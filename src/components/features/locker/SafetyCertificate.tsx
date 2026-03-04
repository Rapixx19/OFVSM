/**
 * @file SafetyCertificate.tsx
 * @summary Sentinel Verified certificate component for lock verification
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SecurityCertificate } from '@/features/locker/types/sentinel';
import { CertificateDetails } from './CertificateDetails';

export { SentinelBadgeInline } from './SentinelBadgeInline';

interface SafetyCertificateProps {
  certificate: SecurityCertificate;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

const SIZE_CONFIG = {
  sm: { badge: 'px-2 py-0.5 text-xs', icon: 'h-3 w-3', panel: 'p-2 text-xs' },
  md: { badge: 'px-3 py-1 text-sm', icon: 'h-4 w-4', panel: 'p-3 text-sm' },
  lg: { badge: 'px-4 py-1.5 text-base', icon: 'h-5 w-5', panel: 'p-4 text-base' },
};

/**
 * Sentinel Verified certificate component
 */
export function SafetyCertificate({ certificate, size = 'md', showDetails = false }: SafetyCertificateProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sizeConfig = SIZE_CONFIG[size];

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
        className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-all duration-200 hover:brightness-110 ${badgeClasses} ${sizeConfig.badge}`}
      >
        {/* Shield icon */}
        <svg className={sizeConfig.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
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
        {showDetails && isExpanded && <CertificateDetails certificate={certificate} sizeConfig={sizeConfig} />}
      </AnimatePresence>
    </motion.div>
  );
}
