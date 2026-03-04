/**
 * @file WalletCardHeader.tsx
 * @summary Label editing and status badge for wallet card
 * @dependencies react
 */

'use client';

import { useState } from 'react';
import { lightTap } from '@/core/utils/haptics';

const statusColors = {
  main: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  verified: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  unverified: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
};

function formatStatus(status: 'main' | 'verified' | 'unverified'): string {
  if (status === 'main') return 'Main';
  if (status === 'verified') return 'Verified';
  return 'Pending';
}

interface WalletCardHeaderProps {
  label: string;
  status: 'main' | 'verified' | 'unverified';
  isMain: boolean;
  onEditLabel: (label: string) => void;
}

export function WalletCardHeader({ label, status, isMain, onEditLabel }: WalletCardHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const colors = statusColors[status];

  const handleSaveLabel = () => {
    if (editLabel.trim() && editLabel !== label) {
      onEditLabel(editLabel.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="mb-3 flex items-center justify-between">
      {isEditing ? (
        <input
          type="text"
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          onBlur={handleSaveLabel}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveLabel();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          autoFocus
          className="w-32 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-white outline-none focus:border-cyan-500"
        />
      ) : (
        <button
          onClick={() => {
            if (!isMain) {
              setIsEditing(true);
              lightTap();
            }
          }}
          className={`text-sm font-medium ${isMain ? 'cursor-default' : 'cursor-pointer hover:text-cyan-400'} text-white`}
        >
          {label}
        </button>
      )}
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
        {formatStatus(status)}
      </span>
    </div>
  );
}
