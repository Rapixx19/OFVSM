/**
 * @file AddWalletModal.tsx
 * @summary Modal for adding and verifying alt wallets
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { lightTap } from '@/core/utils/haptics';
import { WalletInputForm } from './WalletInputForm';
import { SwitchingOverlay, SigningOverlay, SuccessOverlay, ErrorOverlay } from './overlays';

type VerificationStep = 'input' | 'switching' | 'signing' | 'success' | 'error';

interface AddWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWallet: (address: string, label?: string) => Promise<boolean>;
  onVerify: () => Promise<boolean>;
  pendingAddress?: string | null;
  connectedAddress?: string | null;
  error?: string | null;
}

export function AddWalletModal({
  isOpen, onClose, onAddWallet, onVerify, pendingAddress, connectedAddress, error,
}: AddWalletModalProps) {
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [step, setStep] = useState<VerificationStep>('input');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (pendingAddress && connectedAddress === pendingAddress) setStep('signing');
    else if (pendingAddress) setStep('switching');
  }, [pendingAddress, connectedAddress]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => { setAddress(''); setLabel(''); setStep('input'); setIsSubmitting(false); }, 300);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    lightTap();
    setIsSubmitting(true);
    const success = await onAddWallet(address, label || undefined);
    if (success) setStep('switching');
    setIsSubmitting(false);
  };

  const handleVerify = async () => {
    lightTap();
    setIsSubmitting(true);
    const success = await onVerify();
    if (success) { setStep('success'); setTimeout(() => onClose(), 1500); }
    else setStep('error');
    setIsSubmitting(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-2xl border border-white/10 bg-gray-900/95 p-6 shadow-2xl backdrop-blur-xl"
          >
            <button onClick={onClose} className="absolute right-4 top-4 text-gray-500 hover:text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <AnimatePresence mode="wait">
              {step === 'input' && (
                <WalletInputForm
                  address={address} label={label} onAddressChange={setAddress}
                  onLabelChange={setLabel} onSubmit={handleSubmit} isSubmitting={isSubmitting} error={error}
                />
              )}
              {step === 'switching' && pendingAddress && (
                <motion.div key="switching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <SwitchingOverlay targetAddress={pendingAddress} />
                  <p className="mt-4 text-center text-xs text-gray-500">Waiting for wallet connection...</p>
                </motion.div>
              )}
              {step === 'signing' && (
                <motion.div key="signing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <SigningOverlay />
                  <button
                    onClick={handleVerify} disabled={isSubmitting}
                    className="mt-4 w-full rounded-lg bg-cyan-500 py-3 font-medium text-white transition-colors hover:bg-cyan-400"
                  >
                    {isSubmitting ? 'Verifying...' : 'Sign & Verify'}
                  </button>
                  {error && <p className="mt-3 text-center text-sm text-red-400">{error}</p>}
                </motion.div>
              )}
              {step === 'success' && (
                <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <SuccessOverlay />
                </motion.div>
              )}
              {step === 'error' && (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ErrorOverlay error={error} onRetry={() => setStep('input')} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
