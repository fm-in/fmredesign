'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function SlideOverPanel({ open, onClose, title, children }: SlideOverPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Focus trap on open
  useEffect(() => {
    if (open && panelRef.current) {
      const btn = panelRef.current.querySelector<HTMLElement>('button');
      btn?.focus();
    }
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/40 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        style={{ zIndex: 40 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl flex flex-col pb-[env(safe-area-inset-bottom,20px)]',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ zIndex: 50 }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-fm-neutral-200 shrink-0">
          <h2 className="text-lg font-semibold text-fm-neutral-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-fm-neutral-400 hover:text-fm-neutral-700 hover:bg-fm-neutral-100 transition-colors"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </>
  );
}
