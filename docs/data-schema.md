# Skema Data

Tipe kanonik didefinisikan di [`src/types/index.ts`](../src/types/index.ts). Dokumen ini harus selalu sinkron dengannya.

## Tipe Dasar

- `Basis`: `"as_fed" | "dry_matter"`
- `NutrientUnit`: `"%" | "kcal/kg" | "MJ/kg" | "mg/kg" | "IU/kg" | "mEq/kg"`
- `NutrientTier`: `"basic" | "amino_acid" | "fiber_carb" | "mineral_electrolyte" | "anf_physical"`
- `IngredientCategory`: `"energy" | "protein" | "mineral" | "premix" | "forage" | "additive" | "enzyme"`
- `FeedClassCode`: `1 | 2 | 3 | 4 | 5 | 6 | 7 | 8` (8 kelas klasifikasi bahan pakan standar IFN / NRC / Hartadi 1980 Tabel 7: `1=Hijauan Kering`, `2=Hijauan Segar`, `3=Silase`, `4=Sumber Energi`, `5=Sumber Protein`, `6=Sumber Mineral`, `7=Sumber Vitamin`, `8=Aditif`)
- `LivestockSpecies`: `"broiler" | "layer" | "buras" | "duck" | "quail" | "turkey" | "goose" | "cattle_beef" | "cattle_dairy" | "buffalo" | "goat" | "sheep" | "goat_sheep" | "swine" | "fish" | "custom"`
- `OptimizationMode`: `1 | 2 | 3 | 4 | 5` (`1=Hemat`, `2=Agak Hemat`, `3=Seimbang`, `4=Presisi`, `5=Presisi Tinggi`)
- `TargetInputMode`: `"range" | "single"` (`"range"` = batas Min–Max standar; `"single"` = pendekatan presisi 1 angka dengan SK batas maksimal ketat)
- `FormulationStatus`: `"optimal" | "near_feasible" | "infeasible" | "error"`
- `NutrientStatus`: `"met" | "below_min" | "above_max" | "unconstrained"`
- `UiMode`: `"biasa" | "enhanced" | "anti-slop"` (default `"enhanced"` pada `DEFAULT_PREFERENCES`)
- `ThemePaletteId`: `"original-default" | "template-01" | "template-03" | "template-04" | "template-05"`
- `ThemeModeSetting`: `"light" | "dark" | "system"`
- `TableViewTier`: `"basic" | "standard" | "advanced"`

## `Nutrient`

```json
{
  "id": "cp",
  "name": "Protein Kasar",
  "nameEn": "Crude Protein",
  "unit": "%",
  "tier": "basic"
}
```

| Field                 | Tipe            | Keterangan                                                                                         |
| --------------------- | --------------- | -------------------------------------------------------------------------------------------------- |
| `id`                  | `string`        | kode unik (`cp`, `me_poultry`, `ca`, `sid_lys`, `avp`, `custom_*`, …)                              |
| `name` / `nameEn`     | `string`        | label Indonesia / opsional English                                                                 |
| `unit`                | `NutrientUnit`  | satuan nutrien (`% \| kcal/kg \| MJ/kg \| mg/kg \| IU/kg \| mEq/kg`)                               |
| `tier`                | `NutrientTier?` | pengelompokan Basic vs Advance (`amino_acid`, `fiber_carb`, `mineral_electrolyte`, `anf_physical`) |
| `isDigestibleVariant` | `boolean?`      | penanda fraksi tercerna (`SID` asam amino / `AvP`)                                                 |
| `isCustom`            | `boolean?`      | penanda nutrien kustom definisi pengguna (tampil dan aktif langsung di luar Mode Advance)          |
| `defaultBasis`        | `Basis?`        | basis pilihan pengguna yang dapat diubah dinamis (`as_fed \| dry_matter`)                          |

## `Ingredient`

```json
{
  "id": "corn-ground",
  "name": "Jagung Giling Kuning",
  "nameEn": "Ground Yellow Corn",
  "category": "energy",
  "pricePerKg": 5500,
  "dryMatter": 89,
  "basis": "as_fed",
  "isActive": true,
  "inclusion": { "min": 0, "max": 70 },
  "nutrients": { "cp": 8.5, "me_poultry": 3350, "trp": 0.07 },
  "source": "Tabel Pakan Indonesia / NRC (1994)"
}
```

| Field               | Tipe                             | Keterangan                                                                                        |
| ------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------- |
| `id`                | `string`                         | identifier unik                                                                                   |
| `name` / `nameEn`   | `string`                         | nama bahan ID / EN                                                                                |
| `category`          | `IngredientCategory`             | kategori nutrisi bahan                                                                            |
| `feedClass`         | `FeedClassCode?`                 | kelas klasifikasi standar 1–8 (opsional; otomatis diinferensi dari kode IFN/kategori bila kosong) |
| `pricePerKg`        | `number`                         | harga acuan per kg As-Fed (IDR)                                                                   |
| `priceOverride`     | `number?`                        | harga custom sesi pengguna (opsional; menimpa `pricePerKg`)                                       |
| `dryMatter`         | `number`                         | persentase Bahan Kering `(0–100]`                                                                 |
| `basis`             | `Basis`                          | basis pengukuran nilai `nutrients`                                                                |
| `isActive`          | `boolean?`                       | status centang aktif di formulasi                                                                 |
| `nutrients`         | `Record<string, number \| null>` | nilai nutrien; **`null` = data N/A**, **`0` = benar-benar nol**                                   |
| `stdDev`            | `Record<string, number>?`        | simpangan baku lab (sigma) untuk formulasi stokastik                                              |
| `inclusion`         | `Bounds?`                        | batas inklusi `{ min?: number, max?: number }` dalam `%` (`0–100`)                                |
| `zeroInclusionRule` | `ZeroInclusionRule?`             | aturan Anti-Nol `{ enforceNonZero: boolean, minIfSelected?: number }`                             |
| `groupId`           | `string?`                        | pengelompokan bahan                                                                               |
| `phytateP`          | `number?`                        | estimasi fosfor fitat untuk perhitungan matriks enzim fitase                                      |
| `source`            | `string`                         | **wajib** mencantumkan sumber data nutrien                                                        |

## `Requirement`

Mendefinisikan profil standar kebutuhan ternak:

- `id`, `name`, `nameEn?`, `species`, `phase?`, `basis`, `source?`
- `constraints`: `readonly NutrientConstraint[]` (`nutrientId`, `min?`, `max?`, `isAdvance?`, `enabled?`, `idealTarget?`, `tier?`, `requirementStdDev?`, `targetProbability?`, `useCantelli?`)
- `ratios?`: `readonly RatioConstraint[]` (`id?`, `label?`, `numerator`, `denominator`, `min?`, `max?`, `tier?`)
- `ingredientGroups?`: `readonly IngredientGroupConstraint[]` (`id`, `name`, `ingredientIds`, `min?`, `max?`, `tier?`)

## `FormulationConfig`

Menyimpan parameter aktif workbench formulasi:

- `optimizationMode`: `1 | 2 | 3 | 4 | 5`
- `activeBasis`: `"as_fed" | "dry_matter"`
- `batchSizeKg`: `number` (default `100` kg)
- `targetInputMode?`: `"range" | "single"` (default `"range"`; `"single"` mengaktifkan _Goal Programming_ pendekatan 1 angka presisi)
- `enableAdvanceNutrients`: `boolean`
- `showNdf?`: `boolean` (tampilkan parameter NDF/ADF di grid, target, dan solver meskipun di Mode Simpel)
- `showBetn?`: `boolean` (tampilkan parameter Bahan Ekstrak Tanpa Nitrogen / `betn` pada tabel, target nutrien, dan evaluator/solver)
- `enableDigestibleBasis`: `boolean`
- `enableElasticFallback`: `boolean`
- `globalZeroInclusion`: `ZeroInclusionRule`
- `manualLocks?`: `Record<string, number>` (kunci persentase manual untuk What-If)
- `customNutrients?`: `readonly Nutrient[]` (daftar nutrien kustom pengguna; maksimal 50, divalidasi lewat `validateCustomNutrient`)
- `fractionalObjective?`: `FractionalObjective` (`{ mode: "cost_per_nutrient", nutrientId, denominatorEpsilon? }`)
- `enableStochasticSlp?`, `stochasticMaxIter?`, `stochasticDamping?`, `stochasticTolerance?` (parameter SLP Munford `PR-04`)
- `enzymes?`: `readonly EnzymeConfig[]` (`id`, `type`, `matrix`, `thermalRetention?`, `inclusionFraction?`, `substrateNutrientId?`) & `enzymeSubAdditiveCap?` (`PR-05`)

## `FormulationResult`

Output hasil formulasi yang dihasilkan oleh engine LP HiGHS WASM di Web Worker (`solveFormulation`, dengan fallback evaluasi sinkron untuk skenario uji di `evaluateMockFormulation`):

- `status`: `"optimal" | "near_feasible" | "infeasible" | "error"`
- `basis`: `Basis` aktif saat kalkulasi
- `costPerKg`: `number | null` (`null` jika gagal / infeasible)
- `batchTotalCost?`: `number | null`
- `batchSizeKg?`: `number`
- `composition`: array `CompositionItem` (`ingredientId`, `fraction`, `asFedFraction?`, `weightKg?`, `costContribution?`, `priceRange?`)
- `nutrients`: array `NutrientResult` (`nutrientId`, `value`, `min?`, `max?`, `status`, `deviation?`, `shadowPrice?`, `shadowPriceDown?`, `shadowPriceUp?`, `isDegenerate?`, `rhsRange?`, `stochasticMargin?`)
- `opportunityCosts?`: array `OpportunityCostItem` (untuk bahan tidak terpilih `0%`)
- `boundDuals?`: array `BoundDualItem` (bahan yang menempel batas inklusi `min`/`max`)
- `conflicts?`: array `ConflictDiagnostic` (`code`, `severity`, `message`, `targetId?`, `suggestion?`)
- `iis?`: array `IisItem` (`kind`, `targetId`, `bound`, `tier?`, `message` — output _Chinneck Deletion Filter_ `PR-01`)
- `relaxationPenalty?`: `number` (total penalti relaksasi bertingkat pada status `near_feasible`)
- `fractionalCost?`: `number | null` (biaya per unit nutrien saat `fractionalObjective` aktif)
- `stochasticIterations?`: `number` (jumlah iterasi konvergensi SLP `PR-04`)
- `rumenEvaluation?`: `RumenEvaluation` (`forageFractionPct`, `ndfPct`, `peuNdf240Pct`, `estimatedDmiPctBw`, `kpForagePctPerH`, `kpConcPctPerH`, `microbialProteinGPerKgDm`, `predictedMethaneGPerKgDm`, `acidosisRisk`)
- `messages`: array pesan diagnosis manusiawi
- `solvedAt`: timestamp ISO 8601

## `Recipe` & `UserPreferences`

- `Recipe`: format `.feed.json` berversi (`schemaVersion: 1`, `id`, `name`, `notes?`, `ingredients`, `requirement`, `config?`, `result`, `createdAt`, `updatedAt`)
- `RenderingEngineMode`: `"ultra" | "balanced" | "crisp"` (profil kualitas grafis: `ultra` = `Smooth (120 FPS)` dengan blur akrilik & glow, `crisp` = `Standard (Biasa)` hemat daya tanpa blur)
- `MotionEngineMode`: `"gpu_flip" | "css_native"` (pilihan engine animasi `120 FPS` berbasis GPU `layoutId`/crossfade vs transisi CSS ringan)
- `UserPreferences`: preferensi antarmuka (`language`, `theme`, `themePalette?` [`original-default` | `template-01` | `template-03` | `template-04` | `template-05`], `themeModeSetting?` [`light` | `dark` | `system`], `amoledPureBlack?`, `uiMode?` [`"biasa" | "enhanced" | "anti-slop"`, default `"enhanced"`], `uiEnhancer?` [cermin kompatibilitas balik: `true` hanya saat `uiMode === "enhanced"`], `renderingEngine?`, `motionEngine?`, `glassBlurPx?` [`0..32`], `glowIntensityPct?` [`0..150`], `defaultBasis`, `defaultBatchKg`, `zeroInclusionDefaultPct`, `simpleMode?`, `decimalPlaces?` [`0 | 1 | 2`, default `0` dengan _Smart Micro Floor_ `>= 2` desimal bagi nutrien mikro `< 2%`], `tableViewTier?` [`"basic" | "standard" | "advanced"`])

## Penyimpanan IndexedDB & Validasi Batas Sistem

- **Database:** `"openformul-db"` v1 (`src/storage/db.ts` via `idb`) dengan 5 _object store_: `ingredients`, `requirements`, `recipes`, `active_session` (`id: "current"`), dan `preferences` (`id: "user"`), lengkap dengan pemulihan baris rusak, backfill non-destruktif kolom `nutrients.betn` pada data tersimpan lama, dan fallback memori otomatis jika IndexedDB tidak tersedia.
- **Validasi Batas Sistem (`src/utils/validators.ts`):** memastikan `dryMatter ∈ (0, 100]`, `pricePerKg >= 0`, nilai nutrien/inklusi berhingga & valid (`null` tetap dibedakan dari `0`), serta sanitasi karakter kontrol sebelum masuk ke state/domain.
- **Persistensi Tema & Validasi `UiMode`:** `validateUserPreferences` (`src/utils/validators.ts`) memvalidasi `uiMode` secara ketat terhadap `["biasa", "enhanced", "anti-slop"]` sekaligus mempertahankan pembacaan `uiEnhancer` lama. Pada lapisan `localStorage` & hidrasi pra-lukis `index.html`, preferensi dibaca berurutan dari `openformu-ui-mode` → `openformul-ui-mode` → `openformu-theme-enhancer` / `openformul-theme-enhancer` (`"false"` → `"biasa"`, `"true"` → `"enhanced"`, kosong → `"enhanced"`).
- **Impor & Ekspor Offline:** transfer portabel `.feed.json` (`schemaVersion: 1`), impor CSV partial-merge (`src/utils/ingredientCsvImport.ts` dengan alias header seperti `Harga/kg`, `PK (%)`, `BK %`), TSV Multi-Cell Paste (`src/utils/tsvPaste.ts`), generator OOXML `.xlsx` 4-sheet formulasi (`generateFormulationXlsx` dengan sheet `Matriks Nutrien Bahan` 25 parameter, takaran 2-versi `xx,xxx kg` & bulat, serta konsumsi harian BK/As-Fed) + 2-sheet database bahan (`generateIngredientDatabaseXlsx`) & CSV UTF-8 BOM (`src/storage/exportCsvXlsx.ts`), serta PDF 1.4 offline ber-`Head Kop` & `Tail Kop` (`src/storage/exportPdf.ts` dengan _safety status gate_ pada mode `batch_only`).
