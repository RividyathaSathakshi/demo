import type { ScreeningStatus, UrineParamId } from '../config/strips';
import type { OpkCategory } from '../cv/opkAnalysis';
import type { Orientation } from '../cv/detectStrip';

export type TrackingChoice = 'urine' | 'fertility' | 'both';
export type HealthGoal = 'general' | 'conceive' | 'understandCycle' | 'hydration' | 'other';
export type RecordSource = 'camera' | 'upload' | 'sample' | 'manual';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface Profile {
  tracking: TrackingChoice;
  age: number | null;
  /** YYYY-MM-DD */
  lastPeriodDate: string | null;
  cycleLength: number;
  periodLength: number;
  goal: HealthGoal;
}

export interface UrineReadingRecord {
  paramId: UrineParamId;
  levelIndex: number | null;
  status: ScreeningStatus | 'unreadable';
  confidence: 'high' | 'medium' | 'low' | 'unreadable' | 'manual';
}

interface BaseRecord {
  id: string;
  createdAt: string;
  source: RecordSource;
  note?: string;
}

export interface UrineRecord extends BaseRecord {
  type: 'urine';
  productId: string;
  regionCount: number;
  orientation?: Orientation;
  angleDeg?: number;
  overall: ScreeningStatus;
  readings: UrineReadingRecord[];
  /** Which engine located the pads. Absent on older records (on-device). */
  engine?: 'device' | 'roboflow';
}

export interface OpkRecord extends BaseRecord {
  type: 'opk';
  productId: string;
  /** Null for manual entries where no ratio was measured. */
  ratio: number | null;
  category: OpkCategory;
  testDetected?: boolean;
  /** Which engine located the strip. Absent on older records (on-device). */
  engine?: 'device' | 'roboflow';
  /** Kit type confirmed by the test-type model, when it ran. */
  testKit?: { className: string; confidence: number };
  orientation?: Orientation;
  angleDeg?: number;
}

export type TestRecord = UrineRecord | OpkRecord;

export interface AppState {
  version: 1;
  profile: Profile | null;
  consentAcceptedAt: string | null;
  settings: {
    theme: ThemePreference;
    locale: string;
    autoCapture: boolean;
    /** Send urine strip photos to the trained Roboflow model to locate pads (on by default). */
    useTrainedModel: boolean;
    /** Optional Roboflow key entered by the user; kept only in this browser. */
    roboflowKey: string;
  };
  records: TestRecord[];
  /** Logged period start dates, YYYY-MM-DD. */
  periodStarts: string[];
}
