/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    qualities: [60, 70, 75],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  // @ts-ignore - Permitiendo propiedad custom
  allowedDevOrigins: ['192.168.1.72'],
};

export default nextConfig;