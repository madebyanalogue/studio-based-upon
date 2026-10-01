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
    location,
    accent,
    linkLabel,
    link,
    leftTitle,
    leftSubtitle,
    leftLink,
    "leftProductSlug": leftProduct->slug.current,
    rightTitle,
    rightSubtitle,
    rightLink,
    "rightProductSlug": rightProduct->slug.current,
    leftImage { asset->{ _id, url } },
    rightImage { asset->{ _id, url } },
    "productSlug": product->slug.current
  }
}`

const demoSide = (
  title: string,
  subtitle: string,
  link: string,
): SplitSliderSlide['left'] => ({ title, subtitle, link })

/** Demo slides when CMS content is empty. */
export const demoInfiniteSliderSlides = (): SplitSliderSlide[] => [
  {
    title: 'Studioform',
    tags: ['Studio & Movement', 'Fitness & Method', 'Space & Design'],
    location: 'London, UK',
    accent: '#a9d0f5',
    link: '/materials-and-forms',
    linkLabel: 'View Full Project',
    left: demoSide('Studioform', 'London, UK', '/materials-and-forms'),
    right: demoSide('Nightbloom', 'Paris, FR', '/typology'),
    leftImage: '/infinite-slider/slide_img_left_1.jpg',
    rightImage: '/infinite-slider/slide_img_right_1.jpg',
  },
  {
    title: 'Nightbloom',
    tags: ['Editorial & Portrait', 'Concept & Series', 'Art & Direction'],
    location: 'Paris, FR',
    accent: '#f5a97a',
    link: '/materials-and-forms',
    linkLabel: 'View Full Project',
    left: demoSide('Stillpose', 'New York, US', '/materials-and-forms'),
    right: demoSide('Matchawork', 'Tokyo, JP', '/about'),
    leftImage: '/infinite-slider/slide_img_left_2.jpg',
    rightImage: '/infinite-slider/slide_img_right_2.jpg',
  },
  {
    title: 'Stillpose',
    tags: ['Movement & Wellness', 'Body & Practice', 'Brand & Identity'],
    location: 'New York, US',
    accent: '#b7e0a0',
    link: '/materials-and-forms',
    linkLabel: 'View Full Project',
    left: demoSide('Blurface', 'Milan, IT', '/typology'),
    right: demoSide('Studioform', 'London, UK', '/materials-and-forms'),
    leftImage: '/infinite-slider/slide_img_left_3.jpg',
    rightImage: '/infinite-slider/slide_img_right_3.jpg',
  },
  {
    title: 'Matchawork',
    tags: ['Beverage & Craft', 'Content & Styling', 'Product & Story'],
    location: 'Tokyo, JP',
    accent: '#c9a97a',
    link: '/materials-and-forms',
    linkLabel: 'View Full Project',
    left: demoSide('Matchawork', 'Tokyo, JP', '/about'),
    right: demoSide('Stillpose', 'New York, US', '/typology'),
    leftImage: '/infinite-slider/slide_img_left_4.jpg',
    rightImage: '/infinite-slider/slide_img_right_4.jpg',
  },
  {
    title: 'Blurface',
    tags: ['Fashion & Portrait', 'Motion & Study', 'Brand & Identity'],
    location: 'Milan, IT',
    accent: '#e8e8e8',
    link: '/materials-and-forms',
    linkLabel: 'View Full Project',
    left: demoSide('Nightbloom', 'Paris, FR', '/materials-and-forms'),
    right: demoSide('Blurface', 'Milan, IT', '/about'),
    leftImage: '/infinite-slider/slide_img_left_5.jpg',
    rightImage: '/infinite-slider/slide_img_right_5.jpg',
  },
]

export const useInfiniteSlider = async () => {
  const { imageUrl } = useSanityImage()

  const { data, pending, error, refresh } = await useAsyncData(
    'infiniteSliderPage-v3',
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

        const title = String(slide.title || 'Untitled')
        const location = String(slide.location || '').trim()
        const linkLabel = String(slide.linkLabel || 'View Full Project').trim() || 'View Full Project'
        const sharedSubtitle = location || linkLabel

        const side = (prefix: 'left' | 'right'): SplitSliderSlide['left'] => {
          const sideProduct = String(slide[`${prefix}ProductSlug`] || '').trim()
          const sideLink = String(slide[`${prefix}Link`] || '').trim()
          return {
            title: String(slide[`${prefix}Title`] || title).trim() || title,
            subtitle: String(slide[`${prefix}Subtitle`] || sharedSubtitle).trim(),
            link: sideProduct
              ? `/materials-and-forms/${sideProduct}`
              : sideLink || link,
          }
        }

        return {
          title,
          tags,
          location: location || undefined,
          accent: String(slide.accent || '#e8e8e8').trim() || '#e8e8e8',
          link,
          linkLabel,
          left: side('left'),
          right: side('right'),
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
