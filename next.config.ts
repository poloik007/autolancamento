import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {},
  serverExternalPackages: ['pdf-parse', '@google-cloud/vision'],
}

export default nextConfig
