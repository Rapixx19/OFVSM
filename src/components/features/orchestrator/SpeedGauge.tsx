/**
 * @file SpeedGauge.tsx
 * @summary Circular gauge showing session SOL cap remaining
 * @dependencies framer-motion, react
 */

'use client';

import { motion } from 'framer-motion';
import { useMemo, useCallback } from 'react';
import { lightTap } from '@/core/utils/haptics';

interface SpeedGaugeProps {
  remainingCapSol: number;
  totalCapSol: number;
  expiresIn: number;  // Seconds
  onClick?: () => void;
}

/**
 * Format time remaining
 */
function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Expired';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Get color based on percentage
 */
function getGaugeColor(percent: number): string {
  if (percent > 50) return '#22d3ee';  // cyan-400
  if (percent > 20) return '#fbbf24';  // yellow-400
  return '#ef4444';                     // red-500
}

/**
 * Speed Gauge Component
 */
export function SpeedGauge({
  remainingCapSol,
  totalCapSol,
  expiresIn,
  onClick,
}: SpeedGaugeProps) {
  const percent = useMemo(() => {
    if (totalCapSol <= 0) return 0;
    return Math.max(0, Math.min(100, (remainingCapSol / totalCapSol) * 100));
  }, [remainingCapSol, totalCapSol]);

  const color = useMemo(() => getGaugeColor(percent), [percent]);

  const handleClick = useCallback(() => {
    lightTap();
    onClick?.();
  }, [onClick]);

  // SVG circle parameters
  const size = 48;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      className="group relative flex items-center gap-2 rounded-full
        border border-gray-700 bg-gray-900/80 px-3 py-1.5
        transition-colors hover:border-gray-600"
    >
      {/* Circular Gauge */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg className="absolute inset-0" viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#374151"
            strokeWidth={strokeWidth}
          />
        </svg>

        {/* Progress circle */}
        <svg
          className="absolute inset-0 -rotate-90"
          viewBox={`0 0 ${size} ${size}`}
        >
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </svg>

        {/* Lightning icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="h-4 w-4"
            fill={color}
            viewBox="0 0 24 24"
          >
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>

      {/* Text Info */}
      <div className="text-left">
        <p className="text-xs font-medium" style={{ color }}>
          {remainingCapSol.toFixed(4)} SOL
        </p>
        <p className="text-xs text-gray-500">
          {formatTimeRemaining(expiresIn)}
        </p>
      </div>

      {/* Tooltip on hover */}
      <div className="pointer-events-none absolute -bottom-12 left-1/2
        -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-800
        px-3 py-1.5 text-xs text-gray-300 opacity-0
        transition-opacity group-hover:opacity-100">
        Speed Mode: {percent.toFixed(0)}% remaining
      </div>
    </motion.button>
  );
}
