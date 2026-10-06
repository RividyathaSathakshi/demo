/**
 * Strip product registry.
 *
 * IMPORTANT: The reference colours below are approximations of typical
 * dipstick colour charts, intended for this prototype. A production version
 * must calibrate each product against its manufacturer's printed chart and
 * validate against laboratory reference methods.
 *
 * Adding a new supported strip is a data change only: list its pads in order
 * (starting from the handle end) and the detector will match it by the number
 * of regions it finds on the photo.
 */

export type ScreeningStatus = 'normal' | 'borderline' | 'flagged';

export type UrineParamId =
  | 'glucose'
  | 'protein'
  | 'ph'
  | 'ketones'
  | 'blood'
  | 'leukocytes'
  | 'nitrite'
  | 'specificGravity'
  | 'urobilinogen'
  | 'bilirubin';

export type LevelWord = 'negative' | 'trace' | 'small' | 'moderate' | 'large' | 'positive' | 'normal';

export interface ReferenceLevel {
  /** Word shown to the user (translated), optional. */
  word?: LevelWord;
  /** Numeric amount, shown as-is (units are not translated). */
  amount?: string;
  color: string;
  status: ScreeningStatus;
}

export interface UrineParameter {
  id: UrineParamId;
  levels: ReferenceLevel[];
}

export const URINE_PARAMETERS: Record<UrineParamId, UrineParameter> = {
  glucose: {
    id: 'glucose',
    levels: [
      { word: 'negative', color: '#7FC4C7', status: 'normal' },
      { word: 'trace', amount: '100 mg/dL', color: '#8FC09A', status: 'borderline' },
      { amount: '250 mg/dL', color: '#95AE62', status: 'flagged' },
      { amount: '500 mg/dL', color: '#8E8A47', status: 'flagged' },
      { amount: '1000 mg/dL', color: '#7A6338', status: 'flagged' },
      { amount: '≥2000 mg/dL', color: '#5E432B', status: 'flagged' },
    ],
  },
  protein: {
    id: 'protein',
    levels: [
      { word: 'negative', color: '#E3E58C', status: 'normal' },
      { word: 'trace', color: '#CBDC86', status: 'borderline' },
      { amount: '30 mg/dL', color: '#AED18C', status: 'flagged' },
      { amount: '100 mg/dL', color: '#8BC39A', status: 'flagged' },
      { amount: '300 mg/dL', color: '#66AC9C', status: 'flagged' },
      { amount: '≥2000 mg/dL', color: '#438F8E', status: 'flagged' },
    ],
  },
  ph: {
    id: 'ph',
    levels: [
      { amount: '5.0', color: '#EE8F45', status: 'normal' },
      { amount: '6.0', color: '#E8B84A', status: 'normal' },
      { amount: '6.5', color: '#C9C04E', status: 'normal' },
      { amount: '7.0', color: '#9FB65A', status: 'normal' },
      { amount: '7.5', color: '#74A766', status: 'normal' },
      { amount: '8.0', color: '#3F8E7C', status: 'borderline' },
      { amount: '8.5', color: '#246F8C', status: 'borderline' },
    ],
  },
  ketones: {
    id: 'ketones',
    levels: [
      { word: 'negative', color: '#F0D2B4', status: 'normal' },
      { word: 'trace', amount: '5 mg/dL', color: '#EAB4A2', status: 'borderline' },
      { word: 'small', amount: '15 mg/dL', color: '#DC909D', status: 'flagged' },
      { word: 'moderate', amount: '40 mg/dL', color: '#C46A8B', status: 'flagged' },
      { word: 'large', amount: '≥80 mg/dL', color: '#9A4772', status: 'flagged' },
    ],
  },
  blood: {
    id: 'blood',
    levels: [
      { word: 'negative', color: '#F0BE48', status: 'normal' },
      { word: 'trace', color: '#C6C04F', status: 'borderline' },
      { word: 'small', color: '#98B25A', status: 'flagged' },
      { word: 'moderate', color: '#5C9657', status: 'flagged' },
      { word: 'large', color: '#2E6A4C', status: 'flagged' },
    ],
  },
  leukocytes: {
    id: 'leukocytes',
    levels: [
      { word: 'negative', color: '#F1E6D0', status: 'normal' },
      { word: 'trace', color: '#E2CFD3', status: 'borderline' },
      { word: 'small', color: '#C8ADC4', status: 'flagged' },
      { word: 'moderate', color: '#A38AB2', status: 'flagged' },
      { word: 'large', color: '#7A6597', status: 'flagged' },
    ],
  },
  nitrite: {
    id: 'nitrite',
    levels: [
      { word: 'negative', color: '#F4EAD5', status: 'normal' },
      { word: 'positive', color: '#F0B3C2', status: 'flagged' },
      { word: 'positive', amount: '++', color: '#E287A8', status: 'flagged' },
    ],
  },
  specificGravity: {
    id: 'specificGravity',
    levels: [
      { amount: '1.000', color: '#2D5E72', status: 'borderline' },
      { amount: '1.005', color: '#4A7365', status: 'normal' },
      { amount: '1.010', color: '#6C8456', status: 'normal' },
      { amount: '1.015', color: '#8A8F4A', status: 'normal' },
      { amount: '1.020', color: '#A2964A', status: 'normal' },
      { amount: '1.025', color: '#B49C45', status: 'normal' },
      { amount: '1.030', color: '#C6A33F', status: 'borderline' },
    ],
  },
  urobilinogen: {
    id: 'urobilinogen',
    levels: [
      { word: 'normal', amount: '0.2 mg/dL', color: '#F5D0B2', status: 'normal' },
      { word: 'normal', amount: '1 mg/dL', color: '#F0BA9E', status: 'normal' },
      { amount: '2 mg/dL', color: '#EA9E8B', status: 'borderline' },
      { amount: '4 mg/dL', color: '#DE847C', status: 'flagged' },
      { amount: '8 mg/dL', color: '#CB666C', status: 'flagged' },
    ],
  },
  bilirubin: {
    id: 'bilirubin',
    levels: [
      { word: 'negative', color: '#F2E6BE', status: 'normal' },
      { word: 'small', color: '#E5D2A8', status: 'borderline' },
      { word: 'moderate', color: '#D4B996', status: 'flagged' },
      { word: 'large', color: '#C29E85', status: 'flagged' },
    ],
  },
};

export interface UrineProduct {
  id: string;
  kind: 'urine';
  /** Pads ordered from the handle end towards the tip. */
  params: UrineParamId[];
}

export interface OpkProduct {
  id: string;
  kind: 'opk';
  /** R = T / C interpretation, configured per product. */
  thresholds: { rising: number; peak: number };
}

export const URINE_PRODUCTS: UrineProduct[] = [
  { id: 'urine-2', kind: 'urine', params: ['glucose', 'protein'] },
  { id: 'urine-3', kind: 'urine', params: ['glucose', 'protein', 'ph'] },
  { id: 'urine-4', kind: 'urine', params: ['glucose', 'ketones', 'protein', 'ph'] },
  { id: 'urine-5', kind: 'urine', params: ['glucose', 'ketones', 'blood', 'ph', 'protein'] },
  {
    id: 'urine-10',
    kind: 'urine',
    params: [
      'glucose',
      'bilirubin',
      'ketones',
      'specificGravity',
      'blood',
      'ph',
      'protein',
      'urobilinogen',
      'nitrite',
      'leukocytes',
    ],
  },
];

export const OPK_PRODUCTS: OpkProduct[] = [{ id: 'opk-standard', kind: 'opk', thresholds: { rising: 0.8, peak: 1.0 } }];

export const SUPPORTED_PAD_COUNTS = Array.from(new Set(URINE_PRODUCTS.map((p) => p.params.length))).sort((a, b) => a - b);

export function getUrineProduct(id: string): UrineProduct | undefined {
  return URINE_PRODUCTS.find((p) => p.id === id);
}

export function urineProductsForCount(count: number): UrineProduct[] {
  return URINE_PRODUCTS.filter((p) => p.params.length === count);
}

export function worstStatus(statuses: ScreeningStatus[]): ScreeningStatus {
  if (statuses.includes('flagged')) return 'flagged';
  if (statuses.includes('borderline')) return 'borderline';
  return 'normal';
}
