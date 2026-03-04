/**
 * @file ImageUploader.tsx
 * @summary Token image upload with preview
 */

'use client';

import type { ChangeEvent } from 'react';

interface ImageUploaderProps {
  imagePreview: string | null;
  error?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Token image uploader with preview
 */
export function ImageUploader({ imagePreview, error, onChange }: ImageUploaderProps) {
  return (
    <>
      <div className="flex justify-center">
        <label className="group relative cursor-pointer">
          <input type="file" accept="image/*" onChange={onChange} className="hidden" />
          <div className={`flex h-32 w-32 items-center justify-center rounded-full border-2 border-dashed transition-all ${imagePreview ? 'border-cyan-400/50' : 'border-gray-600 hover:border-cyan-400/50'} ${error ? 'border-red-500' : ''}`}>
            {imagePreview ? (
              <img src={imagePreview} alt="Token preview" className="h-full w-full rounded-full object-cover" />
            ) : (
              <div className="text-center">
                <svg className="mx-auto h-8 w-8 text-gray-500 group-hover:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="mt-1 block text-xs text-gray-500">Upload image</span>
              </div>
            )}
          </div>
          {imagePreview && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="text-sm text-white">Change</span>
            </div>
          )}
        </label>
      </div>
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </>
  );
}
