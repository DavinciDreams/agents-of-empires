import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['deepagents'],
  turbopack: {}, // Silence Turbopack/webpack warning
};

export default nextConfig;
