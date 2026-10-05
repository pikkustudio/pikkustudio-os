import type { Embedder } from './search.js'

type Variables = { get: (name: string) => Promise<string | undefined> | string | undefined }

const BATCH = 16

/**
 * Embeddings from the local model server. embeddinggemma is trained with a prompt on
 * each side, so a question and the passage that answers it are embedded differently.
 * Vectors are normalised, so cosine is a dot product.
 */
export async function createEmbedder(variables: Variables): Promise<Embedder> {
  const baseURL = ((await variables.get('OLLAMA_BASE_URL')) || 'http://localhost:11434/v1').replace(/\/$/, '')
  const model = (await variables.get('EMBEDDING_MODEL')) || 'embeddinggemma'
  const embed = async (input: string[]): Promise<Float32Array[]> => {
    const out: Float32Array[] = []
    for (let i = 0; i < input.length; i += BATCH) {
      const res = await fetch(`${baseURL}/embeddings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, input: input.slice(i, i + BATCH) }),
        signal: AbortSignal.timeout(120_000),
      })
      if (!res.ok) throw new Error(`Ollama embeddings answered ${res.status}: ${(await res.text()).slice(0, 200)}`)
      const body = (await res.json()) as { data: { index: number; embedding: number[] }[] }
      for (const d of [...body.data].sort((a, b) => a.index - b.index)) out.push(normalise(d.embedding))
    }
    return out
  }
  return {
    model,
    passages: (texts) => embed(texts.map((t) => `title: none | text: ${t}`)),
    query: async (text) => (await embed([`task: search result | query: ${text}`]))[0]!,
  }
}

export function normalise(v: number[]): Float32Array {
  let norm = 0
  for (const x of v) norm += x * x
  norm = Math.sqrt(norm) || 1
  return Float32Array.from(v, (x) => x / norm)
}
