# Lumenova

*A new light for women's health*

Lumenova is a browser-based screening and wellness aid. It reads **urine test strips** and **ovulation (LH / OPK) strips** with a phone camera. Built as a working prototype for a science exhibition (health category), it is designed so it can grow into a real public product.

> Lumenova is a screening and wellness aid, not a diagnostic device. Results may be affected by strip type, timing, lighting, camera quality, and other factors.

## Quick start

```bash
npm install
npm run dev        # local dev server
npm test           # vision pipeline + cycle unit tests (Vitest)
npm run build      # type-check + static production build in dist/
npm run preview    # serve the built site
```

The camera needs a **secure context**: `https://` or `localhost`. To try it on a phone during development, serve over HTTPS (for example `vite --host` behind a tunnel) or deploy the `dist/` folder.

### Deploying

Every push to the main branch runs `.github/workflows/deploy.yml`, which runs the tests, builds the site and publishes it to GitHub Pages at https://rividyathasathakshi.github.io/demo/.


`npm run build` produces a fully static site in `dist/`. It uses a relative base path and hash routing, so it works on any static host (GitHub Pages, Netlify, S3, a USB stick at the exhibition stand) with no rewrite rules.

## What is in the box

| Area | What it does |
| --- | --- |
| Marketing site | Home, How it works, Modules, The app, About, Privacy & disclaimer, Contact. Includes a language switcher and light/dark theme. |
| Onboarding | Choose Urine Health, Fertility Tracking or both. Optional age, last period, cycle and period length, health goal, and explicit consent. No account is created. |
| Scanner | Capture guide, then a live camera with real-time guidance and an overlay that follows the strip at any angle. Includes auto-capture, a quality gate and a detection reveal, then the result appears immediately. |
| Results | Normal / Borderline / Flagged with icon and text (never colour alone). Sections: What this means, What can I do now, When to seek professional help, Precautions, and Find wellness help nearby. The disclaimer is shown on every result. |
| Fertility | T/C ratio, Low / Rising / Peak, LH trend, cycle day, next-period countdown, and a fertile-window estimate refined by a recorded surge. |
| Dashboard, Calendar, History | Latest results, trends, reminders, a month calendar with period, fertile-window and test markers, and "Clear my data". |
| Fallbacks | Manual entry, "Use a photo instead", and a clearly labelled simulated sample image for demonstrations. |

## The computer-vision pipeline

Everything runs on the device, in a Web Worker, as pure TypeScript over RGBA buffers (`src/cv/`). Nothing assumes a fixed layout.

```
camera frame
  → detectStrip    background model from the frame border (planar lightness fit), CIELAB distance,
                   Otsu threshold capped by border noise, morphology, hole filling, collinear
                   fragment assembly; PCA gives the strip axis at any angle (0–180°)
  → orientation    horizontal / vertical / rotated from the axis angle
  → normalizeStrip bilinear resample into an upright, standard view (with edge margins)
  → assessQuality  partial strip, obstruction (outline bulges), too far, too dark, glare (clipping),
                   blur (edge-spread estimate), coloured light (backing chroma)
  → regions        urine: 1-D colour profile along the strip against a lighting-corrected backing
                   model; pads are counted, not assumed, and faint pads in a 2× gap are inferred.
                   OPK: optical density (green channel) against a running-median baseline;
                   narrow peaks present across the whole strip width become lines
  → analysis       urine: pad colours white-balanced with the strip's own backing, matched to
                   reference charts with CIEDE2000; pad order from the handle end, or by colour
                   fit when the handle is unclear; confidence per pad.
                   OPK: R = OD(test) / OD(control) → Low < 0.8 ≤ Rising < 1.0 ≤ Peak
  → screening result (or a specific, actionable reason why no result is given)
```

`src/cv/live.ts` runs a lighter version of the same detector about 7 times per second to drive the camera guidance ("Center the strip", "Reduce glare", "Ready to capture" and so on).

### Supported strips

Strip layouts are data in `src/config/strips.ts`. The prototype ships 2-, 3-, 4-, 5- and 10-pad urine layouts and one OPK configuration. The detector counts the pads in the photo and matches that count to a configured product. An unknown count is reported as unsupported, and the user is offered retake, strip selection or manual entry. To add a strip, add its pad order (from the handle end) to `URINE_PRODUCTS`.

**Calibration note:** the reference colours are approximations of typical dipstick charts. A production version must calibrate each supported brand against its printed chart and validate it against laboratory methods.

### Testing the vision code

- `src/cv/*.test.ts` renders synthetic strip photos (`src/cv/synthetic.ts`) at many angles, sizes, backgrounds and pad values. It checks pad counts, orientation, level readings, OPK categories and every quality-gate rejection.
- `scripts/make-fake-camera.ts` writes a Y4M video of a synthetic strip so the **live camera** can be tested in Chromium:

  ```bash
  npx vite-node scripts/make-fake-camera.ts strip.y4m urine   # or opk
  chromium --use-fake-device-for-media-stream --use-file-for-fake-video-capture=strip.y4m
  ```

## Roboflow model (optional cloud analysis)

Lumenova can use the YOLO26s model trained in Roboflow to find the urine strip pads. The model locates each pad and names its parameter; Lumenova still reads the colours on the device.

- **Workflow:** `urine-test-strips-main-vurine-test-strips-main-3jtim-gd0a1-1-yolo26s-t1-logic` in workspace `sathakshi2-gmail-com`
- **Model:** `sathakshi2-gmail-com/urine-test-strips-main-3jtim-gd0a1-1-yolo26s-t1` (YOLO26s, version 1: mAP@50 86.7%, precision 81.1%, recall 85.2%)
- **Input:** `image`
- **Output:** `predictions`, one box per pad (`Glucose`, `Bilirubin`, `Ketone`, `SpGravity`, `Blood`, `pH`, `Protein`, `Urobilinogen`, `Nitrite`, `Leukocytes`) plus `strip` and `background`

**How it is wired:**
- `src/roboflow/client.ts` makes the call: `POST https://serverless.roboflow.com/sathakshi2-gmail-com/workflows/<workflow-id>` with `Authorization: Bearer <key>` and `{ "inputs": { "image": { "type": "base64", "value": ... } } }`. It has a 30 s timeout, 2 retries with backoff for network, timeout and 5xx/429 errors, and typed `RoboflowError` errors.
- `src/roboflow/parse.ts` finds the detections output defensively, from the real response captured in `src/roboflow/__fixtures__/workflow-response.json`.
- `src/cv/roboflowAnalysis.ts` maps the model's classes to parameters, samples each pad, white-balances it against the strip backing, and matches it to the reference chart.
- `src/roboflow/cloudScan.ts` is the browser glue: it downscales the photo to at most 1600 px, sends it as JPEG, and keeps only the boxes.

**Turning it on:**
1. **API key.** It is never hardcoded. Either enter a key in the app under **Settings > Cloud analysis** (stored only in that browser), or set `VITE_ROBOFLOW_API_KEY` at build time. Vite inlines `VITE_` variables into the public JavaScript, so use your workspace's **publishable** key (`rf_...`) there, never a private key. Find keys at https://app.roboflow.com/settings/api.
2. **Opt in.** In Settings, enable **Use the Roboflow model for urine strip scans**. It is off by default, because the photo leaves the device; the Privacy page says so.
3. **Fallback.** If Roboflow fails (bad key, offline, timeout), the scan falls back to on-device analysis and says why. Quality-failure screens also offer **Analyze with the trained model** for a single photo.

**Tests:**
```bash
npx vitest run src/roboflow                                 # parser, client and analysis (offline)
ROBOFLOW_API_KEY=... npx vitest run src/roboflow/smoke.test.ts   # live call; skipped without a key
```
The live smoke test runs the workflow on one image from the training project and checks that the `predictions` output exists.

## Privacy

- No account, no backend, no analytics.
- Photos are processed in memory and discarded. They are never stored, and they are only uploaded if the user turns on Roboflow cloud analysis in Settings (urine strips only).
- Profile and saved results live in one `localStorage` entry (`lumenova.v1`) on this device. "Clear my data" removes it.
- Fonts are self-hosted, so no third-party requests are made on page load.
- "Find wellness help nearby" lists clinics, hospitals, pharmacies and women's health services from OpenStreetMap. It asks for location permission (or the user types a place), then the browser sends that location directly to OpenStreetMap's public Overpass and Nominatim services. Lumenova does not store it. The Privacy page says so.

Local storage is not encrypted by Lumenova; the Privacy page says so plainly.

## Internationalisation

All UI text lives in `src/i18n/locales/en.ts`. To add a language, create a locale file (it may be partial; missing keys fall back to English) and register it in `LOCALES` in `src/i18n/index.tsx`. The language switcher picks it up automatically. Keys are type-checked.

## Project layout

```
src/
  cv/            vision pipeline (pure TS), worker, synthetic renderer, tests
  config/        strip products and reference charts
  health/        cycle and date logic (+ tests)
  store/         localStorage-backed state
  i18n/          translation provider and locale files
  components/    UI primitives, layouts, charts, SVG illustrations
  features/      onboarding, scan, results, manual entry, dashboard, calendar, history, settings
  pages/         marketing pages
```

## Possible future directions (not built)

Community and expert Q&A, an AI health chat assistant, sharing with a doctor, an educational library, QR/PDF export, a doctor/hospital locator API, and advanced health insights.
