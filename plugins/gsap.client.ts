import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default defineNuxtPlugin(() => {
  gsap.registerPlugin(Flip, ScrollTrigger)
})
