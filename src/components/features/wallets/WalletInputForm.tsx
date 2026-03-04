/**
 * @file WalletInputForm.tsx
 * @summary Address and label inputs for adding a wallet
 * @dependencies framer-motion, @solana/web3.js
 */

'use client';

import { motion } from 'framer-motion';
import { PublicKey } from '@solana/web3.js';

function isValidAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

interface WalletInputFormProps {
  address: string;
  label: string;
  onAddressChange: (value: string) => void;
  onLabelChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  error?: string | null;
}

export function WalletInputForm({
  address,
  label,
  onAddressChange,
  onLabelChange,
  onSubmit,
  isSubmitting,
  error,
}: WalletInputFormProps) {
  const isAddressValid = address.length > 0 && isValidAddress(address);

  return (
    <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h2 className="mb-4 text-xl font-semibold text-white">Add Wallet</h2>
      <p className="mb-6 text-sm text-gray-400">
        Link an additional wallet to your account. You&apos;ll need to verify ownership by signing a message.
      </p>

      {/* Address input */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-400">Wallet Address</label>
        <input
          type="text"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="Paste Solana address..."
          className={`
            w-full rounded-lg border bg-gray-800 px-4 py-3 font-mono text-sm text-white
            outline-none transition-colors
            ${address && !isAddressValid ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-cyan-500'}
          `}
        />
        {address && !isAddressValid && <p className="mt-1 text-xs text-red-400">Invalid Solana address</p>}
      </div>

      {/* Label input */}
      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium text-gray-400">Label (optional)</label>
        <input
          type="text"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="e.g., Trading Wallet"
          maxLength={32}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-cyan-500"
        />
      </div>

      {/* Error message */}
      {error && <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}

      {/* Submit button */}
      <button
        onClick={onSubmit}
        disabled={!isAddressValid || isSubmitting}
        className={`
          w-full rounded-lg py-3 font-medium transition-all
          ${isAddressValid && !isSubmitting ? 'bg-cyan-500 text-white hover:bg-cyan-400' : 'cursor-not-allowed bg-gray-700 text-gray-400'}
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
  );
}
