'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useApp } from '@/components/AppProvider';

interface MotionContextValue {
  reduced: boolean;
  ecoMode: boolean;
  osReduced: boolean;
}

const MotionContext = createContext<MotionContextValue>({
  reduced: false,
  ecoMode: false,
  osReduced: false,
});

export function MotionProvider({ children }: { children: ReactNode }) {
  const { settings } = useApp();
  const [osReduced, setOsReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setOsReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setOsReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const reduced = settings.ecoMode || osReduced;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.motionMode = reduced ? 'reduced' : 'full';
  }, [reduced]);

  const value = useMemo(
    () => ({ reduced, ecoMode: settings.ecoMode, osReduced }),
    [reduced, settings.ecoMode, osReduced]
  );

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useMotionMode(): MotionContextValue {
  return useContext(MotionContext);
}
