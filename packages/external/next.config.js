/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 将源代码目录设置为 src
  experimental: {
    appDir: false,
  },
}

module.exports = nextConfig 