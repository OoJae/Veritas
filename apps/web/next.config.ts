import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Suppress pino-pretty import warning from WalletConnect/RainbowKit
    config.plugins.push(
      new (require("webpack").IgnorePlugin)({
        resourceRegExp: /^pino-pretty$/,
      })
    );
    return config;
  },
};

export default nextConfig;
