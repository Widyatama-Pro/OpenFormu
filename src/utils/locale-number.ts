/**
 * Utilitas parsing dan pemformatan angka lokal Indonesia (koma & titik)
 * serta mata uang IDR. Pembulatan hanya dilakukan di fungsi format tampilan.
 */

export interface ParseLocaleOptions {
  /** Perlakukan pola satu titik ribuan seperti "5.500" sebagai 5500 (cocok untuk harga/kg batch). */
  readonly treatSingleThousandDot?: boolean;
}

const MICRO_PERCENT_NUTRIENTS = new Set([
  "ca",
  "p",
  "p_total",
  "p_avail",
  "avp",
  "na",
  "k",
  "cl",
  "s",
  "lys",
  "met",
  "metcys",
  "met_cys",
  "thr",
  "trp",
  "val",
  "sid_lys",
  "tannin",
]);

/** Mengembalikan true untuk nutrien mikro bersatuan % yang sensitif terhadap pembulatan 0 desimal. */
export function isMicroPercentNutrient(nutrientId: string): boolean {
  return MICRO_PERCENT_NUTRIENTS.has(nutrientId);
}

/**
 * Menghitung jumlah digit desimal signifikan (tanpa trailing zero) hingga `maxDigits` (default 3 untuk presisi 0.00x).
 * Contoh: 100 -> 0, 0.5 -> 1, 0.05 -> 2, 0.003 -> 3.
 */
export function countSignificantFractionDigits(
  value: number | null | undefined,
  maxDigits = 3,
): number {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 0;
  }
  const rounded = Math.abs(value).toFixed(maxDigits);
  const dotIdx = rounded.indexOf(".");
  if (dotIdx === -1) return 0;
  const frac = rounded.slice(dotIdx + 1).replace(/0+$/, "");
  return frac.length;
}

/**
 * Menentukan jumlah desimal tampilan dengan aturan Smart Micro Floor & 0.00x Bound Precision:
 * - kcal/kg, mg/kg, mEq/kg, IU/kg selalu 0 desimal.
 * - Batas "min" dan "max" mempertahankan seluruh digit desimal signifikan hingga 3 angka (0.00x)
 *   agar nilai seperti 0,5%, 0,05%, atau 0,003% tidak pernah dibulatkan menjadi 1% atau 0%.
 * - Inklusi ("inclusion") dan nutrien mikro (%) saat 0 < |val| < 2 minimal 2 desimal, dan otomatis
 *   naik ke 3 desimal (0.00x) bila memiliki digit ke-3 signifikan (mis. 0,003%).
 * - Nilai % lainnya saat 0 < |val| < 1 juga mempertahankan hingga 3 desimal signifikan, selebihnya
 *   mengikuti pengaturan pengguna `decimalPlaces` (0 | 1 | 2).
 */
export function resolveDisplayDigits(
  unit: string | undefined,
  nutrientId: string,
  decimalPlaces: 0 | 1 | 2 = 0,
  value?: number | null,
): number {
  if (unit === "kcal/kg" || unit === "mg/kg" || unit === "mEq/kg" || unit === "IU/kg") {
    return 0;
  }
  const hasFiniteVal = value !== undefined && value !== null && Number.isFinite(value);
  const absVal = hasFiniteVal ? Math.abs(value) : 0;
  const sigDigits = hasFiniteVal ? countSignificantFractionDigits(value, 3) : 0;

  if (nutrientId === "min" || nutrientId === "max") {
    return Math.max(decimalPlaces, sigDigits);
  }

  if (
    (nutrientId === "inclusion" || isMicroPercentNutrient(nutrientId)) &&
    absVal > 0 &&
    absVal < 2
  ) {
    return Math.max(decimalPlaces, 2, sigDigits);
  }

  if (absVal > 0 && absVal < 1) {
    return Math.max(decimalPlaces, sigDigits);
  }

  return decimalPlaces;
}

export function parseLocaleDecimal(raw: string, options: ParseLocaleOptions = {}): number | null {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "-" || trimmed === "." || trimmed === ",") {
    return null;
  }

  let normalized = trimmed.replace(/\s+/g, "");
  const commaCount = (normalized.match(/,/g) ?? []).length;
  const dotCount = (normalized.match(/\./g) ?? []).length;

  if (commaCount > 1) {
    return null;
  }

  if (commaCount === 1 && dotCount >= 1) {
    // Format campuran Indonesia: "5.500,25" -> ribuan titik, desimal koma
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (commaCount === 1) {
    normalized = normalized.replace(",", ".");
  } else if (dotCount > 1) {
    const isGroupedThousands = /^\d{1,3}(\.\d{3})+$/.test(normalized);
    if (!isGroupedThousands) {
      return null;
    }
    normalized = normalized.replace(/\./g, "");
  } else if (dotCount === 1 && options.treatSingleThousandDot === true) {
    const isThousandPattern = /^[1-9]\d{0,2}\.\d{3}$/.test(normalized);
    if (isThousandPattern) {
      normalized = normalized.replace(".", "");
    }
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatNumberLocale(
  value: number,
  fractionDigits = 2,
  locale: "id-ID" | "en-US" = "id-ID",
): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatCurrencyIdr(value: number, locale: "id-ID" | "en-US" = "id-ID"): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
