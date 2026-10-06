import { useMemo, useState, type FormEvent } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { OPK_PRODUCTS, URINE_PARAMETERS, URINE_PRODUCTS, getUrineProduct, worstStatus, type ScreeningStatus } from '../../config/strips';
import type { OpkCategory } from '../../cv/opkAnalysis';
import { addRecord, newId } from '../../store/store';
import type { OpkRecord, TestRecord, UrineRecord } from '../../store/types';
import { levelLabel, productName } from '../results/format';
import { UrineResultView } from '../results/UrineResultView';
import { OpkResultView } from '../results/OpkResultView';

/** Fallback when the camera, image or strip layout cannot be used. */
export default function ManualEntry() {
  const { module } = useParams();
  if (module !== 'urine' && module !== 'opk') return <Navigate to="/app/scan" replace />;
  return <ManualForm key={module} module={module} />;
}

function ManualForm({ module }: { module: 'urine' | 'opk' }) {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const reason = params.get('reason') as 'denied' | 'quality' | 'unsupported' | null;
  const [result, setResult] = useState<{ record: TestRecord; saved: boolean } | null>(null);

  if (result) {
    const actions = {
      unsaved: true,
      saved: result.saved,
      onSave: () => {
        addRecord(result.record);
        setResult({ ...result, saved: true });
      },
    };
    return result.record.type === 'urine' ? <UrineResultView record={result.record} {...actions} /> : <OpkResultView record={result.record} {...actions} />;
  }

  return (
    <div className="container-page max-w-3xl py-8 sm:py-12">
      <p className="flex items-center gap-2 text-label text-muted">
        <Icon name={module === 'urine' ? 'drop' : 'bloom'} size={18} className={module === 'urine' ? 'text-success' : 'text-rose'} />
        {t(`common.modules.${module}.name`)}
      </p>
      <h1 className="mt-2 text-h1">{t('manual.title')}</h1>
      {reason && reason in { denied: 1, quality: 1, unsupported: 1 } && (
        <p className="mt-3 flex gap-2 rounded-xl bg-panel-alt/70 p-3 text-label">
          <Icon name="info" size={18} className="mt-0.5 shrink-0" />
          {t(`manual.reason.${reason}`)}
        </p>
      )}
      {module === 'urine' ? <UrineManual onDone={(record) => setResult({ record, saved: false })} /> : <OpkManual onDone={(record) => setResult({ record, saved: false })} />}
    </div>
  );
}

function UrineManual({ onDone }: { onDone: (r: UrineRecord) => void }) {
  const { t } = useI18n();
  const [productId, setProductId] = useState(URINE_PRODUCTS[URINE_PRODUCTS.length - 1].id);
  const product = getUrineProduct(productId)!;
  const [levels, setLevels] = useState<Record<string, number | null>>({});
  const complete = useMemo(() => product.params.some((p) => levels[p] !== undefined && levels[p] !== null), [product, levels]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const readings = product.params.map((p) => {
      const idx = levels[p] ?? null;
      const status: ScreeningStatus | 'unreadable' = idx === null ? 'unreadable' : URINE_PARAMETERS[p].levels[idx].status;
      return { paramId: p, levelIndex: idx, status, confidence: idx === null ? ('unreadable' as const) : ('manual' as const) };
    });
    onDone({
      id: newId(),
      type: 'urine',
      createdAt: new Date().toISOString(),
      source: 'manual',
      productId,
      regionCount: product.params.length,
      overall: worstStatus(readings.filter((r) => r.status !== 'unreadable').map((r) => r.status as ScreeningStatus)),
      readings,
    });
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-8">
      <p className="text-muted">{t('manual.lead')}</p>
      <fieldset>
        <legend className="label">{t('manual.chooseStrip')}</legend>
        <div className="flex flex-wrap gap-2">
          {URINE_PRODUCTS.map((p) => (
            <label key={p.id} className={`cursor-pointer rounded-full border px-3.5 py-2 text-label ${productId === p.id ? 'border-ink bg-ink text-bg' : 'hover:bg-panel-alt'}`}>
              <input type="radio" name="product" className="sr-only" checked={productId === p.id} onChange={() => { setProductId(p.id); setLevels({}); }} />
              {productName(t, p.id)}
            </label>
          ))}
        </div>
      </fieldset>
      {product.params.map((p) => {
        const name = t(`params.${p}.name`);
        return (
          <fieldset key={p} className="border-t pt-5">
            <legend className="text-h3 font-display">{name}</legend>
            <p className="text-label text-muted">{t('manual.selectLevel', { name })}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {URINE_PARAMETERS[p].levels.map((l, i) => {
                const checked = levels[p] === i;
                return (
                  <label key={i} className={`flex w-[5.5rem] cursor-pointer flex-col items-center gap-1 rounded-lg border p-1.5 text-center text-caption ${checked ? 'border-ink ring-2 ring-ink' : 'hover:bg-panel-alt'}`}>
                    <input type="radio" name={p} className="sr-only" checked={checked} onChange={() => setLevels((s) => ({ ...s, [p]: i }))} />
                    <span className="h-8 w-full rounded border border-black/10" style={{ background: l.color }} />
                    <span>{levelLabel(t, l)}</span>
                    {checked && <Icon name="check" size={14} />}
                  </label>
                );
              })}
              <label className={`flex w-[5.5rem] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-1.5 text-caption ${levels[p] === null ? 'border-ink ring-2 ring-ink' : ''}`}>
                <input type="radio" name={p} className="sr-only" checked={levels[p] === null} onChange={() => setLevels((s) => ({ ...s, [p]: null }))} />
                <Icon name="question" size={18} />
                {t('manual.notRead')}
              </label>
            </div>
          </fieldset>
        );
      })}
      <Button type="submit" size="lg" disabled={!complete}>
        {t('manual.submit')}
      </Button>
    </form>
  );
}

function OpkManual({ onDone }: { onDone: (r: OpkRecord) => void }) {
  const { t } = useI18n();
  const [category, setCategory] = useState<OpkCategory | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!category) return;
    onDone({ id: newId(), type: 'opk', createdAt: new Date().toISOString(), source: 'manual', productId: OPK_PRODUCTS[0].id, ratio: null, category });
  };
  return (
    <form onSubmit={submit} className="mt-6 space-y-6">
      <fieldset>
        <legend className="text-h3 font-display">{t('manual.opkTitle')}</legend>
        <div className="mt-4 space-y-3">
          {(['low', 'rising', 'peak'] as OpkCategory[]).map((c, i) => (
            <label key={c} className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 ${category === c ? 'border-ink ring-2 ring-ink' : 'hover:bg-panel-alt/60'}`}>
              <input type="radio" name="opk" className="sr-only" checked={category === c} onChange={() => setCategory(c)} />
              <svg width="72" height="28" viewBox="0 0 72 28" aria-hidden="true" className="shrink-0 rounded border border-black/10 bg-[#F3F2EC]">
                <rect x="22" y="4" width="4" height="20" fill="#7A3E8E" opacity={[0.12, 0.55, 0.9][i]} />
                <rect x="40" y="4" width="4" height="20" fill="#7A3E8E" opacity={0.75} />
                <text x="24" y="27" fontSize="6" textAnchor="middle" fill="#5B6178">T</text>
                <text x="42" y="27" fontSize="6" textAnchor="middle" fill="#5B6178">C</text>
              </svg>
              <span className="flex-1">
                <span className="block font-medium">{t(`manual.opkOptions.${c}.title`)}</span>
                <span className="text-label text-muted">{t(`manual.opkOptions.${c}.body`)}</span>
              </span>
              {category === c && <Icon name="checkCircle" size={22} />}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="flex gap-2 text-label text-muted">
        <Icon name="info" size={18} className="shrink-0" /> {t('manual.noControl')}
      </p>
      <Button type="submit" size="lg" disabled={!category}>
        {t('manual.submit')}
      </Button>
    </form>
  );
}
