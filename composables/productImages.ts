import { imageAssetKey } from '~/composables/useSanityImage'

export type ProductImageFrame = {
  asset?: { url?: string; _id?: string; metadata?: unknown }
}

/**
 * Canonical product image list. Gallery is the source of truth (first = cover).
 * Legacy `image` is prepended when still present and not already in gallery.
 */
export const productGalleryFrames = <T extends ProductImageFrame>(item: {
  gallery?: T[] | null
  image?: T | null
}): T[] => {
  const frames: T[] = []
  const seen = new Set<string>()
  const push = (frame?: T | null) => {
    if (!frame?.asset) return
    const key = String(frame.asset._id || frame.asset.url || '')
    if (!key || seen.has(key)) return
    seen.add(key)
    frames.push(frame)
  }
  push(item.image ?? null)
  for (const frame of item.gallery || []) push(frame)
  return frames
}

/** Cover / thumbnail frame — gallery[0] after migration. */
export const productCoverFrame = <T extends ProductImageFrame>(item: {
  gallery?: T[] | null
  image?: T | null
}): T | undefined => productGalleryFrames(item)[0]

/** Deduplicate image URLs for project galleries (Forms, Surfaces, etc.). */
export const uniqueImageUrls = (
  ...urls: Array<string | null | undefined>
): string[] => {
  const out: string[] = []
  const seen = new Set<string>()
  for (const url of urls) {
    if (!url || url.includes('picsum.photos')) continue
    const key = imageAssetKey(url) || url
    if (seen.has(key)) continue
    seen.add(key)
    out.push(url)
  }
  return out
}

export const galleryFromAssets = (
  assets: Array<{ asset?: { url?: string } } | null | undefined>,
  toUrl: (source: { asset?: { url?: string } }, width?: number) => string,
  width = 1200,
): string[] =>
  uniqueImageUrls(...assets.map((asset) => (asset ? toUrl(asset, width) : '')))

/** Pick a random index into a project image list (hero + gallery). */
export const randomImageIndex = (length: number, rng: () => number = Math.random) =>
  length > 1 ? Math.floor(rng() * length) : 0
