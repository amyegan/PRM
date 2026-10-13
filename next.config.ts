import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  // The public share page sends photos (downscaled to ~1 MB) through a server action.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default withEve(nextConfig);
