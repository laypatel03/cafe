import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // let `pnpm dev` behind an ngrok tunnel load dev resources (HMR); dev only
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app", "*.ngrok.app"],
  images: {
    formats: ["image/avif", "image/webp"],
    // only our own assets and uploaded menu photos may go through the optimiser
    localPatterns: [
      { pathname: "/brand/**", search: "" },
      { pathname: "/media/**", search: "" },
      { pathname: "/blog/**", search: "" },
    ],
  },
  experimental: {
    serverActions: {
      // menu photos from a phone camera; they are shrunk to WebP on the server
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
