/**
 * @file SentinelScoreboard.tsx
 * @summary Real-time trust score display with circular gauge
 * @dependencies react, framer-motion, @/core/utils
 */

'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { jackpotPulse } from '@/core/utils/haptics';
import { playWarningChime } from '@/core/utils/audio';
import type { TrustScore } from '@/features/locker/types/trustScore';
import { GRADE_COLORS, GRADE_BG_COLORS } from '@/features/locker/types/trustScore';

interface SentinelScoreboardProps {
  score: TrustScore;
}

/**
 * Get color class based on score
 */
function getScoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-400';
  if (score >= 70) return 'text-cyan-400';
  if (score >= 50) return 'text-yellow-400';
  if (score >= 30) return 'text-orange-400';
  return 'text-red-400';
}

/**
 * Get stroke color for gauge
 */
function getStrokeColor(score: number): string {
  if (score >= 90) return '#34d399';
  if (score >= 70) return '#22d3ee';
  if (score >= 50) return '#facc15';
  if (score >= 30) return '#fb923c';
  return '#f87171';
}

/**
 * Circular Trust Gauge Component
 */
function TrustGauge({ score }: { score: number }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative h-32 w-32">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#374151" strokeWidth="8" />
        {/* Progress circle */}
        <motion.circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={getStrokeColor(score)} strokeWidth="8" strokeLinecap="round"
          initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={score}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`text-3xl font-bold ${getScoreColor(score)}`}
        >
          {score}
        </motion.span>
        <span className="text-xs text-gray-500">/ 100</span>
      </div>
    </div>
  );
}

/**
 * Pillar progress bar
 */
function PillarBar({ name, score, maxScore, status }: {
  name: string; score: number; maxScore: number; status: string;
}) {
  const percent = (score / maxScore) * 100;
  const color = status === 'pass' ? 'bg-emerald-500' : status === 'warn' ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{name}</span>
        <span className="text-gray-500">{score}/{maxScore}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-700">
        <motion.div
          className={`h-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

/**
 * Sentinel Scoreboard - Real-time trust score display
 */
export function SentinelScoreboard({ score }: SentinelScoreboardProps) {
  const prevScore = useRef(score.total);

  // Trigger feedback on score changes
  useEffect(() => {
    if (score.total === 100 && prevScore.current !== 100) {
      jackpotPulse();
    } else if (score.total < 30 && prevScore.current >= 30) {
      playWarningChime();
    }
    prevScore.current = score.total;
  }, [score.total]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-4"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">🛡️</span>
        <span className="font-medium text-gray-300">Sentinel Audit</span>
        <span className={`ml-auto rounded px-2 py-0.5 text-sm font-bold
          ${GRADE_BG_COLORS[score.grade]} ${GRADE_COLORS[score.grade]}`}>
          {score.grade}
        </span>
      </div>

      {/* Gauge and Pillars */}
      <div className="flex gap-4">
        <TrustGauge score={score.total} />
        <div className="flex-1 space-y-2">
          <PillarBar {...score.pillars.metadata} />
          <PillarBar {...score.pillars.tokenomics} />
          <PillarBar {...score.pillars.authority} />
          <PillarBar {...score.pillars.lockDuration} />
        </div>
      </div>

      {/* Status message */}
      <div className="mt-3 text-center text-xs text-gray-500">
        {score.total === 100 ? '✨ Perfect Score!' :
         score.total >= 90 ? 'Excellent security posture' :
         score.total >= 70 ? 'Good - consider improvements' :
         score.total < 30 ? '⚠️ Critical issues detected' :
         'Review recommendations above'}
      </div>
    </motion.div>
  );
}
