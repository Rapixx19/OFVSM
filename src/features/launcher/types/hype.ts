/**
 * @file hype.ts
 * @summary TypeScript types for Hype-Man Agent viral content generation
 * @dependencies N/A
 */

/**
 * Tone variants for generated hype content
 */
export type HypeTone = 'bullish' | 'professional' | 'degen';

/**
 * Generated hype content for a single tone
 */
export interface HypeContent {
  /** The tone used for this content */
  tone: HypeTone;
  /** The generated social post message */
  message: string;
  /** Suggested hashtags */
  hashtags: string[];
}

/**
 * Request parameters for hype generation
 */
export interface HypeRequest {
  /** Token ticker symbol */
  ticker: string;
  /** Optional branding description */
  description?: string;
  /** LP lock period in days */
  lockDays: number;
  /** Token mint address */
  mintAddress: string;
  /** Transaction signature */
  signature: string;
}

/**
 * Response from hype generation
 */
export interface HypeResponse {
  /** Generated posts for each tone */
  posts: HypeContent[];
  /** Timestamp of generation */
  generatedAt: number;
}

/**
 * Tone display configuration
 */
export const TONE_CONFIG: Record<HypeTone, { label: string; emoji: string }> = {
  bullish: { label: 'Bullish', emoji: '🚀' },
  professional: { label: 'Professional', emoji: '💼' },
  degen: { label: 'Degen', emoji: '🦍' },
};
