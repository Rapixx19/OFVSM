/**
 * @file next.config.js
 * @summary Next.js configuration for VECTERAI Foundation
 * Configures webpack for Solana compatibility, enables strict mode, and PWA
 */

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.devnet\.solana\.com/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'solana-rpc-cache',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60, // 1 minute
        },
      },
    },
  ],
});

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

    // Suppress pino-pretty warning from WalletConnect
    // It's an optional dev dependency not needed in production
    config.resolve.alias = {
      ...config.resolve.alias,
      'pino-pretty': false,
    };

    // Ignore pino-pretty in webpack module resolution
    config.plugins.push(
      new (require('webpack').IgnorePlugin)({
        resourceRegExp: /^pino-pretty$/,
      })
    );

    return config;
  },
};

module.exports = withPWA(nextConfig);
