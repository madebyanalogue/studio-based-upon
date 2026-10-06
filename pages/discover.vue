<template>
  <DiscoverField :sources="sources" />
</template>

<script setup lang="ts">
import type { DiscoverSource, PieceKind } from '~/lib/discover/composeField'
import { primaryKindFor } from '~/lib/discover/composeField'
import { productSlug } from '~/composables/useProductCatalog'

const EXTRA: PieceKind[] = ['detail', 'process', 'evidence']

const { items } = await useLibraryCatalog()
const { imageUrl } = useSanityImage()

const sources = computed<DiscoverSource[]>(() => {
  const out: DiscoverSource[] = []
  let extra = 0

  for (const item of items.value) {
    const kind = primaryKindFor(item)
    if (!kind) continue
    const frames = item.gallery || []
    frames.forEach((frame, index) => {
      if (index > 2) return
      const url = imageUrl(frame, 1000)
      if (!url) return
      const dims = frame.asset?.metadata?.dimensions
      const ratio =
        dims?.width && dims?.height ? dims.width / dims.height : item.aspectRatio || 1
      out.push({
        id: `${item._id}:${index}`,
        productId: item._id,
        title: item.title,
        slug: productSlug(item),
        kind: index === 0 ? kind : EXTRA[extra++ % EXTRA.length]!,
        url,
        aspect: ratio,
        imageIndex: index,
        series: item.series,
        materials: item.materials || [],
      })
    })
  }

  return out
})

useHead({
  title: 'Discover — Studio Based Upon',
})
</script>
