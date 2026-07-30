/** Deduplicate image URLs for project galleries (Forms, Surfaces, etc.). */
export const uniqueImageUrls = (
  ...urls: Array<string | null | undefined>
): string[] => {
  const out: string[] = []
  for (const url of urls) {
    if (!url || url.includes('picsum.photos')) continue
    if (!out.includes(url)) out.push(url)
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
