import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { Button, Field } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { LanguageSwitcher, ThemeToggle } from '../../components/Controls';
import { saveProfile, updateSettings, useAppState } from '../../store/store';
import type { HealthGoal, TrackingChoice } from '../../store/types';
import { ClearDataButton } from './ClearData';
import { todayKey } from '../../health/dates';

export default function SettingsPage() {
  const { t } = useI18n();
  const state = useAppState();
  const p = state.profile!;
  const [tracking, setTracking] = useState<TrackingChoice>(p.tracking);
  const [age, setAge] = useState(p.age?.toString() ?? '');
  const [lastPeriod, setLastPeriod] = useState(p.lastPeriodDate ?? '');
  const [cycleLength, setCycleLength] = useState(String(p.cycleLength));
  const [periodLength, setPeriodLength] = useState(String(p.periodLength));
  const [goal, setGoal] = useState<HealthGoal>(p.goal);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const c = Number(cycleLength);
    const pl = Number(periodLength);
    const a = age ? Number(age) : null;
    if (!(c >= 18 && c <= 45)) return setError(t('onboarding.errors.cycle'));
    if (!(pl >= 1 && pl <= 12)) return setError(t('onboarding.errors.period'));
    if (a !== null && !(a >= 10 && a <= 100)) return setError(t('onboarding.errors.age'));
    if (lastPeriod && lastPeriod > todayKey()) return setError(t('onboarding.errors.date'));
    setError(null);
    saveProfile({ tracking, age: a, lastPeriodDate: lastPeriod || null, cycleLength: c, periodLength: pl, goal });
    setSaved(true);
  };

  return (
    <div className="container-page max-w-3xl py-8 sm:py-10">
      <h1 className="text-h1">{t('settings.title')}</h1>

      <form onSubmit={submit} className="mt-8 space-y-6" aria-labelledby="profile-h" onChange={() => setSaved(false)}>
        <h2 id="profile-h" className="text-h2">{t('settings.profileTitle')}</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t('settings.tracking')} htmlFor="s-track">
            <select id="s-track" className="field" value={tracking} onChange={(e) => setTracking(e.target.value as TrackingChoice)}>
              {(['urine', 'fertility', 'both'] as TrackingChoice[]).map((v) => (
                <option key={v} value={v}>{t(`onboarding.track.${v}.title`)}</option>
              ))}
            </select>
          </Field>
          <Field label={t('onboarding.goalTitle')} htmlFor="s-goal">
            <select id="s-goal" className="field" value={goal} onChange={(e) => setGoal(e.target.value as HealthGoal)}>
              {(['general', 'conceive', 'understandCycle', 'hydration', 'other'] as HealthGoal[]).map((g) => (
                <option key={g} value={g}>{t(`onboarding.goals.${g}`)}</option>
              ))}
            </select>
          </Field>
          <Field label={t('onboarding.age')} htmlFor="s-age">
            <input id="s-age" type="number" inputMode="numeric" className="field" value={age} onChange={(e) => setAge(e.target.value)} />
          </Field>
          <Field label={t('onboarding.lastPeriod')} htmlFor="s-lp">
            <input id="s-lp" type="date" max={todayKey()} className="field" value={lastPeriod} onChange={(e) => setLastPeriod(e.target.value)} />
          </Field>
          <Field label={t('onboarding.cycleLength')} htmlFor="s-cl">
            <input id="s-cl" type="number" inputMode="numeric" className="field" value={cycleLength} onChange={(e) => setCycleLength(e.target.value)} />
          </Field>
          <Field label={t('onboarding.periodLength')} htmlFor="s-pl">
            <input id="s-pl" type="number" inputMode="numeric" className="field" value={periodLength} onChange={(e) => setPeriodLength(e.target.value)} />
          </Field>
        </div>
        {error && <p className="text-label text-danger" role="alert">{error}</p>}
        <div className="flex items-center gap-4">
          <Button type="submit">{t('settings.saveProfile')}</Button>
          {saved && (
            <p className="flex items-center gap-1.5 text-label" role="status">
              <Icon name="checkCircle" size={18} className="text-success" /> {t('settings.profileSaved')}
            </p>
          )}
        </div>
      </form>

      <section className="mt-12 space-y-4 border-t pt-8" aria-labelledby="look-h">
        <h2 id="look-h" className="text-h2">{t('settings.appearance')}</h2>
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="label">{t('theme.label')}</p>
            <ThemeToggle showLabel />
          </div>
          <div>
            <p className="label">{t('language.label')}</p>
            <LanguageSwitcher />
            <p className="hint">{t('language.more')}</p>
          </div>
        </div>
      </section>

      <RoboflowSettings />

      <section className="mt-12 space-y-3 border-t pt-8" aria-labelledby="priv-h">
        <h2 id="priv-h" className="text-h2">{t('settings.privacyTitle')}</h2>
        <p className="flex items-center gap-2">
          <Icon name="lock" size={18} className="text-success" />
          {t('settings.privacySummary')}
        </p>
        <p className="text-label text-muted">{t('settings.storageUsed', { n: state.records.length, p: state.periodStarts.length })}</p>
        <Link to="/privacy" className="link text-label">{t('nav.privacy')}</Link>
        <div className="pt-3">
          <ClearDataButton />
        </div>
      </section>
    </div>
  );
}

function RoboflowSettings() {
  const { t } = useI18n();
  const { settings } = useAppState();
  return (
    <section className="mt-12 space-y-4 border-t pt-8" aria-labelledby="rf-h">
      <h2 id="rf-h" className="text-h2">{t('roboflow.settingsTitle')}</h2>
      <p className="max-w-prose text-muted">{t('roboflow.settingsBody')}</p>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-panel p-4">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 shrink-0 accent-[rgb(var(--ink))]"
          checked={settings.useTrainedModel}
          onChange={(e) => updateSettings({ useTrainedModel: e.target.checked })}
        />
        <span>
          <span className="block font-medium">{t('roboflow.toggle')}</span>
          <span className="text-label text-muted">{t('roboflow.keyFromBuild')}</span>
        </span>
      </label>
    </section>
  );
}
