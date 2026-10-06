export interface Layer<T = unknown> {
  name: string
  get(key: string): Promise<T | undefined>
  set?(key: string, value: T): Promise<void>
  delete?(key: string): Promise<void>
}

export interface Resolved<T> {
  value: T
  layer: string
}

export const resolve = async <T>(layers: Layer<T>[], key: string): Promise<Resolved<T> | undefined> => {
  for (const layer of layers) {
    const value = await layer.get(key)
    if (value !== undefined) return { value, layer: layer.name }
  }
  return undefined
}

export const resolveAll = async <T>(layers: Layer<T>[], keys: string[]) => {
  const out: Record<string, Resolved<T>> = {}
  for (const key of keys) {
    const found = await resolve(layers, key)
    if (found) out[key] = found
  }
  return out
}

const named = <T>(layers: Layer<T>[], name: string) => {
  const layer = layers.find((l) => l.name === name)
  if (!layer) throw new Error(`No layer called ${name}`)
  return layer
}

export const writeTo = async <T>(layers: Layer<T>[], name: string, key: string, value: T) => {
  const layer = named(layers, name)
  if (!layer.set) throw new Error(`The ${name} layer is read only`)
  await layer.set(key, value)
}

export const removeFrom = async <T>(layers: Layer<T>[], name: string, key: string) => {
  const layer = named(layers, name)
  if (!layer.delete) throw new Error(`The ${name} layer is read only`)
  await layer.delete(key)
}
