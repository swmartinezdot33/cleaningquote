'use client';

import { useState, useCallback, useEffect } from 'react';

const PREFIX = 'dashboard:';

function storageKey(pageKey: string, stateKey: string, locationId?: string | null): string {
  if (locationId?.trim()) {
    return `${PREFIX}${locationId.trim()}:${pageKey}:${stateKey}`;
  }
  return `${PREFIX}${pageKey}:${stateKey}`;
}

function readFromStorage<T>(key: string, defaultValue: T, parse: (s: string) => T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = sessionStorage.getItem(key);
    if (raw === null || raw === '') return defaultValue;
    return parse(raw);
  } catch {
    return defaultValue;
  }
}

function writeToStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

/**
 * Persist a single value for a dashboard page in sessionStorage.
 * Restores on mount and writes on change so navigating back keeps the last selection.
 *
 * @param pageKey - e.g. 'crm', 'quotes'
 * @param stateKey - e.g. 'pipelineId', 'filterToolId'
 * @param defaultValue - initial value when nothing stored
 * @param locationId - optional; scope state per location
 */
export function useDashboardPageState<T extends string>(
  pageKey: string,
  stateKey: string,
  defaultValue: T,
  options?: { locationId?: string | null }
): [T, (value: T) => void] {
  const locationId = options?.locationId ?? null;
  const key = storageKey(pageKey, stateKey, locationId);

  const [value, setValueState] = useState<T>(() =>
    readFromStorage(key, defaultValue, (s) => s as T)
  );

  const setValue = useCallback(
    (next: T) => {
      setValueState(next);
      writeToStorage(key, next);
    },
    [key]
  );

  useEffect(() => {
    const stored = readFromStorage(key, defaultValue, (s) => s as T);
    setValueState(stored);
  }, [key, defaultValue]);

  return [value, setValue];
}

/**
 * Persist a nullable string (e.g. selected pipeline id) for a dashboard page.
 */
export function useDashboardPageStateNullable(
  pageKey: string,
  stateKey: string,
  defaultValue: string | null,
  options?: { locationId?: string | null }
): [string | null, (value: string | null) => void] {
  const locationId = options?.locationId ?? null;
  const key = storageKey(pageKey, stateKey, locationId);

  const parse = (s: string): string | null => (s === '' || s === 'null' ? null : s);
  const serialize = (v: string | null): string => (v ?? 'null');

  const [value, setValueState] = useState<string | null>(() =>
    readFromStorage(key, defaultValue, parse)
  );

  const setValue = useCallback(
    (next: string | null) => {
      setValueState(next);
      writeToStorage(key, serialize(next));
    },
    [key]
  );

  useEffect(() => {
    const stored = readFromStorage(key, defaultValue, parse);
    setValueState(stored);
  }, [key, defaultValue]);

  return [value, setValue];
}
