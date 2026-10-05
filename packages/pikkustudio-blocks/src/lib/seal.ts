const ALGORITHM = 'sealed-x25519-v1'
const SALT = 'pikkufabric/sealed-box/v1'
const TAG_BYTES = 16

const toBase64 = (bytes: Uint8Array): string => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

const fromBase64 = (value: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const concat = (a: Uint8Array, b: Uint8Array): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(a.length + b.length)
  out.set(a)
  out.set(b, a.length)
  return out
}

export const sealSecret = async (
  publicKey: string,
  keyId: string,
  value: unknown
): Promise<string> => {
  const recipientDer = fromBase64(publicKey)
  const recipient = await crypto.subtle.importKey('spki', recipientDer, { name: 'X25519' }, false, [])
  const ephemeral = (await crypto.subtle.generateKey({ name: 'X25519' }, true, ['deriveBits'])) as CryptoKeyPair
  const epk = new Uint8Array(await crypto.subtle.exportKey('spki', ephemeral.publicKey))
  const shared = await crypto.subtle.deriveBits({ name: 'X25519', public: recipient }, ephemeral.privateKey, 256)
  const material = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey'])
  const contentKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new TextEncoder().encode(SALT), info: concat(epk, recipientDer) },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, contentKey, new TextEncoder().encode(JSON.stringify(value)))
  )
  return JSON.stringify({
    alg: ALGORITHM,
    kid: keyId,
    epk: toBase64(epk),
    iv: toBase64(iv),
    ct: toBase64(sealed.slice(0, sealed.length - TAG_BYTES)),
    tag: toBase64(sealed.slice(sealed.length - TAG_BYTES)),
  })
}
