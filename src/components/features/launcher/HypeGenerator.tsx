/**
 * @file HypeGenerator.tsx
 * @summary AI-powered social post generator with tone selection
 * @dependencies react, framer-motion, @/core/utils/haptics
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic, lightTap } from '@/core/utils/haptics';
import { getHypeManAgent } from '@/features/launcher/agents/HypeManAgent';
import type { HypeContent, HypeTone, HypeRequest } from '@/features/launcher/types/hype';
import { TONE_CONFIG } from '@/features/launcher/types/hype';

interface HypeGeneratorProps {
  ticker: string;
  mintAddress: string;
  signature: string;
  lockDays: number;
  onClose: () => void;
}

/**
 * AI Hype Generator Component
 */
export function HypeGenerator({
  ticker,
  mintAddress,
  signature,
  lockDays,
  onClose,
}: HypeGeneratorProps) {
  const [selectedTone, setSelectedTone] = useState<HypeTone>('bullish');
  const [posts, setPosts] = useState<HypeContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    lightTap();

    const agent = getHypeManAgent();
    const request: HypeRequest = { ticker, mintAddress, signature, lockDays };

    const response = await agent.generateHypePosts(request);
    setPosts(response.posts);
    setIsLoading(false);

    // Medium haptic pulse on completion
    triggerHaptic('medium');
  };

  const handleCopy = async (text: string, hashtags: string[]) => {
    const fullText = `${text}\n\n${hashtags.join(' ')}`;
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    lightTap();
    setTimeout(() => setCopied(false), 2000);
  };

  const currentPost = posts.find((p) => p.tone === selectedTone);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="mt-4 rounded-xl border border-purple-500/30 bg-purple-500/5 p-4"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <span className="font-medium text-purple-400">AI Hype Generator</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Generate Button */}
      {posts.length === 0 && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600
            px-4 py-3 font-medium text-white transition-opacity
            disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Generating...
            </span>
          ) : (
            'Generate Hype Posts'
          )}
        </motion.button>
      )}

      {/* Tone Tabs */}
      {posts.length > 0 && (
        <>
          <div className="mb-3 flex gap-2">
            {(['bullish', 'professional', 'degen'] as HypeTone[]).map((tone) => (
              <button
                key={tone}
                onClick={() => { setSelectedTone(tone); lightTap(); }}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                  ${selectedTone === tone
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-gray-800/50 text-gray-400 hover:text-white'}`}
              >
                {TONE_CONFIG[tone].emoji} {TONE_CONFIG[tone].label}
              </button>
            ))}
          </div>

          {/* Generated Content */}
          <AnimatePresence mode="wait">
            {currentPost && (
              <motion.div
                key={selectedTone}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="rounded-lg bg-black/30 p-4"
              >
                <p className="mb-3 text-sm text-gray-300">{currentPost.message}</p>
                <div className="mb-3 flex flex-wrap gap-1">
                  {currentPost.hashtags.map((tag) => (
                    <span key={tag} className="text-xs text-purple-400">{tag}</span>
                  ))}
                </div>
                <button
                  onClick={() => handleCopy(currentPost.message, currentPost.hashtags)}
                  className="flex items-center gap-2 rounded-lg bg-purple-500/20 px-3 py-1.5
                    text-sm text-purple-400 transition-colors hover:bg-purple-500/30"
                >
                  {copied ? '✓ Copied!' : 'Copy to Clipboard'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}
