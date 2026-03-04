/**
 * @file SafetyBadge.tsx
 * @summary Safe Launch badge component for tokens locked via VECTERAI Locker
 * @dependencies framer-motion, react
 */

'use client';

import { motion } from 'framer-motion';
import type { SafeStandardStatus, LockStatus } from '@/features/locker/types/locker';

/**
 * Props for the SafetyBadge component
 */
interface SafetyBadgeProps {
  /** Safe Standard compliance status */
  status: SafeStandardStatus;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show detailed information */
  showDetails?: boolean;
}

/**
 * Badge configuration by lock status
 */
const BADGE_CONFIG: Record<
  LockStatus,
  {
    label: string;
    bgClass: string;
    textClass: string;
    glowClass: string;
  }
> = {
  locked: {
    label: 'Safe Launch',
    bgClass: 'bg-cyan-500/10',
    textClass: 'text-cyan-400',
    glowClass: 'shadow-[0_0_10px_theme(colors.cyan.400/30)]',
  },
  permanent: {
    label: 'Permanently Locked',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    glowClass: 'shadow-[0_0_10px_theme(colors.emerald.400/30)]',
  },
  unlockable: {
    label: 'Unlockable',
    bgClass: 'bg-yellow-500/10',
    textClass: 'text-yellow-400',
    glowClass: '',
  },
  unlocked: {
    label: 'Not Locked',
    bgClass: 'bg-gray-500/10',
    textClass: 'text-gray-400',
    glowClass: '',
  },
};

/**
 * Size configuration for the badge
 */
const SIZE_CONFIG = {
  sm: {
    badge: 'px-2 py-0.5 text-xs',
    icon: 'text-xs',
    details: 'text-xs',
  },
  md: {
    badge: 'px-3 py-1 text-sm',
    icon: 'text-sm',
    details: 'text-xs',
  },
  lg: {
    badge: 'px-4 py-1.5 text-base',
    icon: 'text-base',
    details: 'text-sm',
  },
};

/**
 * Format days remaining for display
 */
function formatDaysRemaining(days: number | null): string {
  if (days === null) return '';
  if (days === 0) return 'Unlockable now';
  if (days === 1) return '1 day remaining';
  return `${days} days remaining`;
}

/**
 * Safe Launch badge component
 * Displays "Safe Launch" status for tokens locked via VECTERAI Locker
 * Uses Cyan-400 color scheme for compliant tokens
 */
export function SafetyBadge({
  status,
  size = 'md',
  showDetails = false,
}: SafetyBadgeProps) {
  const config = BADGE_CONFIG[status.status];
  const sizeConfig = SIZE_CONFIG[size];

  // Don't render anything if not compliant and status is unlocked
  if (!status.isCompliant && status.status === 'unlocked') {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="inline-flex flex-col items-start gap-1"
    >
      {/* Main badge */}
      <div
        className={`
          inline-flex items-center gap-1.5 rounded-full font-medium
          ${config.bgClass} ${config.textClass} ${config.glowClass}
          ${sizeConfig.badge}
        `}
      >
        {/* Shield icon */}
        <span className={sizeConfig.icon} role="img" aria-label="shield">
          {status.isPermanent ? (
            // Lock icon for permanent
            <svg
              className="h-[1em] w-[1em]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          ) : (
            // Shield icon for locked
            <svg
              className="h-[1em] w-[1em]"
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
          )}
        </span>

        {/* Label */}
        <span>{config.label}</span>

        {/* Verified checkmark for compliant tokens */}
        {status.isCompliant && (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
            className="h-[1em] w-[1em]"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </motion.svg>
        )}
      </div>

      {/* Details section */}
      {showDetails && status.daysRemaining !== null && (
        <motion.span
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`${sizeConfig.details} text-gray-500`}
        >
          {formatDaysRemaining(status.daysRemaining)}
        </motion.span>
      )}

      {/* Locked amount (optional, shown in details) */}
      {showDetails && status.lockedAmount && (
        <motion.span
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`${sizeConfig.details} font-mono text-gray-500`}
        >
          {status.lockedAmount.toString()} LP locked
        </motion.span>
      )}
    </motion.div>
  );
}

/**
 * Compact inline badge for lists
 */
export function SafetyBadgeInline({ isCompliant }: { isCompliant: boolean }) {
  if (!isCompliant) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 rounded bg-cyan-500/10 px-1.5 py-0.5 text-xs font-medium text-cyan-400">
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
      Safe
    </span>
  );
}
