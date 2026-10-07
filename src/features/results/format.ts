import type { TKey } from '../../i18n';
import { URINE_PARAMETERS, type ReferenceLevel, type UrineParamId } from '../../config/strips';
import type { ScanReport } from '../../cv/pipeline';
import type { OpkRecord, RecordSource, UrineRecord } from '../../store/types';
import { newId } from '../../store/store';

type T = (key: TKey, vars?: Record<string, string | number>) => string;

export function levelLabel(t: T, level: ReferenceLevel): string {
  const word = level.word ? t(`levels.${level.word}`) : '';
  if (word && level.amount) return `${word} (${level.amount})`;
  return word || level.amount || '';
}

export function readingLabel(t: T, paramId: UrineParamId, levelIndex: number | null): string {
  if (levelIndex === null) return t('common.status.unreadable');
  return levelLabel(t, URINE_PARAMETERS[paramId].levels[levelIndex]);
}

export function productName(t: T, productId: string): string {
  return t(`products.${productId}` as TKey);
}

export function urineRecordFromReport(report: ScanReport, source: RecordSource): UrineRecord {
  const u = report.urine!;
  return {
    id: newId(),
    type: 'urine',
    createdAt: new Date().toISOString(),
    source,
    productId: u.productId,
    regionCount: report.regionCount,
    orientation: report.orientation ?? undefined,
    angleDeg: report.angleDeg,
    overall: u.overall,
    readings: u.readings.map((r) => ({ paramId: r.paramId, levelIndex: r.levelIndex, status: r.status, confidence: r.confidence })),
  };
}

export function opkRecordFromReport(report: ScanReport, source: RecordSource): OpkRecord {
  const o = report.opk!;
  return {
    id: newId(),
    type: 'opk',
    createdAt: new Date().toISOString(),
    source,
    productId: o.productId,
    ratio: o.ratio,
    category: o.category,
    testDetected: o.testDetected,
    orientation: report.orientation ?? undefined,
    angleDeg: report.angleDeg,
  };
}
