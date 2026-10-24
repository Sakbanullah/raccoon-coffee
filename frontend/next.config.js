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
    // Measured: the Atmosphere cards are 500 CSS px wide and the footer
    // thumbnails 143 CSS px, but the default candidate list has no 512 or 160
    // step, so the browser had to download 640 px and 256 px variants.
    // deviceSizes keeps 3840 for the hero at DPR 2-3 and adds 1440, so a
    // 1440 px-wide DPR 1 viewport no longer rounds up to the 1920 variant.
    deviceSizes: [640, 750, 828, 1080, 1200, 1440, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 160, 256, 384, 512],
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
