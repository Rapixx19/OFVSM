/**
 * @file InstallPrompt.tsx
 * @summary iOS PWA install prompt banner
 * @dependencies react, framer-motion, zustand
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { lightTap } from '@/core/utils/haptics';

const DISMISSED_KEY = 'vecterai-install-prompt-dismissed';

/**
 * Check if running on iOS Safari (not in standalone mode)
 */
function shouldShowInstallPrompt(): boolean {
  if (typeof window === 'undefined') return false;

  // Check if iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (!isIOS) return false;

  // Check if already installed (standalone mode)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  if (isStandalone) return false;

  // Check if Safari (not Chrome/Firefox on iOS)
  const isSafari = /Safari/.test(navigator.userAgent) &&
    !/CriOS|FxiOS/.test(navigator.userAgent);
  if (!isSafari) return false;

  // Check if previously dismissed
  const dismissed = localStorage.getItem(DISMISSED_KEY);
  if (dismissed) return false;

  return true;
}

/**
 * Install Prompt Component
 */
export function InstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Delay check to avoid hydration mismatch
    const timer = setTimeout(() => {
      setIsVisible(shouldShowInstallPrompt());
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    lightTap();
    localStorage.setItem(DISMISSED_KEY, 'true');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed inset-x-4 bottom-20 z-50 rounded-2xl border
            border-gray-700 bg-gray-900/95 p-4 shadow-xl backdrop-blur-lg"
          style={{
            marginBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex h-12 w-12 items-center justify-center
              rounded-xl bg-cyan-500/20">
              <svg className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="font-semibold text-white">Install VECTERAI</h3>
              <p className="mt-1 text-sm text-gray-400">
                Tap <span className="inline-flex items-center gap-1">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l.117.007a1 1 0 0 1 .876.876L13 3v8h4l.117.007a1 1 0 0 1 .876.876L18 12a1 1 0 0 1-.883.993L17 13h-4v8l-.007.117a1 1 0 0 1-.876.876L12 22a1 1 0 0 1-.993-.883L11 21v-8H7l-.117-.007A1 1 0 0 1 6 12a1 1 0 0 1 .883-.993L7 11h4V3l.007-.117a1 1 0 0 1 .876-.876L12 2z" />
                  </svg>
                  Share
                </span> then &quot;Add to Home Screen&quot;
              </p>
            </div>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              className="rounded-lg p-2 text-gray-500 transition-colors
                hover:bg-gray-800 hover:text-gray-300"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
