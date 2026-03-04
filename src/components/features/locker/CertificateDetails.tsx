/**
 * @file CertificateDetails.tsx
 * @summary Expandable certificate details panel
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { SecurityCertificate } from '@/features/locker/types/sentinel';
import { truncateAddress } from '@/core/utils/crypto';

interface CertificateDetailsProps {
  certificate: SecurityCertificate;
  sizeConfig: { panel: string };
}

/** Copy text to clipboard */
async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

/**
 * Expandable certificate details panel
 */
export function CertificateDetails({ certificate, sizeConfig }: CertificateDetailsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(certificate.contractAuditHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`w-full overflow-hidden rounded-lg border border-gray-700/50 bg-gray-800/50 backdrop-blur-sm ${sizeConfig.panel}`}
    >
      <div className="space-y-2">
        {/* Lock Depth */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Lock Depth</span>
          <span className={`font-medium ${certificate.lockDepth === 'permanent' ? 'text-emerald-400' : 'text-cyan-400'}`}>
            {certificate.lockDays !== null ? `${certificate.lockDays} days` : 'Permanent'}
          </span>
        </div>

        {/* Authority Status */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Authority Status</span>
          <span className={`flex items-center gap-1.5 font-medium ${certificate.authorityStatus === 'revoked' ? 'text-emerald-400' : 'text-yellow-400'}`}>
            <span className={`h-2 w-2 rounded-full ${certificate.authorityStatus === 'revoked' ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
            {certificate.authorityStatus === 'revoked' ? 'Revoked' : 'Active'}
          </span>
        </div>

        {/* Contract Audit Hash */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-400">Audit Hash</span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 font-mono text-gray-300 transition-colors hover:text-white"
            title="Click to copy"
          >
            <span>{truncateAddress(certificate.contractAuditHash)}</span>
            <svg className={`h-3.5 w-3.5 ${copied ? 'text-emerald-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {copied ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              )}
            </svg>
          </button>
        </div>

        {/* Verified timestamp */}
        <div className="flex items-center justify-between border-t border-gray-700/50 pt-2">
          <span className="text-gray-500">Verified</span>
          <span className="text-gray-500">{new Date(certificate.verifiedAt).toLocaleString()}</span>
        </div>
      </div>
    </motion.div>
  );
}
