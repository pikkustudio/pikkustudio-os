import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
} from 'node:crypto'

export const SEALED_BOX_ALGORITHM = 'sealed-x25519-v1'

const SEAL_SALT = 'pikkufabric/sealed-box/v1'

export interface SealedValue {
  alg: typeof SEALED_BOX_ALGORITHM
  kid: string | null
  epk: string
  iv: string
  ct: string
  tag: string
}

export interface SealingKeypair {
  publicKey: string
  privateKey: string
}

export const generateSealingKeypair = (): SealingKeypair => {
  const { publicKey, privateKey } = generateKeyPairSync('x25519')
  return {
    publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
    privateKey: privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64'),
  }
}

export const keyIdFor = (publicKey: string): string =>
  createHash('sha256').update(publicKey).digest('hex').slice(0, 16)

const deriveContentKey = (shared: Buffer, epk: Buffer, recipientPublic: Buffer): Buffer =>
  Buffer.from(
    hkdfSync('sha256', shared, Buffer.from(SEAL_SALT), Buffer.concat([epk, recipientPublic]), 32)
  )

export const seal = (publicKey: string, keyId: string, plaintext: string): SealedValue => {
  const recipient = createPublicKey({
    key: Buffer.from(publicKey, 'base64'),
    type: 'spki',
    format: 'der',
  })
  const ephemeral = generateKeyPairSync('x25519')
  const epk = ephemeral.publicKey.export({ type: 'spki', format: 'der' })
  const contentKey = deriveContentKey(
    diffieHellman({ privateKey: ephemeral.privateKey, publicKey: recipient }),
    epk,
    recipient.export({ type: 'spki', format: 'der' })
  )
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', contentKey, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return {
    alg: SEALED_BOX_ALGORITHM,
    kid: keyId,
    epk: epk.toString('base64'),
    iv: iv.toString('base64'),
    ct: ct.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  }
}

export const unseal = (privateKey: string, sealed: SealedValue): string => {
  if (sealed.alg !== SEALED_BOX_ALGORITHM) {
    throw new Error(`Cannot open sealed value: unsupported algorithm "${sealed.alg}"`)
  }
  const recipientPrivate = createPrivateKey({
    key: Buffer.from(privateKey, 'base64'),
    type: 'pkcs8',
    format: 'der',
  })
  const epk = Buffer.from(sealed.epk, 'base64')
  const contentKey = deriveContentKey(
    diffieHellman({
      privateKey: recipientPrivate,
      publicKey: createPublicKey({ key: epk, type: 'spki', format: 'der' }),
    }),
    epk,
    createPublicKey(recipientPrivate).export({ type: 'spki', format: 'der' })
  )
  const decipher = createDecipheriv('aes-256-gcm', contentKey, Buffer.from(sealed.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(sealed.tag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(sealed.ct, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

export const serializeSealedValue = (sealed: SealedValue): string => JSON.stringify(sealed)

export const parseSealedValue = (serialized: string): SealedValue => {
  let raw: Partial<SealedValue>
  try {
    raw = JSON.parse(serialized) as Partial<SealedValue>
  } catch (error) {
    throw new Error(
      `Malformed sealed value: not valid JSON (${error instanceof Error ? error.message : String(error)})`
    )
  }
  for (const field of ['alg', 'epk', 'iv', 'ct', 'tag'] as const) {
    if (typeof raw[field] !== 'string') {
      throw new Error(`Malformed sealed value: missing "${field}"`)
    }
  }
  if (raw.kid !== null && typeof raw.kid !== 'string') {
    throw new Error('Malformed sealed value: missing "kid"')
  }
  if (raw.alg !== SEALED_BOX_ALGORITHM) {
    throw new Error(`Malformed sealed value: unsupported algorithm "${raw.alg}"`)
  }
  return raw as SealedValue
}
