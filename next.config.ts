import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Canonical domain is the apex (veritaslaw.app). Any request that
  // arrives on www.veritaslaw.app gets a permanent 308 to the apex
  // equivalent so we don't split SEO, sessions, or analytics across
  // two hostnames.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.veritaslaw.app" }],
        destination: "https://veritaslaw.app/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
