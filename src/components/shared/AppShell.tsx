/**
 * @file AppShell.tsx
 * @summary App shell wrapper with iOS safe-area inset handling
 * @dependencies react
 */

'use client';

import { type ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
  /** Whether to include bottom navigation padding */
  hasBottomNav?: boolean;
}

/**
 * App Shell Component
 * Handles iOS safe-area insets for notch, Dynamic Island, and Home Bar
 */
export function AppShell({ children, hasBottomNav = true }: AppShellProps) {
  return (
    <div
      className="flex min-h-screen flex-col bg-gray-950"
      style={{
        // Safe area padding via CSS env() variables
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        // Only add bottom padding if no bottom nav (nav handles its own)
        paddingBottom: hasBottomNav ? '0' : 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Main content area */}
      <main
        className="flex-1"
        style={{
          // Extra bottom padding for bottom nav clearance
          paddingBottom: hasBottomNav ? 'calc(4.5rem + env(safe-area-inset-bottom))' : '0',
        }}
      >
        {children}
      </main>
    </div>
  );
}

/**
 * Safe Area Spacer - adds space for iOS safe areas
 */
export function SafeAreaSpacer({ position }: { position: 'top' | 'bottom' }) {
  return (
    <div
      style={{
        height: position === 'top'
          ? 'env(safe-area-inset-top)'
          : 'env(safe-area-inset-bottom)',
      }}
    />
  );
}
