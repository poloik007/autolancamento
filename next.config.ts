import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {},
  serverExternalPackages: ['@google/generative-ai', 'pdf-parse'],
}

export default nextConfig
