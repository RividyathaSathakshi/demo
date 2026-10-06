import { useState } from 'react';
import { useI18n } from '../../i18n';
import { sortedRecords, useAppState } from '../../store/store';
import { HistoryRow } from '../dashboard/Dashboard';
import { ButtonLink } from '../../components/ui';

type Filter = 'all' | 'urine' | 'opk';

export default function HistoryPage() {
  const { t, formatDate } = useI18n();
  const { records } = useAppState();
  const [filter, setFilter] = useState<Filter>('all');
  const list = sortedRecords(records).filter((r) => filter === 'all' || r.type === filter);
  const groups = new Map<string, typeof list>();
  for (const r of list) {
    const k = formatDate(r.createdAt, { month: 'long', year: 'numeric' });
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  return (
    <div className="container-page max-w-3xl py-8 sm:py-10">
      <h1 className="text-h1">{t('history.title')}</h1>
      <p className="mt-1 text-muted">{t('history.lead')}</p>
      <div role="radiogroup" aria-label={t('history.filter')} className="mt-6 inline-flex rounded-full border p-1">
        {(['all', 'urine', 'opk'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={filter === f}
            onClick={() => setFilter(f)}
            className={`min-h-[36px] rounded-full px-4 text-label ${filter === f ? 'bg-ink text-bg' : 'text-muted hover:text-ink'}`}
          >
            {t(`history.${f}`)}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="mt-10">
          <p className="text-muted">{t('history.empty')}</p>
          <ButtonLink to="/app/scan" className="mt-4" icon="camera">
            {t('common.buttons.startScreening')}
          </ButtonLink>
        </div>
      ) : (
        [...groups.entries()].map(([month, items]) => (
          <section key={month} className="mt-8">
            <h2 className="font-display text-h3">{month}</h2>
            <ul className="mt-2 divide-y border-y">
              {items.map((r) => (
                <HistoryRow key={r.id} record={r} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
