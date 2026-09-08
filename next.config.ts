import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Capacitor bundles a static build inside the Android app (no server on
  // the device), so Next.js must export fully static HTML/JS/CSS.
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
