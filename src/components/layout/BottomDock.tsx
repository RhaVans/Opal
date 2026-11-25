'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, BookOpen, Home, Layers } from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { FluidDockOrb } from '@/components/layout/FluidDockOrb';

export function BottomDock() {
  const pathname = usePathname() || '/';
  const { hideDockOverride } = useApp();

  // BottomDock hidden during study sessions or active drill/exam runs
  if (pathname.startsWith('/study') || hideDockOverride) {
    return null;
  }

  const isHome = pathname === '/';
  const isChapters = pathname.startsWith('/chapters');
  const isDrillsOrCbt = pathname.startsWith('/drills') || pathname.startsWith('/cbt');
  const isStats = pathname.startsWith('/stats');

  return (
    <nav
      aria-label="Primary navigation"
      style={{
        bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        width: 'min(calc(100% - 32px), 440px)',
      }}
      className="fixed left-1/2 -translate-x-1/2 z-40 h-16 rounded-[var(--radius-pill)] bg-[#1D1D1F] border border-white/12 shadow-[var(--shadow-medium)] px-2 flex items-center justify-between"
    >
      <Link
        href="/"
        aria-label="Home"
        aria-current={isHome ? 'page' : undefined}
        className={[
          'relative flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-2 rounded-full transition-colors',
          isHome ? 'text-white bg-white/12' : 'text-[#B4B4B8] hover:text-white',
        ].join(' ')}
      >
        <Home size={22} strokeWidth={2} aria-hidden="true" />
        <span className="text-[10px] font-semibold mt-0.5 leading-none">Home</span>
      </Link>

      <Link
        href="/chapters"
        aria-label="Chapters"
        aria-current={isChapters ? 'page' : undefined}
        className={[
          'relative flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-2 rounded-full transition-colors',
          isChapters ? 'text-white bg-white/12' : 'text-[#B4B4B8] hover:text-white',
        ].join(' ')}
      >
        <BookOpen size={22} strokeWidth={2} aria-hidden="true" />
        <span className="text-[10px] font-semibold mt-0.5 leading-none">Chapters</span>
      </Link>

      <FluidDockOrb
        href="/study?mode=due"
        ariaLabel="Start due flashcard review"
      />

      <Link
        href="/drills"
        aria-label="Drills and CBT"
        aria-current={isDrillsOrCbt ? 'page' : undefined}
        className={[
          'relative flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-2 rounded-full transition-colors',
          isDrillsOrCbt ? 'text-white bg-white/12' : 'text-[#B4B4B8] hover:text-white',
        ].join(' ')}
      >
        <Layers size={22} strokeWidth={2} aria-hidden="true" />
        <span className="text-[10px] font-semibold mt-0.5 leading-none">Drills</span>
      </Link>

      <Link
        href="/stats"
        aria-label="Progress and settings"
        aria-current={isStats ? 'page' : undefined}
        className={[
          'relative flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-2 rounded-full transition-colors',
          isStats ? 'text-white bg-white/12' : 'text-[#B4B4B8] hover:text-white',
        ].join(' ')}
      >
        <BarChart3 size={22} strokeWidth={2} aria-hidden="true" />
        <span className="text-[10px] font-semibold mt-0.5 leading-none">Stats</span>
      </Link>
    </nav>
  );
}
