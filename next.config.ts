import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output bundles only what the server needs into .next/standalone/.
  // Drops the ~300MB node_modules from the runtime image.
  output: "standalone",
};

export default nextConfig;
