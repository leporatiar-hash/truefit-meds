import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Expose the Vercel deployment ID to the client bundle at build time.
  // This lets the update-checker compare the running version to the live version.
  env: {
    NEXT_PUBLIC_DEPLOY_ID: process.env.VERCEL_DEPLOYMENT_ID ?? "dev",
  },
};

export default nextConfig;
