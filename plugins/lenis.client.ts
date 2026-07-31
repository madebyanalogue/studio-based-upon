import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) return

  let lenisInstance: Lenis | null = null
  let lastSyncedScroll = -1

  const initLenis = () => {
    if (lenisInstance) return

    lenisInstance = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    gsap.registerPlugin(ScrollTrigger)

    ScrollTrigger.scrollerProxy(document.body, {
      scrollTop(value?: number) {
        if (arguments.length && lenisInstance && typeof value === 'number') {
          lenisInstance.scrollTo(value, { immediate: true })
        }
        return lenisInstance
          ? lenisInstance.scroll
          : (window.scrollY ?? document.documentElement.scrollTop)
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        }
      },
    })

    ScrollTrigger.defaults({ scroller: document.body })

    gsap.ticker.add((time) => {
      if (!lenisInstance) return
      lenisInstance.raf(time * 1000)
      const scroll = lenisInstance.scroll
      if (scroll !== lastSyncedScroll) {
        lastSyncedScroll = scroll
        ScrollTrigger.update()
      }
    })
    gsap.ticker.lagSmoothing(0)

    nuxtApp.provide('lenis', lenisInstance)

    document.dispatchEvent(new CustomEvent('basedupon:lenis-ready'))
    document.dispatchEvent(new CustomEvent('basedupon:scroll-system-ready'))

    requestAnimationFrame(() => {
      lenisInstance?.raf(performance.now())
      ScrollTrigger.update()
    })
  }

  if (document.body.classList.contains('preloader-complete')) {
    initLenis()
  } else {
    document.addEventListener('preloader-complete', initLenis, { once: true })
  }
})
