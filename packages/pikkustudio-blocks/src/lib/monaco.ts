import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker'
import CssWorker from 'monaco-editor/language/css/css.worker.js?worker'
import HtmlWorker from 'monaco-editor/language/html/html.worker.js?worker'
import JsonWorker from 'monaco-editor/language/json/json.worker.js?worker'
import TsWorker from 'monaco-editor/language/typescript/ts.worker.js?worker'

const workers: Record<string, new () => Worker> = { json: JsonWorker, css: CssWorker, scss: CssWorker, less: CssWorker, html: HtmlWorker, typescript: TsWorker, javascript: TsWorker }

;(self as unknown as { MonacoEnvironment: { getWorker: (id: string, label: string) => Worker } }).MonacoEnvironment = {
  getWorker: (_id, label) => new (workers[label] ?? EditorWorker)(),
}

for (const defaults of [monaco.typescript.typescriptDefaults, monaco.typescript.javascriptDefaults])
  defaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: true })

loader.config({ monaco })
