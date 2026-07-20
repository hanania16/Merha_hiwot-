/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${process.env.API_PROXY_URL || 'http://backend:4000'}/api/v1/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;
