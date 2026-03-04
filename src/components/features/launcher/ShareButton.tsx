/**
 * @file ShareButton.tsx
 * @summary X/Twitter share intent button for viral launch sharing
 * @dependencies react, framer-motion, @/core/utils/haptics
 */

'use client';

import { motion } from 'framer-motion';
import { lightTap } from '@/core/utils/haptics';

interface ShareButtonProps {
  ticker: string;
  signature: string;
  lockDays: number;
}

/**
 * Generate X/Twitter share intent URL
 */
function generateShareUrl(ticker: string, signature: string, lockDays: number): string {
  const solscanUrl = `https://solscan.io/tx/${signature}`;
  const text = `Just launched $${ticker} on @VECTERAI - ${lockDays} Day LP Locked. Unruggable.`;

  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(solscanUrl)}`;
}

/**
 * Share to X Button Component
 */
export function ShareButton({ ticker, signature, lockDays }: ShareButtonProps) {
  const handleShare = () => {
    lightTap();
    const shareUrl = generateShareUrl(ticker, signature, lockDays);
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleShare}
      className="flex flex-1 items-center justify-center gap-2 rounded-xl
        bg-black px-4 py-3 font-medium text-white transition-colors
        hover:bg-gray-900"
    >
      {/* X Logo */}
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      <span>Share to X</span>
    </motion.button>
  );
}
