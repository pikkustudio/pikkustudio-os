export class MockRpcError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export const fail = (status: number, message: string): never => {
  throw new MockRpcError(status, message)
}
export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
export const never = () => new Promise<never>(() => {})

export type Mock = { id: string; name: string; respond: (input: any) => unknown | Promise<unknown> }
export type MockEntry = { label: string; mocks: Mock[] }
export type MockRegistry = Record<string, MockEntry>

export function mockRpc(registry: MockRegistry, selected: (name: string) => string | undefined) {
  const invoke = async (name: string, input: unknown) => {
    const entry = registry[name]
    if (!entry) throw new MockRpcError(501, `No mock for ${name}`)
    const mock = entry.mocks.find((m) => m.id === selected(name)) ?? entry.mocks[0]
    return mock.respond(input)
  }
  return { fetch: {}, rpc: { invoke } }
}
