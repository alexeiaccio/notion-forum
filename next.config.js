const { env } = require('./src/server/env')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['lh5.googleusercontent.com'],
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
