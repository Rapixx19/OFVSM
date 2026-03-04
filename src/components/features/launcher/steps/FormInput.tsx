/**
 * @file FormInput.tsx
 * @summary Reusable form input with label and error
 */

'use client';

import type { ChangeEvent } from 'react';

interface FormInputProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  maxLength: number;
  error?: string;
  type?: 'text' | 'textarea';
  optional?: boolean;
  uppercase?: boolean;
  rows?: number;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

/**
 * Form input with label and validation
 */
export function FormInput({ id, label, value, placeholder, maxLength, error, type = 'text', optional, uppercase, rows = 3, onChange }: FormInputProps) {
  const baseClasses = `w-full rounded-lg border bg-gray-900/50 px-4 py-3 text-white placeholder-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400/50 ${error ? 'border-red-500' : 'border-gray-700'}`;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-300">
        {label} {optional && <span className="font-normal text-gray-500">(optional)</span>}
      </label>
      {type === 'textarea' ? (
        <textarea id={id} value={value} onChange={onChange} placeholder={placeholder} rows={rows} maxLength={maxLength} className={`${baseClasses} resize-none`} />
      ) : (
        <input id={id} type="text" value={value} onChange={onChange} placeholder={placeholder} maxLength={maxLength} className={`${baseClasses} ${uppercase ? 'font-mono uppercase' : ''}`} />
      )}
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      <p className="mt-1 text-xs text-gray-500">{value.length}/{maxLength} characters</p>
    </div>
  );
}
