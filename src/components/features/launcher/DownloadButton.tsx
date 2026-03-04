/**
 * @file DownloadButton.tsx
 * @summary Download card as JPEG using html-to-image
 * @dependencies react, framer-motion, html-to-image, @/core/utils/haptics
 */

'use client';

import { useState, type RefObject } from 'react';
import { motion } from 'framer-motion';
import { toJpeg } from 'html-to-image';
import { lightTap, successPulse } from '@/core/utils/haptics';

interface DownloadButtonProps {
  cardRef: RefObject<HTMLDivElement | null>;
  ticker: string;
}

/**
 * Download Card Button Component
 */
export function DownloadButton({ cardRef, ticker }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current || isDownloading) return;

    lightTap();
    setIsDownloading(true);

    try {
      const dataUrl = await toJpeg(cardRef.current, {
        quality: 0.95,
        backgroundColor: '#0F172A',
        pixelRatio: 2, // High-res for retina displays
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `${ticker}-launch-card.jpg`;
      link.href = dataUrl;
      link.click();

      successPulse();
    } catch (error) {
      console.error('Failed to generate image:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleDownload}
      disabled={isDownloading}
      className="flex flex-1 items-center justify-center gap-2 rounded-xl
        border border-gray-700 bg-gray-800/50 px-4 py-3 font-medium
        text-gray-300 transition-colors hover:border-gray-600
        hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isDownloading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="h-5 w-5 rounded-full border-2 border-gray-600 border-t-cyan-400"
        />
      ) : (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      )}
      <span>{isDownloading ? 'Generating...' : 'Download Card'}</span>
    </motion.button>
  );
}
