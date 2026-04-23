import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Accept the raw camera output (iPhone panoramas / Android 108MP
      // shots). The server re-encodes with sharp to ~2400px WebP so
      // the final stored file is a few hundred KB regardless of source.
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
