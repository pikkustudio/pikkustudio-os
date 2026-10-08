import {
  createMessages,
  type CompleteMessages,
  type MessagesOf,
} from '@pikku/react'

/**
 * Every word the graph draws itself. Technical names that come from the
 * user's workflow (function names, step ids, onConnect, onMessage) are never
 * in here. The values are the English defaults; a key that takes a value
 * declares it in its parameter, and that one const is the source of the keys
 * and the parameter types the host has to match.
 */
export const defaultMessages = {
  // Step kinds
  node_inline: () => 'Inline',
  node_generic: () => 'Generic Node (Implementation Needed)',
  node_branch: () => 'Branch',
  node_cancel: () => 'Cancel',
  node_loop: () => 'Loop',
  node_filter: () => 'Filter',
  node_parallel: () => 'Parallel',
  node_return: () => 'Return',
  node_set: () => 'Set',
  node_sleep: () => 'Sleep',
  node_suspend: () => 'Suspend',
  node_switch: () => 'Switch',
  node_some: () => 'Some',
  node_every: () => 'Every',
  node_check: () => 'Check',
  node_message_router: () => 'Message router',
  node_channel_wiring: () => 'Channel wiring',
  node_channel: () => 'Channel',

  // Ways a workflow starts
  wiring_http: () => 'HTTP',
  wiring_queue: () => 'Queue',
  wiring_cli: () => 'CLI',
  wiring_mcp_tool: () => 'MCP Tool',
  wiring_mcp_prompt: () => 'MCP Prompt',
  wiring_mcp_resource: () => 'MCP Resource',
  wiring_schedule: () => 'Schedule',
  wiring_trigger: () => 'Trigger',

  // Labels on the exits of a node
  handle_if: () => 'if',
  handle_elif: ({ n }: { n: number }) => `elif ${n}`,
  handle_else: () => 'else',
  handle_next: () => 'next',
  handle_each: () => 'each',
  handle_done: () => 'done',
  handle_default: () => 'default',
  handle_after: () => 'after',
  handler_on_connect: () => 'onConnect',
  handler_on_disconnect: () => 'onDisconnect',
  handler_on_message: () => 'onMessage',

  // Labels on the lines between nodes
  edge_then: () => 'then',
  edge_else: () => 'else',
  edge_branch: ({ n }: { n: number }) => `branch ${n}`,
  edge_default: () => 'default',
  edge_on_error: () => 'on error',

  // What happened to a step in the run being shown
  status_done: () => 'Done',
  status_running: () => 'Running',
  status_failed: () => 'Failed',
  status_pending: () => 'Pending',
  status_suspended: () => 'Suspended',
  status_cancelled: () => 'Cancelled',
  status_scheduled: () => 'Scheduled',
  status_skipped: () => 'Skipped',

  // Small notes on a node
  not_wired: () => 'Not wired',
  triggered_this_run: () => 'Triggered this run',
  selected: () => 'Selected',
  referenced: () => 'Referenced',
  auth: () => 'Auth',
  open: () => 'Open',
  permissions: () => 'Permissions',
  middleware: () => 'Middleware',
  retries: () => 'Retries',
  retries_value: ({ n }: { n: number }) => `Retries: ${n}`,
  retry_delay: () => 'Retry delay',
  retry_delay_value: ({ n }: { n: number }) => `Retry delay: ${n}`,
  none: () => 'None',

  // Canvas controls
  scroll_sideways: () => 'Scroll sideways',
  scroll_vertical: () => 'Scroll up and down',
}

const messages = createMessages(defaultMessages)

/** The `m` the graph calls: same keys and parameters as `defaultMessages`, every one returning a translated string. */
export type GraphM = MessagesOf<typeof defaultMessages>

/** What a library user supplies: any subset, the rest stays English. */
export type WorkflowGraphMessages = Partial<GraphM>

/** What a host passes through `completeMessages` to be told about every missing key. */
export type CompleteWorkflowGraphMessages = CompleteMessages<GraphM>

export const { MessagesProvider, defaultM } = messages
export const useGraphM = messages.useM
