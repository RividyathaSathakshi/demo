/** Stage 5 (OPK): turn line intensities into the configured LH category. */
import { OPK_PRODUCTS, type OpkProduct } from '../config/strips';
import { MIN_LINE_OD, type LineAnalysis } from './lines';

export type OpkCategory = 'low' | 'rising' | 'peak';

export interface OpkAnalysis {
  productId: string;
  ratio: number;
  category: OpkCategory;
  controlIntensity: number;
  testIntensity: number;
  testDetected: boolean;
  assignment: LineAnalysis['assignment'];
}

export type OpkAnalysisOutcome = { ok: true; analysis: OpkAnalysis } | { ok: false; issue: 'controlMissing' };

export function classifyRatio(ratio: number, product: OpkProduct = OPK_PRODUCTS[0]): OpkCategory {
  if (ratio >= product.thresholds.peak) return 'peak';
  if (ratio >= product.thresholds.rising) return 'rising';
  return 'low';
}

export function analyzeOpk(lines: LineAnalysis, product: OpkProduct = OPK_PRODUCTS[0]): OpkAnalysisOutcome {
  if (!lines.control || lines.control.intensity < MIN_LINE_OD * 1.4) return { ok: false, issue: 'controlMissing' };
  const c = lines.control.intensity;
  const t = lines.test?.intensity ?? 0;
  const ratio = Math.round((t / c) * 100) / 100;
  return {
    ok: true,
    analysis: {
      productId: product.id,
      ratio,
      category: classifyRatio(ratio, product),
      controlIntensity: c,
      testIntensity: t,
      testDetected: !!lines.test,
      assignment: lines.assignment,
    },
  };
}
