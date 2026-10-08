export default defineNuxtPlugin((nuxtApp) => {
  const { isDark, initTheme } = useTheme()

  // Own the dark class here so client navigation keeps the saved theme.
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
