/**
 * Lightweight i18n. Every user-facing string lives in a locale file under
 * ./locales. Adding a language = adding a file and registering it in LOCALES.
 * Missing keys in a partial locale fall back to English.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import en from './locales/en';
import { useAppState, updateSettings } from '../store/store';

type Messages = typeof en;

type DeepPartial<T> = { [K in keyof T]?: T[K] extends string ? string : T[K] extends readonly string[] ? readonly string[] : DeepPartial<T[K]> };

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
type Leaves<T, Leaf> = {
  [K in keyof T & string]: T[K] extends Leaf ? K : T[K] extends readonly unknown[] ? never : T[K] extends object ? Join<K, Leaves<T[K], Leaf>> : never;
}[keyof T & string];

export type TKey = Leaves<Messages, string>;
export type TListKey = {
  [K in keyof Messages & string]: ListLeaves<Messages[K], K>;
}[keyof Messages & string];
type ListLeaves<T, Prefix extends string> = {
  [K in keyof T & string]: T[K] extends readonly string[] ? `${Prefix}.${K}` : T[K] extends object ? ListLeaves<T[K], `${Prefix}.${K}`> : never;
}[keyof T & string];

export interface LocaleDef {
  label: string;
  dir: 'ltr' | 'rtl';
  messages: DeepPartial<Messages>;
}

export const LOCALES = {
  en: { label: 'English', dir: 'ltr', messages: en },
} satisfies Record<string, LocaleDef>;

export type LocaleCode = keyof typeof LOCALES;

function lookup(obj: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

interface I18nValue {
  locale: LocaleCode;
  setLocale: (l: LocaleCode) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
  tl: (key: TListKey) => string[];
  formatDate: (d: Date | string, opts?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (n: number, opts?: Intl.NumberFormatOptions) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { settings } = useAppState();
  const locale: LocaleCode = settings.locale in LOCALES ? (settings.locale as LocaleCode) : 'en';
  const def: LocaleDef = LOCALES[locale];

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = def.dir;
  }, [locale, def.dir]);

  const t = useCallback(
    (key: TKey, vars?: Record<string, string | number>) => {
      const v = lookup(def.messages, key) ?? lookup(en, key);
      if (typeof v !== 'string') {
        if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`);
        return key;
      }
      return interpolate(v, vars);
    },
    [def],
  );
  const tl = useCallback(
    (key: TListKey) => {
      const v = lookup(def.messages, key) ?? lookup(en, key);
      return Array.isArray(v) ? (v as string[]) : [];
    },
    [def],
  );
  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale: (l) => updateSettings({ locale: l }),
      t,
      tl,
      formatDate: (d, opts) =>
        new Intl.DateTimeFormat(locale, opts ?? { day: 'numeric', month: 'short', year: 'numeric' }).format(
          typeof d === 'string' ? parseDateLike(d) : d,
        ),
      formatNumber: (n, opts) => new Intl.NumberFormat(locale, opts).format(n),
    }),
    [locale, t, tl],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Accepts YYYY-MM-DD (local date) or full ISO strings. */
function parseDateLike(s: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(s);
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
