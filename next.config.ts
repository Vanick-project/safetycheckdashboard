import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Le QR 2FA arrive en data:image/png;base64,... — on autorise les data URIs
    dangerouslyAllowSVG: false,
    remotePatterns: [],
  },
};

export default nextConfig;