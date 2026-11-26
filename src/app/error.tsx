'use client';

import { AlertCircle, RotateCcw } from 'lucide-react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="pt-4 space-y-4">
      <h1 className="display-headline text-[#1D1D1F]">Opal</h1>
      <div
        role="alert"
        className="rounded-[var(--radius-hero)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4"
      >
        <div className="flex items-center gap-3 text-[#CC2F52]">
          <AlertCircle size={22} aria-hidden="true" />
          <h2 className="text-lg font-bold">Unable to render screen</h2>
        </div>
        <p className="text-sm text-[#5B5B62]">
          {error.message || 'An unexpected client error interrupted rendering.'}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 min-h-[48px] px-5 rounded-[var(--radius-chip)] bg-[#1D1D1F] text-white text-sm font-semibold"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Retry screen
          </button>
          <button
            type="button"
            onClick={() => window.location.replace('/')}
            className="inline-flex items-center gap-2 min-h-[48px] px-5 rounded-[var(--radius-chip)] bg-[#E1DAFB] text-[#1D1D1F] text-sm font-semibold"
          >
            Reload home
          </button>
        </div>
      </div>
    </div>
  );
}
