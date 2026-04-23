import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Feed photo uploads go directly from the client to Supabase via a
  // signed URL, so the server action payload is never more than a few
  // KB of form fields. Leaving bodySizeLimit at Next's default (1 MB)
  // is fine.

  images: {
    // Allow Next's image optimizer to resize + reformat photos served
    // from Supabase Storage. Mobile viewports get small WebP/AVIF
    // variants instead of the full 4096px source — saves bandwidth and
    // paint time.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hshpfgwoqtrwdxzwlftv.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    qualities: [60, 75, 85],
  },
};

export default nextConfig;
