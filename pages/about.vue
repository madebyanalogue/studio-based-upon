<template>
  <article class="about">
    <svg class="about-plan__goo" viewBox="0 0 0 0" aria-hidden="true" focusable="false">
      <defs>
        <filter
          :id="titleFilterId"
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
          color-interpolation-filters="sRGB"
        >
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140"
          />
        </filter>
      </defs>
    </svg>
    <div
      ref="planEl"
      class="about-plan"
      :class="{
        'about-plan--guide': guideVisible,
        'about-plan--enter': planEntering,
        'about-plan--motion': planMotion,
      }"
    >
      <section
        v-for="section in 6"
        :key="section"
        class="about-plan__section"
        :class="{ 'about-plan__section--tall': section === 1 }"
        :aria-label="`Plan ${section}`"
      >
        <span class="about-plan__index interface">{{ String(section).padStart(2, '0') }}</span>
        <span
          v-for="area in section === 1 ? planAreasTall : planAreas"
          :key="area"
          class="about-plan__cell"
          :data-area="area"
          :style="{ gridArea: area }"
          aria-hidden="true"
        >{{ area }}</span>
        <h2
          v-if="section === 1"
          class="about-plan__title h3"
          :class="{ 'about-plan__title--pending': !titlesReady }"
          :style="titleFilterStyle"
        >
          Welcome to <br/><span>Studio Based Upon</span>
        </h2>
        <div v-if="section === 1" class="about-plan__copy flex flex-col gap-2">
          <div class="h6 muted">Who we are</div>
          <p class="mono-copy">
            We are a team of designers, surface specialists and master fabricators,
            bringing together more than two decades of knowledge gained through
            envisioning, designing, crafting and making within Based Upon’s pioneering
            workshop. We collaborate with visionary designers and architects to realise
            extraordinary bodies of work for the world’s largest yachts, finest private
            residences, prestigious hotels, restaurants and fashion houses.
          </p>
        </div>
        <h2
          v-if="section === 1"
          class="about-plan__title about-plan__title--next h3"
          :class="{ 'about-plan__title--pending': !titlesReady }"
          :style="titleFilterStyle"
        >
          Beautiful Contradictions
        </h2>
        <div v-if="section === 1" class="about-plan__lead">
          <p class="mono-copy">
            Our work moves freely between the intricate and the monumental. We create
            unfathomable surfaces and singular objects as well as large-scale integrated
            artworks, architectural interventions and monolithic forms, bringing the same
            intensity of attention to every scale.</p>
          <p class="mono-copy">Our practice is rooted in curiosity,
            experimentation and a deep knowledge of materials. Part atelier, part laboratory,
            the studio is a place where ideas are explored through making, where the hand
            meets the algorithm, and where traditional craft sits alongside advanced processes
            and emerging technologies.
          </p>
        </div>
        <div v-if="section === 1" class="about-plan__materials">
          <p class="mono-copy">
            We have developed proprietary material innovations such as Tramazite™, inspired
            by studying the ocean from the air, and have pioneered the artistic interpretation
            of liquid metals.
          </p>
        </div>
        <h2
          v-if="section === 1"
          class="about-plan__title about-plan__title--clients h3"
          :class="{ 'about-plan__title--pending': !titlesReady }"
          :style="titleFilterStyle"
        >
          Clients
        </h2>
        <div v-if="section === 1" class="about-plan__clients">
          <p class="mono-copy">
            The client is a critical element of our process. His or her involvement is vital
            to the pursuit of this beauty. The client’s absolute satisfaction and emotional
            fulfillment is the singular point of the pursuit.
          </p>
        </div>
        <div v-if="section === 1" class="about-plan__clients-names">
          <ul class="mono-copy">
            <li>Armani</li>
            <li>Dior</li>
            <li>Donna Karan</li>
            <li>Comme des Garçons</li>
            <li>Chanel</li>
            <li>Hermès</li>
            <li>Louis Vuitton</li>
            <li>Prada</li>
            <li>Saint Laurent</li>
            <li>Bottega Veneta</li>
          </ul>
        </div>
        <NuxtLink
          v-for="thumb in section === 1 ? planThumbs : []"
          :key="thumb.slug"
          class="about-plan__figure"
          :class="[thumb.place, { 'about-plan__figure--lit': litFigures[thumb.slug] }]"
          :style="thumb.column ? { gridColumn: thumb.column, gridRow: thumb.row } : undefined"
          :to="thumb.href"
          :data-slug="thumb.slug"
          @click.capture="onPlanThumbOpen($event, thumb)"
        >
          <span class="about-plan__figure-veil" aria-hidden="true" />
          <img
            :src="thumb.src"
            :alt="thumb.title"
            class="about-plan__figure-img"
            width="1600"
            height="1900"
          />
          <span class="about-plan__figure-meta">
            <span class="about-plan__figure-copy">
              <span class="h6">{{ thumb.title }}</span>
              <span v-if="thumb.detail" class="h6 muted">{{ thumb.detail }}</span>
            </span>
          </span>
        </NuxtLink>
      </section>
    </div>
  </article>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { productCoverFrame } from '~/composables/productImages'
import { productPath, productSlug } from '~/composables/useProductCatalog'
import { IMAGE_WIDTH } from '~/composables/useSanityImage'

definePageMeta({
  pageTransition: false,
})

let runPlanLeave = () => Promise.resolve()
const { open: openProduct } = useProductOverlay()
onBeforeRouteLeave((to, from) => {
  // Closing a product calls history.back() onto this same page. That popstate
  // must not play the about outro.
  if (isOverlayHistoryRestore() || to.path === from.path) return
  return runPlanLeave()
})

/** Guide names match each section's grid-template-areas. Columns a–f. */
const planColumns = ['a', 'b', 'c', 'd', 'e', 'f'] as const
const planAreasFor = (rows: number) =>
  Array.from({ length: rows }, (_, row) =>
    planColumns.map((column) => `${column}${row + 1}`),
  ).flat()

const planAreas = planAreasFor(3)
const planAreasTall = planAreasFor(17)

const query = `*[_type == "aboutPage"][0] {
  seoTitle,
  seoDescription,
  heroTitle,
  heroSubtitle,
  tagline,
  heroImage { asset->{ url, _id } }
}`

const { data: page } = await useAsyncData('aboutPage-v2', () =>
  $fetch('/api/sanity/query', { method: 'POST', body: { query } })
    .then((r: { result?: Record<string, unknown> | null }) => r?.result ?? null)
    .catch(() => null),
)

const { items: libraryItems } = await useLibraryCatalog()
const { imageUrl, prefetchImage } = useSanityImage()

const guideVisible = ref(true)
const planEl = ref<HTMLElement | null>(null)
const planEntering = ref(true)
const planMotion = ref(false)
const titlesReady = ref(false)
const titleFilterId = `about-title-goo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
const titleFilterStyle = { filter: `url(#${titleFilterId})`, WebkitFilter: `url(#${titleFilterId})` }

const TITLE_BLUR_MAX = 60
const TITLE_IN_S = 3
const TITLE_OUT_S = 0.65
const CLIP_IN_S = 1.15
const CLIP_OUT_S = 1.6
const COPY_LINE_S = 0.8
const COPY_STAGGER_S = 0.07
/** Start the copy once the heading is visible, not after the full melt. */
const COPY_AFTER_S = 1.4

type TitleBlock = { el: HTMLElement; words: HTMLElement[] }
type CopyBlock = {
  root: HTMLElement
  split: InstanceType<typeof SplitText>
  lines: HTMLElement[]
}

let titleSplits: InstanceType<typeof SplitText>[] = []
let copySplits: InstanceType<typeof SplitText>[] = []
let scrollTriggers: ScrollTrigger[] = []
let activeTweens: gsap.core.Tween[] = []
const titlePromises = new Map<HTMLElement, Promise<void>>()
let titleBurst = 0
let titleBurstAt = 0
let imageBurst = 0
let imageBurstAt = 0
let leavePromise: Promise<void> | null = null
let pluginsReady = false

const prefersReducedMotion = () =>
  import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const ensureMotionPlugins = () => {
  if (pluginsReady || !import.meta.client) return
  gsap.registerPlugin(SplitText, ScrollTrigger)
  pluginsReady = true
}

const killReveals = () => {
  scrollTriggers.forEach((trigger) => trigger.kill())
  scrollTriggers = []
  activeTweens.forEach((tween) => tween.kill())
  activeTweens = []
  titlePromises.clear()
}

const trackTween = (tween: gsap.core.Tween) => {
  activeTweens.push(tween)
  return tween
}

const revertSplits = (splits: InstanceType<typeof SplitText>[]) => {
  for (const split of splits) {
    try {
      split.revert()
    } catch {
      /* already reverted */
    }
  }
  splits.length = 0
}

const titleWords = () =>
  Array.from(planEl.value?.querySelectorAll<HTMLElement>('.about-plan__title-word') || [])

const planImages = () =>
  Array.from(planEl.value?.querySelectorAll<HTMLElement>('.about-plan__figure-img') || [])

const figureVeil = (img: HTMLElement) =>
  img.parentElement?.querySelector<HTMLElement>('.about-plan__figure-veil') ?? null

/** Bottom inset reveals downward from the top. Top inset hides downward off the bottom. */
const setImageClip = (el: HTMLElement, amount: number, edge: 'bottom' | 'top' = 'bottom') => {
  const clip =
    edge === 'top'
      ? `inset(${amount}% 0% 0% 0%)`
      : `inset(0% 0% ${amount}% 0%)`
  el.style.clipPath = clip
  const veil = figureVeil(el)
  if (veil) veil.style.clipPath = clip
}

const clearImageClip = (el: HTMLElement) => {
  el.style.removeProperty('clip-path')
  figureVeil(el)?.style.removeProperty('clip-path')
}

const clipTop = (el: HTMLElement) => {
  const match = (el.style.clipPath || '').match(
    /inset\(\s*[0-9.]+%\s+[0-9.]+%\s+([0-9.]+)%/,
  )
  return match ? Number(match[1]) : 0
}

const tweenImageClip = (
  els: HTMLElement[],
  to: number,
  duration: number,
  edge: 'bottom' | 'top' = 'bottom',
) =>
  new Promise<void>((resolve) => {
    if (!els.length) {
      resolve()
      return
    }
    const tl = gsap.timeline({ onComplete: resolve })
    els.forEach((el, index) => {
      const state = { amount: edge === 'top' ? 0 : clipTop(el) }
      setImageClip(el, state.amount, edge)
      tl.to(
        state,
        {
          amount: to,
          duration,
          ease: 'power3.inOut',
          onUpdate: () => setImageClip(el, state.amount, edge),
        },
        index * 0.08,
      )
    })
  })

const splitTitles = () => {
  revertSplits(titleSplits)
  const blocks: TitleBlock[] = []
  planEl.value?.querySelectorAll<HTMLElement>('.about-plan__title').forEach((el) => {
    const split = new SplitText(el, { type: 'words', wordsClass: 'about-plan__title-word' })
    titleSplits.push(split)
    blocks.push({ el, words: split.words as HTMLElement[] })
  })
  return blocks
}

const precedingTitle = (blocks: TitleBlock[], el: HTMLElement) => {
  let match: TitleBlock | null = null
  for (const block of blocks) {
    if (block.el.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) match = block
  }
  return match
}

const maskCopyLines = () => {
  revertSplits(copySplits)
  const blocks: CopyBlock[] = []
  planEl.value
    ?.querySelectorAll<HTMLElement>('.about-plan__copy .mono-copy, .about-plan__lead .mono-copy, .about-plan__materials .mono-copy, .about-plan__clients .mono-copy, .about-plan__clients-names .mono-copy')
    .forEach((el) => {
      if (!el.textContent?.trim()) return
      const split = new SplitText(el, {
        type: 'lines',
        linesClass: 'about-plan__clip-line',
      })
      copySplits.push(split)
      const lines: HTMLElement[] = []
      split.lines.forEach((line) => {
        const lineEl = line as HTMLElement
        const mask = document.createElement('div')
        mask.className = 'about-plan__line-mask'
        lineEl.parentNode?.insertBefore(mask, lineEl)
        mask.appendChild(lineEl)
        lines.push(lineEl)
      })
      const root = el.closest<HTMLElement>('.about-plan__copy, .about-plan__lead, .about-plan__materials, .about-plan__clients, .about-plan__clients-names') || el
      blocks.push({ root, split, lines })
    })
  return blocks
}

const playTitle = (block: TitleBlock) => {
  const existing = titlePromises.get(block.el)
  if (existing) return existing
  const now = performance.now()
  if (now - titleBurstAt > 80) titleBurst = 0
  titleBurstAt = now
  const delay = titleBurst * 0.12
  titleBurst += 1
  const promise = new Promise<void>((resolve) => {
    if (!block.words.length) {
      resolve()
      return
    }
    trackTween(
      gsap.to(block.words, {
        filter: 'blur(0px)',
        opacity: 1,
        duration: TITLE_IN_S,
        delay,
        ease: 'power3.out',
        onComplete: resolve,
        onInterrupt: resolve,
      }),
    )
  })
  titlePromises.set(block.el, promise)
  return promise
}

const playCopy = (titles: TitleBlock[], block: CopyBlock) => {
  const title = precedingTitle(titles, block.root)
  if (title && title.el.getBoundingClientRect().top < window.innerHeight * 0.92) {
    void playTitle(title)
  }
  const titleIn = title ? titlePromises.get(title.el) : null
  const gate = titleIn
    ? Promise.race([
        titleIn,
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, COPY_AFTER_S * 1000)
        }),
      ])
    : Promise.resolve()
  void gate.then(() => {
    if (leavePromise || !block.lines.length || block.root.dataset.copyPlayed === '1') return
    block.root.dataset.copyPlayed = '1'
    const label = block.root.querySelector<HTMLElement>('.h6')
    if (label) {
      trackTween(gsap.to(label, { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out' }))
    }
    trackTween(
      gsap.fromTo(
        block.lines,
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: COPY_LINE_S,
          ease: 'power3.out',
          stagger: COPY_STAGGER_S,
          onComplete: () => {
            try {
              block.split.revert()
            } catch {
              /* already reverted */
            }
            const index = copySplits.indexOf(block.split)
            if (index >= 0) copySplits.splice(index, 1)
          },
        },
      ),
    )
  })
}

const playImage = (img: HTMLElement) => {
  if (clipTop(img) < 99) return
  const now = performance.now()
  if (now - imageBurstAt > 80) imageBurst = 0
  imageBurstAt = now
  const delay = imageBurst * 0.08
  imageBurst += 1
  const state = { top: 100 }
  const meta = img.parentElement?.querySelector<HTMLElement>('.about-plan__figure-meta')
  trackTween(
    gsap.to(state, {
      top: 0,
      duration: CLIP_IN_S,
      delay,
      ease: 'power3.inOut',
      onUpdate: () => setImageClip(img, state.top),
      onComplete: () => {
        if (leavePromise || planEntering.value) return
        clearImageClip(img)
        if (meta) {
          trackTween(gsap.to(meta, { opacity: 1, duration: 0.45, ease: 'power2.out' }))
        }
        const slug = img.parentElement?.getAttribute('data-slug')
        if (!slug || litFigures.value[slug]) return
        litFigures.value = { ...litFigures.value, [slug]: true }
      },
    }),
  )
}

const bindReveal = (
  trigger: HTMLElement,
  onEnter: () => void,
  start = 'top 90%',
) => {
  scrollTriggers.push(
    ScrollTrigger.create({
      trigger,
      start,
      once: true,
      onEnter,
    }),
  )
}

/** Melt a title out in the band below the viewport top, and back in on the way down. */
const bindTitleExit = (block: TitleBlock) => {
  const paint = (melted: number) => {
    gsap.killTweensOf(block.words)
    gsap.set(block.words, {
      opacity: 1 - melted,
      filter: `blur(${TITLE_BLUR_MAX * melted}px)`,
    })
  }
  scrollTriggers.push(
    ScrollTrigger.create({
      trigger: block.el,
      start: 'top top+=240',
      end: 'top top+=72',
      scrub: true,
      onUpdate: (self) => {
        if (self.progress <= 0 || !block.words.length) return
        paint(self.progress)
      },
      onLeaveBack: () => {
        if (!block.words.length) return
        paint(0)
      },
    }),
  )
}

const playPlanEnter = async () => {
  if (!import.meta.client || !planEl.value) return
  if (prefersReducedMotion()) {
    planEntering.value = false
    titlesReady.value = true
    const ready: Record<string, true> = {}
    planEl.value.querySelectorAll<HTMLElement>('.about-plan__figure[data-slug]').forEach((el) => {
      const slug = el.dataset.slug
      if (slug) ready[slug] = true
    })
    litFigures.value = ready
    return
  }

  ensureMotionPlugins()
  if (document.fonts?.ready) await document.fonts.ready
  await nextTick()
  if (!planEl.value || leavePromise) return

  const titles = splitTitles()
  const copies = maskCopyLines()
  const images = planImages()

  gsap.set(titleWords(), { filter: `blur(${TITLE_BLUR_MAX}px)`, opacity: 0 })
  copies.forEach((block) => {
    gsap.set(block.lines, { yPercent: 110 })
    const label = block.root.querySelector<HTMLElement>('.h6')
    if (label) gsap.set(label, { opacity: 0, y: 12 })
  })
  images.forEach((el) => {
    setImageClip(el, 100)
    const meta = el.parentElement?.querySelector<HTMLElement>('.about-plan__figure-meta')
    if (meta) gsap.set(meta, { opacity: 0 })
  })
  titlesReady.value = true
  planMotion.value = true
  await nextTick()
  if (!planEl.value || leavePromise) return

  titles.forEach((block) => {
    bindReveal(block.el, () => playTitle(block))
    bindTitleExit(block)
  })
  copies.forEach((block) => bindReveal(block.root, () => playCopy(titles, block)))
  images.forEach((el) => {
    bindReveal(el, () => playImage(el), 'top bottom')
  })
  ScrollTrigger.refresh()
  planEntering.value = false
}

const visibleCopyOut = () => {
  const lines: HTMLElement[] = []
  const labels: HTMLElement[] = []
  if (!planEl.value) return { lines, labels }

  planEl.value
    .querySelectorAll<HTMLElement>('.about-plan__copy .mono-copy, .about-plan__lead .mono-copy, .about-plan__materials .mono-copy, .about-plan__clients .mono-copy, .about-plan__clients-names .mono-copy')
    .forEach((el) => {
      if (!el.textContent?.trim()) return
      let lineEls = [...el.querySelectorAll<HTMLElement>('.about-plan__clip-line')]
      if (!lineEls.length) {
        const split = new SplitText(el, {
          type: 'lines',
          linesClass: 'about-plan__clip-line',
        })
        copySplits.push(split)
        lineEls = split.lines.map((line) => {
          const lineEl = line as HTMLElement
          const mask = document.createElement('div')
          mask.className = 'about-plan__line-mask'
          lineEl.parentNode?.insertBefore(mask, lineEl)
          mask.appendChild(lineEl)
          gsap.set(lineEl, { yPercent: 0 })
          return lineEl
        })
      }
      const shown = lineEls.filter((line) => Number(gsap.getProperty(line, 'yPercent')) < 80)
      if (!shown.length) return
      lines.push(...shown)
      const label = el
        .closest('.about-plan__copy, .about-plan__lead, .about-plan__materials, .about-plan__clients, .about-plan__clients-names')
        ?.querySelector<HTMLElement>('.h6')
      if (label && Number(gsap.getProperty(label, 'opacity')) > 0.05) labels.push(label)
    })

  return { lines, labels }
}

const playCopyOut = () =>
  new Promise<void>((resolve) => {
    const { lines, labels } = visibleCopyOut()
    if (!lines.length && !labels.length) {
      resolve()
      return
    }
    const tl = gsap.timeline({ onComplete: resolve })
    if (labels.length) {
      tl.to(labels, { opacity: 0, y: 12, duration: 0.4, ease: 'power2.in' }, 0)
    }
    if (lines.length) {
      tl.to(
        lines,
        {
          yPercent: 110,
          duration: 0.55,
          ease: 'power2.in',
          stagger: 0.04,
        },
        0,
      )
    }
  })

const playPlanLeave = () => {
  if (leavePromise) return leavePromise
  leavePromise = (async () => {
    killReveals()
    if (!import.meta.client || prefersReducedMotion() || !planEl.value) return

    ensureMotionPlugins()
    if (!planEl.value) return

    if (!titleWords().length) splitTitles()
    const words = titleWords().filter((word) => Number(gsap.getProperty(word, 'opacity')) > 0.04)
    titlesReady.value = true

    const images = planImages().filter((el) => clipTop(el) < 99)
    images.forEach((el) => {
      const meta = el.parentElement?.querySelector<HTMLElement>('.about-plan__figure-meta')
      if (meta && Number(gsap.getProperty(meta, 'opacity')) > 0.04) {
        trackTween(gsap.to(meta, { opacity: 0, duration: 0.3, ease: 'power2.in' }))
      }
    })

    await Promise.all([
      playCopyOut(),
      words.length
        ? new Promise<void>((resolve) => {
            gsap.to(words, {
              filter: `blur(${TITLE_BLUR_MAX}px)`,
              opacity: 0,
              duration: TITLE_OUT_S,
              ease: 'power2.in',
              onComplete: resolve,
            })
          })
        : Promise.resolve(),
      tweenImageClip(images, 100, CLIP_OUT_S, 'top'),
    ])
  })()
  return leavePromise
}

runPlanLeave = playPlanLeave

const onGuideKey = (event: KeyboardEvent) => {
  if (event.key !== 'g' && event.key !== 'G') return
  if (event.metaKey || event.ctrlKey || event.altKey) return
  const target = event.target
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.closest('input, textarea, select'))
  ) {
    return
  }
  guideVisible.value = !guideVisible.value
}

onMounted(() => {
  window.addEventListener('keydown', onGuideKey)
  void playPlanEnter()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGuideKey)
  killReveals()
  revertSplits(titleSplits)
  revertSplits(copySplits)
})

const planThumbSlots: {
  slug: string
  column?: string
  row?: string
  place?: string
}[] = [
  { slug: 'nilou-pearl', column: '1 / 3', row: '3 / 6' },
  { slug: 'crack-dark-dark', place: 'about-plan__figure--second' },
  { slug: 'double-twist-table', place: 'about-plan__figure--after' },
  { slug: 'birth-of-tramazite-mother-rain', place: 'about-plan__figure--third about-plan__figure--front' },
  { slug: 'diamond-coffee-table-blush', place: 'about-plan__figure--fourth' },
  { slug: 'deco-pit', place: 'about-plan__figure--fifth' },
]

const planThumbs = computed(() =>
  planThumbSlots.flatMap((slot) => {
    const item = libraryItems.value.find((entry) => productSlug(entry) === slot.slug)
    if (!item) return []
    const cover = productCoverFrame(item)
    const src = cover ? imageUrl(cover, IMAGE_WIDTH.thumb) : ''
    if (!src) return []
    return [{
      slug: slot.slug,
      id: item._id,
      column: slot.column,
      row: slot.row,
      place: slot.place,
      href: productPath(item) || `/materials-and-forms/${slot.slug}`,
      title: item.title,
      detail: item.feature || '',
      src,
      flipSrc: imageUrl(cover, IMAGE_WIDTH.hero) || src,
    }]
  }),
)

const litFigures = ref<Record<string, true>>({})

const onPlanThumbOpen = (
  event: MouseEvent,
  thumb: { slug: string; id: string; flipSrc: string },
) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
  event.preventDefault()
  const link = event.currentTarget
  if (!(link instanceof HTMLElement)) return
  const source = link.querySelector('.about-plan__figure-img')
  if (thumb.flipSrc) void prefetchImage(thumb.flipSrc)
  openProduct(thumb.slug, {
    source: source instanceof HTMLElement ? source : null,
    flipSrc: thumb.flipSrc || null,
    productId: thumb.id,
  })
}

useHead(() => ({
  title: (page.value?.seoTitle as string) || 'About — Studio Based Upon',
  meta: page.value?.seoDescription
    ? [{ name: 'description', content: page.value.seoDescription as string }]
    : [
        {
          name: 'description',
          content:
            'Studio Based Upon — designers, surface specialists and master fabricators in London since 2004.',
        },
      ],
}))
</script>

<style scoped>
.about {
  --about-gutter: var(--gutter);
  --about-measure: min(38rem, 100%);
  padding-bottom: clamp(4rem, 12vw, 9rem);
  overflow-x: clip;
}

/* Each section is one grid. Place live items with grid-area: a1 … f3.
   The first section is seventeen rows: a1 … f17. */
.about-plan {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: var(--products-grid-gap);
    padding-top: calc(var(--header-height) + clamp(2rem, 8vw, 420px));
  padding-inline: var(--gutter);
}

.about-plan__section {
  position: relative;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  grid-template-rows: repeat(3, calc((100cqi - 5 * var(--products-grid-gap)) / 6));
  grid-template-areas:
    "a1 b1 c1 d1 e1 f1"
    "a2 b2 c2 d2 e2 f2"
    "a3 b3 c3 d3 e3 f3";
  gap: var(--products-grid-gap);
}

.about-plan__section--tall {
  grid-template-rows: repeat(17, calc((100cqi - 5 * var(--products-grid-gap)) / 6));
  grid-template-areas:
    "a1 b1 c1 d1 e1 f1"
    "a2 b2 c2 d2 e2 f2"
    "a3 b3 c3 d3 e3 f3"
    "a4 b4 c4 d4 e4 f4"
    "a5 b5 c5 d5 e5 f5"
    "a6 b6 c6 d6 e6 f6"
    "a7 b7 c7 d7 e7 f7"
    "a8 b8 c8 d8 e8 f8"
    "a9 b9 c9 d9 e9 f9"
    "a10 b10 c10 d10 e10 f10"
    "a11 b11 c11 d11 e11 f11"
    "a12 b12 c12 d12 e12 f12"
    "a13 b13 c13 d13 e13 f13"
    "a14 b14 c14 d14 e14 f14"
    "a15 b15 c15 d15 e15 f15"
    "a16 b16 c16 d16 e16 f16"
    "a17 b17 c17 d17 e17 f17";
}

@media (max-width: 1599px) {
  .about-plan__section {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-template-rows: repeat(3, calc((100cqi - 3 * var(--products-grid-gap)) / 4));
    grid-template-areas:
      "a1 b1 c1 d1"
      "a2 b2 c2 d2"
      "a3 b3 c3 d3";
  }

  .about-plan__section--tall {
    grid-template-rows: repeat(17, calc((100cqi - 3 * var(--products-grid-gap)) / 4));
    grid-template-areas:
      "a1 b1 c1 d1"
      "a2 b2 c2 d2"
      "a3 b3 c3 d3"
      "a4 b4 c4 d4"
      "a5 b5 c5 d5"
      "a6 b6 c6 d6"
      "a7 b7 c7 d7"
      "a8 b8 c8 d8"
      "a9 b9 c9 d9"
      "a10 b10 c10 d10"
      "a11 b11 c11 d11"
      "a12 b12 c12 d12"
      "a13 b13 c13 d13"
      "a14 b14 c14 d14"
      "a15 b15 c15 d15"
      "a16 b16 c16 d16"
      "a17 b17 c17 d17";
  }

  .about-plan__cell[data-area^="e"],
  .about-plan__cell[data-area^="f"] {
    display: none;
  }
}

.about-plan:not(.about-plan--guide) .about-plan__cell,
.about-plan:not(.about-plan--guide) .about-plan__index {
  visibility: hidden;
}

.about-plan__cell {
  display: flex;
  align-items: flex-end;
  min-height: 0;
  padding: 3px 3px;
  border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
  font-family: var(--mono);
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0.04em;
  text-transform: none;
  color: color-mix(in srgb, currentColor 45%, transparent);
  pointer-events: none;
}

.about-plan__index {
  position: absolute;
  top: 12px;
  left: 0;
  z-index: 2;
  margin: 0;
  font-size: 11px;
  line-height: 1;
  pointer-events: none;
}

.about-plan__title {
  grid-column: 1 / 5;
  grid-row: 1;
  z-index: 2;
  align-self: center;
  min-height: 0;
  margin: 0;
  transform: none;
}

.about-plan__title--next {
  grid-row: 7;
}

.about-plan__title--clients {
  grid-row: 11;
}

.about-plan__goo {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}

.about-plan__title--pending {
  visibility: hidden;
}

.about-plan__title :deep(.about-plan__title-word) {
  display: inline-block;
  will-change: filter, opacity;
}

.about-plan--enter .about-plan__figure-img,
.about-plan--enter .about-plan__figure-veil {
  clip-path: inset(0% 0% 100% 0%);
}

.about-plan--enter .about-plan__figure-meta,
.about-plan--enter .about-plan__copy .h6 {
  opacity: 0;
}

.about-plan--enter:not(.about-plan--motion) .about-plan__copy .mono-copy,
.about-plan--enter:not(.about-plan--motion) .about-plan__lead .mono-copy,
.about-plan--enter:not(.about-plan--motion) .about-plan__materials .mono-copy,
.about-plan--enter:not(.about-plan--motion) .about-plan__clients .mono-copy,
.about-plan--enter:not(.about-plan--motion) .about-plan__clients-names .mono-copy {
  visibility: hidden;
}

.about-plan :deep(.about-plan__line-mask) {
  display: block;
  overflow: hidden;
}

.about-plan :deep(.about-plan__clip-line) {
  display: block;
}

@media (prefers-reduced-motion: reduce) {
  .about-plan--enter .about-plan__figure-img,
  .about-plan--enter .about-plan__figure-veil {
    clip-path: none;
  }

  .about-plan--enter .about-plan__copy .mono-copy,
  .about-plan--enter .about-plan__lead .mono-copy,
  .about-plan--enter .about-plan__materials .mono-copy,
  .about-plan--enter .about-plan__clients .mono-copy,
  .about-plan--enter .about-plan__clients-names .mono-copy,
  .about-plan__title--pending {
    visibility: visible;
  }

  .about-plan--enter .about-plan__figure-meta,
  .about-plan--enter .about-plan__copy .h6 {
    opacity: 1;
  }
}

.about-plan__lead {
  grid-column: 2;
  grid-row: 8 / 10;
  z-index: 1;
  min-height: 0;
  margin: 0;
  padding: 0;
}

.about-plan__materials {
  grid-column: 1;
  grid-row: 7;
  z-index: 1;
  min-height: 0;
  margin: 0;
  padding: 0;
}

.about-plan__clients {
  grid-column: 2;
  grid-row: 14 / 15;
  z-index: 1;
  min-height: 0;
  margin: 0;
  padding: 0;
}

.about-plan__clients-names {
  grid-column: 4 / -1;
  grid-row: 12 / 15;
  z-index: 1;
  min-height: 0;
  margin: 0;
  padding: 0;
}

.about-plan__clients-names ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.about-plan__clients-names .mono-copy {
  min-width: 0;
}

.about-plan__copy {
  grid-area: c2;
  position: relative;
  z-index: 1;
  min-height: 0;
  padding: 0;
}

.about-plan__copy .mono-copy {
  /* height: 100%;
  min-height: 0;
  overflow: auto; */
}

.about-plan__mark {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 2px;
  height: 2px;
  background: var(--muted);
  pointer-events: none;
}

.about-plan__figure {
  position: relative;
  z-index: 1;
  min-height: 0;
  margin: 0;
  color: inherit;
  text-decoration: none;
}

.about-plan__figure-veil {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--background-color);
  pointer-events: none;
}

.about-plan__figure--front {
  z-index: 2;
}

/* Landscape tile (4/3), same as the product grid, sitting on the bottom of its cell. */
.about-plan__figure--landscape {
  align-self: end;
  width: 100%;
}

.about-plan__figure--landscape .about-plan__figure-img {
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 3;
}

/* Four columns below 1600, so each span stops at the last column line. */
.about-plan__figure--second {
  grid-column: 3 / -1;
  grid-row: 3 / 6;
}

.about-plan__figure--after {
  grid-column: 3 / -1;
  grid-row: 6 / 8;
}

.about-plan__figure--third {
  grid-column: 4 / -1;
  grid-row: 8 / 10;
}

.about-plan__figure--fourth {
  grid-column: 4 / -1;
  grid-row: 10 / 12;
}

.about-plan__figure--fifth {
  grid-area: 10 / 1 / 13 / 4;
}

@media (min-width: 1600px) {
  .about-plan__figure--second {
    grid-column: 3 / 6;
    grid-row: 4 / 6;
  }

  .about-plan__figure--after {
    grid-column: 6 / 7;
    grid-row: 5 / 6;
  }

  .about-plan__figure--third {
    grid-area: 8 / 4 / 10 / 6;
  }

  .about-plan__figure--fourth {
    grid-area: 14 / 4 / 16 / 7;
  }

  .about-plan__figure--fifth {
    grid-area: 10 / 1 / 13 / 4;
  }

  .about-plan__clients-names {
    grid-column: 5;
    grid-row: 12 / 15;
  }
}

.about-plan__figure-img {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.about-plan__figure-meta {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0;
  padding: 16px 0;
}

.about-plan__figure-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

</style>
