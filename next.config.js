const { env } = require('./src/server/env')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['lh5.googleusercontent.com'],
  },
}

module.exports = nextConfig
