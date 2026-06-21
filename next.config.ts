import type { NextConfig } from "next";

const RAILWAY_API_URL = "https://bestbet-api-production.up.railway.app";
const API_URL =
  process.env.API_URL ||
  (process.env.NODE_ENV === "production" || process.env.VERCEL === "1"
    ? RAILWAY_API_URL
    : "http://127.0.0.1:5000");
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "crests.football-data.org" },
      { protocol: "https", hostname: "cdn.nba.com" },
      { protocol: "https", hostname: "www.mlbstatic.com" },
      { protocol: "https", hostname: "flagcdn.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "r2.thesportsdb.com" },
      { protocol: "https", hostname: "www.thesportsdb.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${API_URL}/uploads/:path*`,
      },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ["**/node_modules/**", "**/.next/**", "**/data/**", "**/server/**"],
      };
    }
    return config;
  },
};

export default nextConfig;
