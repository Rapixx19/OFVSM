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
    {
      urlPattern: /^https:\/\/api\.mainnet-beta\.solana\.com/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'solana-mainnet-rpc-cache',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60,
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Production optimizations
  poweredByHeader: false,
  compress: true,

  // Transpile modular wallet components
  transpilePackages: [
    '@solana/wallet-adapter-base',
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-react-ui',
    '@solana/wallet-adapter-wallets',
  ],

  // Experimental features for performance
  experimental: {
    optimizeCss: true,
  },

  // Image optimization
  images: {
    domains: ['arweave.net', 'www.arweave.net'],
    formats: ['image/avif', 'image/webp'],
  },

  webpack: (config, { isServer }) => {
    // Required for Solana wallet adapter compatibility
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    // Suppress pino-pretty warning from WalletConnect
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

    // Production bundle optimizations
    if (!isServer && process.env.NODE_ENV === 'production') {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            // Separate Solana-related code
            solana: {
              test: /[\\/]node_modules[\\/]@solana[\\/]/,
              name: 'solana',
              chunks: 'all',
              priority: 20,
            },
            // Separate wallet components
            wallets: {
              test: /[\\/]src[\\/](features|components)[\\/]wallets[\\/]/,
              name: 'wallets',
              chunks: 'all',
              priority: 15,
            },
          },
        },
      };
    }

    return config;
  },
};

module.exports = withPWA(nextConfig);
