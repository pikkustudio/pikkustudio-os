export function binaryTarget(head: Uint8Array): string | null {
  if (head.length < 20) return null
  const view = new DataView(head.buffer, head.byteOffset, head.byteLength)
  if (view.getUint32(0) === 0x7f454c46) {
    const machine = view.getUint16(18, head[5] !== 2)
    if (machine === 0xb7) return 'linux-arm64'
    if (machine === 0x3e) return 'linux-x64'
    return null
  }
  if (view.getUint32(0) === 0xcffaedfe) {
    const cpu = view.getUint32(4, true)
    if (cpu === 0x0100000c) return 'darwin-arm64'
    if (cpu === 0x01000007) return 'darwin-x64'
    return null
  }
  if (view.getUint32(0) === 0xcafebabe) return 'darwin-universal'
  return null
}

export function targetRunsOn(binary: string | null, host: string): boolean {
  if (!binary) return false
  if (binary === 'darwin-universal') return host.startsWith('darwin-')
  return binary === host
}

export function hostTarget(): string {
  return `${process.platform}-${process.arch}`
}
