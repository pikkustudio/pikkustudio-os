const TOKEN_ENV = 'PIKKU_STUDIO_SERVICE_TOKEN'

export default function (pi) {
  if (!process.env[TOKEN_ENV]) return
  pi.registerMcpServer('studio', {
    type: 'http',
    url: process.env.PIKKU_STUDIO_MCP_URL || `http://127.0.0.1:${process.env.PORT || 4750}/mcp`,
    headers: { Authorization: `Bearer \${${TOKEN_ENV}}` },
    exposure: 'deferred',
    toolExposure: { installTool: 'direct', listTools: 'direct' },
    description:
      "Studio's own tools: list and install the tools a project needs, such as Ghidra, a JDK and REA. Call installTool when a command answers that a tool is missing.",
  })
}
