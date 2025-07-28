/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix: "/exp4-static",
  transpilePackages: ["@workspace/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "makeitmeme.com",
      },
    ],
  },
};

export default nextConfig;
