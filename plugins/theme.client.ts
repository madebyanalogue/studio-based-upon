export default defineNuxtPlugin(() => {
  const { theme, initTheme } = useTheme()
  initTheme()

  useHead(() => ({
    meta: [{ name: 'color-scheme', content: theme.value }],
  }))
})
