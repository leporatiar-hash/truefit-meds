import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_DEPLOY_ID: process.env.VERCEL_DEPLOYMENT_ID ?? "dev",
  },
};

export default nextConfig;
