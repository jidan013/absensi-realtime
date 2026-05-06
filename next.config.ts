import type { NextConfig } from "next";

// next.config.js
const nextConfig = {
  async headers() {
    return [{
      source: "/api/:path*",
      headers: [
        { key: "Access-Control-Allow-Credentials", value: "true" },
        { key: "Access-Control-Allow-Origin", value: process.env.NEXT_PUBLIC_APP_URL ?? "*" },
      ],
    }];
  },
};

export default nextConfig;
