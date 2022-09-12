import { Ept } from 'ept'
import { JsonSchema, getJson } from 'utils'

type Entry = {
  promise: Promise<Ept>
  createdAt: Date
}
type Map = Record<string, Entry | undefined>

export const Cache = { create }
export type Cache = ReturnType<typeof create>
const MAX_CACHE_SIZE=1*1024*1024*1024; //Max 1 GB

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

      //remove oldest cache once past the limit
      var size = Buffer.byteLength(JSON.stringify(cache))      
      if (size>=MAX_CACHE_SIZE){
        while (size>=MAX_CACHE_SIZE){
          var minDate = new Date();
          var oldestFilename;
          Object.entries(cache).forEach(([filename, entry]) => {
            if (!entry) return
            const { createdAt } = entry;
            if(createdAt.getTime() < minDate.getTime()){
              minDate = createdAt;
              oldestFilename = filename;
            }
          })
          if (oldestFilename){
            delete cache[oldestFilename];
          }
          size = Buffer.byteLength(JSON.stringify(cache))           
        }
      }
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
