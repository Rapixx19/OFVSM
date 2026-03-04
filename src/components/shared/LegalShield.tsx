/**
 * @file LegalShield.tsx
 * @summary Frosted-glass legal shield overlay component
 * @dependencies framer-motion, react
 */

'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Props for the LegalShield component
 */
interface LegalShieldProps {
  /** Whether the shield is visible */
  isOpen: boolean;
  /** Called when user accepts the terms */
  onAccept: () => void;
  /** Called when user declines the terms */
  onDecline: () => void;
  /** Whether an action is in progress */
  isLoading?: boolean;
}

/**
 * Legal Shield overlay with frosted glass effect
 * Requires user to scroll to bottom before accepting
 */
export function LegalShield({
  isOpen,
  onAccept,
  onDecline,
  isLoading = false,
}: LegalShieldProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  /**
   * Check if user has scrolled to the bottom of the terms
   */
  const handleScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20;

    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  }, [hasScrolledToBottom]);

  // Reset scroll state when shield opens
  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onDecline}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, type: 'spring', damping: 25 }}
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-gray-900/90 shadow-2xl backdrop-blur-xl"
          >
            {/* Header */}
            <div className="border-b border-white/10 bg-gradient-to-r from-red-500/20 to-orange-500/20 px-6 py-4">
              <h2 className="text-xl font-bold text-white">
                Legal Shield Agreement
              </h2>
              <p className="mt-1 text-sm text-gray-300">
                Please read and accept the terms to continue
              </p>
            </div>

            {/* Scrollable Content */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="max-h-[60vh] overflow-y-auto px-6 py-4"
            >
              <div className="prose prose-invert prose-sm max-w-none">
                <h3 className="text-lg font-semibold text-white">
                  VECTERAI Foundation Risk Disclaimer
                </h3>

                <p className="text-gray-300">
                  By accessing and using the VECTERAI Foundation platform, you
                  acknowledge and agree to the following terms and conditions:
                </p>

                <h4 className="font-semibold text-white">
                  1. Cryptocurrency Risk Warning
                </h4>
                <p className="text-gray-300">
                  Cryptocurrency and digital asset investments involve
                  substantial risk of loss and are not suitable for every
                  investor. The value of digital assets can fluctuate
                  significantly, and you could lose some or all of your
                  investment. You should carefully consider whether trading or
                  holding digital assets is suitable for you in light of your
                  financial condition.
                </p>

                <h4 className="font-semibold text-white">
                  2. Solana Network Risks
                </h4>
                <p className="text-gray-300">
                  The Solana blockchain network is subject to technical risks
                  including but not limited to: network congestion, validator
                  outages, protocol vulnerabilities, and consensus failures.
                  VECTERAI Foundation is not responsible for any losses
                  resulting from Solana network issues.
                </p>

                <h4 className="font-semibold text-white">
                  3. Token Launch Risks
                </h4>
                <p className="text-gray-300">
                  Participating in token launches carries significant risks.
                  Newly launched tokens may experience extreme price volatility,
                  lack liquidity, or become worthless. The Safe Standard badge
                  indicates compliance with certain technical standards but does
                  not guarantee the success, value, or legitimacy of any token.
                </p>

                <h4 className="font-semibold text-white">
                  4. Smart Contract Risks
                </h4>
                <p className="text-gray-300">
                  Smart contracts are experimental technology and may contain
                  bugs, vulnerabilities, or design flaws that could result in
                  the loss of funds. While VECTERAI Foundation employs security
                  measures, no system is completely secure.
                </p>

                <h4 className="font-semibold text-white">
                  5. Regulatory Compliance
                </h4>
                <p className="text-gray-300">
                  The regulatory status of cryptocurrencies and token offerings
                  varies by jurisdiction. You are solely responsible for
                  determining whether your use of VECTERAI Foundation complies
                  with applicable laws and regulations in your jurisdiction.
                </p>

                <h4 className="font-semibold text-white">
                  6. No Financial Advice
                </h4>
                <p className="text-gray-300">
                  Nothing on this platform constitutes financial, legal, or
                  investment advice. All information is provided for
                  informational purposes only. You should consult with qualified
                  professionals before making any investment decisions.
                </p>

                <h4 className="font-semibold text-white">
                  7. Limitation of Liability
                </h4>
                <p className="text-gray-300">
                  To the maximum extent permitted by law, VECTERAI Foundation
                  and its affiliates, officers, employees, and agents shall not
                  be liable for any direct, indirect, incidental, special,
                  consequential, or punitive damages arising from your use of
                  the platform.
                </p>

                <h4 className="font-semibold text-white">8. Acceptance</h4>
                <p className="text-gray-300">
                  By clicking &quot;Accept&quot;, you confirm that you have read,
                  understood, and agree to be bound by these terms. You
                  acknowledge that you are of legal age in your jurisdiction and
                  have the legal capacity to enter into this agreement.
                </p>

                <p className="mt-4 text-xs text-gray-500">
                  Legal Shield Version: 2026.1.0 | Last Updated: January 2026
                </p>
              </div>
            </div>

            {/* Scroll indicator */}
            {!hasScrolledToBottom && (
              <div className="absolute bottom-20 left-0 right-0 flex justify-center">
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm text-gray-400"
                >
                  Scroll to read all terms
                </motion.div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-white/10 bg-gray-900/50 px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  {hasScrolledToBottom
                    ? 'You may now accept the terms'
                    : 'Please scroll to read all terms'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={onDecline}
                    disabled={isLoading}
                    className="rounded-lg border border-gray-600 bg-transparent px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-500 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Decline
                  </button>
                  <button
                    onClick={onAccept}
                    disabled={!hasScrolledToBottom || isLoading}
                    className="rounded-lg bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="h-4 w-4 animate-spin"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      'Accept'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
