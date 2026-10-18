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
    // 127.0.0.1 (not "localhost") matches the API's default bind address and
    // avoids a resolver picking ::1 while the backend listens on IPv4 loopback.
    const backend = process.env.BACKEND_URL ?? 'http://127.0.0.1:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;
