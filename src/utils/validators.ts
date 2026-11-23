import type {
  Basis,
  Bounds,
  EnzymeConfig,
  FeedClassCode,
  FormulationConfig,
  FractionalObjective,
  Ingredient,
  IngredientCategory,
  IngredientGroupConstraint,
  MotionEngineMode,
  Nutrient,
  NutrientConstraint,
  NutrientTier,
  NutrientUnit,
  OptimizationMode,
  RatioConstraint,
  Recipe,
  RenderingEngineMode,
  Requirement,
  TableViewTier,
  ThemeModeSetting,
  ThemePaletteId,
  UiMode,
  UserPreferences,
  ZeroInclusionRule,
} from "../types";

export type ValidationResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly errors: readonly string[] };

const VALID_CATEGORIES = new Set<IngredientCategory>([
  "energy",
  "protein",
  "mineral",
  "premix",
  "forage",
  "additive",
  "enzyme",
]);

const VALID_BASES = new Set<Basis>(["as_fed", "dry_matter"]);
const VALID_NUTRIENT_UNITS = new Set<NutrientUnit>([
  "%",
  "kcal/kg",
  "MJ/kg",
  "mg/kg",
  "IU/kg",
  "mEq/kg",
]);
const VALID_NUTRIENT_TIERS = new Set<NutrientTier>([
  "basic",
  "amino_acid",
  "fiber_carb",
  "mineral_electrolyte",
  "anf_physical",
]);
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  if (Object.prototype.toString.call(value) !== "[object Object]") {
    return false;
  }
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === null || proto === Object.prototype || Object.getPrototypeOf(proto) === null;
}

function stripControlCharacters(raw: string, allowNewlines: boolean): string {
  let out = "";
  for (let i = 0; i < raw.length; i += 1) {
    const code = raw.charCodeAt(i);
    const isLineBreak = code === 10 || code === 13;
    if ((code <= 31 || code === 127) && !(allowNewlines && isLineBreak)) {
      continue;
    }
    out += raw[i]!;
  }
  return out;
}

export function sanitizeText(
  value: unknown,
  options?: { maxLength?: number; allowNewlines?: boolean },
): string {
  if (typeof value !== "string") return "";
  const cleaned = stripControlCharacters(value, options?.allowNewlines === true).trim();
  const limit = options?.maxLength ?? 500;
  return cleaned.length > limit ? cleaned.slice(0, limit) : cleaned;
}

export function parseFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function validateCategory(value: unknown): IngredientCategory | null {
  if (typeof value !== "string") return null;
  return VALID_CATEGORIES.has(value as IngredientCategory) ? (value as IngredientCategory) : null;
}

function validateBasis(value: unknown): Basis | null {
  if (typeof value !== "string") return null;
  return VALID_BASES.has(value as Basis) ? (value as Basis) : null;
}

function parseOptionalBounds(raw: unknown, label: string, errors: string[]): Bounds | undefined {
  if (raw === undefined) return undefined;
  if (!isPlainObject(raw)) {
    errors.push(`${label} harus berupa objek.`);
    return undefined;
  }
  let minVal: number | undefined;
  let maxVal: number | undefined;

  if (raw.min !== undefined) {
    const parsedMin = parseFiniteNumber(raw.min);
    if (parsedMin === null || parsedMin < 0 || parsedMin > 100) {
      errors.push(`${label}.min harus angka pada rentang 0–100.`);
    } else {
      minVal = parsedMin;
    }
  }
  if (raw.max !== undefined) {
    const parsedMax = parseFiniteNumber(raw.max);
    if (parsedMax === null || parsedMax < 0 || parsedMax > 100) {
      errors.push(`${label}.max harus angka pada rentang 0–100.`);
    } else {
      maxVal = parsedMax;
    }
  }
  if (minVal !== undefined && maxVal !== undefined && minVal > maxVal) {
    errors.push(`${label}.min (${minVal}) tidak boleh lebih besar dari max (${maxVal}).`);
  }

  return {
    ...(minVal !== undefined ? { min: minVal } : {}),
    ...(maxVal !== undefined ? { max: maxVal } : {}),
  };
}

function parseZeroInclusion(
  raw: unknown,
  label: string,
  errors: string[],
): ZeroInclusionRule | undefined {
  if (raw === undefined) return undefined;
  if (!isPlainObject(raw) || typeof raw.enforceNonZero !== "boolean") {
    errors.push(`${label}.enforceNonZero harus boolean.`);
    return undefined;
  }
  let minIfSelected: number | undefined;
  if (raw.minIfSelected !== undefined) {
    const parsed = parseFiniteNumber(raw.minIfSelected);
    if (parsed === null || parsed < 0 || parsed > 100) {
      errors.push(`${label}.minIfSelected harus angka 0–100.`);
    } else {
      minIfSelected = parsed;
    }
  }
  return {
    enforceNonZero: raw.enforceNonZero,
    ...(minIfSelected !== undefined ? { minIfSelected } : {}),
  };
}

export function validateIngredient(
  raw: unknown,
  contextLabel = "Bahan",
): ValidationResult<Ingredient> {
  if (!isPlainObject(raw)) {
    return { ok: false, errors: [`${contextLabel} harus berupa objek JSON.`] };
  }

  const errors: string[] = [];
  const id = sanitizeText(raw.id, { maxLength: 100 });
  if (!id || FORBIDDEN_KEYS.has(id)) {
    errors.push(`${contextLabel}: id wajib terisi string yang valid.`);
  }

  const name = sanitizeText(raw.name, { maxLength: 160 });
  if (!name) {
    errors.push(`${contextLabel}: nama bahan wajib terisi.`);
  }

  const nameEn = sanitizeText(raw.nameEn, { maxLength: 160 });
  const category = validateCategory(raw.category);
  if (!category) {
    errors.push(`${contextLabel}: kategori tidak valid.`);
  }

  const pricePerKg = parseFiniteNumber(raw.pricePerKg);
  if (pricePerKg === null || pricePerKg < 0) {
    errors.push(`${contextLabel}: pricePerKg harus angka >= 0.`);
  }

  let priceOverride: number | undefined;
  if (raw.priceOverride !== undefined) {
    const parsedOverride = parseFiniteNumber(raw.priceOverride);
    if (parsedOverride === null || parsedOverride < 0) {
      errors.push(`${contextLabel}: priceOverride harus angka >= 0.`);
    } else {
      priceOverride = parsedOverride;
    }
  }

  const dryMatter = parseFiniteNumber(raw.dryMatter);
  if (dryMatter === null || dryMatter <= 0 || dryMatter > 100) {
    errors.push(`${contextLabel}: dryMatter (BK %) harus > 0 dan <= 100.`);
  }

  const basis = validateBasis(raw.basis);
  if (!basis) {
    errors.push(`${contextLabel}: basis harus 'as_fed' atau 'dry_matter'.`);
  }

  let isActive: boolean | undefined;
  if (raw.isActive !== undefined) {
    if (typeof raw.isActive !== "boolean") {
      errors.push(`${contextLabel}: isActive harus boolean.`);
    } else {
      isActive = raw.isActive;
    }
  }

  const nutrients: Record<string, number | null> = {};
  if (!isPlainObject(raw.nutrients)) {
    errors.push(`${contextLabel}: nutrients harus berupa peta nilai nutrien.`);
  } else {
    for (const [k, v] of Object.entries(raw.nutrients)) {
      const cleanKey = sanitizeText(k, { maxLength: 60 });
      if (!cleanKey || FORBIDDEN_KEYS.has(cleanKey)) continue;
      if (v === null) {
        nutrients[cleanKey] = null;
      } else {
        const num = parseFiniteNumber(v);
        if (num === null || num < 0) {
          errors.push(
            `${contextLabel}: nilai nutrien '${cleanKey}' tidak valid (< 0 atau bukan angka).`,
          );
        } else {
          nutrients[cleanKey] = num;
        }
      }
    }
  }

  let stdDev: Record<string, number> | undefined;
  if (raw.stdDev !== undefined) {
    if (!isPlainObject(raw.stdDev)) {
      errors.push(`${contextLabel}: stdDev harus berupa objek.`);
    } else {
      stdDev = {};
      for (const [k, v] of Object.entries(raw.stdDev)) {
        if (FORBIDDEN_KEYS.has(k)) continue;
        const num = parseFiniteNumber(v);
        if (num === null || num < 0) {
          errors.push(`${contextLabel}: stdDev['${k}'] tidak valid.`);
        } else {
          stdDev[k] = num;
        }
      }
    }
  }

  const inclusion = parseOptionalBounds(raw.inclusion, `${contextLabel}.inclusion`, errors);
  const zeroInclusionRule = parseZeroInclusion(
    raw.zeroInclusionRule,
    `${contextLabel}.zeroInclusionRule`,
    errors,
  );

  const groupId = sanitizeText(raw.groupId, { maxLength: 100 });
  let phytateP: number | undefined;
  if (raw.phytateP !== undefined) {
    const parsed = parseFiniteNumber(raw.phytateP);
    if (parsed === null || parsed < 0 || parsed > 100) {
      errors.push(`${contextLabel}: phytateP harus pada rentang 0–100.`);
    } else {
      phytateP = parsed;
    }
  }

  let feedClass: FeedClassCode | undefined;
  if (raw.feedClass !== undefined) {
    const parsedFc = parseFiniteNumber(raw.feedClass);
    if (parsedFc !== null && Number.isInteger(parsedFc) && parsedFc >= 1 && parsedFc <= 8) {
      feedClass = parsedFc as FeedClassCode;
    }
  }

  const source = sanitizeText(raw.source, { maxLength: 400 }) || "Impor JSON";

  if (errors.length > 0 || !category || pricePerKg === null || dryMatter === null || !basis) {
    return { ok: false, errors };
  }

  const validated: Ingredient = {
    id,
    name,
    category,
    pricePerKg,
    dryMatter,
    basis,
    nutrients,
    source,
    ...(feedClass !== undefined ? { feedClass } : {}),
    ...(nameEn ? { nameEn } : {}),
    ...(priceOverride !== undefined ? { priceOverride } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(stdDev ? { stdDev } : {}),
    ...(inclusion ? { inclusion } : {}),
    ...(zeroInclusionRule ? { zeroInclusionRule } : {}),
    ...(groupId ? { groupId } : {}),
    ...(phytateP !== undefined ? { phytateP } : {}),
  };

  return { ok: true, data: validated };
}

export function validateIngredientPackJson(raw: unknown): ValidationResult<readonly Ingredient[]> {
  if (!Array.isArray(raw)) {
    return { ok: false, errors: ["File pack bahan harus berupa array JSON bahan pakan."] };
  }
  if (raw.length === 0) {
    return { ok: false, errors: ["Array bahan pakan kosong."] };
  }
  if (raw.length > 500) {
    return { ok: false, errors: ["Jumlah bahan dalam satu impor dibatasi maksimal 500 entri."] };
  }
  const errors: string[] = [];
  const items: Ingredient[] = [];
  raw.forEach((entry, idx) => {
    const res = validateIngredient(entry, `Bahan #${idx + 1}`);
    if (!res.ok) {
      errors.push(...res.errors);
    } else {
      items.push(res.data);
    }
  });
  return errors.length > 0 ? { ok: false, errors } : { ok: true, data: items };
}

export function validateRequirement(
  raw: unknown,
  contextLabel = "Standar Kebutuhan",
): ValidationResult<Requirement> {
  if (!isPlainObject(raw)) {
    return { ok: false, errors: [`${contextLabel} harus berupa objek JSON.`] };
  }
  const errors: string[] = [];
  const id = sanitizeText(raw.id, { maxLength: 100 });
  const name = sanitizeText(raw.name, { maxLength: 160 });
  const nameEn = sanitizeText(raw.nameEn, { maxLength: 160 });
  const species = sanitizeText(raw.species, { maxLength: 60 });
  const phase = sanitizeText(raw.phase, { maxLength: 100 });
  const basis = validateBasis(raw.basis);
  const source = sanitizeText(raw.source, { maxLength: 400 });

  if (!id || FORBIDDEN_KEYS.has(id)) errors.push(`${contextLabel}: id tidak valid.`);
  if (!name) errors.push(`${contextLabel}: nama wajib terisi.`);
  if (!species) errors.push(`${contextLabel}: species wajib terisi.`);
  if (!basis) errors.push(`${contextLabel}: basis harus 'as_fed' atau 'dry_matter'.`);

  const constraints: NutrientConstraint[] = [];
  if (!Array.isArray(raw.constraints)) {
    errors.push(`${contextLabel}: constraints harus berupa array.`);
  } else {
    raw.constraints.forEach((cRaw, idx) => {
      if (!isPlainObject(cRaw)) {
        errors.push(`${contextLabel}.constraints[${idx}] harus berupa objek.`);
        return;
      }
      const nutrientId = sanitizeText(cRaw.nutrientId, { maxLength: 60 });
      if (!nutrientId || FORBIDDEN_KEYS.has(nutrientId)) {
        errors.push(`${contextLabel}.constraints[${idx}].nutrientId tidak valid.`);
        return;
      }
      let minVal: number | undefined;
      let maxVal: number | undefined;
      let idealTarget: number | undefined;
      if (cRaw.min !== undefined) {
        const parsed = parseFiniteNumber(cRaw.min);
        if (parsed === null || parsed < 0) {
          errors.push(`${contextLabel}.constraints[${idx}].min tidak valid.`);
        } else {
          minVal = parsed;
        }
      }
      if (cRaw.max !== undefined) {
        const parsed = parseFiniteNumber(cRaw.max);
        if (parsed === null || parsed < 0) {
          errors.push(`${contextLabel}.constraints[${idx}].max tidak valid.`);
        } else {
          maxVal = parsed;
        }
      }
      if (cRaw.idealTarget !== undefined) {
        const parsed = parseFiniteNumber(cRaw.idealTarget);
        if (parsed === null || parsed < 0) {
          errors.push(`${contextLabel}.constraints[${idx}].idealTarget tidak valid.`);
        } else {
          idealTarget = parsed;
        }
      }
      if (minVal !== undefined && maxVal !== undefined && minVal > maxVal) {
        errors.push(`${contextLabel}.constraints[${idx}]: min (${minVal}) > max (${maxVal}).`);
      }

      constraints.push({
        nutrientId,
        ...(minVal !== undefined ? { min: minVal } : {}),
        ...(maxVal !== undefined ? { max: maxVal } : {}),
        ...(idealTarget !== undefined ? { idealTarget } : {}),
        ...(typeof cRaw.isAdvance === "boolean" ? { isAdvance: cRaw.isAdvance } : {}),
        ...(typeof cRaw.enabled === "boolean" ? { enabled: cRaw.enabled } : {}),
      });
    });
  }

  let ratios: RatioConstraint[] | undefined;
  if (raw.ratios !== undefined) {
    if (!Array.isArray(raw.ratios)) {
      errors.push(`${contextLabel}.ratios harus berupa array.`);
    } else {
      ratios = [];
      raw.ratios.forEach((rRaw, idx) => {
        if (!isPlainObject(rRaw)) {
          errors.push(`${contextLabel}.ratios[${idx}] harus berupa objek.`);
          return;
        }
        const numerator = sanitizeText(rRaw.numerator, { maxLength: 60 });
        const denominator = sanitizeText(rRaw.denominator, { maxLength: 60 });
        if (!numerator || !denominator) {
          errors.push(`${contextLabel}.ratios[${idx}] numerator/denominator wajib terisi.`);
          return;
        }
        const rId = sanitizeText(rRaw.id, { maxLength: 60 });
        const rLabel = sanitizeText(rRaw.label, { maxLength: 120 });
        let rMin: number | undefined;
        let rMax: number | undefined;
        if (rRaw.min !== undefined) {
          const parsed = parseFiniteNumber(rRaw.min);
          if (parsed === null || parsed < 0)
            errors.push(`${contextLabel}.ratios[${idx}].min tidak valid.`);
          else rMin = parsed;
        }
        if (rRaw.max !== undefined) {
          const parsed = parseFiniteNumber(rRaw.max);
          if (parsed === null || parsed < 0)
            errors.push(`${contextLabel}.ratios[${idx}].max tidak valid.`);
          else rMax = parsed;
        }
        if (rMin !== undefined && rMax !== undefined && rMin > rMax) {
          errors.push(`${contextLabel}.ratios[${idx}]: min > max.`);
        }
        ratios?.push({
          numerator,
          denominator,
          ...(rId ? { id: rId } : {}),
          ...(rLabel ? { label: rLabel } : {}),
          ...(rMin !== undefined ? { min: rMin } : {}),
          ...(rMax !== undefined ? { max: rMax } : {}),
        });
      });
    }
  }

  let ingredientGroups: IngredientGroupConstraint[] | undefined;
  if (raw.ingredientGroups !== undefined) {
    if (!Array.isArray(raw.ingredientGroups)) {
      errors.push(`${contextLabel}.ingredientGroups harus berupa array.`);
    } else {
      ingredientGroups = [];
      raw.ingredientGroups.forEach((gRaw, idx) => {
        if (!isPlainObject(gRaw)) {
          errors.push(`${contextLabel}.ingredientGroups[${idx}] harus berupa objek.`);
          return;
        }
        const gId = sanitizeText(gRaw.id, { maxLength: 80 });
        const gName = sanitizeText(gRaw.name, { maxLength: 120 });
        const ids = Array.isArray(gRaw.ingredientIds)
          ? gRaw.ingredientIds.map((item) => sanitizeText(item, { maxLength: 100 })).filter(Boolean)
          : [];
        if (!gId || !gName) {
          errors.push(`${contextLabel}.ingredientGroups[${idx}] id dan name wajib terisi.`);
          return;
        }
        const bounds = parseOptionalBounds(
          {
            ...(gRaw.min !== undefined ? { min: gRaw.min } : {}),
            ...(gRaw.max !== undefined ? { max: gRaw.max } : {}),
          },
          `${contextLabel}.ingredientGroups[${idx}]`,
          errors,
        );
        ingredientGroups?.push({
          id: gId,
          name: gName,
          ingredientIds: ids,
          ...(bounds?.min !== undefined ? { min: bounds.min } : {}),
          ...(bounds?.max !== undefined ? { max: bounds.max } : {}),
        });
      });
    }
  }

  if (errors.length > 0 || !basis) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      id,
      name,
      species,
      basis,
      constraints,
      ...(nameEn ? { nameEn } : {}),
      ...(phase ? { phase } : {}),
      ...(ratios ? { ratios } : {}),
      ...(ingredientGroups ? { ingredientGroups } : {}),
      ...(source ? { source } : {}),
    },
  };
}

export function validateCustomNutrient(
  raw: unknown,
  contextLabel = "CustomNutrient",
): ValidationResult<Nutrient> {
  if (!isPlainObject(raw)) {
    return { ok: false, errors: [`${contextLabel}: harus berupa objek JSON.`] };
  }
  const errors: string[] = [];
  const id = sanitizeText(raw.id, { maxLength: 60 });
  if (!id || FORBIDDEN_KEYS.has(id)) {
    errors.push(`${contextLabel}: id nutrien kustom tidak valid.`);
  }
  const name = sanitizeText(raw.name, { maxLength: 100 });
  if (!name) {
    errors.push(`${contextLabel}: nama nutrien wajib terisi.`);
  }
  const nameEn = sanitizeText(raw.nameEn, { maxLength: 100 });
  const unitRaw = typeof raw.unit === "string" ? raw.unit.trim() : "";
  const unit = VALID_NUTRIENT_UNITS.has(unitRaw as NutrientUnit) ? (unitRaw as NutrientUnit) : null;
  if (!unit) {
    errors.push(
      `${contextLabel}: satuan tidak valid (pilih %, kcal/kg, MJ/kg, mg/kg, IU/kg, atau mEq/kg).`,
    );
  }
  let tier: NutrientTier | undefined;
  if (raw.tier !== undefined) {
    if (typeof raw.tier !== "string" || !VALID_NUTRIENT_TIERS.has(raw.tier as NutrientTier)) {
      errors.push(`${contextLabel}: tier nutrien tidak valid.`);
    } else {
      tier = raw.tier as NutrientTier;
    }
  }
  let defaultBasis: Basis | undefined;
  if (raw.defaultBasis !== undefined) {
    const parsedBasis = validateBasis(raw.defaultBasis);
    if (!parsedBasis) {
      errors.push(`${contextLabel}: defaultBasis harus 'as_fed' atau 'dry_matter'.`);
    } else {
      defaultBasis = parsedBasis;
    }
  }
  if (errors.length > 0 || !unit) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    data: {
      id,
      name,
      unit,
      isCustom: true,
      ...(nameEn ? { nameEn } : {}),
      ...(tier ? { tier } : {}),
      ...(raw.isDigestibleVariant === true ? { isDigestibleVariant: true } : {}),
      ...(defaultBasis ? { defaultBasis } : {}),
    },
  };
}

export function validateFormulationConfig(raw: unknown): ValidationResult<FormulationConfig> {
  if (!isPlainObject(raw)) {
    return { ok: false, errors: ["Konfigurasi formulasi harus berupa objek JSON."] };
  }
  const errors: string[] = [];
  const modeNum = parseFiniteNumber(raw.optimizationMode);
  const optimizationMode: OptimizationMode =
    modeNum === 1 || modeNum === 2 || modeNum === 3 || modeNum === 4 || modeNum === 5 ? modeNum : 3;
  if (modeNum !== optimizationMode) {
    errors.push("optimizationMode harus antara 1 sampai 5.");
  }

  const activeBasis = validateBasis(raw.activeBasis) ?? "as_fed";
  if (!validateBasis(raw.activeBasis)) {
    errors.push("activeBasis harus 'as_fed' atau 'dry_matter'.");
  }

  const batchSizeKg = parseFiniteNumber(raw.batchSizeKg);
  if (batchSizeKg === null || batchSizeKg <= 0 || batchSizeKg > 1_000_000) {
    errors.push("batchSizeKg harus angka > 0.");
  }

  const zeroRule = parseZeroInclusion(
    raw.globalZeroInclusion,
    "config.globalZeroInclusion",
    errors,
  ) ?? {
    enforceNonZero: false,
    minIfSelected: 1,
  };

  let manualLocks: Record<string, number> | undefined;
  if (raw.manualLocks !== undefined) {
    if (!isPlainObject(raw.manualLocks)) {
      errors.push("manualLocks harus berupa objek.");
    } else {
      manualLocks = {};
      for (const [k, v] of Object.entries(raw.manualLocks)) {
        if (FORBIDDEN_KEYS.has(k)) continue;
        const parsed = parseFiniteNumber(v);
        if (parsed === null || parsed < 0 || parsed > 100) {
          errors.push(`manualLocks['${k}'] harus angka 0–100.`);
        } else {
          manualLocks[k] = parsed;
        }
      }
    }
  }

  let customNutrients: Nutrient[] | undefined;
  if (raw.customNutrients !== undefined) {
    if (!Array.isArray(raw.customNutrients)) {
      errors.push("customNutrients harus berupa array.");
    } else if (raw.customNutrients.length > 50) {
      errors.push("Jumlah nutrien kustom melebihi batas maksimal (50).");
    } else {
      customNutrients = [];
      const seenCustomIds = new Set<string>();
      raw.customNutrients.forEach((item, idx) => {
        const res = validateCustomNutrient(item, `customNutrients[${idx}]`);
        if (!res.ok) {
          errors.push(...res.errors);
        } else if (seenCustomIds.has(res.data.id)) {
          errors.push(`customNutrients[${idx}]: duplikasi id '${res.data.id}'.`);
        } else {
          seenCustomIds.add(res.data.id);
          customNutrients!.push(res.data);
        }
      });
    }
  }

  if (errors.length > 0 || batchSizeKg === null) {
    return { ok: false, errors };
  }

  let fractionalObjective: FractionalObjective | undefined;
  if (
    isPlainObject(raw.fractionalObjective) &&
    raw.fractionalObjective.mode === "cost_per_nutrient"
  ) {
    const nutId = sanitizeText(raw.fractionalObjective.nutrientId, { maxLength: 80 });
    if (nutId && !FORBIDDEN_KEYS.has(nutId)) {
      const eps = parseFiniteNumber(raw.fractionalObjective.denominatorEpsilon);
      fractionalObjective = {
        mode: "cost_per_nutrient",
        nutrientId: nutId,
        ...(eps !== null && eps > 0 ? { denominatorEpsilon: eps } : {}),
      };
    }
  }

  let enzymes: EnzymeConfig[] | undefined;
  if (Array.isArray(raw.enzymes)) {
    const parsedEnzymes: EnzymeConfig[] = [];
    for (const item of raw.enzymes.slice(0, 12)) {
      if (!isPlainObject(item)) continue;
      const eid = sanitizeText(item.id, { maxLength: 80 });
      const etype =
        item.type === "phytase" || item.type === "xylanase" || item.type === "protease"
          ? item.type
          : null;
      if (!eid || !etype || !isPlainObject(item.matrix)) continue;
      const matrix: Record<string, number> = {};
      for (const [mk, mv] of Object.entries(item.matrix)) {
        if (FORBIDDEN_KEYS.has(mk)) continue;
        const num = parseFiniteNumber(mv);
        if (num !== null) matrix[mk] = num;
      }
      const retention = parseFiniteNumber(item.thermalRetention);
      const incl = parseFiniteNumber(item.inclusionFraction);
      const subId = sanitizeText(item.substrateNutrientId, { maxLength: 80 });
      parsedEnzymes.push({
        id: eid,
        type: etype,
        matrix,
        ...(retention !== null ? { thermalRetention: Math.min(1, Math.max(0, retention)) } : {}),
        ...(incl !== null ? { inclusionFraction: Math.min(1, Math.max(0, incl)) } : {}),
        ...(subId ? { substrateNutrientId: subId } : {}),
      });
    }
    if (parsedEnzymes.length > 0) {
      enzymes = parsedEnzymes;
    }
  }

  const stochasticMaxIter = parseFiniteNumber(raw.stochasticMaxIter);
  const stochasticDamping = parseFiniteNumber(raw.stochasticDamping);
  const stochasticTolerance = parseFiniteNumber(raw.stochasticTolerance);
  const enzymeSubAdditiveCap = parseFiniteNumber(raw.enzymeSubAdditiveCap);

  const targetInputMode =
    raw.targetInputMode === "single"
      ? ("single" as const)
      : raw.targetInputMode === "range"
        ? ("range" as const)
        : undefined;

  return {
    ok: true,
    data: {
      optimizationMode,
      activeBasis,
      batchSizeKg,
      ...(targetInputMode !== undefined ? { targetInputMode } : {}),
      enableAdvanceNutrients: Boolean(raw.enableAdvanceNutrients),
      ...(raw.showNdf !== undefined ? { showNdf: Boolean(raw.showNdf) } : {}),
      ...(raw.showBetn !== undefined ? { showBetn: Boolean(raw.showBetn) } : {}),
      enableDigestibleBasis: Boolean(raw.enableDigestibleBasis),
      enableElasticFallback: raw.enableElasticFallback !== false,
      globalZeroInclusion: zeroRule,
      ...(manualLocks ? { manualLocks } : {}),
      ...(customNutrients !== undefined ? { customNutrients } : {}),
      ...(fractionalObjective ? { fractionalObjective } : {}),
      ...(raw.enableStochasticSlp !== undefined
        ? { enableStochasticSlp: Boolean(raw.enableStochasticSlp) }
        : {}),
      ...(stochasticMaxIter !== null
        ? { stochasticMaxIter: Math.max(1, Math.min(40, Math.round(stochasticMaxIter))) }
        : {}),
      ...(stochasticDamping !== null
        ? { stochasticDamping: Math.min(1, Math.max(0.1, stochasticDamping)) }
        : {}),
      ...(stochasticTolerance !== null && stochasticTolerance > 0 ? { stochasticTolerance } : {}),
      ...(enzymes ? { enzymes } : {}),
      ...(enzymeSubAdditiveCap !== null
        ? { enzymeSubAdditiveCap: Math.min(1, Math.max(0.1, enzymeSubAdditiveCap)) }
        : {}),
    },
  };
}

const VALID_THEME_PALETTES = new Set<ThemePaletteId>([
  "original-default",
  "template-01",
  "template-03",
  "template-04",
  "template-05",
]);
const VALID_THEME_MODE_SETTINGS = new Set<ThemeModeSetting>(["light", "dark", "system"]);
const VALID_UI_MODES = new Set<UiMode>(["biasa", "enhanced", "anti-slop"]);

export function validateUserPreferences(raw: unknown): ValidationResult<UserPreferences> {
  if (!isPlainObject(raw)) {
    return { ok: false, errors: ["Preferensi harus berupa objek."] };
  }
  const language = raw.language === "en" ? "en" : "id";
  const theme = raw.theme === "dark" ? "dark" : "light";
  const themePalette =
    typeof raw.themePalette === "string" &&
    VALID_THEME_PALETTES.has(raw.themePalette as ThemePaletteId)
      ? (raw.themePalette as ThemePaletteId)
      : undefined;
  const themeModeSetting =
    typeof raw.themeModeSetting === "string" &&
    VALID_THEME_MODE_SETTINGS.has(raw.themeModeSetting as ThemeModeSetting)
      ? (raw.themeModeSetting as ThemeModeSetting)
      : undefined;
  const amoledPureBlack =
    typeof raw.amoledPureBlack === "boolean" ? raw.amoledPureBlack : undefined;
  const uiMode: UiMode | undefined =
    typeof raw.uiMode === "string" && VALID_UI_MODES.has(raw.uiMode as UiMode)
      ? (raw.uiMode as UiMode)
      : undefined;
  const uiEnhancer = typeof raw.uiEnhancer === "boolean" ? raw.uiEnhancer : undefined;
  const renderingEngine: RenderingEngineMode | undefined =
    raw.renderingEngine === "ultra" ||
    raw.renderingEngine === "balanced" ||
    raw.renderingEngine === "crisp"
      ? raw.renderingEngine
      : undefined;
  const motionEngine: MotionEngineMode | undefined =
    raw.motionEngine === "gpu_flip" || raw.motionEngine === "css_native"
      ? raw.motionEngine
      : undefined;
  const blurRaw = parseFiniteNumber(raw.glassBlurPx);
  const glassBlurPx =
    blurRaw !== null && blurRaw >= 0 && blurRaw <= 32 ? Math.round(blurRaw) : undefined;
  const glowRaw = parseFiniteNumber(raw.glowIntensityPct);
  const glowIntensityPct =
    glowRaw !== null && glowRaw >= 0 && glowRaw <= 150 ? Math.round(glowRaw) : undefined;
  const defaultBasis = validateBasis(raw.defaultBasis) ?? "as_fed";
  const batch = parseFiniteNumber(raw.defaultBatchKg);
  const zeroPct = parseFiniteNumber(raw.zeroInclusionDefaultPct);
  const decRaw = parseFiniteNumber(raw.decimalPlaces);
  const decimalPlaces: 0 | 1 | 2 | undefined =
    decRaw === 0 || decRaw === 1 || decRaw === 2 ? decRaw : undefined;
  const tableViewTier: TableViewTier | undefined =
    raw.tableViewTier === "basic" ||
    raw.tableViewTier === "standard" ||
    raw.tableViewTier === "advanced"
      ? raw.tableViewTier
      : undefined;
  return {
    ok: true,
    data: {
      language,
      theme,
      ...(themePalette !== undefined ? { themePalette } : {}),
      ...(themeModeSetting !== undefined ? { themeModeSetting } : {}),
      ...(amoledPureBlack !== undefined ? { amoledPureBlack } : {}),
      ...(uiMode !== undefined ? { uiMode } : {}),
      ...(uiEnhancer !== undefined ? { uiEnhancer } : {}),
      ...(renderingEngine !== undefined ? { renderingEngine } : {}),
      ...(motionEngine !== undefined ? { motionEngine } : {}),
      ...(glassBlurPx !== undefined ? { glassBlurPx } : {}),
      ...(glowIntensityPct !== undefined ? { glowIntensityPct } : {}),
      defaultBasis,
      defaultBatchKg: batch !== null && batch > 0 ? batch : 100,
      zeroInclusionDefaultPct: zeroPct !== null && zeroPct >= 0 && zeroPct <= 50 ? zeroPct : 1,
      ...(raw.simpleMode !== undefined ? { simpleMode: Boolean(raw.simpleMode) } : {}),
      ...(decimalPlaces !== undefined ? { decimalPlaces } : {}),
      ...(tableViewTier !== undefined ? { tableViewTier } : {}),
    },
  };
}

export function validateFeedJson(raw: unknown): ValidationResult<Recipe> {
  if (!isPlainObject(raw)) {
    return { ok: false, errors: ["Format berkas .feed.json harus berupa objek JSON."] };
  }

  if (raw.schemaVersion !== 1) {
    return {
      ok: false,
      errors: [
        `Versi skema .feed.json tidak didukung (${String(raw.schemaVersion)}). Hanya schemaVersion: 1 yang didukung.`,
      ],
    };
  }

  const errors: string[] = [];
  const id = sanitizeText(raw.id, { maxLength: 100 });
  const name = sanitizeText(raw.name, { maxLength: 180 });
  const notes = sanitizeText(raw.notes, { maxLength: 1000, allowNewlines: true });
  const createdAt = sanitizeText(raw.createdAt, { maxLength: 60 }) || new Date().toISOString();
  const updatedAt = sanitizeText(raw.updatedAt, { maxLength: 60 }) || createdAt;

  if (!id || FORBIDDEN_KEYS.has(id)) errors.push("Recipe id tidak valid.");
  if (!name) errors.push("Nama resep wajib terisi.");

  if (!Array.isArray(raw.ingredients) || raw.ingredients.length === 0) {
    errors.push("Resep wajib memiliki minimal 1 bahan pakan.");
  }

  const ingredients: Ingredient[] = [];
  if (Array.isArray(raw.ingredients)) {
    if (raw.ingredients.length > 500) {
      errors.push("Jumlah bahan pada satu resep melebihi batas maksimal (500).");
    } else {
      raw.ingredients.forEach((item, idx) => {
        const res = validateIngredient(item, `Bahan resep #${idx + 1}`);
        if (!res.ok) errors.push(...res.errors);
        else ingredients.push(res.data);
      });
    }
  }

  const reqCheck = validateRequirement(raw.requirement, "Standar Kebutuhan Resep");
  if (!reqCheck.ok) {
    errors.push(...reqCheck.errors);
  }

  let config: FormulationConfig | undefined;
  if (raw.config !== undefined) {
    const cfgCheck = validateFormulationConfig(raw.config);
    if (!cfgCheck.ok) errors.push(...cfgCheck.errors);
    else config = cfgCheck.data;
  }

  if (errors.length > 0 || !reqCheck.ok) {
    return { ok: false, errors };
  }

  // Untuk keamanan dan konsistensi matematis, `result` diimpor ulang hanya jika eksplisit null/valid;
  // solver selalu menghitung ulang live dari bahan + standar sesaat setelah dibuka.
  const recipe: Recipe = {
    schemaVersion: 1,
    id,
    name,
    ingredients,
    requirement: reqCheck.data,
    result: null,
    createdAt,
    updatedAt,
    ...(notes ? { notes } : {}),
    ...(config ? { config } : {}),
  };

  return { ok: true, data: recipe };
}
