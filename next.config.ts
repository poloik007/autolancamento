import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {},
  serverExternalPackages: ['@google/generative-ai'],
}

export default nextConfig
