import type {
  AppLanguage,
  ConflictDiagnostic,
  ConstraintTier,
  FormulationStatus,
  IisItem,
  IngredientCategory,
  Nutrient,
  NutrientStatus,
} from "../types";

/** Memilih string terjemahan sesuai bahasa aktif (`id` atau `en`). */
export function pickLang(language: AppLanguage, idText: string, enText: string): string {
  return language === "id" ? idText : enText;
}

const CATEGORY_LABELS: Record<IngredientCategory, { readonly id: string; readonly en: string }> = {
  energy: { id: "Energi", en: "Energy" },
  protein: { id: "Protein", en: "Protein" },
  forage: { id: "Hijauan", en: "Forage" },
  mineral: { id: "Mineral", en: "Mineral" },
  premix: { id: "Premix", en: "Premix" },
  additive: { id: "Aditif", en: "Additive" },
  enzyme: { id: "Enzim", en: "Enzyme" },
};

export function getCategoryLabel(language: AppLanguage, category: IngredientCategory): string {
  const entry = CATEGORY_LABELS[category];
  return language === "id" ? entry.id : entry.en;
}

const SPECIES_LABELS: Record<string, { readonly id: string; readonly en: string }> = {
  broiler: { id: "Ayam Broiler", en: "Broiler Chicken" },
  layer: { id: "Ayam Layer", en: "Layer Chicken" },
  buras: { id: "Ayam Buras / Kampung", en: "Native Chicken" },
  duck: { id: "Itik / Bebek", en: "Duck" },
  quail: { id: "Burung Puyuh", en: "Japanese Quail" },
  turkey: { id: "Kalkun", en: "Turkey" },
  goose: { id: "Angsa", en: "Goose" },
  cattle_beef: { id: "Sapi Potong", en: "Beef Cattle" },
  cattle_dairy: { id: "Sapi Perah", en: "Dairy Cattle" },
  buffalo: { id: "Kerbau", en: "Domestic Buffalo" },
  sheep: { id: "Domba", en: "Sheep" },
  goat: { id: "Kambing", en: "Goat" },
  goat_sheep: { id: "Kambing / Domba", en: "Goat / Sheep" },
};

const NUTRIENT_SHORT_LABELS: Record<string, { readonly id: string; readonly en: string }> = {
  cp: { id: "PK", en: "CP" },
  me_poultry: { id: "EM", en: "ME" },
  tdn: { id: "TDN", en: "TDN" },
  ee: { id: "LK", en: "EE" },
  cf: { id: "SK", en: "CF" },
  ca: { id: "Ca", en: "Ca" },
  p: { id: "P", en: "P" },
  lys: { id: "Lys", en: "Lys" },
  met: { id: "Met", en: "Met" },
  metcys: { id: "M+S", en: "M+C" },
  thr: { id: "Thr", en: "Thr" },
  trp: { id: "Trp", en: "Trp" },
  val: { id: "Val", en: "Val" },
  sid_lys: { id: "SID Lys", en: "SID Lys" },
  avp: { id: "AvP", en: "AvP" },
  na: { id: "Na", en: "Na" },
  k: { id: "K", en: "K" },
  cl: { id: "Cl", en: "Cl" },
  s: { id: "S", en: "S" },
  deb: { id: "dEB", en: "dEB" },
  dcad: { id: "DCAD", en: "DCAD" },
  ndf: { id: "NDF", en: "NDF" },
  adf: { id: "ADF", en: "ADF" },
  starch: { id: "Pati", en: "Starch" },
  betn: { id: "BETN", en: "NFE" },
  tannin: { id: "Tanin", en: "Tannin" },
  liquid_fat: { id: "Lmk Cair", en: "Liq Fat" },
};

/** Nama lengkap nutrien sesuai bahasa aktif. */
export function getNutrientFullName(nutrient: Nutrient, language: AppLanguage): string {
  return language === "id" ? nutrient.name : (nutrient.nameEn ?? nutrient.name);
}

/** Singkatan nutrien standar (mis. Protein Kasar -> PK, Energi Metabolis -> EM). */
export function getNutrientShortName(nutrient: Nutrient, language: AppLanguage): string {
  const short = NUTRIENT_SHORT_LABELS[nutrient.id];
  if (short) {
    return language === "id" ? short.id : short.en;
  }
  return getNutrientFullName(nutrient, language);
}

/** Mengembalikan singkatan saat Mode Simpel aktif, atau nama lengkap saat Mode Lanjutan aktif. */
export function getNutrientDisplayName(
  nutrient: Nutrient,
  language: AppLanguage,
  simpleMode: boolean,
): string {
  return simpleMode
    ? getNutrientShortName(nutrient, language)
    : getNutrientFullName(nutrient, language);
}

export function getSpeciesLabelI18n(language: AppLanguage, species: string): string {
  const entry = SPECIES_LABELS[species];
  if (!entry) return species;
  return language === "id" ? entry.id : entry.en;
}

export function getFormulationStatusLabel(
  language: AppLanguage,
  status: FormulationStatus,
): string {
  switch (status) {
    case "optimal":
      return "Optimal";
    case "near_feasible":
      return language === "id" ? "Mendekati Target" : "Closest Fit";
    case "infeasible":
      return language === "id" ? "Formula Tidak Ditemukan" : "Infeasible";
    case "error":
      return language === "id" ? "Kesalahan Solver" : "Solver Error";
  }
}

export function getNutrientStatusLabel(language: AppLanguage, status: NutrientStatus): string {
  switch (status) {
    case "met":
      return language === "id" ? "Terpenuhi" : "Met";
    case "below_min":
      return language === "id" ? "Kurang" : "Below Min";
    case "above_max":
      return language === "id" ? "Lebih" : "Above Max";
    case "unconstrained":
      return language === "id" ? "Bebas" : "Free";
  }
}

export function getTierLabel(language: AppLanguage, tier: ConstraintTier | undefined): string {
  switch (tier) {
    case "tier0":
      return language === "id" ? "T0 Kaku (Hard)" : "T0 Hard";
    case "tier1":
      return language === "id" ? "T1 Kritis" : "T1 Critical";
    case "tier2":
      return language === "id" ? "T2 Standar" : "T2 Standard";
    case "tier3":
      return language === "id" ? "T3 Lunak" : "T3 Soft";
    default:
      return language === "id" ? "T2 Default" : "T2 Default";
  }
}

export function formatIisBound(language: AppLanguage, bound: IisItem["bound"]): string {
  switch (bound) {
    case "min":
      return "≥ min";
    case "max":
      return language === "id" ? "≤ maks" : "≤ max";
    case "eq":
      return "= target";
    case "sum":
      return "Σ";
  }
}

export function translateConflict(
  language: AppLanguage,
  conflict: ConflictDiagnostic,
): { readonly message: string; readonly suggestion?: string } {
  if (language === "id") {
    return {
      message: conflict.message,
      ...(conflict.suggestion !== undefined ? { suggestion: conflict.suggestion } : {}),
    };
  }

  const target = conflict.targetId ? ` (${conflict.targetId})` : "";
  switch (conflict.code) {
    case "MIN_GT_MAX":
      return {
        message: `Minimum bound exceeds maximum bound${target}.`,
        suggestion: "Adjust Min and Max bounds so Min <= Max.",
      };
    case "INCLUSION_SUM_EXCEEDS_100":
      return {
        message: "Sum of minimum ingredient inclusions exceeds 100%.",
        suggestion: "Lower Min % limits on active ingredients or disable global Anti-Zero.",
      };
    case "INCLUSION_MAX_UNDER_100":
      return {
        message: "Sum of maximum ingredient inclusions is under 100%.",
        suggestion: "Raise Max % limits or activate additional ingredients.",
      };
    case "NUTRIENT_UNREACHABLE":
      return {
        message: `Nutrient constraint${target} cannot be satisfied by active ingredients.`,
        suggestion: "Enable Flexible Bounds, adjust target bounds, or add richer ingredients.",
      };
    case "ANTI_NOL_CONFLICT":
      return {
        message: "Global Anti-Zero rule reserves more than 50% of ration capacity.",
        suggestion: "Use per-ingredient Anti-Zero settings for greater solver flexibility.",
      };
    case "ADVANCE_NULL_DATA":
      return {
        message:
          "Some active ingredients have N/A (missing) lab values for active Advance constraints.",
        suggestion: "Fill lab values or verify N/A is intentionally treated as 0.",
      };
    case "FRACTIONAL_DENOMINATOR_ZERO":
      return {
        message: `Fractional objective denominator${target} is zero across all active ingredients.`,
        suggestion: "Activate ingredients containing this nutrient or switch objective target.",
      };
    case "STOCHASTIC_UNSTABLE":
      return {
        message: "Stochastic SLP did not fully converge within the maximum iterations.",
        suggestion: "Increase SLP max iterations or reduce damping factor alpha.",
      };
    case "SOLVER_INFEASIBLE":
      return {
        message: "No feasible solution found under current hard constraints.",
        suggestion: "Enable Flexible Bounds or relax conflicting bounds listed in IIS.",
      };
  }
}
