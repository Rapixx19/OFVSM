/**
 * @file GhostStepper.tsx
 * @summary Main stepper container for Ghost Engine launch flow
 * @dependencies framer-motion, react
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useGhostLaunch } from '@/features/launcher/hooks/useGhostLaunch';
import { STEPS } from '@/features/launcher/types/ghost';
import { BrandingStep } from './steps/BrandingStep';
import { EconomicsStep } from './steps/EconomicsStep';
import { ReviewStep } from './steps/ReviewStep';

/**
 * Step indicator component
 */
function StepIndicator({
  steps,
  currentStep,
}: {
  steps: typeof STEPS;
  currentStep: number;
}) {
  return (
    <div className="mb-8">
      {/* Progress line */}
      <div className="relative">
        <div className="absolute left-0 top-4 h-0.5 w-full bg-gray-700" />
        <motion.div
          className="absolute left-0 top-4 h-0.5 bg-cyan-400"
          initial={{ width: '0%' }}
          animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.3 }}
        />

        {/* Step circles */}
        <div className="relative flex justify-between">
          {steps.map((step) => {
            const isActive = step.id === currentStep;
            const isComplete = step.id < currentStep;

            return (
              <div key={step.id} className="flex flex-col items-center">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    backgroundColor: isComplete || isActive ? '#22d3ee' : '#374151',
                  }}
                  className={`
                    flex h-8 w-8 items-center justify-center rounded-full
                    text-sm font-semibold transition-colors
                    ${isComplete || isActive ? 'text-black' : 'text-gray-400'}
                  `}
                >
                  {isComplete ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    step.id
                  )}
                </motion.div>
                <span
                  className={`
                    mt-2 text-xs font-medium
                    ${isActive ? 'text-cyan-400' : 'text-gray-500'}
                  `}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Ghost Stepper Component
 * Progressive disclosure form for token launch
 */
export function GhostStepper() {
  const {
    step,
    params,
    fees,
    status,
    error,
    result,
    validationErrors,
    isValidForCurrentStep,
    isValidForLaunch,
    canGoNext,
    isLoading,
    nextStep,
    prevStep,
    updateParams,
    calculateFees,
    launch,
    reset,
  } = useGhostLaunch();

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Card container */}
      <motion.div
        layout
        className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 backdrop-blur-xl"
      >
        {/* Step indicator */}
        <StepIndicator steps={STEPS} currentStep={step} />

        {/* Step content with animations */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <BrandingStep
              key="branding"
              params={params}
              errors={validationErrors}
              onUpdate={updateParams}
              onNext={nextStep}
              canNext={canGoNext}
            />
          )}

          {step === 2 && (
            <EconomicsStep
              key="economics"
              params={params}
              errors={validationErrors}
              onUpdate={updateParams}
              onNext={nextStep}
              onPrev={prevStep}
              canNext={canGoNext}
            />
          )}

          {step === 3 && (
            <ReviewStep
              key="review"
              params={params}
              fees={fees}
              status={status}
              error={error}
              result={result}
              onUpdate={updateParams}
              onCalculateFees={calculateFees}
              onLaunch={launch}
              onPrev={prevStep}
              onReset={reset}
              canLaunch={isValidForLaunch}
              isLoading={isLoading}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Atomic guarantee banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 text-center"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-900/50 px-4 py-2">
          <svg
            className="h-4 w-4 text-cyan-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span className="text-sm text-gray-400">
            <span className="font-medium text-white">Atomic execution</span>
            {' '}— All or nothing, no partial failures
          </span>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Export for lazy loading
 */
export default GhostStepper;
