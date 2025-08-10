import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
    ],
    deviceSizes: [360, 420, 640, 768, 1024, 1280],
    imageSizes: [256, 384, 512, 768, 1080],
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
