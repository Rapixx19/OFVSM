/**
 * @file BrandingStep.tsx
 * @summary Step 1: Token branding - Name, Symbol, Image
 * @dependencies framer-motion, react
 */

'use client';

import { motion } from 'framer-motion';
import { useState, useCallback, type ChangeEvent } from 'react';
import type { LaunchParams, ValidationErrors } from '@/features/launcher/types/ghost';

/**
 * Props for BrandingStep
 */
interface BrandingStepProps {
  params: Partial<LaunchParams>;
  errors: ValidationErrors;
  onUpdate: (partial: Partial<LaunchParams>) => void;
  onNext: () => void;
  canNext: boolean;
}

/**
 * Step 1: Token Branding
 * Collects name, symbol, and image for the token
 */
export function BrandingStep({
  params,
  errors,
  onUpdate,
  onNext,
  canNext,
}: BrandingStepProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(
    params.imageUri || null
  );

  const handleNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onUpdate({ name: e.target.value });
    },
    [onUpdate]
  );

  const handleSymbolChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onUpdate({ symbol: e.target.value.toUpperCase() });
    },
    [onUpdate]
  );

  const handleDescriptionChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate({ description: e.target.value });
    },
    [onUpdate]
  );

  const handleImageChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be under 5MB');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        // In production, this would upload to IPFS
        onUpdate({ imageUri: result });
      };
      reader.readAsDataURL(file);
    },
    [onUpdate]
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white">Token Branding</h2>
        <p className="mt-1 text-sm text-gray-400">
          Define your token&apos;s identity
        </p>
      </div>

      {/* Image Upload */}
      <div className="flex justify-center">
        <label className="group relative cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
          <div
            className={`
              flex h-32 w-32 items-center justify-center rounded-full
              border-2 border-dashed transition-all
              ${
                imagePreview
                  ? 'border-cyan-400/50'
                  : 'border-gray-600 hover:border-cyan-400/50'
              }
              ${errors.imageUri ? 'border-red-500' : ''}
            `}
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Token preview"
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <div className="text-center">
                <svg
                  className="mx-auto h-8 w-8 text-gray-500 group-hover:text-cyan-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="mt-1 block text-xs text-gray-500">
                  Upload image
                </span>
              </div>
            )}
          </div>
          {/* Edit overlay */}
          {imagePreview && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="text-sm text-white">Change</span>
            </div>
          )}
        </label>
      </div>
      {errors.imageUri && (
        <p className="text-center text-sm text-red-400">{errors.imageUri}</p>
      )}

      {/* Name Input */}
      <div>
        <label
          htmlFor="token-name"
          className="mb-1 block text-sm font-medium text-gray-300"
        >
          Token Name
        </label>
        <input
          id="token-name"
          type="text"
          value={params.name || ''}
          onChange={handleNameChange}
          placeholder="e.g., Ghost Token"
          maxLength={32}
          className={`
            w-full rounded-lg border bg-gray-900/50 px-4 py-3
            text-white placeholder-gray-500 transition-colors
            focus:outline-none focus:ring-2 focus:ring-cyan-400/50
            ${errors.name ? 'border-red-500' : 'border-gray-700'}
          `}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-400">{errors.name}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          {params.name?.length || 0}/32 characters
        </p>
      </div>

      {/* Symbol Input */}
      <div>
        <label
          htmlFor="token-symbol"
          className="mb-1 block text-sm font-medium text-gray-300"
        >
          Symbol
        </label>
        <input
          id="token-symbol"
          type="text"
          value={params.symbol || ''}
          onChange={handleSymbolChange}
          placeholder="e.g., GHOST"
          maxLength={10}
          className={`
            w-full rounded-lg border bg-gray-900/50 px-4 py-3
            font-mono text-white uppercase placeholder-gray-500 transition-colors
            focus:outline-none focus:ring-2 focus:ring-cyan-400/50
            ${errors.symbol ? 'border-red-500' : 'border-gray-700'}
          `}
        />
        {errors.symbol && (
          <p className="mt-1 text-sm text-red-400">{errors.symbol}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          {params.symbol?.length || 0}/10 characters
        </p>
      </div>

      {/* Description (Optional) */}
      <div>
        <label
          htmlFor="token-description"
          className="mb-1 block text-sm font-medium text-gray-300"
        >
          Description{' '}
          <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <textarea
          id="token-description"
          value={params.description || ''}
          onChange={handleDescriptionChange}
          placeholder="What makes your token special?"
          rows={3}
          maxLength={500}
          className="
            w-full resize-none rounded-lg border border-gray-700 bg-gray-900/50
            px-4 py-3 text-white placeholder-gray-500 transition-colors
            focus:outline-none focus:ring-2 focus:ring-cyan-400/50
          "
        />
        <p className="mt-1 text-xs text-gray-500">
          {params.description?.length || 0}/500 characters
        </p>
      </div>

      {/* Next Button */}
      <motion.button
        whileHover={{ scale: canNext ? 1.02 : 1 }}
        whileTap={{ scale: canNext ? 0.98 : 1 }}
        onClick={onNext}
        disabled={!canNext}
        className={`
          w-full rounded-lg py-4 font-semibold transition-all
          ${
            canNext
              ? 'bg-cyan-500 text-black hover:bg-cyan-400'
              : 'cursor-not-allowed bg-gray-700 text-gray-400'
          }
        `}
      >
        Continue to Economics
      </motion.button>
    </motion.div>
  );
}
