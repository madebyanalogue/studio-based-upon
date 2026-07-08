import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { DUMB_MODE_DEFAULT } from './config/dumbMode'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineNuxtConfig({
  devtools: { enabled: false },
  modules: ['@nuxtjs/sanity', '@nuxt/image'],
  sanity: {
    projectId: 'k8gpyc57',
    dataset: 'production',
    useCdn: true,
    apiVersion: '2024-03-19',
    visualEditing: {
      studioUrl: false,
      enabled: false,
    },
  },
  runtimeConfig: {
    public: {
      sanity: {
        projectId: 'k8gpyc57',
        dataset: 'production',
        apiVersion: '2024-03-19',
      },
    },
  },
  image: {
    sanity: {
      projectId: 'k8gpyc57',
      dataset: 'production',
    },
    quality: 80,
    format: ['webp', 'jpg'],
    domains: ['cdn.sanity.io', 'images.unsplash.com', 'picsum.photos'],
    screens: {
      lg: 1200,
      xl: 2560,
      xxl: 3200,
    },
  },
  css: [
    '~/assets/styles/colours.css',
    '~/assets/styles/typography.css',
    '~/assets/styles/main.css',
    '~/assets/styles/dumb-mode.css',
  ],
  app: {
    head: {
      title: 'Studio Based Upon',
      htmlAttrs: DUMB_MODE_DEFAULT ? { class: 'dumb-mode' } : {},
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
  },
  build: {
    transpile: ['@nuxtjs/sanity'],
  },
  vite: {
    optimizeDeps: {
      exclude: [
        '@sanity/visual-editing',
        '@sanity/ui',
        'react-compiler-runtime',
        'react',
        'react-dom',
      ],
    },
    ssr: {
      external: ['@sanity/visual-editing'],
    },
    resolve: {
      alias: {
        'react-compiler-runtime': join(__dirname, 'node_modules/react-compiler-runtime/dist/index.js'),
        '@sanity/visual-editing': join(__dirname, 'stubs/sanity-visual-editing-stub.js'),
      },
    },
    plugins: [
      {
        name: 'stub-react-compiler-nested',
        resolveId(id) {
          if (id.includes('react-compiler-runtime')) {
            return join(__dirname, 'node_modules/react-compiler-runtime/dist/index.js')
          }
          if (id.includes('@sanity/visual-editing') && !id.includes('stub')) {
            return join(__dirname, 'stubs/sanity-visual-editing-stub.js')
          }
        },
      },
    ],
  },
})
