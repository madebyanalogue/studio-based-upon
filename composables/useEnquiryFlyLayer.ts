import gsap from 'gsap'
import type { EnquiryFlyRect } from './useEnquiryForm'

export type EnquiryFlyBox = {
  left: number
  top: number
  width: number
  height: number
}

const FLY_BEHIND = '450'
const FLY_FRONT = '470'

let layer: HTMLDivElement | null = null

export const enquiryFlyLayer = () => layer

export const mountEnquiryFlyers = (
  boxes: Array<EnquiryFlyRect & { src: string }>,
) => {
  clearEnquiryFlyers()
  if (!import.meta.client || !boxes.length) return
  const root = document.createElement('div')
  root.setAttribute('aria-hidden', 'true')
  root.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:${FLY_BEHIND};`
  for (const box of boxes) {
    const img = document.createElement('img')
    img.src = box.src
    img.alt = ''
    img.draggable = false
    img.dataset.flyId = box.id
    img.style.cssText = [
      'position:fixed',
      `left:${box.left}px`,
      `top:${box.top}px`,
      `width:${box.width}px`,
      `height:${box.height}px`,
      'object-fit:contain',
      'pointer-events:none',
    ].join(';')
    root.appendChild(img)
  }
  document.body.appendChild(root)
  layer = root
}

export const enquiryFlyImages = () =>
  layer ? [...layer.querySelectorAll<HTMLImageElement>('img')] : []

export const setEnquiryFlyFront = (front: boolean) => {
  if (!layer) return
  layer.style.zIndex = front ? FLY_FRONT : FLY_BEHIND
}

export const clearEnquiryFlyers = () => {
  if (!layer) return
  gsap.killTweensOf(layer.querySelectorAll('img'))
  layer.remove()
  layer = null
}

export const tweenEnquiryFlyers = (
  boxes: Array<EnquiryFlyBox | undefined>,
  duration: number,
) =>
  new Promise<void>((resolve) => {
    const pairs = enquiryFlyImages()
      .map((el, index) => ({ el, box: boxes[index] }))
      .filter((pair): pair is { el: HTMLImageElement; box: EnquiryFlyBox } =>
        Boolean(pair.box && pair.box.width > 1 && pair.box.height > 1),
      )
    if (!pairs.length) {
      resolve()
      return
    }
    let pending = pairs.length
    pairs.forEach(({ el, box }, index) => {
      gsap.to(el, {
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        duration,
        delay: Math.min(index * 0.03, 0.24),
        ease: 'power3.inOut',
        overwrite: 'auto',
        onComplete: () => {
          pending -= 1
          if (pending <= 0) resolve()
        },
      })
    })
  })

/** Center pile. Longest side is `maxSize`; each box keeps its source ratio. */
export const pileBoxes = (
  sources: Array<{ width: number; height: number }>,
  maxSize: number,
): EnquiryFlyBox[] => {
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  return sources.map((source, index) => {
    const w = Math.max(source.width, 1)
    const h = Math.max(source.height, 1)
    const scale = maxSize / Math.max(w, h)
    const width = w * scale
    const height = h * scale
    const shift = Math.min(index, 12) * 1.25
    return {
      left: cx - width / 2 + shift,
      top: cy - height / 2 + shift,
      width,
      height,
    }
  })
}
