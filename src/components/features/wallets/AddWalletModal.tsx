/**
 * @file AddWalletModal.tsx
 * @summary Modal for adding and verifying alt wallets
 * @dependencies framer-motion, react
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PublicKey } from '@solana/web3.js';
import { lightTap } from '@/core/utils/haptics';

/**
 * Verification step types
 */
type VerificationStep = 'input' | 'switching' | 'signing' | 'success' | 'error';

/**
 * Props for AddWalletModal
 */
interface AddWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWallet: (address: string, label?: string) => Promise<boolean>;
  onVerify: () => Promise<boolean>;
  pendingAddress?: string | null;
  connectedAddress?: string | null;
  error?: string | null;
}

/**
 * Truncate wallet address for display
 */
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Validate Solana wallet address
 */
function isValidAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Switching network animation overlay
 */
function SwitchingOverlay({ targetAddress }: { targetAddress: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center py-8"
    >
      {/* Animated rings */}
      <div className="relative mb-6">
        <motion.div
          className="h-16 w-16 rounded-full border-2 border-cyan-400/30"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-cyan-400"
          animate={{ scale: [1, 1.1, 1], rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        </div>
      </div>

      <h3 className="mb-2 text-lg font-medium text-white">Switching Network</h3>
      <p className="mb-4 text-center text-sm text-gray-400">
        Please switch to your alt wallet in your extension
      </p>
      <div className="rounded-lg bg-gray-800 px-4 py-2">
        <span className="font-mono text-sm text-cyan-400">
          {truncateAddress(targetAddress)}
        </span>
      </div>
    </motion.div>
  );
}

/**
 * Signing request overlay
 */
function SigningOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center py-8"
    >
      <motion.div
        className="mb-6 h-16 w-16 rounded-full bg-cyan-500/20"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        <div className="flex h-full items-center justify-center">
          <svg className="h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </div>
      </motion.div>

      <h3 className="mb-2 text-lg font-medium text-white">Sign to Verify</h3>
      <p className="text-center text-sm text-gray-400">
        Please sign the verification message in your wallet
      </p>
    </motion.div>
  );
}

/**
 * Success overlay
 */
function SuccessOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center py-8"
    >
      <motion.div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <motion.svg
          className="h-8 w-8 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </motion.svg>
      </motion.div>

      <h3 className="mb-2 text-lg font-medium text-white">Wallet Verified!</h3>
      <p className="text-center text-sm text-gray-400">
        Your wallet has been successfully linked
      </p>
    </motion.div>
  );
}

/**
 * Add wallet modal component
 */
export function AddWalletModal({
  isOpen,
  onClose,
  onAddWallet,
  onVerify,
  pendingAddress,
  connectedAddress,
  error,
}: AddWalletModalProps) {
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [step, setStep] = useState<VerificationStep>('input');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine current step based on state
  useEffect(() => {
    if (pendingAddress && connectedAddress === pendingAddress) {
      setStep('signing');
    } else if (pendingAddress) {
      setStep('switching');
    }
  }, [pendingAddress, connectedAddress]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setAddress('');
        setLabel('');
        setStep('input');
        setIsSubmitting(false);
      }, 300);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!isValidAddress(address)) return;

    lightTap();
    setIsSubmitting(true);

    const success = await onAddWallet(address, label || undefined);
    if (success) {
      setStep('switching');
    }

    setIsSubmitting(false);
  };

  const handleVerify = async () => {
    lightTap();
    setIsSubmitting(true);

    const success = await onVerify();
    if (success) {
      setStep('success');
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setStep('error');
    }

    setIsSubmitting(false);
  };

  const isAddressValid = address.length > 0 && isValidAddress(address);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 mx-auto max-w-md rounded-2xl border border-white/10 bg-gray-900/95 p-6 backdrop-blur-xl shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-gray-500 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <AnimatePresence mode="wait">
              {/* Input step */}
              {step === 'input' && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <h2 className="mb-4 text-xl font-semibold text-white">Add Wallet</h2>
                  <p className="mb-6 text-sm text-gray-400">
                    Link an additional wallet to your account. You&apos;ll need to verify ownership by signing a message.
                  </p>

                  {/* Address input */}
                  <div className="mb-4">
                    <label className="mb-1 block text-sm font-medium text-gray-400">
                      Wallet Address
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Paste Solana address..."
                      className={`
                        w-full rounded-lg border bg-gray-800 px-4 py-3 font-mono text-sm text-white
                        outline-none transition-colors
                        ${address && !isAddressValid
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-gray-700 focus:border-cyan-500'
                        }
                      `}
                    />
                    {address && !isAddressValid && (
                      <p className="mt-1 text-xs text-red-400">Invalid Solana address</p>
                    )}
                  </div>

                  {/* Label input */}
                  <div className="mb-6">
                    <label className="mb-1 block text-sm font-medium text-gray-400">
                      Label (optional)
                    </label>
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="e.g., Trading Wallet"
                      maxLength={32}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-cyan-500"
                    />
                  </div>

                  {/* Error message */}
                  {error && (
                    <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    onClick={handleSubmit}
                    disabled={!isAddressValid || isSubmitting}
                    className={`
                      w-full rounded-lg py-3 font-medium transition-all
                      ${isAddressValid && !isSubmitting
                        ? 'bg-cyan-500 text-white hover:bg-cyan-400'
                        : 'cursor-not-allowed bg-gray-700 text-gray-400'
                      }
                    `}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                        />
                        Adding...
                      </span>
                    ) : (
                      'Continue'
                    )}
                  </button>
                </motion.div>
              )}

              {/* Switching step */}
              {step === 'switching' && pendingAddress && (
                <motion.div
                  key="switching"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <SwitchingOverlay targetAddress={pendingAddress} />
                  <p className="mt-4 text-center text-xs text-gray-500">
                    Waiting for wallet connection...
                  </p>
                </motion.div>
              )}

              {/* Signing step */}
              {step === 'signing' && (
                <motion.div
                  key="signing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <SigningOverlay />
                  <button
                    onClick={handleVerify}
                    disabled={isSubmitting}
                    className="mt-4 w-full rounded-lg bg-cyan-500 py-3 font-medium text-white transition-colors hover:bg-cyan-400"
                  >
                    {isSubmitting ? 'Verifying...' : 'Sign & Verify'}
                  </button>
                  {error && (
                    <p className="mt-3 text-center text-sm text-red-400">{error}</p>
                  )}
                </motion.div>
              )}

              {/* Success step */}
              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <SuccessOverlay />
                </motion.div>
              )}

              {/* Error step */}
              {step === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-8 text-center"
                >
                  <div className="mb-4 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                      <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="mb-2 text-lg font-medium text-white">Verification Failed</h3>
                  <p className="mb-4 text-sm text-gray-400">{error || 'Please try again'}</p>
                  <button
                    onClick={() => setStep('input')}
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    Try Again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
