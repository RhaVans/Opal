'use client';

import { SharedPill } from '@/components/motion/SharedPill';
import { TransitionLink } from '@/components/motion/ViewTransitionProvider';
import { usePathname } from 'next/navigation';

export function DrillsCbtSwitch() {
  const pathname = usePathname() || '/drills';
  const isDrills = pathname.startsWith('/drills');
  const isCbt = pathname.startsWith('/cbt');

  return (
    <nav
      aria-label="Drills and CBT mode switcher"
      className="inline-flex items-center p-1 rounded-[var(--radius-chip)] bg-[rgba(29,29,31,0.06)] border border-[rgba(29,29,31,0.10)]"
    >
      <TransitionLink
        href="/drills"
        transitionType="nav-backward"
        aria-current={isDrills ? 'page' : undefined}
        className={[
          'relative overflow-hidden inline-flex items-center justify-center min-h-[48px] min-w-[88px] px-5 rounded-[var(--radius-chip)] text-sm font-semibold transition-colors active:scale-95',
          isDrills ? 'text-white' : 'text-[#1D1D1F] hover:bg-black/5',
        ].join(' ')}
      >
        <SharedPill groupId="drills-cbt" active={isDrills} className="bg-[#1D1D1F] shadow-sm" />
        <span className="relative z-10">Drills</span>
      </TransitionLink>
      <TransitionLink
        href="/cbt"
        transitionType="nav-forward"
        aria-current={isCbt ? 'page' : undefined}
        className={[
          'relative overflow-hidden inline-flex items-center justify-center min-h-[48px] min-w-[88px] px-5 rounded-[var(--radius-chip)] text-sm font-semibold transition-colors active:scale-95',
          isCbt ? 'text-white' : 'text-[#1D1D1F] hover:bg-black/5',
        ].join(' ')}
      >
        <SharedPill groupId="drills-cbt" active={isCbt} className="bg-[#1D1D1F] shadow-sm" />
        <span className="relative z-10">CBT</span>
      </TransitionLink>
    </nav>
  );
}
