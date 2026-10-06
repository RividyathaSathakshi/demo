/** Small numeric helpers used across the vision pipeline. */

export function median(values: ArrayLike<number>): number {
  const n = values.length;
  if (n === 0) return 0;
  const arr = Float64Array.from(values as ArrayLike<number>).sort();
  const mid = n >> 1;
  return n % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

export function percentile(values: ArrayLike<number>, p: number): number {
  const n = values.length;
  if (n === 0) return 0;
  const arr = Float64Array.from(values as ArrayLike<number>).sort();
  const idx = Math.min(n - 1, Math.max(0, (p / 100) * (n - 1)));
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return arr[lo] + (arr[hi] - arr[lo]) * (idx - lo);
}

export function mean(values: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < values.length; i++) s += values[i];
  return values.length ? s / values.length : 0;
}

export function stdDev(values: ArrayLike<number>): number {
  const m = mean(values);
  let s = 0;
  for (let i = 0; i < values.length; i++) s += (values[i] - m) ** 2;
  return values.length ? Math.sqrt(s / values.length) : 0;
}

/** Otsu's threshold over values in [0, maxValue]. */
export function otsu(values: ArrayLike<number>, maxValue: number, bins = 128): number {
  const hist = new Float64Array(bins);
  const n = values.length;
  if (n === 0 || maxValue <= 0) return 0;
  for (let i = 0; i < n; i++) {
    const b = Math.min(bins - 1, Math.max(0, Math.floor((values[i] / maxValue) * bins)));
    hist[b]++;
  }
  let sumAll = 0;
  for (let i = 0; i < bins; i++) sumAll += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let bestT = 0;
  for (let t = 0; t < bins; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = n - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sumAll - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) {
      best = between;
      bestT = t;
    }
  }
  return ((bestT + 1) / bins) * maxValue;
}

/** Centred moving average. */
export function smooth(values: ArrayLike<number>, radius: number): Float32Array {
  const n = values.length;
  const out = new Float32Array(n);
  if (radius <= 0) {
    for (let i = 0; i < n; i++) out[i] = values[i];
    return out;
  }
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + values[i];
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - radius);
    const b = Math.min(n, i + radius + 1);
    out[i] = (prefix[b] - prefix[a]) / (b - a);
  }
  return out;
}

/** Running median (used as a slowly varying baseline for line detection). */
export function runningMedian(values: ArrayLike<number>, radius: number): Float32Array {
  const n = values.length;
  const out = new Float32Array(n);
  const win: number[] = [];
  for (let i = 0; i < n; i++) {
    win.length = 0;
    for (let j = Math.max(0, i - radius); j <= Math.min(n - 1, i + radius); j++) win.push(values[j]);
    win.sort((a, b) => a - b);
    out[i] = win[win.length >> 1];
  }
  return out;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
