/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    dangerouslyAllowSVG: true,
    // Upload URLs are immutable (unique prefix-timestamp-random filenames), so
    // the optimizer output can be cached in the browser for a year without ever
    // serving a stale image. Replaces the default `max-age=0, must-revalidate`.
    minimumCacheTTL: 31536000,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};
module.exports = nextConfig;
