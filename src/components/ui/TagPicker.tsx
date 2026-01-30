'use client';

import * as React from 'react';
import { useRef, useEffect, useState, useMemo } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

function parseCsv(value: string): string[] {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function toCsv(tags: string[]): string {
  return tags.join(', ');
}

export interface TagPickerProps {
  /** Current value as CSV string */
  value: string;
  /** Called with new CSV string when selection changes */
  onChange: (value: string) => void;
  /** Optional list of tag names to suggest (e.g. from GHL) */
  suggestions?: string[];
  /** Allow creating new tags by typing and pressing Enter when no match (default true) */
  allowCreateNew?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
  /** Max height of dropdown list */
  dropdownMaxHeight?: number;
}

export function TagPicker({
  value,
  onChange,
  suggestions = [],
  allowCreateNew = true,
  placeholder = 'Search or type a tag…',
  id,
  className,
  dropdownMaxHeight = 240,
}: TagPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);

  const selected = useMemo(() => parseCsv(value), [value]);
  const selectedSet = useMemo(() => new Set(selected.map((s) => s.toLowerCase())), [selected]);

  const filtered = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return suggestions.filter((s) => !selectedSet.has(s.toLowerCase()));
    return suggestions.filter(
      (s) => !selectedSet.has(s.toLowerCase()) && s.toLowerCase().includes(q)
    );
  }, [suggestions, selectedSet, inputValue]);

  const canCreateNew = allowCreateNew && inputValue.trim().length > 0 && !selectedSet.has(inputValue.trim().toLowerCase());
  const showCreateHint = canCreateNew && filtered.length === 0;
  const options = showCreateHint ? [] : filtered;

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (!t) return;
    const lower = t.toLowerCase();
    if (selectedSet.has(lower)) return;
    onChange(toCsv([...selected, t]));
    setInputValue('');
    setHighlightIndex(0);
  };

  const removeTag = (tag: string) => {
    onChange(toCsv(selected.filter((s) => s !== tag)));
  };

  const clearAll = () => {
    onChange('');
    setInputValue('');
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        const match = options[highlightIndex];
        if (match) {
          addTag(match);
        } else if (allowCreateNew) {
          addTag(inputValue.trim());
        }
      }
      return;
    }
    if (e.key === 'Backspace' && !inputValue && selected.length > 0) {
      removeTag(selected[selected.length - 1]);
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => (i < options.length - 1 ? i + 1 : 0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => (i > 0 ? i - 1 : options.length - 1));
      return;
    }
    setOpen(true);
  };

  const handleBlur = () => {
    setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    if (!open) setHighlightIndex(0);
  }, [open, inputValue]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onDocClick = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'min-h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
          'flex flex-wrap items-center gap-2',
          'focus-within:ring-2 focus-within:ring-[var(--primary-color,#0d9488)] focus-within:ring-offset-0 focus-within:border-[var(--primary-color,#0d9488)]'
        )}
      >
        {selected.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-sm text-gray-800 border border-gray-200"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded p-0.5 hover:bg-gray-200 text-gray-500 hover:text-gray-700"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {selected.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md bg-gray-200 px-2 py-0.5 text-sm text-gray-700 border border-gray-300">
            <span>{selected.length}</span>
            <button
              type="button"
              onClick={clearAll}
              className="rounded p-0.5 hover:bg-gray-300 text-gray-600"
              aria-label="Clear all"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { setOpen(true); inputRef.current?.focus(); }}
              className="rounded p-0.5 hover:bg-gray-300 text-gray-600"
              aria-label="Open dropdown"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
        <div className="inline-flex flex-1 items-center min-w-[120px]">
          <Search className="h-4 w-4 text-gray-400 mr-1.5 flex-shrink-0" />
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={selected.length === 0 ? placeholder : 'Search…'}
            className="flex-1 min-w-0 border-0 bg-transparent py-1 text-sm outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      {open && (options.length > 0 || showCreateHint) && (
        <div
          className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white py-1 shadow-lg"
          style={{ maxHeight: dropdownMaxHeight }}
        >
          {options.length > 0 ? (
            <ul className="overflow-auto py-1" style={{ maxHeight: dropdownMaxHeight - 8 }}>
              {options.map((tag, i) => (
                <li key={tag}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addTag(tag);
                      inputRef.current?.focus();
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-left text-sm',
                      i === highlightIndex ? 'bg-indigo-50 text-indigo-900' : 'text-gray-900 hover:bg-gray-50'
                    )}
                  >
                    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-gray-300" />
                    {tag}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {showCreateHint && (
            <div className="border-t border-gray-100 px-3 py-2 text-sm text-gray-500">
              No results. Press <kbd className="rounded bg-gray-100 px-1 font-mono">Enter</kbd> to create &quot;{inputValue.trim()}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
