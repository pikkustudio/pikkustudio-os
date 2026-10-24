import { expect, test } from 'bun:test'
import { generateSealingKeypair, keyIdFor, parseSealedValue, unseal } from '../../../vault/src/sealed-box.ts'
import { sealSecret } from './seal.ts'

test('a value sealed in the browser opens with the vault key', async () => {
  const pair = generateSealingKeypair()
  const sealed = await sealSecret(pair.publicKey, keyIdFor(pair.publicKey), { token: 'sk-1', n: 2 })
  expect(JSON.parse(unseal(pair.privateKey, parseSealedValue(sealed)))).toEqual({ token: 'sk-1', n: 2 })
})

test('a value sealed to another key does not open', async () => {
  const a = generateSealingKeypair()
  const b = generateSealingKeypair()
  const sealed = await sealSecret(a.publicKey, 'a', 'x')
  expect(() => unseal(b.privateKey, parseSealedValue(sealed))).toThrow()
})
