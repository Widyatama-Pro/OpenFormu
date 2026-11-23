# OpenFormu 🌾 — Offline-first least-cost feed formulation engine

<p align="center">
  <img src="assets/banner.jpg" alt="OpenFormu — Precision Feed Optimization" width="100%">
</p>

<p align="center">
  <a href="https://github.com/Widyatama-Pro/OpenFormu/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Widyatama-Pro/OpenFormu/ci.yml?branch=main&style=flat-square&label=CI" alt="CI Status"></a>
  <a href="https://github.com/Widyatama-Pro/OpenFormu/releases"><img src="https://img.shields.io/github/v/release/Widyatama-Pro/OpenFormu?include_prereleases&style=flat-square" alt="Releases"></a>
  <img src="https://img.shields.io/badge/solver-HiGHS%20WASM-10B981?style=flat-square" alt="HiGHS WASM">
  <img src="https://img.shields.io/badge/offline-PWA%20%2B%20IndexedDB-0F766E?style=flat-square" alt="Offline-First">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-3B82F6?style=flat-square" alt="MIT License"></a>
</p>

**OpenFormu** is a client-side least-cost ration formulation engine powered by Linear Programming (HiGHS WebAssembly). It runs as an installable PWA in any modern browser, a native Windows desktop executable via Tauri v2, and an offline Android application via Capacitor 8. Drop straight into existing feed mill and spreadsheet workflows with multi-cell TSV paste, CSV partial-merge, multi-sheet `.xlsx`, print-ready PDF 1.4 (`full` and `batch_only`), and portable `.feed.json` files. Under the hood, a pure TypeScript model builder compiles nutrient, ratio, and inclusion constraints into CPLEX LP models and solves them off the main thread in a Web Worker.

**100% local & offline-first.** Every ingredient catalog, custom price override, nutrient standard, and saved ration stays on your device in IndexedDB with a precached `.wasm` Service Worker for zero-connectivity field work. No cloud account, no external solver API, and zero telemetry leave your machine. Open-source MIT code you can audit, fork, and run in air-gapped feed mills or research laboratories.

---

## Core Capabilities

- **Exact Client-Side LP & Goal Programming (`HiGHS` WASM):** Compiles decision variables $x_i \in [0, 1]$ ($\sum x_i = 1$) in pure `As-Fed` or `Dry Matter (BK)` basis after automatic normalization, running off the main thread with stale-ticket cancellation and `1e-6` post-solve mathematical verification against manual nutrient recalculation. Supports **Modes 1–5** (pure Least-Cost through High-Precision Chebyshev minimax deviation) as well as **Range (Min–Max)** and **Single-Target Approach** constraints.
- **Built-In Local Nutrition Libraries & Dynamic Cattle Calculators:** Ships with sourced feed composition data (**344** calibrated feeds in `HARTADI_FEEDS` combining Hartadi et al. 1980 Tables 12–15, Kearl 1982 Tables 26/27/32 tropical feeds, and NRC 1994 Tables 9-1/9-2/9-6/9-7/9-9/9-10 poultry feeds with 0 duplicate IFNs and derived `SID Lys`, `AvP`, `Na`, `K`, `Cl`, `S`, `NDF`, `ADF`), **22** SNI poultry & ruminant standards, **17** NRC (1994) 9th Revised Edition poultry requirements (Broiler, Layer, Breeder, Turkey, Pekin Duck, Japanese Quail, Geese), **98** Kearl (1982) ruminant profiles (Table 14 Cattle, Table 11 Sheep, Table 12 Goats, Table 16 Domestic Buffaloes), **24** NRC (1988) dairy profiles, plus dynamic **Beef Cattle (Kearl 1982)** and **Dairy Cattle (Kearl 1982 / NRC 1988)** piecewise interpolation & extrapolation calculators (computing DMI, 4% FCM, `CP`, `TDN`, `EE`, `CF`, `Ca`, and `P` with step-by-step transparent breakdown).
- **Industrial-Grade Precision & Conflict Diagnostics:**
  - **`PR-01` Minimal IIS & Priority Tiers:** Chinneck Deletion Filter isolates exact conflicting nutrient, ratio (`Ca:P`), or ingredient-group constraints across tiers (`tier0` hard to `tier3` soft), with farmer-friendly `Toleransi Target` ($\ell_1$ relaxation) guarded by an asymmetric **Crude Fiber (`cf`) hard ceiling of `+15%` above `max` (`max * 1.15`)**.
  - **`PR-02` Sensitivity, Bound Duals & Price Ladder:** Extracts `shadowPrice` (including directional degenerate duals), `opportunityCosts` for unused feeds, inclusion bound duals, and parametric Critical-Region price stepping (`computeCriticalRegionStepping`).
  - **`PR-03` Fractional Objective & `dEB/DCAD`:** Charnes–Cooper / Dinkelbach iteration minimizing `Cost / Nutrient` (e.g. IDR per Mcal ME) alongside active dietary electrolyte balance calculations.
  - **`PR-04` Stochastic SLP (Munford):** Accounts for ingredient nutrient variance ($\sigma$) using Gaussian quantiles $\Phi^{-1}(p)$ or distribution-free Cantelli bounds.
  - **`PR-05` Sub-Additive Multi-Enzymes & Algebraic Rumen Evaluator:** Models phytase/xylanase/protease uplift bounded by substrate availability (`phytateP`) with thermal pelleting retention, plus CNCPS v6.5 / NASEM 2021 ruminal passage, microbial protein, `peuNDF240`, `eCH4`, and acidosis risk estimation.
- **Data Exchange, 2-Decimal Batch Results & Offline Storage:** Multi-cell TSV paste from spreadsheets, CSV partial-merge without wiping missing columns, 4-sheet OOXML `.xlsx` formulation workbooks (including full 25-nutrient ingredient matrix, daily consumption BK & As-Fed, and dual batch weights `xx,xxx kg` vs rounded), PDF 1.4 formulation/batch reports with formal institutional `Head Kop` & 3-column verification `Tail Kop`, streamlined **Daily Consumption (BK & As-Fed kg/head/day)** cards & automatic **2-decimal (`0,00`)** batch/nutrient results in the Results tab, hover explanations on the `Inklusi %` column, draft-buffered numeric inputs (allowing empty field editing and `0.00x` micro-bounds without forced `0`), expandable `Nama Bahan` column on Android/mobile (`↔` toggle & touch drag), portable `.feed.json` transfer, custom user-defined nutrients, and bilingual (`ID / EN`) domain messages.
- **Three-Mode Display System (`Biasa`, `Enhanced`, `Anti-Slop`) & Platform-Aware Defaults:** Configurable in Theme Settings (`ThemeSwitcherMenu.tsx`, `src/theme/use-theme.ts`) across **5 curated palettes (`Indigo Glasial` default) × Light / Dark (+ AMOLED Pure Black)** and simplified **`Performa & Animasi Tampilan`** (`Smooth` vs `Ringan` with hover tooltips) with pre-paint hydration (`index.html`, key `openformu-ui-mode` with legacy migration). Defaults adapt cleanly by platform: **PC** launches with `Indigo Glasial` + **Dark** + `Enhanced` + `Smooth`, while **Android** launches with `Indigo Glasial` + **Light** + `Enhanced` + `Ringan` (disabling backdrop-blur & SVG turbulence overlays while keeping specular rims, mesh canvas, and subtle glow for smooth mobile performance). **`Anti-Slop`** (`[data-ui-mode="anti-slop"]` in `src/theme/anti-slop.css`) delivers WCAG AA calibrated surfaces (`>= 4.5:1` text, `>= 3.0:1` UI boundaries), flat tabular field-ledger hierarchy, `>= 44x44px` mobile touch targets, `SheetDialog` focus trapping, and explicit Empty/Loading/Error states while keeping `Biasa` and `Enhanced` visually and functionally intact.

---

## Scope & Mathematical Limitations

- **Mathematically Infeasible / Extreme Standards Cannot Be Forced:** If ingredient profiles and inclusion limits cannot physically satisfy active hard targets (e.g., requesting higher protein, energy, and low fiber simultaneously than any combination of available ingredients permits), the solver strictly reports `infeasible` (**Formula Tidak Ditemukan**) rather than fabricating invalid or unverified ratios.
- **Asymmetric Crude Fiber (`cf`) Hard Ceiling (`+15%` Above Max):** Under `Toleransi Target` (`elasticMode`), high-fiber ingredients are allowed wider flexibility below `min` (`cf` shortage is tolerated at a lower penalty tier), **but exceeding `max` is strictly hard-capped at `<= max * 1.15`**. Any ration exceeding `+15%` above the maximum Crude Fiber limit is rejected as `infeasible`.
- **Strict `0` vs `N/A` (`null`) Distinction:** Missing nutrient values (`null`) are never silently treated as `0`. Formulating in Advance / Amino Acid mode when selected ingredients lack lab values raises an `ADVANCE_NULL_DATA` advisory warning so unmeasured nutrients are not miscounted as zero contribution.
- **Linear Optimization Scope:** Core formulation uses linear / successive-linear programming (non-linear biological curves outside `PR-04` SLP and algebraic CNCPS/NASEM post-evaluation are approximated linearly). Enterprise multi-plant warehouse allocation, direct PLC/FT-NIR hardware feeds, and dynamic statutory legal-label generation are intentionally outside offline client scope (`Out of Scope`).

---

## Platforms & Downloads

- **Web / PWA (GitHub Pages):** [`https://widyatama-pro.github.io/OpenFormu/`](https://widyatama-pro.github.io/OpenFormu/)
- **Windows Desktop (`.exe`):** `OpenFormu-Windows-x64-setup.exe` via [GitHub Releases](https://github.com/Widyatama-Pro/OpenFormu/releases) (Tauri v2 + WebView2, maximized launch, native file dialogs & external browser links)
- **Android (`.apk`):** `OpenFormu-Android.apk` via [GitHub Releases](https://github.com/Widyatama-Pro/OpenFormu/releases) (Capacitor 8, local HiGHS WASM & native Share/Export)
- **Portable Offline ZIP:** `openformu-offline-portable.zip` (`start-windows.bat` / `start-mac-linux.sh`)

---

## Architecture

```mermaid
flowchart LR
  Input["Ingredients + Targets + Basis"] --> Norm["Basis Normalizer (As-Fed / DM)"]
  Norm --> Precheck["Precheck (IIS / Conflicts)"]
  Precheck --> Model["Pure TS LP Builder (toLpString)"]
  Model --> Worker["Web Worker (HiGHS WASM)"]
  Worker --> Verify["Post-Solve Verify (1e-6 + CF <= 1.15x max)"]
  Verify --> Store[("IndexedDB (Offline Storage)")]
```

---

## Quick Start (Development)

```bash
git clone https://github.com/Widyatama-Pro/OpenFormu.git
cd OpenFormu
npm install
npm run dev
```

Verification gates before committing:

```bash
npm run format:check
npm run typecheck
npm run lint
npm test -- --run
npm run build
```

> Note: `npm run format:check` runs `prettier --check .` (if third-party `.agents/` skill files are unignored, verify project files with `npx prettier --check README.md docs/ AGENTS.md index.html "src/**/*.{ts,tsx,css}" "tests/**/*.{ts,tsx}" "e2e/**/*.mjs"`). The 98-case opaque-box Playwright E2E suite lives in `e2e/` (`node e2e/run-e2e.mjs --tier=all`; the suite is ready via `e2e/run-e2e.mjs`, and full Tiers 1–4 execution plus Tier 5 hardening are scheduled in the Final Milestone).

---

## Documentation & License

- [System Architecture](docs/architecture.md)
- [Formulation Mathematics](docs/formulation-math.md)
- [Data Schema](docs/data-schema.md)
- [Roadmap](docs/ROADMAP.md)
- [Anti-Slop Design Direction & Delivery Gate](docs/anti-slop-design-direction.md)
- [Contributing Guide](CONTRIBUTING.md) · [Security Policy](SECURITY.md)

Licensed under the [MIT License](LICENSE).
