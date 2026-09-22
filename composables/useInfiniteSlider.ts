import type { SplitSliderSlide } from '~/components/InfiniteSplitSlider.vue'
import { IMAGE_WIDTH } from '~/composables/useSanityImage'

export type InfiniteSliderPageData = {
  seoTitle?: string
  seoDescription?: string
  slides: SplitSliderSlide[]
}

export const INFINITE_SLIDER_PAGE_QUERY = `*[_type == "infiniteSliderPage"][0] {
  seoTitle,
  seoDescription,
  slides[] {
    _key,
    title,
    tags,
    accent,
    linkLabel,
    link,
    leftImage { asset->{ _id, url } },
    rightImage { asset->{ _id, url } },
    "productSlug": product->slug.current
  }
}`

/** Demo slides when CMS content is empty. */
export const demoInfiniteSliderSlides = (): SplitSliderSlide[] => [
  {
    title: 'Studioform',
    tags: ['Studio & Movement', 'Fitness & Method', 'Space & Design'],
    accent: '#a9d0f5',
    link: '/materials-and-forms',
    linkLabel: 'View Full Project',
    leftImage: '/infinite-slider/slide_img_left_1.jpg',
    rightImage: '/infinite-slider/slide_img_right_1.jpg',
  },
  {
    title: 'Nightbloom',
    tags: ['Editorial & Portrait', 'Concept & Series', 'Art & Direction'],
    accent: '#f5a97a',
    link: '/materials-and-forms',
    linkLabel: 'View Full Project',
    leftImage: '/infinite-slider/slide_img_left_2.jpg',
    rightImage: '/infinite-slider/slide_img_right_2.jpg',
  },
  {
    title: 'Stillpose',
    tags: ['Movement & Wellness', 'Body & Practice', 'Brand & Identity'],
    accent: '#b7e0a0',
    link: '/materials-and-forms',
    linkLabel: 'View Full Project',
    leftImage: '/infinite-slider/slide_img_left_3.jpg',
    rightImage: '/infinite-slider/slide_img_right_3.jpg',
  },
  {
    title: 'Matchawork',
    tags: ['Beverage & Craft', 'Content & Styling', 'Product & Story'],
    accent: '#c9a97a',
    link: '/materials-and-forms',
    linkLabel: 'View Full Project',
    leftImage: '/infinite-slider/slide_img_left_4.jpg',
    rightImage: '/infinite-slider/slide_img_right_4.jpg',
  },
  {
    title: 'Blurface',
    tags: ['Fashion & Portrait', 'Motion & Study', 'Brand & Identity'],
    accent: '#e8e8e8',
    link: '/materials-and-forms',
    linkLabel: 'View Full Project',
    leftImage: '/infinite-slider/slide_img_left_5.jpg',
    rightImage: '/infinite-slider/slide_img_right_5.jpg',
  },
]

export const useInfiniteSlider = async () => {
  const { imageUrl } = useSanityImage()

  const { data, pending, error, refresh } = await useAsyncData(
    'infiniteSliderPage',
    () =>
      $fetch('/api/sanity/query', {
        method: 'POST',
        body: { query: INFINITE_SLIDER_PAGE_QUERY },
      })
        .then((r: { result?: unknown }) => r?.result ?? null)
        .catch(() => null),
  )

  const page = computed<InfiniteSliderPageData>(() => {
    const raw = data.value as Record<string, unknown> | null
    if (!raw) {
      return {
        slides: demoInfiniteSliderSlides(),
      }
    }

    const slidesRaw = Array.isArray(raw.slides) ? raw.slides : []
    const slides: SplitSliderSlide[] = slidesRaw
      .map((slide: Record<string, unknown>) => {
        const left = slide.leftImage as { asset?: { _id?: string; url?: string } } | undefined
        const right = slide.rightImage as
          | { asset?: { _id?: string; url?: string } }
          | undefined
        const leftSrc = imageUrl(left || null, IMAGE_WIDTH.splitSlider, 90)
        const rightSrc = imageUrl(right || null, IMAGE_WIDTH.splitSlider, 90)
        if (!leftSrc || !rightSrc) return null

        const productSlug = String(slide.productSlug || '').trim()
        const linkFromCms = String(slide.link || '').trim()
        const link = productSlug
          ? `/materials-and-forms/${productSlug}`
          : linkFromCms || '/materials-and-forms'

        const tags = Array.isArray(slide.tags)
          ? slide.tags.map((tag) => String(tag || '').trim()).filter(Boolean)
          : []

        return {
          title: String(slide.title || 'Untitled'),
          tags,
          accent: String(slide.accent || '#e8e8e8').trim() || '#e8e8e8',
          link,
          linkLabel: String(slide.linkLabel || 'View Full Project').trim() || 'View Full Project',
          leftImage: leftSrc,
          rightImage: rightSrc,
        } satisfies SplitSliderSlide
      })
      .filter(Boolean) as SplitSliderSlide[]

    if (!slides.length) {
      return {
        seoTitle: (raw.seoTitle as string) || undefined,
        seoDescription: (raw.seoDescription as string) || undefined,
        slides: demoInfiniteSliderSlides(),
      }
    }

    return {
      seoTitle: (raw.seoTitle as string) || undefined,
      seoDescription: (raw.seoDescription as string) || undefined,
      slides,
    }
  })

  return { page, pending, error, refresh }
}
