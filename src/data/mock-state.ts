import { HARTADI_FEEDS } from "./hartadi-feeds";
import { KEARL_REQUIREMENTS, NRC_1988_DAIRY_REQUIREMENTS } from "./kearl-requirements";
import { NRC_1994_POULTRY_REQUIREMENTS, SNI_REQUIREMENTS } from "./sni-requirements";
import { resolveEffectiveConstraintBounds } from "../solver/modelHelpers";
import type {
  Basis,
  BoundDualItem,
  CompositionItem,
  ConflictDiagnostic,
  FormulationConfig,
  FormulationResult,
  Ingredient,
  Nutrient,
  NutrientResult,
  OpportunityCostItem,
  OptimizationMode,
  Recipe,
  Requirement,
  UserPreferences,
} from "../types";

export const MOCK_NUTRIENTS: readonly Nutrient[] = [
  // Basic tier
  { id: "cp", name: "Protein Kasar", nameEn: "Crude Protein", unit: "%", tier: "basic" },
  {
    id: "me_poultry",
    name: "Energi Metabolis Unggas",
    nameEn: "Poultry ME",
    unit: "kcal/kg",
    tier: "basic",
  },
  { id: "tdn", name: "TDN (Ruminansia)", nameEn: "TDN", unit: "%", tier: "basic" },
  { id: "ee", name: "Lemak Kasar", nameEn: "Ether Extract", unit: "%", tier: "basic" },
  { id: "cf", name: "Serat Kasar", nameEn: "Crude Fiber", unit: "%", tier: "basic" },
  { id: "ca", name: "Kalsium", nameEn: "Calcium", unit: "%", tier: "basic" },
  { id: "p", name: "Fosfor Total", nameEn: "Total Phosphorus", unit: "%", tier: "basic" },
  // Advance: Amino acids (protein fractions)
  { id: "lys", name: "Lisin", nameEn: "Lysine", unit: "%", tier: "amino_acid" },
  { id: "met", name: "Metionin", nameEn: "Methionine", unit: "%", tier: "amino_acid" },
  { id: "metcys", name: "Metionin + Sistin", nameEn: "Met + Cys", unit: "%", tier: "amino_acid" },
  { id: "thr", name: "Treonin", nameEn: "Threonine", unit: "%", tier: "amino_acid" },
  { id: "trp", name: "Triptofan", nameEn: "Tryptophan", unit: "%", tier: "amino_acid" },
  { id: "val", name: "Valin", nameEn: "Valine", unit: "%", tier: "amino_acid" },
  // Advance: Digestible variants
  {
    id: "sid_lys",
    name: "SID Lisin",
    nameEn: "SID Lysine",
    unit: "%",
    tier: "amino_acid",
    isDigestibleVariant: true,
  },
  {
    id: "avp",
    name: "Fosfor Tersedia (AvP)",
    nameEn: "Available Phosphorus",
    unit: "%",
    tier: "mineral_electrolyte",
    isDigestibleVariant: true,
  },
  // Advance: Mineral & Electrolyte Balance (PR-03 active dEB/DCAD)
  {
    id: "na",
    name: "Natrium (Na)",
    nameEn: "Sodium (Na)",
    unit: "mg/kg",
    tier: "mineral_electrolyte",
  },
  {
    id: "k",
    name: "Kalium (K)",
    nameEn: "Potassium (K)",
    unit: "mg/kg",
    tier: "mineral_electrolyte",
  },
  {
    id: "cl",
    name: "Klorida (Cl)",
    nameEn: "Chloride (Cl)",
    unit: "mg/kg",
    tier: "mineral_electrolyte",
  },
  {
    id: "s",
    name: "Sulfur (S)",
    nameEn: "Sulfur (S)",
    unit: "mg/kg",
    tier: "mineral_electrolyte",
  },
  {
    id: "deb",
    name: "dEB (Na+K-Cl)",
    nameEn: "dEB (Dietary Electrolyte Balance)",
    unit: "mEq/kg",
    tier: "mineral_electrolyte",
  },
  {
    id: "dcad",
    name: "DCAD (Na+K-Cl-S)",
    nameEn: "DCAD (Cation-Anion Difference)",
    unit: "mEq/kg",
    tier: "mineral_electrolyte",
  },
  // Advance: Fiber & carbohydrate fractions
  { id: "ndf", name: "NDF", nameEn: "Neutral Detergent Fiber", unit: "%", tier: "fiber_carb" },
  { id: "adf", name: "ADF", nameEn: "Acid Detergent Fiber", unit: "%", tier: "fiber_carb" },
  { id: "starch", name: "Pati", nameEn: "Starch", unit: "%", tier: "fiber_carb" },
  {
    id: "betn",
    name: "BETN (Ekstrak Tanpa Nitrogen)",
    nameEn: "NFE (Nitrogen-Free Extract)",
    unit: "%",
    tier: "fiber_carb",
  },
  // Advance: ANF & physical pellet limits (max-only)
  { id: "tannin", name: "Tanin", nameEn: "Tannin", unit: "%", tier: "anf_physical" },
  {
    id: "liquid_fat",
    name: "Lemak Cair Mixer",
    nameEn: "Mixer Liquid Fat",
    unit: "%",
    tier: "anf_physical",
  },
];

export const MOCK_INGREDIENTS: readonly Ingredient[] = [
  {
    id: "corn-ground",
    name: "Jagung Giling Kuning",
    nameEn: "Ground Yellow Corn",
    category: "energy",
    pricePerKg: 5500,
    dryMatter: 89,
    basis: "as_fed",
    isActive: true,
    inclusion: { min: 0, max: 70 },
    nutrients: {
      cp: 8.5,
      me_poultry: 3350,
      tdn: 80,
      ee: 3.8,
      cf: 2.2,
      ca: 0.02,
      p: 0.28,
      lys: 0.26,
      met: 0.18,
      metcys: 0.36,
      thr: 0.29,
      trp: 0.07,
      val: 0.4,
      sid_lys: 0.23,
      avp: 0.09,
      na: 200,
      k: 3000,
      cl: 400,
      s: 800,
      ndf: 9.5,
      adf: 3.1,
      starch: 64.0,
      betn: 73.2,
      tannin: 0,
      liquid_fat: 0,
    },
    stdDev: { cp: 0.5, me_poultry: 85 },
    phytateP: 0.21,
    source: "NRC (1994) Nutrient Requirements of Poultry",
  },
  {
    id: "sbm-44",
    name: "Bungkil Kedelai (SBM 44%)",
    nameEn: "Soybean Meal 44%",
    category: "protein",
    pricePerKg: 8200,
    dryMatter: 89,
    basis: "as_fed",
    isActive: true,
    inclusion: { min: 0, max: 40 },
    nutrients: {
      cp: 44.0,
      me_poultry: 2230,
      tdn: 78,
      ee: 0.8,
      cf: 7.0,
      ca: 0.29,
      p: 0.65,
      lys: 2.69,
      met: 0.62,
      metcys: 1.28,
      thr: 1.72,
      trp: 0.58,
      val: 2.08,
      sid_lys: 2.42,
      avp: 0.22,
      na: 340,
      k: 19600,
      cl: 360,
      s: 4300,
      ndf: 13.8,
      adf: 8.6,
      starch: 5.5,
      betn: 31.2,
      tannin: 0,
      liquid_fat: 0,
    },
    stdDev: { cp: 1.4, me_poultry: 65 },
    phytateP: 0.42,
    source: "NRC (1994) / Feedipedia",
  },
  {
    id: "rice-bran",
    name: "Dedak Padi Halus",
    nameEn: "Rice Bran",
    category: "energy",
    pricePerKg: 3000,
    dryMatter: 91,
    basis: "as_fed",
    isActive: true,
    inclusion: { min: 0, max: 20 },
    nutrients: {
      cp: 12.9,
      me_poultry: 2100,
      tdn: 68,
      ee: 13.0,
      cf: 11.4,
      ca: 0.07,
      p: 1.5,
      lys: 0.57,
      met: 0.26,
      metcys: 0.5,
      thr: 0.46,
      trp: null, // Contoh data lab lokal belum tersedia (N/A)
      val: 0.75,
      sid_lys: 0.45,
      avp: 0.24,
      na: 700,
      k: 17300,
      cl: 700,
      s: 1800,
      ndf: 26.5,
      adf: 14.2,
      starch: 22.0,
      betn: 43.2,
      tannin: 0.1,
      liquid_fat: 0,
    },
    stdDev: { cp: 1.1, cf: 1.8 },
    phytateP: 1.18,
    source: "Tabel Komposisi Pakan Indonesia (Hartadi) / NRC",
  },
  {
    id: "fish-meal-local",
    name: "Tepung Ikan Lokal (55%)",
    nameEn: "Local Fish Meal 55%",
    category: "protein",
    pricePerKg: 14500,
    dryMatter: 92,
    basis: "as_fed",
    isActive: true,
    inclusion: { min: 0, max: 10 },
    nutrients: {
      cp: 55.0,
      me_poultry: 2780,
      tdn: 74,
      ee: 8.5,
      cf: 1.0,
      ca: 5.1,
      p: 2.8,
      lys: 4.15,
      met: 1.55,
      metcys: 2.1,
      thr: 2.3,
      trp: 0.55,
      val: 2.65,
      sid_lys: 3.65,
      avp: 2.7,
      na: 8800,
      k: 7200,
      cl: 9800,
      s: 5400,
      ndf: 0,
      adf: 0,
      starch: 0,
      betn: 2.5,
      tannin: 0,
      liquid_fat: 0,
    },
    source: "SNI Tepung Ikan Pakan / Hartadi",
  },
  {
    id: "palm-kernel-meal",
    name: "Bungkil Inti Sawit (BIS)",
    nameEn: "Palm Kernel Meal",
    category: "protein",
    pricePerKg: 2600,
    dryMatter: 90,
    basis: "as_fed",
    isActive: false,
    inclusion: { min: 0, max: 15 },
    nutrients: {
      cp: 15.5,
      me_poultry: 1520,
      tdn: 71,
      ee: 7.2,
      cf: 16.5,
      ca: 0.28,
      p: 0.58,
      lys: 0.48,
      met: 0.31,
      metcys: 0.52,
      thr: 0.49,
      trp: 0.16,
      val: 0.78,
      sid_lys: 0.36,
      avp: 0.19,
      na: 220,
      k: 6400,
      cl: 1600,
      s: 2100,
      ndf: 65.0,
      adf: 41.0,
      starch: 2.0,
      betn: 46.8,
      tannin: 0.3,
      liquid_fat: 0,
    },
    source: "Feedipedia / Tabel Pakan Indonesia",
  },
  {
    id: "cpo-oil",
    name: "Minyak Sawit (CPO)",
    nameEn: "Crude Palm Oil",
    category: "energy",
    pricePerKg: 15200,
    dryMatter: 99.5,
    basis: "as_fed",
    isActive: true,
    inclusion: { min: 0, max: 5 },
    nutrients: {
      cp: 0,
      me_poultry: 8500,
      tdn: 185,
      ee: 99.5,
      cf: 0,
      ca: 0,
      p: 0,
      lys: 0,
      met: 0,
      metcys: 0,
      thr: 0,
      trp: 0,
      val: 0,
      sid_lys: 0,
      avp: 0,
      ndf: 0,
      adf: 0,
      starch: 0,
      betn: 0,
      tannin: 0,
      liquid_fat: 100,
    },
    source: "NRC (1994) / Standar Energi Lemak",
  },
  {
    id: "limestone",
    name: "Tepung Kapur (CaCO3)",
    nameEn: "Limestone",
    category: "mineral",
    pricePerKg: 1200,
    dryMatter: 99,
    basis: "as_fed",
    isActive: true,
    inclusion: { min: 0, max: 3 },
    nutrients: {
      cp: 0,
      me_poultry: 0,
      tdn: 0,
      ee: 0,
      cf: 0,
      ca: 38.0,
      p: 0,
      lys: 0,
      met: 0,
      metcys: 0,
      thr: 0,
      trp: 0,
      val: 0,
      sid_lys: 0,
      avp: 0,
      ndf: 0,
      adf: 0,
      starch: 0,
      betn: 0,
      tannin: 0,
      liquid_fat: 0,
    },
    source: "NRC (1994)",
  },
  {
    id: "dcp-mineral",
    name: "Dikalsium Fosfat (DCP)",
    nameEn: "Dicalcium Phosphate",
    category: "mineral",
    pricePerKg: 9800,
    dryMatter: 98,
    basis: "as_fed",
    isActive: true,
    inclusion: { min: 0, max: 3 },
    nutrients: {
      cp: 0,
      me_poultry: 0,
      tdn: 0,
      ee: 0,
      cf: 0,
      ca: 22.0,
      p: 18.0,
      lys: 0,
      met: 0,
      metcys: 0,
      thr: 0,
      trp: 0,
      val: 0,
      sid_lys: 0,
      avp: 17.5,
      ndf: 0,
      adf: 0,
      starch: 0,
      betn: 0,
      tannin: 0,
      liquid_fat: 0,
    },
    source: "NRC (1994)",
  },
  {
    id: "dl-methionine",
    name: "DL-Metionin (99%)",
    nameEn: "DL-Methionine 99%",
    category: "additive",
    pricePerKg: 58000,
    dryMatter: 99,
    basis: "as_fed",
    isActive: true,
    inclusion: { min: 0, max: 0.5 },
    nutrients: {
      cp: 58.0,
      me_poultry: 3680,
      tdn: 0,
      ee: 0,
      cf: 0,
      ca: 0,
      p: 0,
      lys: 0,
      met: 99.0,
      metcys: 99.0,
      thr: 0,
      trp: 0,
      val: 0,
      sid_lys: 0,
      avp: 0,
      ndf: 0,
      adf: 0,
      starch: 0,
      betn: 0,
      tannin: 0,
      liquid_fat: 0,
    },
    source: "Evonik / NRC Asam Amino Sintetis",
  },
  {
    id: "premix-vitmin",
    name: "Premix Vitamin-Mineral",
    nameEn: "Vitamin-Mineral Premix",
    category: "premix",
    pricePerKg: 35000,
    dryMatter: 95,
    basis: "as_fed",
    isActive: true,
    inclusion: { min: 0.5, max: 0.5 },
    nutrients: {
      cp: 0,
      me_poultry: 0,
      tdn: 0,
      ee: 0,
      cf: 0,
      ca: 12.0,
      p: 0,
      lys: 0,
      met: 0,
      metcys: 0,
      thr: 0,
      trp: 0,
      val: 0,
      sid_lys: 0,
      avp: 0,
      ndf: 0,
      adf: 0,
      starch: 0,
      betn: 0,
      tannin: 0,
      liquid_fat: 0,
    },
    source: "Rekomendasi produsen premix (inklusi tetap 0,5%)",
  },
  {
    id: "napier-grass",
    name: "Rumput Gajah (Segar)",
    nameEn: "Napier Grass (Fresh)",
    category: "forage",
    pricePerKg: 450,
    dryMatter: 22,
    basis: "dry_matter",
    isActive: false,
    inclusion: { min: 30, max: 70 },
    nutrients: {
      cp: 10.2,
      me_poultry: null,
      tdn: 56.0,
      ee: 2.4,
      cf: 31.5,
      ca: 0.42,
      p: 0.28,
      lys: null,
      met: null,
      metcys: null,
      thr: null,
      trp: null,
      val: null,
      sid_lys: null,
      avp: null,
      ndf: 67.0,
      adf: 39.5,
      starch: 2.5,
      tannin: 0.2,
      liquid_fat: 0,
    },
    source: "Feedipedia / Tabel Hijauan Tropis Indonesia (basis BK)",
  },
  ...HARTADI_FEEDS,
];

export {
  HARTADI_FEEDS,
  KEARL_REQUIREMENTS,
  NRC_1988_DAIRY_REQUIREMENTS,
  NRC_1994_POULTRY_REQUIREMENTS,
  SNI_REQUIREMENTS,
};

export const MOCK_REQUIREMENTS: readonly Requirement[] = [
  {
    id: "broiler-starter",
    name: "Broiler Starter (0–21 hari)",
    nameEn: "Broiler Starter (0–21 d)",
    species: "broiler",
    phase: "Starter",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 21, max: 23, idealTarget: 22, enabled: true },
      { nutrientId: "me_poultry", min: 2950, max: 3150, idealTarget: 3050, enabled: true },
      { nutrientId: "cf", max: 5, idealTarget: 3.5, enabled: true },
      { nutrientId: "ee", min: 3, max: 7, idealTarget: 5, enabled: true },
      { nutrientId: "ca", min: 0.9, max: 1.1, idealTarget: 1.0, enabled: true },
      { nutrientId: "p", min: 0.65, max: 0.85, idealTarget: 0.72, enabled: true },
      // Advance opt-in
      {
        nutrientId: "lys",
        min: 1.25,
        max: 1.45,
        idealTarget: 1.32,
        isAdvance: true,
        enabled: true,
      },
      { nutrientId: "met", min: 0.5, max: 0.65, idealTarget: 0.55, isAdvance: true, enabled: true },
      { nutrientId: "metcys", min: 0.92, isAdvance: true, enabled: true },
      { nutrientId: "thr", min: 0.82, isAdvance: true, enabled: false },
      { nutrientId: "avp", min: 0.45, max: 0.55, isAdvance: true, enabled: false },
      { nutrientId: "liquid_fat", max: 3.0, isAdvance: true, enabled: true },
    ],
    ratios: [
      {
        id: "ca-p",
        label: "Kalsium : Fosfor (Ca:P)",
        numerator: "ca",
        denominator: "p",
        min: 1.3,
        max: 2.0,
      },
    ],
    source: "SNI 8173.2:2015 / Adaptasi NRC (1994)",
  },
  {
    id: "layer-peak",
    name: "Ayam Petelur Fase Produksi",
    nameEn: "Layer Peak Production",
    species: "layer",
    phase: "Layer 18–45 minggu",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 17, max: 19, idealTarget: 18, enabled: true },
      { nutrientId: "me_poultry", min: 2700, max: 2850, idealTarget: 2780, enabled: true },
      { nutrientId: "cf", max: 6, idealTarget: 4.5, enabled: true },
      { nutrientId: "ca", min: 3.5, max: 4.2, idealTarget: 3.8, enabled: true },
      { nutrientId: "p", min: 0.55, max: 0.75, idealTarget: 0.62, enabled: true },
      { nutrientId: "lys", min: 0.82, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.38, isAdvance: true, enabled: true },
    ],
    ratios: [
      {
        id: "ca-p",
        label: "Kalsium : Fosfor (Ca:P)",
        numerator: "ca",
        denominator: "p",
        min: 5.0,
        max: 7.5,
      },
    ],
    source: "SNI 8290.5:2016 / Adaptasi NRC (1994)",
  },
  {
    id: "beef-fattening",
    name: "Sapi Potong Penggemukan (BK)",
    nameEn: "Beef Cattle Fattening (DM)",
    species: "cattle_beef",
    phase: "Penggemukan",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 13, max: 16, idealTarget: 14.5, enabled: true },
      { nutrientId: "tdn", min: 68, max: 78, idealTarget: 72, enabled: true },
      { nutrientId: "cf", min: 14, max: 24, idealTarget: 18, enabled: true },
      { nutrientId: "ca", min: 0.55, max: 0.9, idealTarget: 0.7, enabled: true },
      { nutrientId: "p", min: 0.3, max: 0.5, idealTarget: 0.38, enabled: true },
      { nutrientId: "ndf", min: 28, max: 42, isAdvance: true, enabled: true },
      { nutrientId: "adf", min: 17, max: 26, isAdvance: true, enabled: false },
    ],
    ratios: [
      {
        id: "ca-p",
        label: "Kalsium : Fosfor (Ca:P)",
        numerator: "ca",
        denominator: "p",
        min: 1.5,
        max: 2.5,
      },
    ],
    source: "SNI 3148-2:2017 / NRC Beef Cattle (2016)",
  },
  ...SNI_REQUIREMENTS,
  ...NRC_1994_POULTRY_REQUIREMENTS,
  ...KEARL_REQUIREMENTS,
  ...NRC_1988_DAIRY_REQUIREMENTS,
];

export const DEFAULT_CONFIG: FormulationConfig = {
  optimizationMode: 3,
  activeBasis: "as_fed",
  batchSizeKg: 100,
  enableAdvanceNutrients: false,
  showNdf: false,
  showBetn: false,
  enableDigestibleBasis: false,
  enableElasticFallback: true,
  globalZeroInclusion: { enforceNonZero: true, minIfSelected: 1 },
  manualLocks: {},
  customNutrients: [],
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  language: "id",
  theme: "light",
  uiMode: "enhanced",
  uiEnhancer: true,
  renderingEngine: "ultra",
  motionEngine: "gpu_flip",
  glassBlurPx: 20,
  glowIntensityPct: 100,
  defaultBasis: "as_fed",
  defaultBatchKg: 100,
  zeroInclusionDefaultPct: 1,
  simpleMode: true,
  decimalPlaces: 0,
  tableViewTier: "basic",
};

export const MOCK_SAVED_RECIPES: readonly Recipe[] = [
  {
    schemaVersion: 1,
    id: "recipe-broiler-hemat",
    name: "Starter Broiler Pakan Ekonomis",
    notes: "Template contoh broiler fase 0–21 hari dengan dedak dibatasi 12%.",
    ingredients: MOCK_INGREDIENTS,
    requirement: MOCK_REQUIREMENTS[0]!,
    config: DEFAULT_CONFIG,
    result: null,
    createdAt: "2026-11-10T08:00:00.000Z",
    updatedAt: "2026-11-12T14:30:00.000Z",
  },
  {
    schemaVersion: 1,
    id: "recipe-sapi-bk",
    name: "Ransum Sapi Potong Rumput Gajah + Konsentrat",
    notes: "Basis Bahan Kering (DM) dengan hijauan segar BK 22%.",
    ingredients: MOCK_INGREDIENTS.map((ing) =>
      ing.id === "napier-grass" ? { ...ing, isActive: true } : ing,
    ),
    requirement: MOCK_REQUIREMENTS[2]!,
    config: { ...DEFAULT_CONFIG, activeBasis: "dry_matter", batchSizeKg: 500 },
    result: null,
    createdAt: "2026-11-11T09:15:00.000Z",
    updatedAt: "2026-11-13T10:00:00.000Z",
  },
  {
    schemaVersion: 1,
    id: "recipe-sapi-kearl-300",
    name: "Ransum Sapi Potong 300 kg (Kearl 1982 + Hartadi)",
    notes:
      "Standar Kearl (1982) BB 300 kg PBBH 1,0 kg/hr dengan hijauan & konsentrat lokal Hartadi (basis BK).",
    ingredients: HARTADI_FEEDS.map((ing) => ({
      ...ing,
      isActive: [
        "hartadi-rumput-gajah",
        "hartadi-jerami-padi",
        "hartadi-lamtoro",
        "hartadi-bungkil-kelapa",
        "hartadi-pollard",
        "hartadi-onggok-kering",
        "hartadi-molases",
        "hartadi-bis-ekspeller",
      ].includes(ing.id),
    })),
    requirement: KEARL_REQUIREMENTS[1]!,
    config: { ...DEFAULT_CONFIG, activeBasis: "dry_matter", batchSizeKg: 500 },
    result: null,
    createdAt: "2026-11-14T08:00:00.000Z",
    updatedAt: "2026-11-15T08:00:00.000Z",
  },
];

export const OPTIMIZATION_MODE_META: Record<
  OptimizationMode,
  { readonly name: string; readonly nameEn: string; readonly hint: string }
> = {
  1: { name: "Hemat", nameEn: "Least-Cost", hint: "Biaya serendah mungkin, penuhi batas minimal" },
  2: {
    name: "Agak Hemat",
    nameEn: "Cost-Aware",
    hint: "Biaya rendah + ruang aman di atas minimal",
  },
  3: { name: "Seimbang", nameEn: "Balanced", hint: "Kompromi seimbang efisiensi biaya & kualitas" },
  4: { name: "Presisi", nameEn: "Precision", hint: "Prioritaskan akurasi target nutrisi" },
  5: {
    name: "Presisi Tinggi",
    nameEn: "High Precision",
    hint: "Fokus kedekatan target midpoint, abaikan harga",
  },
};

function convertNutrientToBasis(
  value: number | null,
  fromBasis: Basis,
  toBasis: Basis,
  dryMatter: number,
): number | null {
  if (value === null) return null;
  if (fromBasis === toBasis) return value;
  const dmFactor = Math.max(dryMatter, 1) / 100;
  return fromBasis === "as_fed" ? value / dmFactor : value * dmFactor;
}

function convertPriceToBasis(pricePerKgAsFed: number, toBasis: Basis, dryMatter: number): number {
  if (toBasis === "as_fed") return pricePerKgAsFed;
  const dmFactor = Math.max(dryMatter, 1) / 100;
  return pricePerKgAsFed / dmFactor;
}

/**
 * Evaluator prototype untuk Fase 1 (sebelum integrasi HiGHS WASM di Fase 2).
 * Mendukung validasi nyata, konversi basis As-Fed <-> BK, skala adukan,
 * mode What-If Lock, dan simulasi output Optimal / Near-Feasible / Infeasible.
 */
export function evaluateMockFormulation(
  ingredients: readonly Ingredient[],
  requirement: Requirement,
  config: FormulationConfig,
): FormulationResult {
  const active = ingredients.filter((ing) => ing.isActive !== false);
  const conflicts: ConflictDiagnostic[] = [];
  const activeBasis = config.activeBasis;

  if (active.length === 0) {
    return {
      status: "infeasible",
      basis: activeBasis,
      costPerKg: null,
      batchTotalCost: null,
      batchSizeKg: config.batchSizeKg,
      composition: [],
      nutrients: [],
      conflicts: [
        {
          code: "INCLUSION_MAX_UNDER_100",
          severity: "error",
          message: "Belum ada bahan pakan yang dipilih aktif.",
          suggestion: "Aktifkan minimal 2 bahan pakan pada daftar bahan.",
        },
      ],
      messages: ["Aktifkan minimal 2 bahan pakan untuk memulai formulasi."],
      solvedAt: new Date().toISOString(),
    };
  }

  // Hitung batas efektif inklusi dengan aturan anti-nol
  let sumMin = 0;
  let sumMax = 0;
  const effectiveBounds = new Map<string, { min: number; max: number }>();

  for (const ing of active) {
    const rawMin = ing.inclusion?.min ?? 0;
    const rawMax = ing.inclusion?.max ?? 100;
    const enforceNonZero =
      ing.zeroInclusionRule?.enforceNonZero ?? config.globalZeroInclusion.enforceNonZero;
    const autoMin =
      ing.zeroInclusionRule?.minIfSelected ?? config.globalZeroInclusion.minIfSelected ?? 1;

    const lockedVal = config.manualLocks?.[ing.id];
    const min =
      lockedVal !== undefined
        ? lockedVal
        : enforceNonZero
          ? Math.max(rawMin, Math.min(autoMin, rawMax))
          : rawMin;
    const max = lockedVal !== undefined ? lockedVal : rawMax;

    if (min < 0 || max < 0 || min > max) {
      conflicts.push({
        code: "MIN_GT_MAX",
        severity: "error",
        targetId: ing.id,
        message: `Batas inklusi tidak valid pada ${ing.name} (Min ${min}% > Max ${max}%).`,
        suggestion: "Perbaiki nilai Min% agar lebih kecil atau sama dengan Max%.",
      });
    }

    sumMin += min;
    sumMax += max;
    effectiveBounds.set(ing.id, { min, max });
  }

  if (config.globalZeroInclusion.enforceNonZero) {
    const autoMin = config.globalZeroInclusion.minIfSelected ?? 1;
    if (active.length * autoMin > 50) {
      conflicts.push({
        code: "ANTI_NOL_CONFLICT",
        severity: "warning",
        message: `Aturan Anti-Nol global mengunci ${active.length} × ${autoMin}% = ${(active.length * autoMin).toFixed(1)}% (> 50%) komposisi.`,
        suggestion: "Gunakan pengaturan Anti-Nol per-bahan agar Mode Hemat tetap leluasa.",
      });
    }
  }

  if (sumMin > 100 + 1e-6) {
    conflicts.push({
      code: "INCLUSION_SUM_EXCEEDS_100",
      severity: "error",
      message: `Total batas minimal semua bahan aktif (${sumMin.toFixed(1)}%) melebihi 100%.`,
      suggestion: "Turunkan batas Min% pada beberapa bahan atau matikan Anti-Nol global.",
    });
  }

  if (sumMax < 100 - 1e-6) {
    conflicts.push({
      code: "INCLUSION_MAX_UNDER_100",
      severity: "error",
      message: `Total batas maksimal semua bahan aktif (${sumMax.toFixed(1)}%) kurang dari 100%.`,
      suggestion: "Naikkan batas Max% atau aktifkan bahan tambahan.",
    });
  }

  const customIds = new Set((config.customNutrients ?? []).map((n) => n.id));
  const visibleConstraints = requirement.constraints.filter((c) => {
    const isCustom = customIds.has(c.nutrientId);
    const isNdfVisible =
      config.showNdf === true && (c.nutrientId === "ndf" || c.nutrientId === "adf");
    const isBetnVisible = config.showBetn === true && c.nutrientId === "betn";
    return (
      (isCustom ||
        c.isAdvance !== true ||
        config.enableAdvanceNutrients ||
        isNdfVisible ||
        isBetnVisible) &&
      c.enabled !== false
    );
  });

  // Pastikan setiap nutrien kustom, NDF/ADF aktif, maupun BETN aktif selalu dievaluasi meskipun belum punya target Min/Max
  const evalConstraints: typeof visibleConstraints = [...visibleConstraints];
  for (const custom of config.customNutrients ?? []) {
    if (!evalConstraints.some((c) => c.nutrientId === custom.id)) {
      evalConstraints.push({ nutrientId: custom.id, enabled: true });
    }
  }
  if (config.showNdf === true) {
    for (const ndfId of ["ndf", "adf"]) {
      if (!evalConstraints.some((c) => c.nutrientId === ndfId)) {
        evalConstraints.push({ nutrientId: ndfId, enabled: true });
      }
    }
  }
  if (config.showBetn === true && !evalConstraints.some((c) => c.nutrientId === "betn")) {
    evalConstraints.push({ nutrientId: "betn", enabled: true });
  }

  for (const c of visibleConstraints) {
    if (c.min !== undefined && c.max !== undefined && c.min > c.max) {
      conflicts.push({
        code: "MIN_GT_MAX",
        severity: "error",
        targetId: c.nutrientId,
        message: `Target nutrien ${c.nutrientId.toUpperCase()} memiliki Min (${c.min}) > Max (${c.max}).`,
        suggestion: "Samakan atau tukar nilai Min dan Max pada target nutrien.",
      });
    }
  }

  // Peringatan data Null pada mode Advance
  if (config.enableAdvanceNutrients) {
    const nullPairs: string[] = [];
    for (const c of visibleConstraints.filter((x) => x.isAdvance === true)) {
      for (const ing of active) {
        if (ing.nutrients[c.nutrientId] === null) {
          nullPairs.push(`${ing.name} (${c.nutrientId})`);
        }
      }
    }
    if (nullPairs.length > 0) {
      conflicts.push({
        code: "ADVANCE_NULL_DATA",
        severity: "warning",
        message: `Data nutrien Advance masih N/A (kosong) pada: ${nullPairs.slice(0, 3).join(", ")}${nullPairs.length > 3 ? ` +${nullPairs.length - 3} lainnya` : ""}.`,
        suggestion: "Lengkapi nilai lab atau pastikan angka N/A memang dimaksudkan sebagai 0.",
      });
    }
  }

  const hardErrors = conflicts.filter((c) => c.severity === "error");
  if (hardErrors.length > 0) {
    return {
      status: "infeasible",
      basis: activeBasis,
      costPerKg: null,
      batchTotalCost: null,
      batchSizeKg: config.batchSizeKg,
      composition: [],
      nutrients: [],
      conflicts,
      messages: hardErrors.map((e) => e.message),
      solvedAt: new Date().toISOString(),
    };
  }

  // Heuristik mock greedy+balancing untuk Prototype Fase 1 (diganti HiGHS WASM di Fase 2)
  const weights = new Map<string, number>();
  let remaining = 100;
  for (const ing of active) {
    const min = effectiveBounds.get(ing.id)?.min ?? 0;
    weights.set(ing.id, min);
    remaining -= min;
  }

  // Skor kesesuaian bahan terhadap mode optimasi (1=murah, 5=midpoint/kualitas protein-energi)
  const cpTarget = visibleConstraints.find((c) => c.nutrientId === "cp");
  const targetCp = cpTarget?.idealTarget ?? cpTarget?.min ?? 18;
  const priceWeight = (6 - config.optimizationMode) / 5; // Mode 1=1.0, Mode 5=0.2 (simulasi)

  const scored = [...active].sort((a, b) => {
    const priceA = convertPriceToBasis(a.priceOverride ?? a.pricePerKg, activeBasis, a.dryMatter);
    const priceB = convertPriceToBasis(b.priceOverride ?? b.pricePerKg, activeBasis, b.dryMatter);
    const cpA = convertNutrientToBasis(a.nutrients.cp ?? 0, a.basis, activeBasis, a.dryMatter) ?? 0;
    const cpB = convertNutrientToBasis(b.nutrients.cp ?? 0, b.basis, activeBasis, b.dryMatter) ?? 0;

    const scoreA = priceA * priceWeight * 0.01 + Math.abs(cpA - targetCp) * (1 - priceWeight * 0.6);
    const scoreB = priceB * priceWeight * 0.01 + Math.abs(cpB - targetCp) * (1 - priceWeight * 0.6);
    return scoreA - scoreB;
  });

  // Distribusikan sisa persentase secara bertahap agar mendekati komposisi masuk akal
  for (let pass = 0; pass < 4 && remaining > 1e-6; pass++) {
    for (const ing of scored) {
      if (remaining <= 1e-6) break;
      const bounds = effectiveBounds.get(ing.id);
      if (!bounds) continue;
      const cur = weights.get(ing.id) ?? 0;
      const room = bounds.max - cur;
      if (room <= 1e-6) continue;
      const preferredCap =
        ing.category === "mineral" || ing.category === "additive" || ing.category === "premix"
          ? Math.min(room, 1.5)
          : Math.min(room, remaining * (pass === 0 ? 0.55 : 0.4));
      const add = Math.min(room, remaining, preferredCap > 0 ? preferredCap : room);
      weights.set(ing.id, cur + add);
      remaining -= add;
    }
  }
  if (remaining > 1e-6) {
    for (const ing of active) {
      if (remaining <= 1e-6) break;
      const bounds = effectiveBounds.get(ing.id);
      if (!bounds) continue;
      const cur = weights.get(ing.id) ?? 0;
      const add = Math.min(bounds.max - cur, remaining);
      weights.set(ing.id, cur + add);
      remaining -= add;
    }
  }

  // Hitung proporsi As-Fed & biaya riil
  const rawComposition = active
    .map((ing) => ({
      ing,
      fraction: (weights.get(ing.id) ?? 0) / 100,
    }))
    .filter((item) => item.fraction > 1e-6);

  let afNormDenom = 0;
  for (const item of rawComposition) {
    afNormDenom +=
      activeBasis === "dry_matter"
        ? item.fraction / (Math.max(item.ing.dryMatter, 1) / 100)
        : item.fraction;
  }

  let totalCostPerKgModel = 0;
  const composition: CompositionItem[] = rawComposition
    .map((item) => {
      const unitPrice = item.ing.priceOverride ?? item.ing.pricePerKg;
      const modelPrice = convertPriceToBasis(unitPrice, activeBasis, item.ing.dryMatter);
      totalCostPerKgModel += item.fraction * modelPrice;

      const asFedFraction =
        activeBasis === "dry_matter" && afNormDenom > 0
          ? item.fraction / (Math.max(item.ing.dryMatter, 1) / 100) / afNormDenom
          : item.fraction;

      const weightKg = item.fraction * config.batchSizeKg;
      const costContribution = weightKg * modelPrice;

      return {
        ingredientId: item.ing.id,
        fraction: item.fraction,
        asFedFraction,
        weightKg,
        costContribution,
        priceRange: {
          minPrice: Math.round(unitPrice * 0.85),
          maxPrice: Math.round(unitPrice * 1.18),
        },
      };
    })
    .sort((a, b) => b.fraction - a.fraction);

  // Evaluasi capaian nutrien & cek deviasi
  const singleMode = config.targetInputMode === "single";
  const nutrientResults: NutrientResult[] = [];
  let hasViolation = false;

  for (const c of evalConstraints) {
    let val = 0;
    for (const item of rawComposition) {
      const converted = convertNutrientToBasis(
        item.ing.nutrients[c.nutrientId] ?? 0,
        item.ing.basis,
        activeBasis,
        item.ing.dryMatter,
      );
      val += item.fraction * (converted ?? 0);
    }

    const eff = resolveEffectiveConstraintBounds(c, singleMode);
    let status: NutrientResult["status"] = "met";
    let deviation = 0;
    if (eff.min !== undefined && val < eff.min - 1e-6) {
      status = "below_min";
      deviation = val - eff.min;
      hasViolation = true;
    } else if (eff.max !== undefined && val > eff.max + 1e-6) {
      status = "above_max";
      deviation = val - eff.max;
      hasViolation = true;
    } else if (eff.min === undefined && eff.max === undefined) {
      status = "unconstrained";
    }

    nutrientResults.push({
      nutrientId: c.nutrientId,
      value: val,
      ...(eff.min !== undefined ? { min: eff.min } : {}),
      ...(eff.max !== undefined ? { max: eff.max } : {}),
      status,
      deviation,
      shadowPrice: status === "met" && eff.min !== undefined ? Math.round((eff.min * 18) % 240) : 0,
    });
  }

  // Opportunity cost untuk bahan 0%
  const chosenIds = new Set(composition.map((c) => c.ingredientId));
  const opportunityCosts: OpportunityCostItem[] = active
    .filter((ing) => !chosenIds.has(ing.id))
    .map((ing) => {
      const current = ing.priceOverride ?? ing.pricePerKg;
      const opp = Math.round(current * 0.82);
      return {
        ingredientId: ing.id,
        currentPrice: current,
        opportunityPrice: opp,
        reducedCost: current - opp,
      };
    });

  // Bound duals untuk bahan yang menempel batas inklusi
  const boundDuals: BoundDualItem[] = composition
    .filter((item) => {
      const b = effectiveBounds.get(item.ingredientId);
      if (!b) return false;
      const pct = item.fraction * 100;
      return Math.abs(pct - b.min) < 0.05 || Math.abs(pct - b.max) < 0.05;
    })
    .map((item) => {
      const b = effectiveBounds.get(item.ingredientId)!;
      const pct = item.fraction * 100;
      const boundHit: "min" | "max" = Math.abs(pct - b.max) < 0.05 ? "max" : "min";
      return {
        ingredientId: item.ingredientId,
        boundHit,
        dualValue: boundHit === "max" ? -145 : 210,
      };
    });

  if (hasViolation && !config.enableElasticFallback) {
    return {
      status: "infeasible",
      basis: activeBasis,
      costPerKg: null,
      batchTotalCost: null,
      batchSizeKg: config.batchSizeKg,
      composition: [],
      nutrients: nutrientResults,
      conflicts: [
        ...conflicts,
        {
          code: "SOLVER_INFEASIBLE",
          severity: "error",
          message:
            "Kombinasi bahan aktif belum memenuhi seluruh batas target nutrien (Mode Toleransi Target nonaktif).",
          suggestion: "Aktifkan Mode Toleransi Target atau longgarkan batas nutrien/inklusi.",
        },
      ],
      messages: [
        "Formula tidak ditemukan untuk seluruh kendala saat ini (simulasi Fase 1; HiGHS LP penuh hadir di Fase 2).",
      ],
      solvedAt: new Date().toISOString(),
    };
  }

  return {
    status: hasViolation ? "near_feasible" : "optimal",
    basis: activeBasis,
    costPerKg: totalCostPerKgModel,
    batchTotalCost: totalCostPerKgModel * config.batchSizeKg,
    batchSizeKg: config.batchSizeKg,
    composition,
    nutrients: nutrientResults,
    opportunityCosts,
    boundDuals,
    conflicts,
    messages: hasViolation
      ? [
          "Mode Toleransi Target aktif (Prototype Mock): sebagian nutrien belum tercapai penuh dan ditandai merah.",
        ]
      : [],
    solvedAt: new Date().toISOString(),
  };
}
