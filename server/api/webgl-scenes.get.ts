import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

/** Static fallback — Vercel serverless has no `public/` on disk for `readdir`. */
const FALLBACK = [
  '/webgl/webgl-01-fish.glb',
  '/webgl/webgl-02-butterfly.glb',
  '/webgl/webgl-03-bird.glb',
  '/webgl/webgl-04-woodpecker.glb',
  '/webgl/webgl-05-toad.glb',
  '/webgl/webgl-06-turle.glb',
  '/webgl/webgl-07-dragonfly.glb',
]

const toUrls = (names: string[]) =>
  names
    .filter((name) => name.toLowerCase().endsWith('.glb') && !/^reliefs_/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => `/webgl/${encodeURIComponent(name)}`)

export default defineEventHandler(async () => {
  try {
    const names = await readdir(join(process.cwd(), 'public/webgl'))
    const urls = toUrls(names)
    if (urls.length) return urls
  } catch {
    /* production / serverless: public assets are on the CDN only */
  }
  return FALLBACK
})
