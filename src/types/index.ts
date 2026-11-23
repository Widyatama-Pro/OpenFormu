/**
 * Tipe domain kanonik OpenFormu.
 * Sinkronkan setiap perubahan dengan docs/data-schema.md.
 */

export type NutrientUnit = "%" | "kcal/kg" | "MJ/kg" | "mg/kg" | "IU/kg" | "mEq/kg";
export type NutrientId = string;
export type Basis = "as_fed" | "dry_matter";

export type NutrientTier =
  "basic" | "amino_acid" | "fiber_carb" | "mineral_electrolyte" | "anf_physical";

export interface Nutrient {
  readonly id: NutrientId;
  readonly name: string;
  readonly nameEn?: string;
  readonly unit: NutrientUnit;
  readonly tier?: NutrientTier;
  readonly isDigestibleVariant?: boolean;
  readonly isCustom?: boolean;
  readonly defaultBasis?: Basis;
}

export type IngredientCategory =
  "energy" | "protein" | "mineral" | "premix" | "forage" | "additive" | "enzyme";

/** 8 klasifikasi bahan pakan standar internasional (IFN / NRC / Hartadi 1980 Tabel 7). */
export type FeedClassCode = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Batas dalam persen (0–100) atau satuan nutrien terkait. */
export interface Bounds {
  readonly min?: number;
  readonly max?: number;
}

export interface ZeroInclusionRule {
  readonly enforceNonZero: boolean;
  readonly minIfSelected?: number;
}

export interface Ingredient {
  readonly id: string;
  readonly name: string;
  readonly nameEn?: string;
  readonly category: IngredientCategory;
  /** Kode kelas bahan pakan standar 1–8 (IFN / NRC). */
  readonly feedClass?: FeedClassCode;
  /** Harga pasaran acuan per kg As-Fed (IDR). */
  readonly pricePerKg: number;
  /** Harga custom sesi pengguna yang menimpa harga acuan (IDR). */
  readonly priceOverride?: number;
  /** Bahan kering, % (0–100]. */
  readonly dryMatter: number;
  readonly basis: Basis;
  readonly isActive?: boolean;
  /**
   * Nilai nutrien pada basis bahan (`null` = data lab tidak tersedia / N/A;
   * `0` = memang tidak mengandung nutrien tersebut).
   */
  readonly nutrients: Readonly<Record<NutrientId, number | null>>;
  /** Standar deviasi (sigma) per nutrien untuk formulasi stokastik. */
  readonly stdDev?: Readonly<Record<NutrientId, number>>;
  readonly inclusion?: Bounds;
  readonly zeroInclusionRule?: ZeroInclusionRule;
  readonly groupId?: string;
  readonly phytateP?: number;
  readonly source: string;
}

export type ConstraintTier = "tier0" | "tier1" | "tier2" | "tier3";

export interface NutrientConstraint extends Bounds {
  readonly nutrientId: NutrientId;
  readonly isAdvance?: boolean;
  readonly enabled?: boolean;
  /** Titik tengah target ideal untuk Mode 5 (Presisi Tinggi). */
  readonly idealTarget?: number;
  /**
   * Prioritas relaksasi saat model infeasible.
   * tier0 = kaku (tidak boleh dilonggarkan, tanpa variabel slack); tier1/2/3 = elastis dengan penalti menurun.
   */
  readonly tier?: ConstraintTier;
  /** PR-04: standar deviasi kebutuhan ternak (sigma_bi) untuk stochastic RHS. */
  readonly requirementStdDev?: number;
  /** PR-04: probabilitas minimum pemenuhan kendala (0 < p < 1, default 0.95). */
  readonly targetProbability?: number;
  /** PR-04: gunakan batas Cantelli (bebas distribusi) untuk parameter miring. */
  readonly useCantelli?: boolean;
}

export interface RatioConstraint extends Bounds {
  readonly id?: string;
  readonly label?: string;
  readonly numerator: NutrientId;
  readonly denominator: NutrientId;
  /** PR-01: tier relaksasi rasio. */
  readonly tier?: ConstraintTier;
}

export interface IngredientGroupConstraint extends Bounds {
  readonly id: string;
  readonly name: string;
  readonly ingredientIds: readonly string[];
  /** PR-01: tier relaksasi grup (default tier3). */
  readonly tier?: ConstraintTier;
}

export interface DynamicCalculationStep {
  readonly nutrientId: string;
  readonly labelId: string;
  readonly labelEn: string;
  readonly dailyAmountLabel: string;
  readonly formulaText: string;
  readonly resultLabel: string;
}

export interface DynamicCalculationBreakdown {
  readonly standardName: string;
  readonly method: "interpolated" | "extrapolated";
  readonly inputsSummaryId: string;
  readonly inputsSummaryEn: string;
  readonly dmiKg: number;
  readonly fcm4PctKg?: number;
  readonly steps: readonly DynamicCalculationStep[];
}

export interface Requirement {
  readonly id: string;
  readonly name: string;
  readonly nameEn?: string;
  readonly species: string;
  readonly phase?: string;
  readonly basis: Basis;
  readonly constraints: readonly NutrientConstraint[];
  readonly ratios?: readonly RatioConstraint[];
  readonly ingredientGroups?: readonly IngredientGroupConstraint[];
  readonly source?: string;
  readonly dynamicCalculation?: DynamicCalculationBreakdown;
}

/** 1=Hemat, 2=Agak Hemat, 3=Seimbang, 4=Presisi, 5=Presisi Tinggi */
export type OptimizationMode = 1 | 2 | 3 | 4 | 5;

/** Mode input & pendekatan Target Nutrien: rentang Min–Max standar vs pendekatan presisi 1 angka. */
export type TargetInputMode = "range" | "single";

/** Mode objektif fraksional PR-03: minimasi biaya per satuan nutrien. */
export interface FractionalObjective {
  readonly mode: "cost_per_nutrient";
  readonly nutrientId: NutrientId;
  readonly denominatorEpsilon?: number;
}

/** Pengaturan multi-enzim sub-aditif PR-05. */
export interface EnzymeConfig {
  readonly id: string;
  readonly type: "phytase" | "xylanase" | "protease";
  /** Nutrien yang dilepaskan (tersedia tambahan) per fraksi enzim. */
  readonly matrix: Readonly<Record<NutrientId, number>>;
  /** Koefisien retensi termal 0-1 (mis. peleting < 1). */
  readonly thermalRetention?: number;
  /** Inclusion fraksi (0-1) enzim dalam ransum; default dari komposisi jika ada. */
  readonly inclusionFraction?: number;
  /** Substrat nutrien yang membatasi pelepasan (anti double-counting). */
  readonly substrateNutrientId?: NutrientId;
}

export interface FormulationConfig {
  readonly optimizationMode: OptimizationMode;
  readonly activeBasis: Basis;
  readonly batchSizeKg: number;
  /** Mode target nutrien: "range" (Min–Max) atau "single" (pendekatan 1 angka presisi). */
  readonly targetInputMode?: TargetInputMode;
  readonly enableAdvanceNutrients: boolean;
  /** Tampilkan dan aktifkan parameter NDF/ADF meskipun di luar Mode Lanjutan penuh. */
  readonly showNdf?: boolean;
  /** Tampilkan dan evaluasi parameter BETN (Bahan Ekstrak Tanpa Nitrogen / NFE). */
  readonly showBetn?: boolean;
  readonly enableDigestibleBasis: boolean;
  readonly enableElasticFallback: boolean;
  readonly globalZeroInclusion: ZeroInclusionRule;
  readonly manualLocks?: Readonly<Record<string, number>>;
  readonly customNutrients?: readonly Nutrient[];
  /** PR-03: objektif rasio Charnes–Cooper (mis. Cost/Mcal ME, Cost/g SID Lys). */
  readonly fractionalObjective?: FractionalObjective;
  /** PR-04: aktifkan iterasi SLP stokastik (Munford) bila ada data sigma/kovarians. */
  readonly enableStochasticSlp?: boolean;
  /** PR-04: maksimum iterasi SLP (default 12). */
  readonly stochasticMaxIter?: number;
  /** PR-04: faktor redaman alpha SLP (default 0.5). */
  readonly stochasticDamping?: number;
  /** PR-04: toleransi konvergensi ||dx||_inf (default 1e-5). */
  readonly stochasticTolerance?: number;
  /** PR-05: konfigurasi enzim aktif. */
  readonly enzymes?: readonly EnzymeConfig[];
  /** PR-05: plafon sub-aditif gabungan ψ (0-1) terhadap total uplift individual per substrat; default 1 = tanpa cap. */
  readonly enzymeSubAdditiveCap?: number;
}

export type FormulationStatus = "optimal" | "near_feasible" | "infeasible" | "error";
export type NutrientStatus = "met" | "below_min" | "above_max" | "unconstrained";

export interface PriceRange {
  readonly minPrice: number | null;
  readonly maxPrice: number | null;
}

export interface CompositionItem {
  readonly ingredientId: string;
  /** Fraksi 0–1 dalam basis model aktif. */
  readonly fraction: number;
  /** Proporsi dalam basis As-Fed (fraksi 0–1) untuk penimbangan aktual. */
  readonly asFedFraction?: number;
  readonly weightKg?: number;
  readonly costContribution?: number;
  readonly priceRange?: PriceRange;
}

export interface NutrientResult extends Bounds {
  readonly nutrientId: NutrientId;
  readonly value: number;
  readonly status: NutrientStatus;
  readonly deviation?: number;
  readonly shadowPrice?: number | null;
  /** PR-02: shadow price atas/bawah bila basis degenerat (directional). */
  readonly shadowPriceDown?: number | null;
  readonly shadowPriceUp?: number | null;
  readonly isDegenerate?: boolean;
  /** PR-02: rentang RHS target yang menjaga basis/dual valid. */
  readonly rhsRange?: { readonly min: number | null; readonly max: number | null };
  /** PR-04: margin stokastik kappa*sqrt(V) yang diterapkan pada kendala. */
  readonly stochasticMargin?: number;
}

export interface OpportunityCostItem {
  readonly ingredientId: string;
  readonly currentPrice: number;
  readonly opportunityPrice: number;
  readonly reducedCost: number;
}

export interface BoundDualItem {
  readonly ingredientId: string;
  readonly boundHit: "min" | "max";
  readonly dualValue: number;
}

export interface ConflictDiagnostic {
  readonly code:
    | "MIN_GT_MAX"
    | "INCLUSION_SUM_EXCEEDS_100"
    | "INCLUSION_MAX_UNDER_100"
    | "NUTRIENT_UNREACHABLE"
    | "ANTI_NOL_CONFLICT"
    | "ADVANCE_NULL_DATA"
    | "SOLVER_INFEASIBLE"
    | "FRACTIONAL_DENOMINATOR_ZERO"
    | "STOCHASTIC_UNSTABLE";
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly targetId?: string;
  readonly suggestion?: string;
}

/** PR-01: entri konflik minimal (IIS) terdeteksi. */
export interface IisItem {
  readonly kind: "nutrient" | "ratio" | "group" | "inclusion" | "sum";
  readonly targetId: string;
  readonly bound: "min" | "max" | "eq" | "sum";
  readonly tier?: ConstraintTier;
  readonly message: string;
}

/** PR-05: hasil evaluasi biologis rumen pasca-solve (CNCPS v6.5 / NASEM 2021 aljabar). */
export interface RumenEvaluation {
  readonly forageFractionPct: number;
  readonly ndfPct: number;
  readonly peuNdf240Pct: number;
  readonly estimatedDmiPctBw: number;
  readonly kpForagePctPerH: number;
  readonly kpConcPctPerH: number;
  readonly microbialProteinGPerKgDm: number;
  readonly predictedMethaneGPerKgDm: number;
  readonly acidosisRisk: "low" | "moderate" | "high";
}

export interface FormulationResult {
  readonly status: FormulationStatus;
  readonly basis: Basis;
  readonly costPerKg: number | null;
  readonly batchTotalCost?: number | null;
  readonly batchSizeKg?: number;
  readonly composition: readonly CompositionItem[];
  readonly nutrients: readonly NutrientResult[];
  readonly opportunityCosts?: readonly OpportunityCostItem[];
  readonly boundDuals?: readonly BoundDualItem[];
  readonly conflicts?: readonly ConflictDiagnostic[];
  /** PR-01: subset kendala pemicu infeasibility (Chinneck Deletion Filter). */
  readonly iis?: readonly IisItem[];
  /** PR-01: total pelanggaran relaksasi elastik bertingkat (LpUnit). */
  readonly relaxationPenalty?: number;
  /** PR-03: nilai objektif fraksional (mis. Rp/Mcal) bila mode fractional aktif. */
  readonly fractionalCost?: number | null;
  /** PR-04: jumlah iterasi SLP stokastik yang dijalankan. */
  readonly stochasticIterations?: number;
  /** PR-05: ringkasan evaluator biologis rumen (CNCPS/NASEM) bila relevan. */
  readonly rumenEvaluation?: RumenEvaluation;
  readonly messages: readonly string[];
  readonly solvedAt: string;
}

export interface Recipe {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly name: string;
  readonly notes?: string;
  readonly ingredients: readonly Ingredient[];
  readonly requirement: Requirement;
  readonly config?: FormulationConfig;
  readonly result: FormulationResult | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type AppLanguage = "id" | "en";
export type ThemeMode = "light" | "dark";

export type ThemePaletteId =
  "original-default" | "template-01" | "template-03" | "template-04" | "template-05";

export type ThemeModeSetting = "light" | "dark" | "system";
export type ResolvedThemeMode = "light" | "dark";
export type UiMode = "biasa" | "enhanced" | "anti-slop";
export type TableViewTier = "basic" | "standard" | "advanced";
export type RenderingEngineMode = "ultra" | "balanced" | "crisp";
export type MotionEngineMode = "gpu_flip" | "css_native";

export interface UserPreferences {
  readonly language: AppLanguage;
  readonly theme: ThemeMode;
  readonly themePalette?: ThemePaletteId;
  readonly themeModeSetting?: ThemeModeSetting;
  readonly amoledPureBlack?: boolean;
  /** Mode tampilan antarmuka: biasa, enhanced (default), atau anti-slop. */
  readonly uiMode?: UiMode;
  /** Kompatibilitas balik untuk sakelar UI Enhancer (true hanya saat uiMode === "enhanced"). */
  readonly uiEnhancer?: boolean;
  /** Profil engine grafis: ultra (Smooth 120 FPS), balanced, atau crisp (Standard hemat daya). */
  readonly renderingEngine?: RenderingEngineMode;
  /** Engine animasi & tata letak anti-hardcut 120 FPS: gpu_flip atau css_native. */
  readonly motionEngine?: MotionEngineMode;
  /** Intensitas blur kaca akrilik (0–32 px). */
  readonly glassBlurPx?: number;
  /** Intensitas pendaran glow volumetrik (0–150%). */
  readonly glowIntensityPct?: number;
  readonly defaultBasis: Basis;
  readonly defaultBatchKg: number;
  readonly zeroInclusionDefaultPct: number;
  /** Mode Simpel menyingkat istilah nutrisi (PK, EM, TDN, LK, SK) dan menyederhanakan tampilan. */
  readonly simpleMode?: boolean;
  /** Jumlah angka desimal tampilan nutrien makro & komposisi (0 = bulat default, 1 = xx,0, 2 = xx,00). */
  readonly decimalPlaces?: 0 | 1 | 2;
  /** Tingkat kolom default tabel formulasi: Dasar, Standar (BK/Min/Max), atau Lanjutan. */
  readonly tableViewTier?: TableViewTier;
}
