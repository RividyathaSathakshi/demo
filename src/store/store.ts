/**
 * All user data lives in this one localStorage entry. There is no backend,
 * no account and no network sync: clearing it removes everything.
 */
import { useSyncExternalStore } from 'react';
import type { AppState, Profile, TestRecord } from './types';

export const STORAGE_KEY = 'lumenova.v1';

const DEFAULT_STATE: AppState = {
  version: 1,
  profile: null,
  consentAcceptedAt: null,
  settings: { theme: 'system', locale: 'en', autoCapture: true },
  records: [],
  periodStarts: [],
};

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      settings: { ...DEFAULT_STATE.settings, ...(parsed.settings ?? {}) },
      records: Array.isArray(parsed.records) ? parsed.records : [],
      periodStarts: Array.isArray(parsed.periodStarts) ? parsed.periodStarts : [],
    };
  } catch {
    return DEFAULT_STATE;
  }
}

let state: AppState = typeof localStorage === 'undefined' ? DEFAULT_STATE : load();
const listeners = new Set<() => void>();
let storageError = false;

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageError = false;
  } catch {
    storageError = true;
  }
}

function setState(next: AppState) {
  state = next;
  persist();
  listeners.forEach((l) => l());
}

export function getState(): AppState {
  return state;
}

export function hasStorageError(): boolean {
  return storageError;
}

export function useAppState(): AppState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

export function updateSettings(patch: Partial<AppState['settings']>) {
  setState({ ...state, settings: { ...state.settings, ...patch } });
}

export function saveProfile(profile: Profile) {
  const periodStarts =
    profile.lastPeriodDate && !state.periodStarts.includes(profile.lastPeriodDate)
      ? [...state.periodStarts, profile.lastPeriodDate].sort()
      : state.periodStarts;
  setState({ ...state, profile, periodStarts });
}

export function acceptConsent() {
  setState({ ...state, consentAcceptedAt: new Date().toISOString() });
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function addRecord(record: TestRecord) {
  setState({ ...state, records: [...state.records.filter((r) => r.id !== record.id), record] });
}

export function deleteRecord(id: string) {
  setState({ ...state, records: state.records.filter((r) => r.id !== id) });
}

export function logPeriodStart(date: string) {
  if (state.periodStarts.includes(date)) return;
  const periodStarts = [...state.periodStarts, date].sort();
  const latest = periodStarts[periodStarts.length - 1];
  const profile = state.profile ? { ...state.profile, lastPeriodDate: latest } : state.profile;
  setState({ ...state, periodStarts, profile });
}

export function removePeriodStart(date: string) {
  const periodStarts = state.periodStarts.filter((d) => d !== date);
  const latest = periodStarts[periodStarts.length - 1] ?? null;
  const profile = state.profile ? { ...state.profile, lastPeriodDate: latest } : state.profile;
  setState({ ...state, periodStarts, profile });
}

/** Removes every piece of Lumenova data from this browser. */
export function clearAllData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  state = { ...DEFAULT_STATE, settings: { ...DEFAULT_STATE.settings } };
  listeners.forEach((l) => l());
}

export function sortedRecords(records: TestRecord[]): TestRecord[] {
  return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
