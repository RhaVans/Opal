'use client';

import { usePathname } from 'next/navigation';
import { BarChart3, BookOpen, Home, Layers } from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { FluidDockOrb } from '@/components/layout/FluidDockOrb';
import { SharedPill } from '@/components/motion/SharedPill';
import { SemanticIcon } from '@/components/motion/SemanticIcon';
import { TransitionLink } from '@/components/motion/ViewTransitionProvider';

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
        viewTransitionName: 'bottom-dock',
      }}
      className="fixed left-1/2 -translate-x-1/2 z-40 h-16 rounded-[var(--radius-pill)] bg-[#1D1D1F] border border-white/12 shadow-[var(--shadow-medium)] px-2 flex items-center justify-between"
    >
      <TransitionLink
        href="/"
        aria-label="Home"
        aria-current={isHome ? 'page' : undefined}
        className={[
          'relative flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-2 rounded-full transition-colors active:scale-95',
          isHome ? 'text-white' : 'text-[#B4B4B8] hover:text-white',
        ].join(' ')}
      >
        <SharedPill groupId="bottom-dock" active={isHome} className="bg-white/12" />
        <SemanticIcon behavior="pop-fill" active={isHome} className="relative z-10">
          <Home size={22} strokeWidth={2} aria-hidden="true" />
        </SemanticIcon>
        <span className="relative z-10 text-[10px] font-semibold mt-0.5 leading-none">Home</span>
      </TransitionLink>

      <TransitionLink
        href="/chapters"
        aria-label="Chapters"
        aria-current={isChapters ? 'page' : undefined}
        className={[
          'relative flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-2 rounded-full transition-colors active:scale-95',
          isChapters ? 'text-white' : 'text-[#B4B4B8] hover:text-white',
        ].join(' ')}
      >
        <SharedPill groupId="bottom-dock" active={isChapters} className="bg-white/12" />
        <SemanticIcon behavior="pop-fill" active={isChapters} className="relative z-10">
          <BookOpen size={22} strokeWidth={2} aria-hidden="true" />
        </SemanticIcon>
        <span className="relative z-10 text-[10px] font-semibold mt-0.5 leading-none">Chapters</span>
      </TransitionLink>

      <FluidDockOrb
        href="/study?mode=due"
        ariaLabel="Start due flashcard review"
      />

      <TransitionLink
        href="/drills"
        aria-label="Drills and CBT"
        aria-current={isDrillsOrCbt ? 'page' : undefined}
        className={[
          'relative flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-2 rounded-full transition-colors active:scale-95',
          isDrillsOrCbt ? 'text-white' : 'text-[#B4B4B8] hover:text-white',
        ].join(' ')}
      >
        <SharedPill groupId="bottom-dock" active={isDrillsOrCbt} className="bg-white/12" />
        <SemanticIcon behavior="pop-fill" active={isDrillsOrCbt} className="relative z-10">
          <Layers size={22} strokeWidth={2} aria-hidden="true" />
        </SemanticIcon>
        <span className="relative z-10 text-[10px] font-semibold mt-0.5 leading-none">Drills</span>
      </TransitionLink>

      <TransitionLink
        href="/stats"
        aria-label="Progress and settings"
        aria-current={isStats ? 'page' : undefined}
        className={[
          'relative flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-2 rounded-full transition-colors active:scale-95',
          isStats ? 'text-white' : 'text-[#B4B4B8] hover:text-white',
        ].join(' ')}
      >
        <SharedPill groupId="bottom-dock" active={isStats} className="bg-white/12" />
        <SemanticIcon behavior="pop-fill" active={isStats} className="relative z-10">
          <BarChart3 size={22} strokeWidth={2} aria-hidden="true" />
        </SemanticIcon>
        <span className="relative z-10 text-[10px] font-semibold mt-0.5 leading-none">Stats</span>
      </TransitionLink>
    </nav>
  );
}
