import { useEffect, useId } from 'react';
import { useI18n, LOCALES, type LocaleCode } from '../i18n';
import { updateSettings, useAppState } from '../store/store';
import type { ThemePreference } from '../store/types';
import { Icon, type IconName } from './Icon';

/** Applies the theme preference to <html data-theme>. */
export function ThemeSync() {
  const { settings } = useAppState();
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && mq.matches);
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [settings.theme]);
  return null;
}

const THEME_ICONS: Record<ThemePreference, IconName> = { system: 'monitor', light: 'sun', dark: 'moon' };

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const { t } = useI18n();
  const { settings } = useAppState();
  const order: ThemePreference[] = ['system', 'light', 'dark'];
  return (
    <div role="radiogroup" aria-label={t('theme.label')} className="inline-flex items-center rounded-full border p-0.5">
      {order.map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={settings.theme === p}
          onClick={() => updateSettings({ theme: p })}
          className={`inline-flex min-h-[32px] min-w-[32px] items-center justify-center gap-1.5 rounded-full px-2 text-caption ${settings.theme === p ? 'bg-ink text-bg' : 'text-muted hover:text-ink'}`}
          title={t(`theme.${p}`)}
        >
          <Icon name={THEME_ICONS[p]} size={16} label={showLabel ? undefined : t(`theme.${p}`)} />
          {showLabel && <span>{t(`theme.${p}`)}</span>}
        </button>
      ))}
    </div>
  );
}

export function LanguageSwitcher() {
  const { t, locale, setLocale } = useI18n();
  const id = useId();
  return (
    <div className="inline-flex items-center gap-1.5">
      <label htmlFor={id} className="sr-only">
        {t('language.label')}
      </label>
      <Icon name="globe" size={18} className="text-muted" />
      <select
        id={id}
        value={locale}
        onChange={(e) => setLocale(e.target.value as LocaleCode)}
        className="min-h-[32px] rounded-md border-0 bg-transparent py-1 pl-1 pr-6 text-label text-ink"
        title={t('language.more')}
      >
        {(Object.keys(LOCALES) as LocaleCode[]).map((code) => (
          <option key={code} value={code}>
            {LOCALES[code].label}
          </option>
        ))}
      </select>
    </div>
  );
}
