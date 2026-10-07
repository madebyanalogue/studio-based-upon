<template>
  <section ref="rootRef" class="d2" data-lenis-prevent>
    <div ref="containerRef" class="d2__container">
      <div ref="sphereRef" class="d2__sphere">
        <button
          v-for="(tile, index) in tiles"
          :key="tile.key"
          type="button"
          class="d2__media"
          :aria-label="tile.title"
          :data-cursor-label="tile.title"
          :data-index="index"
        >
          <img :src="tile.src" alt="" draggable="false" />
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import { Observer } from 'gsap/Observer'
import { DEMO_PRODUCTS } from '~/composables/demoData'
import type { PdpNextItem } from '~/composables/useProductOverlay'

type Tile = {
  key: string
  title: string
  slug: string
  id: string
  src: string
}

const SPHERE_COUNT = 69

const rootRef = ref<HTMLElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const sphereRef = ref<HTMLElement | null>(null)
const phase = useD2Cursor()
const { open } = useProductOverlay()

const catalog = DEMO_PRODUCTS.filter(
  (item) => item.itemType === 'product' && item.slug?.current && item.gallery[0]?.asset?.url,
)

const tiles = computed<Tile[]>(() => {
  if (!catalog.length) return []
  return Array.from({ length: SPHERE_COUNT }, (_, index) => {
    const item = catalog[index % catalog.length]!
    return {
      key: `${item._id}-${index}`,
      title: item.title,
      slug: item.slug!.current!,
      id: item._id,
      src: item.gallery[0]!.asset.url,
    }
  })
})

const sequence = computed<PdpNextItem[]>(() =>
  catalog.map((item) => ({
    slug: item.slug!.current!,
    title: item.title,
    imageUrl: item.gallery[0]!.asset.url,
  })),
)

let teardown: (() => void) | null = null

onMounted(() => {
  const root = rootRef.value
  const sphere = sphereRef.value
  const sphereContainer = containerRef.value
  if (!root || !sphere || !sphereContainer) return

  gsap.registerPlugin(Observer)

  const medias = [...sphere.querySelectorAll<HTMLElement>('.d2__media')]
  const totalMedias = medias.length
  if (!totalMedias) return

  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  let radius = 0

  const positions = medias.map((_, index) => {
    const y = 1 - (2 * index) / (totalMedias - 1 || 1)
    const phi = Math.acos(y) - Math.PI / 2
    const theta = (index * goldenAngle) % (2 * Math.PI)
    return {
      x: Math.cos(phi) * Math.cos(theta),
      y: Math.sin(phi),
      z: Math.cos(phi) * Math.sin(theta),
    }
  })

  const m = [1, 0, 0, 0, 1, 0, 0, 0, 1]
  const mTmp = [0, 0, 0, 0, 0, 0, 0, 0, 0]
  const R = [0, 0, 0, 0, 0, 0, 0, 0, 0]

  const premultiply3x3 = (left: number[]) => {
    for (let i = 0; i < 3; i++) {
      const a = left[i * 3]!
      const b = left[i * 3 + 1]!
      const c = left[i * 3 + 2]!
      for (let j = 0; j < 3; j++) {
        mTmp[i * 3 + j] = a * m[j]! + b * m[3 + j]! + c * m[6 + j]!
      }
    }
    for (let k = 0; k < 9; k++) m[k] = mTmp[k]!
  }

  const axisAngleMatrix = (ax: number, ay: number, az: number, angle: number) => {
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    const t = 1 - c
    return [
      t * ax * ax + c, t * ax * ay - s * az, t * ax * az + s * ay,
      t * ax * ay + s * az, t * ay * ay + c, t * ay * az - s * ax,
      t * ax * az - s * ay, t * ay * az + s * ax, t * az * az + c,
    ]
  }

  const orientationMatrix = (fx: number, fy: number, fz: number) => {
    let ux = 0
    let uy = -1
    let uz = 0

    let rx = uy * fz - uz * fy
    let ry = uz * fx - ux * fz
    let rz = ux * fy - uy * fx

    let len = Math.hypot(rx, ry, rz)
    if (len < 1e-6) {
      ux = 0
      uy = 0
      uz = 1
      rx = uy * fz - uz * fy
      ry = uz * fx - ux * fz
      rz = ux * fy - uy * fx
      len = Math.hypot(rx, ry, rz)
    }
    const il = 1 / len
    rx *= il
    ry *= il
    rz *= il

    const ux2 = fy * rz - fz * ry
    const uy2 = fz * rx - fx * rz
    const uz2 = fx * ry - fy * rx

    return [rx, -ux2, fx, ry, -uy2, fy, rz, -uz2, fz]
  }

  const transformedPosition = (i: number) => {
    const p = positions[i]!
    return [
      m[0]! * p.x + m[1]! * p.y + m[2]! * p.z,
      m[3]! * p.x + m[4]! * p.y + m[5]! * p.z,
      m[6]! * p.x + m[7]! * p.y + m[8]! * p.z,
    ]
  }

  const findClosestIndex = () => {
    let closestIndex = 0
    let closestDist = Infinity
    for (let i = 0; i < totalMedias; i++) {
      const [x, y, z] = transformedPosition(i)
      if (z! <= 0) continue
      const dist = x! * x! + y! * y!
      if (dist < closestDist) {
        closestDist = dist
        closestIndex = i
      }
    }
    return closestIndex
  }

  const renderMedias = () => {
    medias.forEach((media, i) => {
      const [x, y, z] = transformedPosition(i)
      const len = Math.hypot(x!, y!, z!) || 1
      const rot = orientationMatrix(x! / len, -y! / len, z! / len)
      media.style.transform = `translate3d(${x! * radius}px, ${-y! * radius}px, ${z! * radius}px) matrix3d(${rot[0]},${rot[3]},${rot[6]},0,${rot[1]},${rot[4]},${rot[7]},0,${rot[2]},${rot[5]},${rot[8]},0,0,0,0,1) scaleX(-1)`
    })
  }

  const smooth = { x: 0, y: 0 }
  const target = { x: 0, y: 0 }
  let prevX = 0
  let prevY = 0
  let snapTween: gsap.core.Tween | null = null
  let moving = false

  const updateMedias = () => {
    const dY = ((smooth.y - prevY) * Math.PI) / 180
    const dX = ((smooth.x - prevX) * Math.PI) / 180
    prevY = smooth.y
    prevX = smooth.x

    if (dX !== 0 || dY !== 0) {
      const cy = Math.cos(dY)
      const sy = Math.sin(dY)
      const cx = Math.cos(dX)
      const sx = Math.sin(dX)
      R[0] = cy
      R[1] = 0
      R[2] = sy
      R[3] = sx * sy
      R[4] = cx
      R[5] = -sx * cy
      R[6] = -cx * sy
      R[7] = sx
      R[8] = cx * cy
      premultiply3x3(R)
    }
    renderMedias()
  }

  const settle = () => {
    if (moving || snapTween) return
    if (Math.abs(target.x - smooth.x) > 0.5 || Math.abs(target.y - smooth.y) > 0.5) return
    snapToClosest()
  }

  const quickY = gsap.quickTo(smooth, 'y', {
    duration: 1,
    ease: 'power2',
    onUpdate: updateMedias,
    onComplete: settle,
  })
  const quickX = gsap.quickTo(smooth, 'x', {
    duration: 1,
    ease: 'power2',
  })

  const rebase = () => {
    snapTween?.kill()
    snapTween = null
    target.x = target.y = 0
    prevX = prevY = 0
    quickX(0, 0)
    quickY(0, 0)
    smooth.x = smooth.y = 0
  }

  const snapToIndex = (index: number, instant?: boolean) => {
    const [vx, vy, vz] = transformedPosition(index)
    const sin = Math.hypot(vx!, vy!)
    if (sin < 0.02) return

    const ax = vy! / sin
    const ay = -vx! / sin
    const angle = Math.acos(Math.max(-1, Math.min(1, vz!)))

    rebase()

    if (instant) {
      premultiply3x3(axisAngleMatrix(ax, ay, 0, angle))
      renderMedias()
      return
    }

    const mStart = m.slice()
    const snap = { t: 0 }

    snapTween = gsap.to(snap, {
      t: 1,
      duration: 1,
      ease: 'expo.inOut',
      onUpdate() {
        for (let k = 0; k < 9; k++) m[k] = mStart[k]!
        premultiply3x3(axisAngleMatrix(ax, ay, 0, angle * snap.t))
        renderMedias()
      },
      onComplete() {
        snapTween = null
      },
    })
  }

  const snapToClosest = (instant?: boolean) => {
    snapToIndex(findClosestIndex(), instant)
  }

  gsap.set(sphere, { transformStyle: 'preserve-3d' })

  let isTouch = false
  const mm = gsap.matchMedia()
  mm.add('(hover: none)', () => {
    isTouch = true
  })
  mm.add(
    {
      isMobile: '(max-width: 500px)',
      isFixed: '(min-width: 501px) and (max-width: 1400px)',
      isDesktop: '(min-width: 1401px)',
    },
    (context) => {
      const { isMobile, isFixed } = context.conditions as {
        isMobile: boolean
        isFixed: boolean
      }
      if (isMobile) {
        radius = 310
        gsap.set(sphere, { translateZ: '250px' })
        gsap.set(sphereContainer, { perspective: '1000px' })
      } else if (isFixed) {
        radius = 980
        gsap.set(sphere, { translateZ: '-310px' })
        gsap.set(sphereContainer, { perspective: '3920px' })
      } else {
        radius = 0.7 * window.innerWidth
        gsap.set(sphere, { translateZ: '-22vw' })
        gsap.set(sphereContainer, { perspective: '280vw' })
      }
      renderMedias()
    },
  )

  snapToClosest(true)

  let dragDist = 0
  const onInput = () => {
    if (phase.value === 'scroll') phase.value = 'delve'
    if (!moving) {
      moving = true
      rebase()
    }
  }

  const endGesture = () => {
    moving = false
    settle()
  }

  const gsapObs = Observer.create({
    target: root,
    type: 'wheel,touch,pointer',
    onPress: () => {
      dragDist = 0
    },
    onWheel: (event) => {
      onInput()
      target.y -= event.deltaX / 10
      target.x -= event.deltaY / 10
      quickY(target.y)
      quickX(target.x)
    },
    onDrag: (event) => {
      dragDist += Math.abs(event.deltaX) + Math.abs(event.deltaY)
      onInput()
      const factor = isTouch ? 1 : 0.25
      target.y += event.deltaX * factor
      target.x += event.deltaY * factor
      quickY(target.y)
      quickX(target.x)
    },
    onDragEnd: endGesture,
    onStop: endGesture,
  })

  const onMediaClick = (event: MouseEvent) => {
    if (dragDist > 3) return
    const media = (event.target as Element | null)?.closest('.d2__media')
    if (!(media instanceof HTMLElement) || !root.contains(media)) return
    const index = Number(media.dataset.index)
    const tile = tiles.value[index]
    if (!tile) return
    phase.value = 'ready'
    const image = media.querySelector('img')
    open(tile.slug, {
      source: image instanceof HTMLElement ? image : media,
      flipSrc: tile.src,
      productId: tile.id,
      imageIndex: 0,
      sequence: sequence.value,
    })
  }

  root.addEventListener('click', onMediaClick)

  teardown = () => {
    snapTween?.kill()
    gsap.killTweensOf(smooth)
    root.removeEventListener('click', onMediaClick)
    mm.revert()
    gsapObs.kill()
  }
})

onBeforeUnmount(() => {
  teardown?.()
  teardown = null
})
</script>

<style scoped>
.d2 {
  width: 100%;
  height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background: var(--cream);
  touch-action: none;
}

.d2__container {
  perspective-origin: center center;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.d2__sphere {
  position: relative;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
}

.d2__media {
  position: absolute;
  width: 14vw;
  height: 14vw;
  left: 50%;
  top: 50%;
  margin-left: -7vw;
  margin-top: -7vw;
  padding: 0;
  border: 0;
  border-radius: 0.5vw;
  overflow: hidden;
  background: var(--sand);
  color: var(--charcoal);
  transform-style: preserve-3d;
  backface-visibility: hidden;
  user-select: none;
  -webkit-user-drag: none;
  -webkit-tap-highlight-color: transparent;
}

.d2__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

@media (min-width: 501px) and (max-width: 1400px) {
  .d2__media {
    width: 200px;
    height: 200px;
    margin-left: -100px;
    margin-top: -100px;
    border-radius: 6px;
  }
}

@media (max-width: 500px) {
  .d2__media {
    width: 60px;
    height: 60px;
    margin-left: -30px;
    margin-top: -30px;
    border-radius: 4px;
  }
}
</style>
