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

## Roboflow model (trained pad detector)

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

### Test-kit type model (Fertility Tracking)

A second Workflow checks ovulation photos before the C/T lines are read:

- **Workflow:** `test-strips-v2-vtest-strips-v2-b3uiv-1-yolo26s-t1-logic` (same workspace and key)
- **Model:** `sathakshi2-gmail-com/test-strips-v2-b3uiv-1-yolo26s-t1` (YOLO26s, version 1: mAP@50 98.8%, precision 94.7%, recall 94.6%)
- **Input:** `image`
- **Output:** `predictions`, one box per test kit. Classes: `ovulation_test`; pregnancy tests (`pregnancy_test`, `urine1_pregnancy`, `urine2_pregnancy`, `green_hcg`, `wh_hcg`); COVID tests (`spring_covid`, `cas_covid`, `hip_covid`)

**How it's used** (`src/cv/testKit.ts`, `runCloudOpkScan` in `src/roboflow/cloudScan.ts`):
- **Ovulation test found:** the photo is cropped to the detected box (with padding), and the on-device C/T line reader runs on the crop. If that fails, it runs on the full photo.
- **Pregnancy or COVID test found:** no reading is given, and the user is told this isn't an ovulation strip.
- **No kit recognised:** the whole photo is read on-device, with a notice.

The model does not detect the lines themselves; line intensity and the T/C ratio are still measured on-device. A real response is stored in `src/roboflow/__fixtures__/test-type-response.json`.

**Setup:** none. The model is **on by default** for urine strip scans.
1. **Key.** The workspace's publishable key (`rf_…`) is built into `src/roboflow/config.ts`. Roboflow issues publishable keys for client-side code: they can run inference but cannot read or manage the workspace. Never put a private key there or in `VITE_ROBOFLOW_API_KEY`, because both end up in the public JavaScript. `VITE_ROBOFLOW_API_KEY` at build time overrides it (developers only). Users never enter a key; Settings only has an on/off switch.
2. **Switching it off.** Users can turn it off under **Settings → Trained model** to keep every photo on the device. The Privacy page, home page and onboarding consent all say that urine strip photos are sent to Roboflow.
3. **Fallback.** If Roboflow fails (offline, timeout, key rejected), the scan falls back to on-device analysis and says why. Quality-failure screens also offer **Analyze with the trained model** for a single photo.

**Tests:**
```bash
npx vitest run src/roboflow                                 # parser, client and analysis (offline)
ROBOFLOW_API_KEY=... npx vitest run src/roboflow/smoke.test.ts   # live calls to both workflows; skipped without a key
```
The live smoke tests run each workflow on one image from its training project and check that the `predictions` output exists.

## Privacy

- No account, no backend, no analytics.
- Photos are processed and discarded; they are never stored. Urine strip photos are sent to the trained Roboflow model to locate the pads unless the user turns it off in Settings. Ovulation strip photos are sent to the test-kit model to confirm the kit type and locate the strip; the lines are read on-device.
- Profile and saved results live in one `localStorage` entry (`lumenova.v1`) on this device. "Clear my data" removes it.
- Fonts are self-hosted, so no third-party requests are made on page load.
- "Need professional guidance?" (Find wellness help nearby) searches OpenStreetMap for clinics, hospitals, pharmacies, women's health services and other healthcare facilities. The user chooses a category, then shares their location (browser permission) or types a place. Typed places are geocoded with Nominatim (up to 5 matches; the user picks one when there are several). Facilities come from the Overpass API (5 km, optionally 15 km). Results show on a Leaflet map with OpenStreetMap tiles (no API key) and in a list. **Get Directions** opens `https://www.google.com/maps/dir/?api=1&destination=LAT,LON` in a new tab, with only the facility's coordinates. The search location stays in React state for that search. It is never written to localStorage or sessionStorage, never put in a URL, and never sent anywhere except Nominatim, Overpass and the tile server. Code: `src/features/results/nearby.ts` (services), `NearbyHelp.tsx` (flow), `NearbyMap.tsx` (map, lazy-loaded).

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
