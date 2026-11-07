import { parse } from '@babel/parser'
import { createHash } from 'node:crypto'
import type { UiEntry, UiMeta, UiUnitKind } from './ui-types.js'

export interface UiSourceFile {
  path: string
  content: string
}

/**
 * A Babel AST node. TypeScript 7 ships no JavaScript compiler API, and this
 * scan reads source text in-process, so it parses with Babel. The shapes used
 * here are narrow enough that a loose type reads better than the full union.
 */
// oxlint-disable-next-line typescript/no-explicit-any
type Node = { type: string; start: number; end: number; [key: string]: any }

const SKIP_FILE = /\.(gen|stories|test|spec|d)\.tsx?$/
const SKIP_DIR = /(^|\/)(paraglide|__generated__|node_modules|dist|build)(\/|$)/
const RPC_HOOKS = new Set(['usePikkuQuery', 'usePikkuMutation', 'usePikkuSubscription'])
const QUERY_HOOKS = new Set(['usePikkuQuery', 'useQuery', 'useSuspenseQuery', 'useInfiniteQuery'])
const MUTATION_HOOKS = new Set(['usePikkuMutation', 'useMutation'])
const EFFECT_HOOKS = new Set(['useEffect', 'useLayoutEffect', 'useInsertionEffect'])
const TEXT_ATTRS = new Set(['label', 'placeholder', 'title', 'aria-label', 'description', 'alt'])
const SHORT_CIRCUIT = new Set(['&&', '||', '??'])
const BRANCHING = new Set([
  'SwitchStatement',
  'ForStatement',
  'ForOfStatement',
  'ForInStatement',
  'WhileStatement',
  'DoWhileStatement',
  'CatchClause',
])
const SKIPPED_KEYS = new Set([
  'loc',
  'extra',
  'leadingComments',
  'trailingComments',
  'innerComments',
])

const isNode = (value: unknown): value is Node =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Node).type === 'string' &&
  typeof (value as Node).start === 'number'

/** Children in source order, so first-seen lists come out the way the file reads. */
const childrenOf = (node: Node): Node[] => {
  const children: Node[] = []
  for (const [key, value] of Object.entries(node)) {
    if (SKIPPED_KEYS.has(key)) continue
    if (Array.isArray(value)) {
      for (const item of value) if (isNode(item)) children.push(item)
    } else if (isNode(value)) {
      children.push(value)
    }
  }
  return children.sort((a, b) => a.start - b.start)
}

const forEachChild = (node: Node, callback: (child: Node) => void) => {
  for (const child of childrenOf(node)) callback(child)
}

const isCall = (node: Node | null | undefined): node is Node =>
  node?.type === 'CallExpression' || node?.type === 'OptionalCallExpression'

const isMember = (node: Node | null | undefined): node is Node =>
  (node?.type === 'MemberExpression' || node?.type === 'OptionalMemberExpression') &&
  !node.computed &&
  node.property?.type === 'Identifier'

const isJsx = (node: Node): boolean => node.type === 'JSXElement' || node.type === 'JSXFragment'

const isStringLiteral = (node: Node | null | undefined): node is Node =>
  node?.type === 'StringLiteral'

/** The pattern a parameter binds, past a default value (`a = 1`). */
const bindingTarget = (param: Node): Node => {
  if (param.type === 'AssignmentPattern') return param.left
  if (param.type === 'TSParameterProperty') return bindingTarget(param.parameter)
  return param
}

/** The annotation on a node, as the type itself rather than the `: T` wrapper. */
const annotationOf = (node: Node | null | undefined): Node | undefined =>
  node?.typeAnnotation?.typeAnnotation

interface Source {
  text: string
  lineOf: (offset: number) => number
}

const textOf = (source: Source, node: Node): string => source.text.slice(node.start, node.end)

export const isScannableUiFile = (path: string): boolean =>
  /\.tsx?$/.test(path) && !SKIP_FILE.test(path) && !SKIP_DIR.test(path)

const hash = (value: string): string =>
  createHash('sha256').update(value).digest('hex').slice(0, 16)

const isHookName = (name: string): boolean => /^use[A-Z]/.test(name)

const calleeName = (node: Node): string | null => {
  if (node.callee.type === 'Identifier') return node.callee.name
  if (isMember(node.callee)) return node.callee.property.name
  return null
}

const containsJsx = (node: Node): boolean => {
  let found = false
  const visit = (child: Node) => {
    if (found) return
    if (isJsx(child)) {
      found = true
      return
    }
    forEachChild(child, visit)
  }
  visit(node)
  return found
}

const jsxDepthOf = (node: Node): number => {
  let deepest = 0
  const walk = (child: Node, depth: number) => {
    const next = isJsx(child) ? depth + 1 : depth
    if (next > deepest) deepest = next
    forEachChild(child, (grandchild) => walk(grandchild, next))
  }
  walk(node, 0)
  return deepest
}

const unitOf = (name: string, fn: Node): UiUnitKind | null => {
  if (name.endsWith('Provider')) return 'context'
  if (isHookName(name)) return 'hook'
  if (/^[A-Z]/.test(name) && containsJsx(fn)) return 'component'
  return null
}

const firstParameter = (fn: Node): Node | undefined => fn.params[0]

const keyText = (source: Source, member: Node): string => {
  if (!member.key) return ''
  const text = textOf(source, member.key)
  return member.computed ? `[${text}]` : text
}

const membersOf = (source: Source, type: Node | undefined): string[] => {
  if (!type) return []
  if (type.type === 'TSTypeLiteral') {
    return type.members.map((member: Node) => keyText(source, member)).filter(Boolean)
  }
  if (type.type === 'TSTypeReference' && type.typeParameters) {
    return type.typeParameters.params.flatMap((argument: Node) => membersOf(source, argument))
  }
  return []
}

const propNamesOf = (source: Source, fn: Node, declared: Node | undefined): string[] => {
  const param = firstParameter(fn)
  const target = param && bindingTarget(param)
  if (target?.type === 'ObjectPattern') {
    return target.properties.map((element: Node) => {
      if (element.type === 'RestElement') return textOf(source, element.argument)
      return textOf(source, bindingTarget(element.value))
    })
  }
  const fromParam = membersOf(source, annotationOf(target))
  return fromParam.length > 0 ? fromParam : membersOf(source, declared)
}

/**
 * `const X: FC<Props> = (props) =>` puts the type on the variable, not the
 * parameter, so a parameter with no annotation is only untyped when the
 * declaration carries none either.
 */
const hasUntypedProps = (fn: Node, declared: Node | undefined, unit: UiUnitKind): boolean => {
  if (unit === 'hook') return false
  const param = firstParameter(fn)
  if (!param) return false
  const type = annotationOf(bindingTarget(param))
  if (type) return type.type === 'TSAnyKeyword'
  if (declared) return declared.type === 'TSAnyKeyword'
  return true
}

const isMeaningfulText = (raw: string): boolean => {
  const text = raw.trim()
  if (text.length < 3) return false
  if (!/[A-Za-z]{2,}/.test(text)) return false
  return /\s|[A-Za-z]{4,}/.test(text)
}

const optionsObjectOf = (call: Node): Node | null =>
  call.arguments.find((argument: Node) => argument.type === 'ObjectExpression') ?? null

const hasProperty = (object: Node | null, name: string): boolean =>
  !!object?.properties.some(
    (property: Node) =>
      (property.type === 'ObjectProperty' || property.type === 'ObjectMethod') &&
      !property.computed &&
      property.key.type === 'Identifier' &&
      property.key.name === name,
  )

interface Binding {
  name: string | null
  fields: string[]
}

const bindingOf = (source: Source, call: Node, parent: Node | null): Binding => {
  if (!parent || parent.type !== 'VariableDeclarator' || parent.init !== call) {
    return { name: null, fields: [] }
  }
  if (parent.id.type === 'Identifier') return { name: parent.id.name, fields: [] }
  if (parent.id.type === 'ObjectPattern') {
    return {
      name: null,
      fields: parent.id.properties.map((element: Node) =>
        textOf(source, element.type === 'RestElement' ? element.argument : element.key),
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

const attributeName = (name: Node): string =>
  name.type === 'JSXNamespacedName' ? `${name.namespace.name}:${name.name.name}` : name.name

/**
 * Read once, count everything. Every signal needs the same ancestor bookkeeping
 * — whether we are inside a branch, inside an effect — and the counts have to
 * agree with each other for the score to mean anything.
 */
const collect = (source: Source, fn: Node, props: Set<string>, bodyText: string): Signals => {
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

  const visit = (node: Node, parent: Node, branched: boolean, inEffect: boolean) => {
    let nowBranched = branched
    let nowInEffect = inEffect

    if (node.type === 'TSAnyKeyword') anyCasts += 1

    if (BRANCHING.has(node.type)) nowBranched = true

    if (node.type === 'JSXText' && isMeaningfulText(node.value)) hardcodedText += 1

    if (node.type === 'JSXAttribute' && node.value) {
      const attribute = attributeName(node.name)
      if (TEXT_ATTRS.has(attribute) && isStringLiteral(node.value)) {
        if (isMeaningfulText(node.value.value)) hardcodedText += 1
      }
      if (attribute === 'href' && isStringLiteral(node.value)) {
        if (node.value.value.startsWith('/')) rawNavigations += 1
      }
    }

    if (
      isMember(node) &&
      node.object.type === 'Identifier' &&
      node.object.name === 'window' &&
      node.property.name === 'location' &&
      !(isMember(parent) && parent.property.name === 'reload')
    ) {
      rawNavigations += 1
    }

    if (isCall(node)) {
      const name = calleeName(node)

      if (name && isHookName(name)) {
        if (!hooks.includes(name)) hooks.push(name)
        if (nowBranched) conditionalHooks += 1
      }

      if (name && RPC_HOOKS.has(name)) {
        const [first] = node.arguments
        if (first && isStringLiteral(first) && !rpcs.includes(first.value)) {
          rpcs.push(first.value)
        }
      }

      if (name && EFFECT_HOOKS.has(name)) {
        effects += 1
        if (node.arguments.length < 2) effectsWithoutDeps += 1
        nowInEffect = true
      }

      if (name && QUERY_HOOKS.has(name)) {
        queries.push({
          binding: bindingOf(source, node, parent),
          suspense: name === 'useSuspenseQuery',
        })
      }

      if (name && MUTATION_HOOKS.has(name)) {
        mutations.push({
          binding: bindingOf(source, node, parent),
          handled: hasProperty(optionsObjectOf(node), 'onError'),
        })
      }

      if (name === 'useState' && node.arguments.length > 0) {
        const [seed] = node.arguments
        const root = seed && isMember(seed) ? seed.object : seed
        const identifier = root && root.type === 'Identifier' ? root.name : null
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

    if (nowInEffect && node.type === 'AwaitExpression') fetchInEffect += 1

    if (node.type === 'LogicalExpression' && SHORT_CIRCUIT.has(node.operator)) {
      visit(node.left, node, nowBranched, nowInEffect)
      visit(node.right, node, true, nowInEffect)
      return
    }

    if (node.type === 'ConditionalExpression') {
      visit(node.test, node, nowBranched, nowInEffect)
      visit(node.consequent, node, true, nowInEffect)
      visit(node.alternate, node, true, nowInEffect)
      return
    }

    if (node.type === 'IfStatement') {
      visit(node.test, node, branched, nowInEffect)
      visit(node.consequent, node, true, nowInEffect)
      if (node.alternate) visit(node.alternate, node, true, nowInEffect)
      return
    }

    forEachChild(node, (child) => visit(child, node, nowBranched, nowInEffect))
  }

  forEachChild(fn, (child) => visit(child, fn, false, false))

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

/**
 * `declaration` is the whole statement, `export` and all; `fn` is the function
 * node; `text` is what the body hash and size read, which for a declaration is
 * the statement and for a variable is just the function.
 */
const entryFor = (
  source: Source,
  path: string,
  name: string,
  declaration: Node,
  fn: Node,
  text: Node,
  declaredType?: Node,
): UiEntry | null => {
  const unit = unitOf(name, fn)
  if (!unit) return null

  const bodyStart = source.lineOf(declaration.start)
  const bodyEnd = source.lineOf(declaration.end)
  const bodyText = textOf(source, text)
  const props = propNamesOf(source, fn, declaredType)

  const signals = collect(source, fn, new Set(props), bodyText)
  const parameter = firstParameter(fn)
  const returnType: Node | undefined = fn.returnType?.typeAnnotation
  const contract = [
    name,
    parameter ? textOf(source, parameter) : '',
    returnType ? textOf(source, returnType) : '',
  ]

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

const sourceOf = (content: string): Source => {
  const lineStarts = [0]
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === '\n') lineStarts.push(index + 1)
  }
  return {
    text: content,
    lineOf: (offset) => {
      let low = 0
      let high = lineStarts.length - 1
      while (low < high) {
        const mid = (low + high + 1) >> 1
        if (lineStarts[mid]! <= offset) low = mid
        else high = mid - 1
      }
      return low + 1
    },
  }
}

export const scanUiFile = (file: UiSourceFile): UiEntry[] => {
  let program: Node
  try {
    program = parse(file.content, {
      sourceType: 'module',
      errorRecovery: true,
      createParenthesizedExpressions: true,
      plugins: file.path.endsWith('.tsx') ? ['typescript', 'jsx'] : ['typescript'],
    }).program as unknown as Node
  } catch {
    return []
  }

  const source = sourceOf(file.content)
  const entries: UiEntry[] = []

  for (const statement of program.body as Node[]) {
    const inner: Node =
      (statement.type === 'ExportNamedDeclaration' ||
        statement.type === 'ExportDefaultDeclaration') &&
      statement.declaration
        ? statement.declaration
        : statement

    if (inner.type === 'FunctionDeclaration' && inner.id && inner.body) {
      const entry = entryFor(source, file.path, inner.id.name, statement, inner, statement)
      if (entry) entries.push(entry)
      continue
    }

    if (inner.type !== 'VariableDeclaration') continue

    for (const declaration of inner.declarations as Node[]) {
      if (declaration.id.type !== 'Identifier' || !declaration.init) continue
      const initializer = declaration.init
      if (
        initializer.type !== 'ArrowFunctionExpression' &&
        initializer.type !== 'FunctionExpression'
      ) {
        continue
      }
      const entry = entryFor(
        source,
        file.path,
        declaration.id.name,
        statement,
        initializer,
        initializer,
        annotationOf(declaration.id),
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
