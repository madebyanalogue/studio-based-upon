export default defineNuxtPlugin((nuxtApp) => {
  const { theme, initTheme } = useTheme()

  useHead(() => ({
    meta: [{ name: 'color-scheme', content: theme.value }],
  }))

  // After hydration — reading localStorage in setup caused icon/tooltip mismatches.
  nuxtApp.hook('app:mounted', () => {
    initTheme()
  })
})
