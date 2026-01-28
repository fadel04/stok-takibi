// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt'
  ],

  ssr: false,

  devtools: {
    enabled: true
  },

  devServer: {
    host: '0.0.0.0',
    port: 3000
  },

  css: ['~/assets/css/main.css'],

  nitro: {
    preset: 'netlify',
    compressPublicAssets: true,
    routeRules: {
      '/api/**': {
        cors: true,
        headers: {
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    }
  },

  routeRules: {
    '/api/**': {
      cors: true,
      headers: {
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Origin': '*'
      }
    }
  },

  runtimeConfig: {
    tursoDbUrl: process.env.TURSO_DATABASE_URL,
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN,
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://your-app.netlify.app'
    }
  },

  compatibilityDate: '2024-07-11',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
