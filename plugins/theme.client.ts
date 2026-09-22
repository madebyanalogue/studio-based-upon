export default defineNuxtPlugin((nuxtApp) => {
  const { isDark, initTheme } = useTheme()

  useHead(() => ({
    meta: [{ name: 'color-scheme', content: isDark.value ? 'dark' : 'light' }],
  }))

  // After hydration — reading localStorage in setup caused icon/tooltip mismatches.
  nuxtApp.hook('app:mounted', () => {
    initTheme()
  })
})
