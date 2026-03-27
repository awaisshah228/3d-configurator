import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow larger body size for 3D model uploads (50MB)
  serverExternalPackages: [],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
