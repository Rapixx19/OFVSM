/**
 * @file SentinelBadgeInline.tsx
 * @summary Compact inline sentinel verification badge
 */

'use client';

interface SentinelBadgeInlineProps {
  isCompliant: boolean;
}

/**
 * Compact inline sentinel badge
 */
export function SentinelBadgeInline({ isCompliant }: SentinelBadgeInlineProps) {
  if (!isCompliant) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-400">
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
