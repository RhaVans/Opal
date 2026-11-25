'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search } from 'lucide-react';
import { ALL_FLASHCARDS } from '@/lib/curriculum';
import { useApp } from '@/components/AppProvider';
import { TrilingualBlock } from '@/components/text/TrilingualBlock';
import { TTSButton } from '@/components/text/TTSButton';
import { Sparkle } from '@/components/ui/Sparkle';

interface GlossaryDialogProps {
  open: boolean;
  onClose: () => void;
}

export function GlossaryDialog({ open, onClose }: GlossaryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { settings } = useApp();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      setTimeout(() => inputRef.current?.focus(), 0);
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Fallback for browsers lacking <dialog closedby="any">
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };
    dialog.addEventListener('close', handleClose);

    if ('closedBy' in HTMLDialogElement.prototype) {
      return () => dialog.removeEventListener('close', handleClose);
    }

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) dialog.close();
    };
    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('pointerup', onPointerUp);

    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('pointerup', onPointerUp);
    };
  }, [onClose]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_FLASHCARDS.slice(0, 30);
    return ALL_FLASHCARDS.filter((card) => {
      const haystack = [
        card.section,
        card.prompt.jaPlain,
        card.prompt.id,
        card.prompt.en,
        card.answer.jaPlain,
        card.answer.id,
        card.answer.en,
        card.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    }).slice(0, 40);
  }, [query]);

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="glossary-title"
      className="max-h-[85dvh] open:flex open:flex-col overflow-hidden"
    >
      <div className="p-4 border-b border-black/10 flex items-center justify-between gap-3 bg-white sticky top-0 z-10">
        <div>
          <span className="eyebrow text-[#4D3EA3]">Read-Only Reference</span>
          <h2 id="glossary-title" className="text-xl font-bold text-[#1D1D1F]">
            Curriculum Glossary
          </h2>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close glossary"
          className="inline-flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-[var(--radius-chip)] bg-[#F5F5F7] text-[#1D1D1F] hover:bg-black/10"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="p-4 border-b border-black/8 bg-[#F5F5F7]">
        <search>
          <label htmlFor="glossary-search" className="block text-xs font-semibold text-[#5B5B62] mb-1.5">
            Search Japanese, Indonesian, or English terms
          </label>
          <div className="relative flex items-center">
            <Search
              size={18}
              className="absolute left-3.5 text-[#5B5B62] pointer-events-none"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              id="glossary-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 空室, RevPAR, 119, Halal..."
              className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-[var(--radius-card)] bg-white border border-black/15 text-sm text-[#1D1D1F]"
            />
          </div>
        </search>
      </div>

      <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-[#F5F5F7]">
        {matches.length === 0 ? (
          <div className="rounded-[var(--radius-card)] bg-white p-6 text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-[var(--radius-icon)] bg-[#E1DAFB] flex items-center justify-center">
              <Sparkle size={18} color="#4D3EA3" />
            </div>
            <p className="text-sm font-bold text-[#1D1D1F]">No matching terms</p>
            <p className="text-xs text-[#5B5B62]">
              Try a chapter keyword, Japanese kana, or numeric rule.
            </p>
          </div>
        ) : (
          matches.map((card) => (
            <article
              key={card.id}
              className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-soft)] space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="eyebrow text-[#4D3EA3]">
                  CH 0{card.chapter} · p.{card.pdfPage}
                </span>
                <TTSButton
                  text={`${card.prompt.jaPlain}。 ${card.answer.jaPlain}`}
                  ariaLabel={`Listen to glossary item ${card.id}`}
                />
              </div>
              <TrilingualBlock
                text={card.prompt}
                furiganaMode={settings.furiganaMode}
                langPreset={settings.langPreset}
                jaClassName="text-base font-bold leading-[1.8]"
              />
              <div className="pt-2 border-t border-black/8">
                <TrilingualBlock
                  text={card.answer}
                  furiganaMode={settings.furiganaMode}
                  langPreset={settings.langPreset}
                  jaClassName="text-sm font-semibold leading-[1.75]"
                  secondaryClassName="text-xs leading-relaxed"
                />
              </div>
            </article>
          ))
        )}
      </div>
    </dialog>
  );
}
