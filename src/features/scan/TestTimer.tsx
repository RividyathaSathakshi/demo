import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui';
import { Icon } from '../../components/Icon';

export interface Countdown {
  total: number;
  remaining: number;
  running: boolean;
  done: boolean;
  start: (seconds?: number) => void;
  pause: () => void;
  resume: () => void;
  reset: (seconds?: number) => void;
}

/** Wall-clock based countdown, so it stays accurate if the tab is throttled. */
export function useCountdown(initial: number): Countdown {
  const [total, setTotal] = useState(initial);
  const [remaining, setRemaining] = useState(initial);
  const [running, setRunning] = useState(false);
  const endRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setRunning(false);
        try {
          navigator.vibrate?.([200, 100, 200]);
        } catch {
          /* not supported */
        }
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [running]);

  const start = useCallback((seconds?: number) => {
    const s = seconds ?? total;
    setTotal(s);
    setRemaining(s);
    endRef.current = Date.now() + s * 1000;
    setRunning(true);
  }, [total]);
  const pause = useCallback(() => setRunning(false), []);
  const resume = useCallback(() => {
    endRef.current = Date.now() + remaining * 1000;
    setRunning(true);
  }, [remaining]);
  const reset = useCallback((seconds?: number) => {
    const s = seconds ?? total;
    setRunning(false);
    setTotal(s);
    setRemaining(s);
  }, [total]);
  return { total, remaining, running, done: remaining === 0 && !running, start, pause, resume, reset };
}

export function formatClock(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface Props {
  timer: Countdown;
  presets: { seconds: number; label: string }[];
  title: string;
  hint: string;
}

export function TestTimer({ timer, presets, title, hint }: Props) {
  const { t } = useI18n();
  const progress = timer.total ? 1 - timer.remaining / timer.total : 0;
  const idle = !timer.running && timer.remaining === timer.total;
  return (
    <section aria-labelledby="timer-h" className="rounded-2xl border bg-panel p-5">
      <h3 id="timer-h" className="flex items-center gap-2 text-h3">
        <Icon name="clock" size={22} className="text-gold" /> {title}
      </h3>
      <p className="text-label text-muted">{hint}</p>
      <div className="mt-4 flex flex-wrap items-center gap-5">
        <div className="relative grid h-28 w-28 shrink-0 place-items-center">
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r="44" fill="none" stroke="var(--border-strong)" strokeWidth="7" />
            <circle cx="50" cy="50" r="44" fill="none" stroke={timer.done ? 'rgb(var(--success))' : 'rgb(var(--gold))'} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${progress * 276.5} 276.5`} />
          </svg>
          <span className="font-display text-h2 tabular-nums" role="timer" aria-label={t('timer.remaining', { time: formatClock(timer.remaining) })}>
            {formatClock(timer.remaining)}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2" role="group" aria-label={title}>
            {presets.map((p) => (
              <button
                key={p.seconds}
                type="button"
                onClick={() => timer.reset(p.seconds)}
                aria-pressed={timer.total === p.seconds}
                className={`min-h-[34px] rounded-full border px-3 text-label ${timer.total === p.seconds ? 'border-ink bg-ink text-bg' : 'hover:bg-panel-alt'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {timer.running ? (
              <Button variant="secondary" onClick={timer.pause}>{t('timer.pause')}</Button>
            ) : idle || timer.done ? (
              <Button icon="clock" onClick={() => timer.start()}>{t('timer.start')}</Button>
            ) : (
              <Button onClick={timer.resume}>{t('timer.resume')}</Button>
            )}
            {!idle && <Button variant="ghost" onClick={() => timer.reset()}>{t('timer.reset')}</Button>}
          </div>
        </div>
      </div>
      <p aria-live="assertive" className={`mt-3 flex items-center gap-2 font-medium ${timer.done ? '' : 'sr-only'}`}>
        {timer.done && (
          <>
            <Icon name="checkCircle" size={20} className="text-success" /> {t('timer.done')}
          </>
        )}
      </p>
    </section>
  );
}

/** Small running-timer pill shown on the capture step. */
export function TimerChip({ timer }: { timer: Countdown }) {
  const { t } = useI18n();
  if (!timer.running && !timer.done) return null;
  return (
    <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-label font-medium ${timer.done ? 'bg-success/15' : 'bg-gold/15'}`} role="status">
      <Icon name={timer.done ? 'checkCircle' : 'clock'} size={16} className={timer.done ? 'text-success' : 'text-gold'} />
      {timer.done ? t('timer.done') : t('timer.remaining', { time: formatClock(timer.remaining) })}
    </p>
  );
}
