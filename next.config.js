/**
 * @file next.config.js
 * @summary Next.js configuration for VECTERAI Foundation
 * Configures webpack for Solana compatibility and enables strict mode
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Required for Solana wallet adapter compatibility
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    return config;
  },
};

module.exports = nextConfig;
