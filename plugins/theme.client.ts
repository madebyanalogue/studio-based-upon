export default defineNuxtPlugin((nuxtApp) => {
  const { isDark, initTheme } = useTheme()

  // Own the dark class here. Home and Curate used to set html class="dark"
  // themselves, and leaving those pages stripped it — About flipped to light.
  useHead(() => ({
    htmlAttrs: {
      class: {
        dark: isDark.value,
      },
    },
    meta: [{ name: 'color-scheme', content: isDark.value ? 'dark' : 'light' }],
  }))

  // After hydration — reading localStorage in setup caused icon/tooltip mismatches.
  nuxtApp.hook('app:mounted', () => {
    initTheme()
  })
})
