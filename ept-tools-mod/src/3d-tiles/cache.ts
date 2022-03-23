import { Ept } from 'ept'
import { JsonSchema, getJson } from 'utils'

type Entry = {
  promise: Promise<Ept>
  createdAt: Date
}
type Map = Record<string, Entry | undefined>

export const Cache = { create }
export type Cache = ReturnType<typeof create>

function create(timeout = 60000) {
  const cache: Map = {}

  async function get(filename: string,options?:any): Promise<Ept> {
    const existing = cache[filename + '_' + options?.headers?.Cookie]

    if (existing) return existing.promise

    const promise = fetch(filename,options)
    cache[filename + '_' + options?.headers?.Cookie] = { promise, createdAt: new Date() }

    return promise
  }

  let interval =
    timeout &&
    setInterval(() => {
      const now = new Date()

      Object.entries(cache).forEach(([filename, entry]) => {
        if (!entry) return
        const { createdAt } = entry

        if (now.getTime() - createdAt.getTime() > timeout)
          delete cache[filename]
      })
    }, 60000)

  function destroy() {
    if (interval) clearInterval(interval)
  }

  return { get, destroy }
}

async function fetch(filename: string,options?:object) {
  const [result, errors] = JsonSchema.validate<Ept>(
    Ept.schema,
    await getJson(filename,options)
  )

  errors.forEach((e) => console.log(`${filename}:`, e))

  return result
}
