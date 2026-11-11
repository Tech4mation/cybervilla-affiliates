import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // Campaigns moved in with the catalogue they apply to. Done here
        // rather than with a redirect() in a page: that page had no
        // dynamic data, so Next prerendered it and the redirect only
        // happened once the browser had already loaded it — a bookmark or
        // a link from an admin notification landed on a blank screen.
        source: "/admin/campaigns",
        destination: "/admin/products",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
