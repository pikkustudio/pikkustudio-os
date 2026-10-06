import ts from 'typescript'
import { createHash } from 'node:crypto'
import type { UiEntry, UiMeta, UiUnitKind } from './ui-types.js'

export interface UiSourceFile {
  path: string
  content: string
}

const SKIP_FILE = /\.(gen|stories|test|spec|d)\.tsx?$/
const SKIP_DIR = /(^|\/)(paraglide|__generated__|node_modules|dist|build)(\/|$)/
const RPC_HOOKS = new Set(['usePikkuQuery', 'usePikkuMutation', 'usePikkuSubscription'])
const QUERY_HOOKS = new Set(['usePikkuQuery', 'useQuery', 'useSuspenseQuery', 'useInfiniteQuery'])
const MUTATION_HOOKS = new Set(['usePikkuMutation', 'useMutation'])
const EFFECT_HOOKS = new Set(['useEffect', 'useLayoutEffect', 'useInsertionEffect'])
const TEXT_ATTRS = new Set(['label', 'placeholder', 'title', 'aria-label', 'description', 'alt'])
const SHORT_CIRCUIT = new Set([
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionQuestionToken,
])
const BRANCHING = new Set([
  ts.SyntaxKind.SwitchStatement,
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.CatchClause,
])

export const isScannableUiFile = (path: string): boolean =>
  /\.tsx?$/.test(path) && !SKIP_FILE.test(path) && !SKIP_DIR.test(path)

const hash = (value: string): string =>
  createHash('sha256').update(value).digest('hex').slice(0, 16)

const isHookName = (name: string): boolean => /^use[A-Z]/.test(name)

const calleeName = (node: ts.CallExpression): string | null => {
  if (ts.isIdentifier(node.expression)) return node.expression.text
  if (ts.isPropertyAccessExpression(node.expression)) return node.expression.name.text
  return null
}

const containsJsx = (node: ts.Node): boolean => {
  let found = false
  const visit = (child: ts.Node) => {
    if (found) return
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) {
      found = true
      return
    }
    ts.forEachChild(child, visit)
  }
  visit(node)
  return found
}

const jsxDepthOf = (node: ts.Node): number => {
  let deepest = 0
  const walk = (child: ts.Node, depth: number) => {
    const next =
      ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)
        ? depth + 1
        : depth
    if (next > deepest) deepest = next
    ts.forEachChild(child, (grandchild) => walk(grandchild, next))
  }
  walk(node, 0)
  return deepest
}

const unitOf = (name: string, fn: ts.Node): UiUnitKind | null => {
  if (name.endsWith('Provider')) return 'context'
  if (isHookName(name)) return 'hook'
  if (/^[A-Z]/.test(name) && containsJsx(fn)) return 'component'
  return null
}

const firstParameter = (fn: ts.SignatureDeclarationBase): ts.ParameterDeclaration | undefined =>
  fn.parameters[0]

const membersOf = (type: ts.TypeNode | undefined): string[] => {
  if (!type) return []
  if (ts.isTypeLiteralNode(type)) {
    return type.members.map((member) => member.name?.getText() ?? '').filter(Boolean)
  }
  if (ts.isTypeReferenceNode(type) && type.typeArguments) {
    return type.typeArguments.flatMap((argument) => membersOf(argument))
  }
  return []
}

const propNamesOf = (
  fn: ts.SignatureDeclarationBase,
  declared: ts.TypeNode | undefined,
): string[] => {
  const param = firstParameter(fn)
  if (param && ts.isObjectBindingPattern(param.name)) {
    return param.name.elements.map((element) => element.name.getText())
  }
  const fromParam = membersOf(param?.type)
  return fromParam.length > 0 ? fromParam : membersOf(declared)
}

/**
 * `const X: FC<Props> = (props) =>` puts the type on the variable, not the
 * parameter, so a parameter with no annotation is only untyped when the
 * declaration carries none either.
 */
const hasUntypedProps = (
  fn: ts.SignatureDeclarationBase,
  declared: ts.TypeNode | undefined,
  unit: UiUnitKind,
): boolean => {
  if (unit === 'hook') return false
  const param = firstParameter(fn)
  if (!param) return false
  if (param.type) return param.type.kind === ts.SyntaxKind.AnyKeyword
  if (declared) return declared.kind === ts.SyntaxKind.AnyKeyword
  return true
}

const isMeaningfulText = (raw: string): boolean => {
  const text = raw.trim()
  if (text.length < 3) return false
  if (!/[A-Za-z]{2,}/.test(text)) return false
  return /\s|[A-Za-z]{4,}/.test(text)
}

const optionsObjectOf = (call: ts.CallExpression): ts.ObjectLiteralExpression | null => {
  for (const argument of call.arguments) {
    if (ts.isObjectLiteralExpression(argument)) return argument
  }
  return null
}

const hasProperty = (object: ts.ObjectLiteralExpression | null, name: string): boolean =>
  !!object?.properties.some((property) => property.name?.getText() === name)

interface Binding {
  name: string | null
  fields: string[]
}

const bindingOf = (call: ts.CallExpression): Binding => {
  const parent = call.parent
  if (!parent || !ts.isVariableDeclaration(parent)) return { name: null, fields: [] }
  if (ts.isIdentifier(parent.name)) return { name: parent.name.text, fields: [] }
  if (ts.isObjectBindingPattern(parent.name)) {
    return {
      name: null,
      fields: parent.name.elements.map((element) =>
        (element.propertyName ?? element.name).getText(),
      ),
    }
  }
  return { name: null, fields: [] }
}

interface Signals {
  hooks: string[]
  rpcs: string[]
  effects: number
  effectsWithoutDeps: number
  conditionalHooks: number
  stateFromProps: number
  fetchInEffect: number
  queriesWithoutError: number
  queriesWithoutPending: number
  mutationsWithoutError: number
  broadInvalidations: number
  hardcodedText: number
  rawNavigations: number
  anyCasts: number
  jsxDepth: number
}

/**
 * Read once, count everything. Every signal needs the same ancestor bookkeeping
 * — whether we are inside a branch, inside an effect — and the counts have to
 * agree with each other for the score to mean anything.
 */
const collect = (fn: ts.Node, props: Set<string>, bodyText: string): Signals => {
  const hooks: string[] = []
  const rpcs: string[] = []
  const queries: Array<{ binding: Binding; suspense: boolean }> = []
  const mutations: Array<{ binding: Binding; handled: boolean }> = []

  let effects = 0
  let effectsWithoutDeps = 0
  let conditionalHooks = 0
  let stateFromProps = 0
  let fetchInEffect = 0
  let broadInvalidations = 0
  let hardcodedText = 0
  let rawNavigations = 0
  let anyCasts = 0

  const visit = (node: ts.Node, branched: boolean, inEffect: boolean) => {
    let nowBranched = branched
    let nowInEffect = inEffect

    if (node.kind === ts.SyntaxKind.AnyKeyword) anyCasts += 1

    if (BRANCHING.has(node.kind)) nowBranched = true

    if (ts.isJsxText(node) && isMeaningfulText(node.text)) hardcodedText += 1

    if (ts.isJsxAttribute(node) && node.initializer) {
      const attribute = node.name.getText()
      if (TEXT_ATTRS.has(attribute) && ts.isStringLiteral(node.initializer)) {
        if (isMeaningfulText(node.initializer.text)) hardcodedText += 1
      }
      if (attribute === 'href' && ts.isStringLiteral(node.initializer)) {
        if (node.initializer.text.startsWith('/')) rawNavigations += 1
      }
    }

    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'window' &&
      node.name.text === 'location' &&
      !(ts.isPropertyAccessExpression(node.parent) && node.parent.name.text === 'reload')
    ) {
      rawNavigations += 1
    }

    if (ts.isCallExpression(node)) {
      const name = calleeName(node)

      if (name && isHookName(name)) {
        if (!hooks.includes(name)) hooks.push(name)
        if (nowBranched) conditionalHooks += 1
      }

      if (name && RPC_HOOKS.has(name)) {
        const [first] = node.arguments
        if (first && ts.isStringLiteral(first) && !rpcs.includes(first.text)) {
          rpcs.push(first.text)
        }
      }

      if (name && EFFECT_HOOKS.has(name)) {
        effects += 1
        if (node.arguments.length < 2) effectsWithoutDeps += 1
        nowInEffect = true
      }

      if (name && QUERY_HOOKS.has(name)) {
        queries.push({ binding: bindingOf(node), suspense: name === 'useSuspenseQuery' })
      }

      if (name && MUTATION_HOOKS.has(name)) {
        mutations.push({
          binding: bindingOf(node),
          handled: hasProperty(optionsObjectOf(node), 'onError'),
        })
      }

      if (name === 'useState' && node.arguments.length > 0) {
        const [seed] = node.arguments
        const root = seed && ts.isPropertyAccessExpression(seed) ? seed.expression : seed
        const identifier = root && ts.isIdentifier(root) ? root.text : null
        if (identifier && props.has(identifier)) stateFromProps += 1
      }

      if (name === 'invalidateQueries') {
        const options = optionsObjectOf(node)
        if (node.arguments.length === 0 || !hasProperty(options, 'queryKey')) {
          broadInvalidations += 1
        }
      }

      if (nowInEffect && (name === 'fetch' || name === 'invoke' || name === 'then')) {
        fetchInEffect += 1
      }
    }

    if (nowInEffect && node.kind === ts.SyntaxKind.AwaitExpression) fetchInEffect += 1

    if (ts.isBinaryExpression(node) && SHORT_CIRCUIT.has(node.operatorToken.kind)) {
      visit(node.left, nowBranched, nowInEffect)
      visit(node.right, true, nowInEffect)
      return
    }

    if (ts.isConditionalExpression(node)) {
      visit(node.condition, nowBranched, nowInEffect)
      visit(node.whenTrue, true, nowInEffect)
      visit(node.whenFalse, true, nowInEffect)
      return
    }

    if (ts.isIfStatement(node)) {
      visit(node.expression, branched, nowInEffect)
      visit(node.thenStatement, true, nowInEffect)
      if (node.elseStatement) visit(node.elseStatement, true, nowInEffect)
      return
    }

    ts.forEachChild(node, (child) => visit(child, nowBranched, nowInEffect))
  }

  ts.forEachChild(fn, (child) => visit(child, false, false))

  const reads = (binding: Binding, fields: string[]): boolean =>
    binding.fields.some((field) => fields.includes(field)) ||
    (binding.name !== null && fields.some((field) => bodyText.includes(`${binding.name}.${field}`)))

  const queriesWithoutError = queries.filter(
    (query) => !reads(query.binding, ['error', 'isError', 'status']),
  ).length
  const queriesWithoutPending = queries.filter(
    (query) => !query.suspense && !reads(query.binding, ['isPending', 'isLoading', 'status']),
  ).length
  const mutationsWithoutError = mutations.filter(
    (mutation) => !mutation.handled && !reads(mutation.binding, ['error', 'isError']),
  ).length

  return {
    hooks,
    rpcs,
    effects,
    effectsWithoutDeps,
    conditionalHooks,
    stateFromProps,
    fetchInEffect,
    queriesWithoutError,
    queriesWithoutPending,
    mutationsWithoutError,
    broadInvalidations,
    hardcodedText,
    rawNavigations,
    anyCasts,
    jsxDepth: jsxDepthOf(fn),
  }
}

const entryFor = (
  path: string,
  sourceFile: ts.SourceFile,
  name: string,
  declaration: ts.Node,
  fn: ts.SignatureDeclarationBase & ts.Node,
  declaredType?: ts.TypeNode,
): UiEntry | null => {
  const unit = unitOf(name, fn)
  if (!unit) return null

  const start = declaration.getStart(sourceFile)
  const bodyStart = sourceFile.getLineAndCharacterOfPosition(start).line + 1
  const bodyEnd = sourceFile.getLineAndCharacterOfPosition(declaration.getEnd()).line + 1
  const bodyText = fn.getText(sourceFile)
  const props = propNamesOf(fn, declaredType)

  const signals = collect(fn, new Set(props), bodyText)
  const parameter = firstParameter(fn)
  const contract = [name, parameter?.getText(sourceFile) ?? '', fn.type?.getText(sourceFile) ?? '']

  return {
    uiId: `${path}#${name}`,
    name,
    unit,
    sourceFile: path,
    bodyStart,
    bodyEnd,
    lines: bodyEnd - bodyStart + 1,
    contractHash: hash(contract.join(' ')),
    implementationHash: hash(bodyText.replace(/\s+/g, ' ')),
    hooks: signals.hooks,
    rpcs: signals.rpcs,
    propCount: props.length,
    jsxDepth: signals.jsxDepth,
    effects: signals.effects,
    effectsWithoutDeps: signals.effectsWithoutDeps,
    conditionalHooks: signals.conditionalHooks,
    stateFromProps: signals.stateFromProps,
    fetchInEffect: signals.fetchInEffect,
    queriesWithoutError: signals.queriesWithoutError,
    queriesWithoutPending: signals.queriesWithoutPending,
    mutationsWithoutError: signals.mutationsWithoutError,
    broadInvalidations: signals.broadInvalidations,
    hardcodedText: signals.hardcodedText,
    rawNavigations: signals.rawNavigations,
    anyCasts: signals.anyCasts,
    untypedProps: hasUntypedProps(fn, declaredType, unit),
  }
}

export const scanUiFile = (file: UiSourceFile): UiEntry[] => {
  const sourceFile = ts.createSourceFile(
    file.path,
    file.content,
    ts.ScriptTarget.Latest,
    true,
    file.path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )

  const entries: UiEntry[] = []

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && statement.body) {
      const entry = entryFor(file.path, sourceFile, statement.name.text, statement, statement)
      if (entry) entries.push(entry)
      continue
    }

    if (!ts.isVariableStatement(statement)) continue

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue
      const initializer = declaration.initializer
      if (!ts.isArrowFunction(initializer) && !ts.isFunctionExpression(initializer)) continue
      const entry = entryFor(
        file.path,
        sourceFile,
        declaration.name.text,
        statement,
        initializer,
        declaration.type,
      )
      if (entry) entries.push(entry)
    }
  }

  return entries
}

export const scanUiSources = (files: UiSourceFile[]): UiMeta => {
  const meta: UiMeta = {}
  for (const file of files) {
    if (!isScannableUiFile(file.path)) continue
    for (const entry of scanUiFile(file)) {
      meta[entry.uiId] = entry
    }
  }
  return meta
}
