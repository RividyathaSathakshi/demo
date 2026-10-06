import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { Button, CheckList, Disclaimer, Field, Logo } from '../../components/ui';
import { Icon, type IconName } from '../../components/Icon';
import { acceptConsent, saveProfile, useAppState } from '../../store/store';
import type { HealthGoal, TrackingChoice } from '../../store/types';
import { todayKey } from '../../health/dates';

const TOTAL = 4;

export default function Onboarding() {
  const { t, tl } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const existing = useAppState().profile;
  const [step, setStep] = useState(1);
  const [tracking, setTracking] = useState<TrackingChoice>(existing?.tracking ?? 'both');
  const [age, setAge] = useState(existing?.age?.toString() ?? '');
  const [lastPeriod, setLastPeriod] = useState(existing?.lastPeriodDate ?? '');
  const [cycleLength, setCycleLength] = useState(String(existing?.cycleLength ?? 28));
  const [periodLength, setPeriodLength] = useState(String(existing?.periodLength ?? 5));
  const [goal, setGoal] = useState<HealthGoal>(existing?.goal ?? 'general');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const validateAbout = () => {
    const e: Record<string, string | null> = {};
    const a = age ? Number(age) : null;
    if (a !== null && (!Number.isFinite(a) || a < 10 || a > 100)) e.age = t('onboarding.errors.age');
    const c = Number(cycleLength);
    if (!Number.isFinite(c) || c < 18 || c > 45) e.cycle = t('onboarding.errors.cycle');
    const p = Number(periodLength);
    if (!Number.isFinite(p) || p < 1 || p > 12) e.period = t('onboarding.errors.period');
    if (lastPeriod && lastPeriod > todayKey()) e.date = t('onboarding.errors.date');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = (e: FormEvent) => {
    e.preventDefault();
    if (step === 2 && !validateAbout()) return;
    if (step < TOTAL) {
      setStep(step + 1);
      return;
    }
    if (!consent) {
      setErrors({ consent: t('onboarding.errors.consent') });
      return;
    }
    saveProfile({
      tracking,
      age: age ? Number(age) : null,
      lastPeriodDate: lastPeriod || null,
      cycleLength: Number(cycleLength),
      periodLength: Number(periodLength),
      goal,
    });
    acceptConsent();
    const dest = params.get('next');
    navigate(dest && dest.startsWith('/app') && !dest.startsWith('/app/welcome') ? dest : '/app', { replace: true });
  };

  const trackOptions: { v: TrackingChoice; icon: IconName }[] = [
    { v: 'urine', icon: 'drop' },
    { v: 'fertility', icon: 'bloom' },
    { v: 'both', icon: 'layers' },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <div className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="rounded-md"><Logo /></Link>
        <span className="text-label text-muted">{t('onboarding.step', { current: step, total: TOTAL })}</span>
      </div>
      <div className="h-1 bg-panel-alt" aria-hidden="true">
        <div className="h-1 bg-rose transition-all" style={{ width: `${(step / TOTAL) * 100}%` }} />
      </div>
      <form onSubmit={next} className="container-page max-w-2xl py-10" noValidate>
        {step === 1 && (
          <>
            <h1 className="text-h1">{t('onboarding.title')}</h1>
            <p className="mt-2 text-body-lg text-muted">{t('onboarding.lead')}</p>
            <fieldset className="mt-8">
              <legend className="text-h3 font-display">{t('onboarding.trackTitle')}</legend>
              <div className="mt-4 space-y-3">
                {trackOptions.map(({ v, icon }) => (
                  <label key={v} className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 ${tracking === v ? 'border-ink bg-panel ring-2 ring-ink' : 'bg-panel hover:bg-panel-alt/50'}`}>
                    <input type="radio" name="tracking" className="sr-only" checked={tracking === v} onChange={() => setTracking(v)} />
                    <Icon name={icon} size={28} className={v === 'urine' ? 'text-success' : v === 'fertility' ? 'text-rose' : 'text-gold'} />
                    <span className="flex-1">
                      <span className="block font-medium">{t(`onboarding.track.${v}.title`)}</span>
                      <span className="text-label text-muted">{t(`onboarding.track.${v}.body`)}</span>
                    </span>
                    {tracking === v && <Icon name="checkCircle" size={22} />}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}
        {step === 2 && (
          <>
            <h1 className="text-h1">{t('onboarding.aboutTitle')}</h1>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <Field label={<>{t('onboarding.age')} <span className="font-normal text-muted">({t('common.optional')})</span></>} htmlFor="age" hint={t('onboarding.ageHint')} error={errors.age}>
                <input id="age" inputMode="numeric" type="number" min={10} max={100} className="field" value={age} onChange={(e) => setAge(e.target.value)} aria-invalid={!!errors.age} />
              </Field>
              <Field label={<>{t('onboarding.lastPeriod')} <span className="font-normal text-muted">({t('common.optional')})</span></>} htmlFor="lp" hint={t('onboarding.lastPeriodHint')} error={errors.date}>
                <input id="lp" type="date" max={todayKey()} className="field" value={lastPeriod} onChange={(e) => setLastPeriod(e.target.value)} aria-invalid={!!errors.date} />
              </Field>
              <Field label={t('onboarding.cycleLength')} htmlFor="cl" hint={t('onboarding.cycleLengthHint')} error={errors.cycle}>
                <input id="cl" inputMode="numeric" type="number" min={18} max={45} className="field" value={cycleLength} onChange={(e) => setCycleLength(e.target.value)} aria-invalid={!!errors.cycle} />
              </Field>
              <Field label={t('onboarding.periodLength')} htmlFor="pl" error={errors.period}>
                <input id="pl" inputMode="numeric" type="number" min={1} max={12} className="field" value={periodLength} onChange={(e) => setPeriodLength(e.target.value)} aria-invalid={!!errors.period} />
              </Field>
            </div>
          </>
        )}
        {step === 3 && (
          <fieldset>
            <legend className="text-h1 font-display">{t('onboarding.goalTitle')}</legend>
            <div className="mt-8 grid gap-3">
              {(['general', 'conceive', 'understandCycle', 'hydration', 'other'] as HealthGoal[]).map((g) => (
                <label key={g} className={`flex cursor-pointer items-center justify-between rounded-xl border bg-panel p-4 ${goal === g ? 'border-ink ring-2 ring-ink' : 'hover:bg-panel-alt/50'}`}>
                  <input type="radio" name="goal" className="sr-only" checked={goal === g} onChange={() => setGoal(g)} />
                  {t(`onboarding.goals.${g}`)}
                  {goal === g && <Icon name="checkCircle" size={22} />}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {step === 4 && (
          <>
            <h1 className="text-h1">{t('onboarding.consentTitle')}</h1>
            <div className="mt-6">
              <CheckList items={tl('onboarding.consentPoints')} icon="shield" tone="rose" />
            </div>
            <div className="mt-6">
              <Disclaimer />
            </div>
            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border bg-panel p-4">
              <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[rgb(var(--ink))]" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-invalid={!!errors.consent} aria-describedby={errors.consent ? 'consent-err' : undefined} />
              <span>{t('onboarding.consentCheck')}</span>
            </label>
            {errors.consent && (
              <p id="consent-err" className="mt-2 text-label text-danger" role="alert">
                {errors.consent}
              </p>
            )}
          </>
        )}
        <div className="mt-10 flex items-center justify-between gap-3">
          {step > 1 ? (
            <Button variant="ghost" icon="chevronLeft" onClick={() => setStep(step - 1)}>
              {t('common.buttons.back')}
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" size="lg">
            {step === TOTAL ? t('onboarding.finish') : t('common.buttons.continue')}
          </Button>
        </div>
      </form>
    </div>
  );
}
