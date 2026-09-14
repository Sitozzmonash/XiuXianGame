/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // 本机开发：/api/* 代理到本地 uvicorn（:8000，无前缀路由）；生产由 vercel.json Services 接管
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') return []
    return [{ source: '/api/:path*', destination: 'http://127.0.0.1:8000/:path*' }]
  },
}

export default nextConfig
