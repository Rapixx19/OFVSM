/**
 * @file ScheduleToggle.tsx
 * @summary Calendar-style picker for scheduling Ghost Launches
 * @dependencies framer-motion, react
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';

interface ScheduleToggleProps {
  onSchedule: (date: Date) => void;
  disabled?: boolean;
}

/**
 * Quick preset options for launch timing
 */
const PRESETS = [
  { label: 'Peak Hours', description: 'Today 2-4 PM UTC', hours: 14 },
  { label: 'Low Gas', description: 'Tonight 2 AM UTC', hours: 26 },
  { label: 'Tomorrow', description: 'Same time tomorrow', hours: 24 },
] as const;

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/**
 * Schedule Toggle Component
 */
export function ScheduleToggle({ onSchedule, disabled }: ScheduleToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [customTime, setCustomTime] = useState('');

  const presetDates = useMemo(() => {
    const now = new Date();
    return PRESETS.map((preset) => {
      const date = new Date(now);
      date.setHours(date.getHours() + preset.hours);
      date.setMinutes(0);
      date.setSeconds(0);
      return { ...preset, date };
    });
  }, []);

  const handlePresetSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleConfirm = () => {
    if (selectedDate) {
      onSchedule(selectedDate);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 rounded-lg border px-4 py-2
          transition-colors
          ${isOpen
            ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400'
            : 'border-gray-600 text-gray-300 hover:border-gray-500'}
          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-medium">
          {selectedDate ? formatDate(selectedDate) : 'Schedule'}
        </span>
      </motion.button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl
              border border-gray-700 bg-gray-900 p-4 shadow-xl"
          >
            <h4 className="mb-3 text-sm font-medium text-white">Quick Presets</h4>

            <div className="space-y-2">
              {presetDates.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetSelect(preset.date)}
                  className={`
                    w-full rounded-lg border p-3 text-left transition-colors
                    ${selectedDate?.getTime() === preset.date.getTime()
                      ? 'border-cyan-400 bg-cyan-400/10'
                      : 'border-gray-700 hover:border-gray-600'}
                  `}
                >
                  <p className="font-medium text-white">{preset.label}</p>
                  <p className="text-xs text-gray-400">{preset.description}</p>
                </button>
              ))}
            </div>

            {/* Custom Time Input */}
            <div className="mt-4">
              <label className="mb-1 block text-xs text-gray-400">Custom Time</label>
              <input
                type="datetime-local"
                value={customTime}
                onChange={(e) => {
                  setCustomTime(e.target.value);
                  if (e.target.value) {
                    setSelectedDate(new Date(e.target.value));
                  }
                }}
                className="w-full rounded-lg border border-gray-700 bg-gray-800
                  px-3 py-2 text-sm text-white"
              />
            </div>

            {/* Confirm Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleConfirm}
              disabled={!selectedDate}
              className={`
                mt-4 w-full rounded-lg py-2 text-sm font-semibold
                ${selectedDate
                  ? 'bg-cyan-500 text-black hover:bg-cyan-400'
                  : 'cursor-not-allowed bg-gray-700 text-gray-400'}
              `}
            >
              Confirm Schedule
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
