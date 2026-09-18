import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

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
    '~/assets/styles/main.css',
    '~/assets/styles/colours.css',
    '~/assets/styles/typography.css',
  ],
  app: {
    head: {
      title: 'Studio Based Upon',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Homemade+Apple&display=swap',
        },
      ],
      // Apply stored theme / text case before CSS paints to avoid FOUC.
      script: [
        {
          children: `(function(){try{var t=localStorage.getItem('basedupon:theme');if(t==='dark')document.documentElement.classList.add('dark');var c=localStorage.getItem('sba-text-case');if(c==='uppercase')document.documentElement.classList.add('text-uppercase');document.documentElement.classList.remove('face-serif','serif-sans');}catch(e){}})();`,
          tagPosition: 'head',
        },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
  },
  build: {
    transpile: ['@nuxtjs/sanity', '@mkkellogg/gaussian-splats-3d'],
  },
  vite: {
    optimizeDeps: {
      include: ['three', '@mkkellogg/gaussian-splats-3d', 'gsap/CustomEase', 'gsap/SplitText'],
      exclude: [
        '@sanity/visual-editing',
        '@sanity/ui',
        'react-compiler-runtime',
        'react',
        'react-dom',
      ],
    },
    ssr: {
      external: ['@sanity/visual-editing', '@mkkellogg/gaussian-splats-3d'],
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
