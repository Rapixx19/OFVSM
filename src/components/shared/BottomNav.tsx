/**
 * @file BottomNav.tsx
 * @summary Bottom navigation bar with iOS Home Bar safe-area handling
 * @dependencies react, next/link, next/navigation, framer-motion
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { lightTap } from '@/core/utils/haptics';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: '/cockpit',
    label: 'Cockpit',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/dashboard/portfolio',
    label: 'Portfolio',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    href: '/launcher',
    label: 'Launch',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    href: '/locker',
    label: 'Locker',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
];

/**
 * Bottom Navigation Component
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-800
        bg-gray-950/95 backdrop-blur-lg"
      style={{
        // Padding for iOS Home Bar
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex items-center justify-around px-4 pt-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => lightTap()}
              className="relative flex flex-col items-center px-4 py-2"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`transition-colors ${
                  isActive ? 'text-cyan-400' : 'text-gray-500'
                }`}
              >
                {item.icon}
              </motion.div>
              <span
                className={`mt-1 text-xs font-medium transition-colors ${
                  isActive ? 'text-cyan-400' : 'text-gray-500'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -top-2 h-0.5 w-8 rounded-full bg-cyan-400"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
