import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Mobile cameras produce large photos; even after client-side
      // compression to WebP/2000px, some iPhone panoramas land around
      // 3-4 MB. 10 MB body ceiling matches the server-side check in
      // uploadFeedPhotoAction.
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
