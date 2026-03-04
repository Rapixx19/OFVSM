/**
 * @file WalletCardActions.tsx
 * @summary Set Active and Remove actions for wallet card
 * @dependencies react
 */

'use client';

import { lightTap } from '@/core/utils/haptics';

interface WalletCardActionsProps {
  isActive: boolean;
  isVerified: boolean;
  isMain: boolean;
  onSetActive: () => void;
  onRemove: () => void;
}

export function WalletCardActions({ isActive, isVerified, isMain, onSetActive, onRemove }: WalletCardActionsProps) {
  return (
    <div className="flex items-center justify-between">
      {isVerified || isMain ? (
        <button
          onClick={() => {
            onSetActive();
            lightTap();
          }}
          disabled={isActive}
          className={`
            rounded-lg px-3 py-1.5 text-sm font-medium transition-all
            ${isActive ? 'cursor-default bg-cyan-500/20 text-cyan-400' : 'bg-gray-800 text-gray-300 hover:bg-cyan-500/20 hover:text-cyan-400'}
          `}
        >
          {isActive ? 'Active' : 'Set Active'}
        </button>
      ) : (
        <span className="text-sm text-gray-500">Awaiting verification</span>
      )}

      {!isMain && (
        <button
          onClick={() => {
            onRemove();
            lightTap();
          }}
          className="text-sm text-gray-500 transition-colors hover:text-red-400"
        >
          Remove
        </button>
      )}
    </div>
  );
}
