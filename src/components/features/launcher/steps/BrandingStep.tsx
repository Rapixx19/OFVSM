/**
 * @file BrandingStep.tsx
 * @summary Step 1: Token branding - Name, Symbol, Image
 */

'use client';

import { motion } from 'framer-motion';
import { useState, useCallback, type ChangeEvent } from 'react';
import type { LaunchParams, ValidationErrors } from '@/features/launcher/types/ghost';
import { lightTap } from '@/core/utils/haptics';
import { ImageUploader } from './ImageUploader';
import { FormInput } from './FormInput';

interface BrandingStepProps {
  params: Partial<LaunchParams>;
  errors: ValidationErrors;
  onUpdate: (partial: Partial<LaunchParams>) => void;
  onNext: () => void;
  canNext: boolean;
}

/**
 * Step 1: Token Branding
 */
export function BrandingStep({ params, errors, onUpdate, onNext, canNext }: BrandingStepProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(params.imageUri || null);

  const handleNameChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onUpdate({ name: e.target.value });
  }, [onUpdate]);

  const handleSymbolChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onUpdate({ symbol: (e.target as HTMLInputElement).value.toUpperCase() });
  }, [onUpdate]);

  const handleDescriptionChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onUpdate({ description: e.target.value });
  }, [onUpdate]);

  const handleImageChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      lightTap();
      onUpdate({ imageUri: result });
    };
    reader.readAsDataURL(file);
  }, [onUpdate]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white">Token Branding</h2>
        <p className="mt-1 text-sm text-gray-400">Define your token&apos;s identity</p>
      </div>

      <ImageUploader imagePreview={imagePreview} error={errors.imageUri} onChange={handleImageChange} />

      <FormInput id="token-name" label="Token Name" value={params.name || ''} onChange={handleNameChange} placeholder="e.g., Ghost Token" maxLength={32} error={errors.name} />

      <FormInput id="token-symbol" label="Symbol" value={params.symbol || ''} onChange={handleSymbolChange} placeholder="e.g., GHOST" maxLength={10} error={errors.symbol} uppercase />

      <FormInput id="token-description" label="Description" value={params.description || ''} onChange={handleDescriptionChange} placeholder="What makes your token special?" maxLength={500} type="textarea" optional />

      <motion.button
        whileHover={{ scale: canNext ? 1.02 : 1 }}
        whileTap={{ scale: canNext ? 0.98 : 1 }}
        onClick={onNext}
        disabled={!canNext}
        className={`w-full rounded-lg py-4 font-semibold transition-all ${canNext ? 'bg-cyan-500 text-black hover:bg-cyan-400' : 'cursor-not-allowed bg-gray-700 text-gray-400'}`}
      >
        Continue to Economics
      </motion.button>
    </motion.div>
  );
}
