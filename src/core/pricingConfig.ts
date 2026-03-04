/**
 * @file pricingConfig.ts
 * @summary Parameterized fee structure configuration for VECTERAI platform
 * @dependencies @/types
 */

import type { FeeConfig, FeeTier, UserRole } from '@/types';

/**
 * Default fee configuration for the platform
 * - Developers get reduced flat-rate fees
 * - Public users pay tiered fees based on transaction value
 */
export const DEFAULT_FEE_CONFIG: FeeConfig = {
  developer: {
    flatFee: 0.001, // 0.001 SOL flat fee for developers
  },
  public: [
    {
      name: 'Micro',
      minValue: 0,
      maxValue: 1,
      feePercentage: 0.03, // 3% for transactions under 1 SOL
    },
    {
      name: 'Small',
      minValue: 1,
      maxValue: 10,
      feePercentage: 0.025, // 2.5% for 1-10 SOL
    },
    {
      name: 'Medium',
      minValue: 10,
      maxValue: 100,
      feePercentage: 0.02, // 2% for 10-100 SOL
    },
    {
      name: 'Large',
      minValue: 100,
      maxValue: null,
      feePercentage: 0.015, // 1.5% for 100+ SOL
    },
  ],
};

/**
 * Get the applicable fee tier for a transaction value
 */
export function getFeeTier(
  transactionValue: number,
  tiers: FeeTier[]
): FeeTier | null {
  return (
    tiers.find(
      (tier) =>
        transactionValue >= tier.minValue &&
        (tier.maxValue === null || transactionValue < tier.maxValue)
    ) ?? null
  );
}

/**
 * Calculate the fee for a transaction based on user role and value
 */
export function calculateFee(
  transactionValue: number,
  role: UserRole,
  config: FeeConfig = DEFAULT_FEE_CONFIG
): number {
  if (role === 'developer') {
    return config.developer.flatFee;
  }

  const tier = getFeeTier(transactionValue, config.public);
  if (!tier) {
    // Fallback to highest tier if no tier found
    const lastTier = config.public[config.public.length - 1];
    return lastTier ? transactionValue * lastTier.feePercentage : 0;
  }

  return transactionValue * tier.feePercentage;
}

/**
 * Get fee description for display purposes
 */
export function getFeeDescription(
  role: UserRole,
  config: FeeConfig = DEFAULT_FEE_CONFIG
): string {
  if (role === 'developer') {
    return `Flat fee: ${config.developer.flatFee} SOL per transaction`;
  }

  return 'Tiered fees based on transaction value';
}
