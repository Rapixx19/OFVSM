/**
 * @file SafetyCertificate.tsx
 * @summary Sentinel Verified certificate component for lock verification
 * @dependencies framer-motion, react
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SecurityCertificate } from '@/features/locker/types/sentinel';

/**
 * Props for the SafetyCertificate component
 */
interface SafetyCertificateProps {
  /** Security certificate data */
  certificate: SecurityCertificate;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show detailed breakdown */
  showDetails?: boolean;
}

/**
 * Size configuration for the badge
 */
const SIZE_CONFIG = {
  sm: {
    badge: 'px-2 py-0.5 text-xs',
    icon: 'h-3 w-3',
    details: 'text-xs',
    panel: 'p-2 text-xs',
  },
  md: {
    badge: 'px-3 py-1 text-sm',
    icon: 'h-4 w-4',
    details: 'text-xs',
    panel: 'p-3 text-sm',
  },
  lg: {
    badge: 'px-4 py-1.5 text-base',
    icon: 'h-5 w-5',
    details: 'text-sm',
    panel: 'p-4 text-base',
  },
};

/**
 * Truncate a string with ellipsis in the middle
 */
function truncateMiddle(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  const half = Math.floor((maxLength - 3) / 2);
  return `${str.slice(0, half)}...${str.slice(-half)}`;
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

/**
 * Sentinel Verified certificate component
 * Displays security verification status with expandable details
 */
export function SafetyCertificate({
  certificate,
  size = 'md',
  showDetails = false,
}: SafetyCertificateProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const sizeConfig = SIZE_CONFIG[size];

  const handleCopy = async () => {
    await copyToClipboard(certificate.contractAuditHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Badge styling based on compliance
  const badgeClasses = certificate.isCompliant
    ? 'bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_theme(colors.emerald.400/30)]'
    : 'bg-gray-500/10 text-gray-400';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="inline-flex flex-col items-start gap-2"
    >
      {/* Main badge */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          inline-flex items-center gap-1.5 rounded-full font-medium
          transition-all duration-200 hover:brightness-110
          ${badgeClasses} ${sizeConfig.badge}
        `}
      >
        {/* Shield icon */}
        <svg
          className={sizeConfig.icon}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>

        {/* Label */}
        <span>Sentinel Verified</span>

        {/* Compliance checkmark */}
        {certificate.isCompliant && (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
            className={sizeConfig.icon}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </motion.svg>
        )}

        {/* Expand indicator */}
        {showDetails && (
          <motion.svg
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className={`${sizeConfig.icon} opacity-50`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </motion.svg>
        )}
      </button>

      {/* Details panel */}
      <AnimatePresence>
        {showDetails && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`
              w-full overflow-hidden rounded-lg border border-gray-700/50
              bg-gray-800/50 backdrop-blur-sm ${sizeConfig.panel}
            `}
          >
            <div className="space-y-2">
              {/* Lock Depth */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Lock Depth</span>
                <span className={`font-medium ${
                  certificate.lockDepth === 'permanent'
                    ? 'text-emerald-400'
                    : 'text-cyan-400'
                }`}>
                  {certificate.lockDays !== null
                    ? `${certificate.lockDays} days`
                    : 'Permanent'}
                </span>
              </div>

              {/* Authority Status */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Authority Status</span>
                <span className={`flex items-center gap-1.5 font-medium ${
                  certificate.authorityStatus === 'revoked'
                    ? 'text-emerald-400'
                    : 'text-yellow-400'
                }`}>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      certificate.authorityStatus === 'revoked'
                        ? 'bg-emerald-400'
                        : 'bg-yellow-400'
                    }`}
                  />
                  {certificate.authorityStatus === 'revoked' ? 'Revoked' : 'Active'}
                </span>
              </div>

              {/* Contract Audit Hash */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-400">Audit Hash</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 font-mono text-gray-300 transition-colors hover:text-white"
                  title="Click to copy"
                >
                  <span>{truncateMiddle(certificate.contractAuditHash, 20)}</span>
                  <svg
                    className={`h-3.5 w-3.5 ${copied ? 'text-emerald-400' : 'text-gray-500'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    {copied ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    )}
                  </svg>
                </button>
              </div>

              {/* Verified timestamp */}
              <div className="flex items-center justify-between border-t border-gray-700/50 pt-2">
                <span className="text-gray-500">Verified</span>
                <span className="text-gray-500">
                  {new Date(certificate.verifiedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Compact inline sentinel badge
 */
export function SentinelBadgeInline({ isCompliant }: { isCompliant: boolean }) {
  if (!isCompliant) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-400">
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
      Sentinel
    </span>
  );
}
