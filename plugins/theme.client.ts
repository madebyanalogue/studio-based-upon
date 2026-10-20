export default defineNuxtPlugin((nuxtApp) => {
  const { isDark, initTheme } = useTheme()
  /** Until initTheme runs, the early head script owns <html class="dark">. */
  const headReady = useState('theme-head-ready', () => false)

  // Own the dark class here so client navigation keeps the saved theme.
  // Skip until mounted so hydration doesn't re-force dark over a saved light theme.
  useHead(() => {
    if (!headReady.value) {
      return {
        meta: [
          {
            name: 'color-scheme',
            content:
              import.meta.client &&
              !document.documentElement.classList.contains('dark')
                ? 'light'
                : 'dark',
          },
        ],
      }
    }
    return {
      htmlAttrs: {
        class: {
          dark: isDark.value,
        },
      },
      meta: [{ name: 'color-scheme', content: isDark.value ? 'dark' : 'light' }],
    }
  })

  // After hydration — reading localStorage in setup caused icon/tooltip mismatches.
  nuxtApp.hook('app:mounted', () => {
    initTheme()
    headReady.value = true
  })
})
