// const { env } = require('./src/server/env')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    swcPlugins: [
      [
        'next-superjson-plugin',
        {
          excluded: [],
        },
      ],
    ],
  },
  images: {
    domains: ['localhost'],
  },
  webpack(config) {
    config.module.rules.push({
      test: [/src\/components\/index.ts/i],
      sideEffects: false,
    })

    return config
  },
}

module.exports = nextConfig
