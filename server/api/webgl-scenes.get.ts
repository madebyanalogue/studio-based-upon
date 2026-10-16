import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

export default defineEventHandler(async () => {
  const names = await readdir(join(process.cwd(), 'public/webgl'))
  return names
    .filter((name) => name.toLowerCase().endsWith('.glb'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => `/webgl/${encodeURIComponent(name)}`)
})
