import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Feed photo uploads go directly from the client to Supabase via a
  // signed URL, so the server action payload is never more than a few
  // KB of form fields. Leaving bodySizeLimit at Next's default (1 MB)
  // is fine.
};

export default nextConfig;
