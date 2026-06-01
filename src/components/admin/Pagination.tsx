'use client';

import React from 'react';
import { Button } from '@/design-system/components/primitives/Button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds the list of page numbers to render, inserting `null` for ellipsis gaps.
 * Always shows first, last, current, and 1 neighbor on each side of current.
 */
function getPageNumbers(current: number, total: number): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.add(i);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | null)[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push(null); // ellipsis
    }
    result.push(sorted[i]);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const rangeStart = (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);
  const pages = getPageNumbers(currentPage, totalPages);

  const isFirst = currentPage === 1;
  const isLast = currentPage === totalPages;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
      {/* Item count */}
      <p className="text-sm text-fm-neutral-500 shrink-0">
        Showing{' '}
        <span className="font-medium text-fm-neutral-700">{rangeStart}</span>
        {' '}&ndash;{' '}
        <span className="font-medium text-fm-neutral-700">{rangeEnd}</span>
        {' '}of{' '}
        <span className="font-medium text-fm-neutral-700">{totalItems}</span>
        {' '}items
      </p>

      {/* Page controls */}
      <div className="flex items-center gap-1">
        {/* First page (desktop only) */}
        <Button
          variant="ghost"
          size="sm"
          disabled={isFirst}
          onClick={() => onPageChange(1)}
          aria-label="First page"
          className="hidden sm:inline-flex"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>

        {/* Previous */}
        <Button
          variant="ghost"
          size="sm"
          disabled={isFirst}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="sr-only sm:not-sr-only">Prev</span>
        </Button>

        {/* Page numbers (desktop only) */}
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((page, idx) =>
            page === null ? (
              <span
                key={`ellipsis-${idx}`}
                style={{ textAlign: 'center' }}
                className="w-9 text-fm-neutral-400 select-none"
              >
                &hellip;
              </span>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onPageChange(page)}
                aria-label={`Page ${page}`}
                aria-current={page === currentPage ? 'page' : undefined}
                className="min-w-[2.25rem]"
              >
                {page}
              </Button>
            )
          )}
        </div>

        {/* Mobile page indicator */}
        <span className="sm:hidden text-sm font-medium text-fm-neutral-700 px-2">
          {currentPage} / {totalPages}
        </span>

        {/* Next */}
        <Button
          variant="ghost"
          size="sm"
          disabled={isLast}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          <span className="sr-only sm:not-sr-only">Next</span>
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* Last page (desktop only) */}
        <Button
          variant="ghost"
          size="sm"
          disabled={isLast}
          onClick={() => onPageChange(totalPages)}
          aria-label="Last page"
          className="hidden sm:inline-flex"
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
