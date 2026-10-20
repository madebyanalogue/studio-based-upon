import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

/** Static fallback — Vercel serverless has no `public/` on disk for `readdir`. */
const FALLBACK = {
  model: '/webgl/reliefs_high_compressed.glb',
  plaster: '/webgl/plaster.jpg',
}

async function listing(dir: string) {
  try {
    return await readdir(dir)
  } catch {
    return [] as string[]
  }
}

export default defineEventHandler(async () => {
  const homeDir = join(process.cwd(), 'public/webgl/home')
  const rootDir = join(process.cwd(), 'public/webgl')
  const homeNames = await listing(homeDir)
  const rootNames = await listing(rootDir)

  const pickModel = (names: string[]) =>
    names
      .filter((name) => /reliefs_.*\.glb$/i.test(name))
      .sort((a, b) => {
        const rank = (name: string) => (name.includes('high') ? 0 : name.includes('low') ? 1 : 2)
        return rank(a) - rank(b) || a.localeCompare(b)
      })[0]

  const pickPlaster = (names: string[]) =>
    names.find((name) => /plaster/i.test(name) && /\.(jpe?g|png|webp)$/i.test(name))

  const modelName = pickModel(homeNames) ?? pickModel(rootNames)
  const plasterName = pickPlaster(homeNames) ?? pickPlaster(rootNames)
  const modelInHome = Boolean(pickModel(homeNames))
  const plasterInHome = Boolean(pickPlaster(homeNames))

  const url = (name: string, inHome: boolean) =>
    `/webgl/${inHome ? 'home/' : ''}${encodeURIComponent(name)}`

  return {
    model: modelName ? url(modelName, modelInHome) : FALLBACK.model,
    plaster: plasterName ? url(plasterName, plasterInHome) : FALLBACK.plaster,
  }
})
