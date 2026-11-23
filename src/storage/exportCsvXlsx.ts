import { FEED_CLASSES, resolveFeedClass } from "../data/feed-classes";
import { MOCK_NUTRIENTS } from "../data/mock-state";
import type { FormulationResult, Ingredient, Nutrient, Requirement } from "../types";
import { resolveDisplayDigits } from "../utils/locale-number";
import { computeRationDryMatterPct, estimateDailyConsumption } from "../components/analytics/BatchMixerCalculator";

export interface FormulationExportInput {
  readonly recipeName: string;
  readonly ingredients: readonly Ingredient[];
  readonly nutrientsCatalog: readonly Nutrient[];
  readonly requirement: Requirement;
  readonly result: FormulationResult;
  readonly decimalPlaces?: 0 | 1 | 2 | undefined;
}

export interface IngredientDatabaseXlsxInput {
  readonly ingredients: readonly Ingredient[];
  readonly nutrientsCatalog?: readonly Nutrient[];
  readonly title?: string;
}

export function assertExportableResult(
  result: FormulationResult,
  options?: { readonly requireStrictOptimal?: boolean },
): void {
  if (
    result.status === "infeasible" ||
    result.status === "error" ||
    result.composition.length === 0
  ) {
    throw new Error(
      "Ekspor diblokir: formulasi berstatus Infeasible/Error atau belum memiliki komposisi valid.",
    );
  }
  if (options?.requireStrictOptimal && result.status !== "optimal") {
    throw new Error(
      "Lembar Timbang Batch (batch_only) hanya diizinkan untuk formulasi berstatus Optimal.",
    );
  }
}

export function neutralizeSpreadsheetFormula(raw: string): string {
  if (!raw) return raw;
  const firstChar = raw[0]!;
  if (
    firstChar === "=" ||
    firstChar === "+" ||
    firstChar === "-" ||
    firstChar === "@" ||
    firstChar === "\t" ||
    firstChar === "\r"
  ) {
    return `'${raw}`;
  }
  return raw;
}

type CellValue = string | number | null | undefined;

export function escapeCsvCell(value: CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  const safe = neutralizeSpreadsheetFormula(value);
  if (safe !== value || /[",\n\r;]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

function formatNum(val: number | null | undefined, digits = 2): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return "-";
  return val.toFixed(digits);
}

function buildLookupMaps(input: FormulationExportInput): {
  ingMap: Map<string, Ingredient>;
  nutMap: Map<string, Nutrient>;
} {
  return {
    ingMap: new Map(input.ingredients.map((i) => [i.id, i])),
    nutMap: new Map(input.nutrientsCatalog.map((n) => [n.id, n])),
  };
}

export function generateFormulationCsv(input: FormulationExportInput): string {
  assertExportableResult(input.result);
  const { ingMap, nutMap } = buildLookupMaps(input);
  const { result, requirement, recipeName, decimalPlaces = 0 } = input;
  const batchKg = result.batchSizeKg ?? 100;
  const rationDmPct = computeRationDryMatterPct(result.composition, input.ingredients);
  const dmiEst = estimateDailyConsumption(requirement, rationDmPct);

  const lines: CellValue[][] = [
    ["OPENFORMU — LAPORAN FORMULASI PAKAN"],
    ["Nama Formula", recipeName],
    ["Standar Kebutuhan", requirement.name],
    ["Basis Model", result.basis === "dry_matter" ? "BK (Dry Matter)" : "As-Fed"],
    ["Status Solver", result.status === "optimal" ? "OPTIMAL" : "NEAR-FEASIBLE (TOLERANSI TARGET)"],
    ["Ukuran Batch (kg)", Number(batchKg.toFixed(2))],
    ["Kadar BK Ransum (%)", Number(rationDmPct.toFixed(2))],
    ["Konsumsi BK / Ekor / Hari (kg)", Number(dmiEst.dmiKgPerHead.toFixed(3))],
    ["Konsumsi Segar As-Fed / Ekor / Hari (kg)", Number(dmiEst.asFedKgPerHead.toFixed(3))],
    ["Biaya per kg (Rp)", result.costPerKg !== null ? Math.round(result.costPerKg) : "-"],
    [
      "Total Biaya Batch (Rp)",
      result.batchTotalCost !== null && result.batchTotalCost !== undefined
        ? Math.round(result.batchTotalCost)
        : "-",
    ],
    ["Waktu Solve", result.solvedAt],
    [],
    ["KOMPOSISI BAHAN"],
    [
      "No",
      "ID Bahan",
      "Nama Bahan",
      "Kategori",
      "Porsi Model (0.00x%)",
      "Porsi Timbang As-Fed (0.00x%)",
      "Takaran Presisi (xx.xxx kg)",
      "Berat Batch Bulat (kg)",
      "Konsumsi Segar/hr (kg)",
      "Harga (Rp/kg)",
      "Kontribusi Biaya (Rp/kg pakan)",
      "Min Harga Shadow (Rp/kg)",
      "Max Harga Shadow (Rp/kg)",
    ],
  ];

  result.composition.forEach((item, idx) => {
    const ing = ingMap.get(item.ingredientId);
    const activePrice = ing ? (ing.priceOverride ?? ing.pricePerKg) : 0;
    const modelPct = item.fraction * 100;
    const asFedFraction = item.asFedFraction ?? item.fraction;
    const asFedPct = asFedFraction * 100;
    const weight = item.weightKg ?? asFedFraction * batchKg;
    const weightDigits = Math.max(1, decimalPlaces);
    lines.push([
      idx + 1,
      item.ingredientId,
      ing?.name ?? item.ingredientId,
      ing?.category ?? "-",
      Number(modelPct.toFixed(3)),
      Number(asFedPct.toFixed(3)),
      Number(weight.toFixed(3)),
      Number(weight.toFixed(weightDigits)),
      Number((asFedFraction * dmiEst.asFedKgPerHead).toFixed(3)),
      activePrice,
      Number((item.costContribution ?? item.fraction * activePrice).toFixed(0)),
      item.priceRange?.minPrice !== null && item.priceRange?.minPrice !== undefined
        ? Math.round(item.priceRange.minPrice)
        : "-",
      item.priceRange?.maxPrice !== null && item.priceRange?.maxPrice !== undefined
        ? Math.round(item.priceRange.maxPrice)
        : "-",
    ]);
  });

  lines.push([]);
  lines.push(["PROFIL NUTRIEN"]);
  lines.push([
    "ID Nutrien",
    "Nama Nutrien",
    "Satuan",
    "Aktual Presisi (0.00x)",
    "Aktual Tampilan",
    "Min",
    "Max",
    "Status",
    "Shadow Price (Rp)",
  ]);

  for (const nr of result.nutrients) {
    const meta = nutMap.get(nr.nutrientId);
    const valDigits = resolveDisplayDigits(meta?.unit, nr.nutrientId, decimalPlaces, nr.value);
    const minDigits = resolveDisplayDigits(meta?.unit, nr.nutrientId, decimalPlaces, nr.min);
    const maxDigits = resolveDisplayDigits(meta?.unit, nr.nutrientId, decimalPlaces, nr.max);
    lines.push([
      nr.nutrientId,
      meta?.name ?? nr.nutrientId,
      meta?.unit ?? "%",
      Number(nr.value.toFixed(3)),
      Number(nr.value.toFixed(valDigits)),
      nr.min !== undefined ? Number(nr.min.toFixed(minDigits)) : "-",
      nr.max !== undefined ? Number(nr.max.toFixed(maxDigits)) : "-",
      nr.status,
      nr.shadowPrice !== null && nr.shadowPrice !== undefined
        ? Number(nr.shadowPrice.toFixed(0))
        : "-",
    ]);
  }

  if ((result.opportunityCosts ?? []).length > 0) {
    lines.push([]);
    lines.push(["OPPORTUNITY COST BAHAN 0%"]);
    lines.push([
      "ID Bahan",
      "Nama Bahan",
      "Harga Saat Ini (Rp/kg)",
      "Harga Masuk Layak (Rp/kg)",
      "Selisih Reduced Cost (Rp/kg)",
    ]);
    for (const oc of result.opportunityCosts ?? []) {
      const ing = ingMap.get(oc.ingredientId);
      lines.push([
        oc.ingredientId,
        ing?.name ?? oc.ingredientId,
        Math.round(oc.currentPrice),
        Math.round(oc.opportunityPrice),
        Math.round(oc.reducedCost),
      ]);
    }
  }

  return "\uFEFF" + lines.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

// ============================================================================
// Pure TypeScript OOXML (.xlsx) Builder via Uncompressed ZIP (STORE method 0)
// ============================================================================

const CRC32_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    const idx = (c ^ (bytes[i] ?? 0)) & 0xff;
    c = (CRC32_TABLE[idx] ?? 0) ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  readonly name: string;
  readonly data: Uint8Array;
}

function encodeZipStore(entries: readonly ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = entry.data;
    const sum = crc32(dataBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const ldv = new DataView(localHeader.buffer);
    ldv.setUint32(0, 0x04034b50, true);
    ldv.setUint16(4, 20, true);
    ldv.setUint16(6, 0x0800, true); // UTF-8 filename flag
    ldv.setUint16(8, 0, true); // Compression 0 = STORE
    ldv.setUint16(10, 0, true);
    ldv.setUint16(12, 0x5421, true);
    ldv.setUint32(14, sum, true);
    ldv.setUint32(18, dataBytes.length, true);
    ldv.setUint32(22, dataBytes.length, true);
    ldv.setUint16(26, nameBytes.length, true);
    ldv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    const cdHeader = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(cdHeader.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true);
    cdv.setUint16(6, 20, true);
    cdv.setUint16(8, 0x0800, true);
    cdv.setUint16(10, 0, true);
    cdv.setUint16(12, 0, true);
    cdv.setUint16(14, 0x5421, true);
    cdv.setUint32(16, sum, true);
    cdv.setUint32(20, dataBytes.length, true);
    cdv.setUint32(24, dataBytes.length, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint16(30, 0, true);
    cdv.setUint16(32, 0, true);
    cdv.setUint16(34, 0, true);
    cdv.setUint16(36, 0, true);
    cdv.setUint32(38, 0, true);
    cdv.setUint32(42, offset, true);
    cdHeader.set(nameBytes, 46);

    localParts.push(localHeader, dataBytes);
    centralParts.push(cdHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((acc, p) => acc + p.length, 0);
  const eocd = new Uint8Array(22);
  const edv = new DataView(eocd.buffer);
  edv.setUint32(0, 0x06054b50, true);
  edv.setUint16(4, 0, true);
  edv.setUint16(6, 0, true);
  edv.setUint16(8, entries.length, true);
  edv.setUint16(10, entries.length, true);
  edv.setUint32(12, centralSize, true);
  edv.setUint32(16, offset, true);
  edv.setUint16(20, 0, true);

  const totalSize = offset + centralSize + eocd.length;
  const out = new Uint8Array(totalSize);
  let cursor = 0;
  for (const part of localParts) {
    out.set(part, cursor);
    cursor += part.length;
  }
  for (const part of centralParts) {
    out.set(part, cursor);
    cursor += part.length;
  }
  out.set(eocd, cursor);
  return out;
}

function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function colIndexToLetter(index: number): string {
  let col = "";
  let n = index;
  while (n >= 0) {
    col = String.fromCharCode((n % 26) + 65) + col;
    n = Math.floor(n / 26) - 1;
  }
  return col;
}

function buildWorksheetXml(
  rows: readonly (readonly CellValue[])[],
  headerRowIndices: ReadonlySet<number>,
): string {
  const xmlRows = rows
    .map((cells, rIdx) => {
      const rNum = rIdx + 1;
      const isHeader = headerRowIndices.has(rIdx);
      const cellXml = cells
        .map((val, cIdx) => {
          if (val === null || val === undefined || val === "") return "";
          const ref = `${colIndexToLetter(cIdx)}${rNum}`;
          if (typeof val === "number" && Number.isFinite(val)) {
            return `<c r="${ref}"${isHeader ? ' s="1"' : ""}><v>${val}</v></c>`;
          }
          const safeStr = escapeXml(neutralizeSpreadsheetFormula(String(val)));
          return `<c r="${ref}" t="inlineStr"${isHeader ? ' s="1"' : ""}><is><t>${safeStr}</t></is></c>`;
        })
        .filter(Boolean)
        .join("");
      return `<row r="${rNum}">${cellXml}</row>`;
    })
    .join("");

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetData>${xmlRows}</sheetData>` +
    "</worksheet>"
  );
}

interface XlsxSheetSpec {
  readonly name: string;
  readonly rows: readonly (readonly CellValue[])[];
  readonly headerRowIndices: ReadonlySet<number>;
}

function encodeWorkbookXlsx(sheets: readonly XlsxSheetSpec[]): Uint8Array {
  const encoder = new TextEncoder();

  const sheetOverrides = sheets
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join("");

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    sheetOverrides +
    "</Types>";

  const rootRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    "</Relationships>";

  const workbookSheets = sheets
    .map(
      (s, i) =>
        `<sheet name="${escapeXml(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
    )
    .join("");

  const workbookXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets>${workbookSheets}</sheets>` +
    "</workbook>";

  const sheetRels = sheets
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
    )
    .join("");

  const workbookRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    sheetRels +
    `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    "</Relationships>";

  const stylesXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2">' +
    '<font><sz val="10"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="10"/><name val="Calibri"/></font>' +
    "</fonts>" +
    '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>' +
    '<borders count="1"><border/></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="2">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    "</cellXfs>" +
    "</styleSheet>";

  const entries: ZipEntry[] = [
    { name: "[Content_Types].xml", data: encoder.encode(contentTypes) },
    { name: "_rels/.rels", data: encoder.encode(rootRels) },
    { name: "xl/workbook.xml", data: encoder.encode(workbookXml) },
    { name: "xl/_rels/workbook.xml.rels", data: encoder.encode(workbookRels) },
    { name: "xl/styles.xml", data: encoder.encode(stylesXml) },
    ...sheets.map((s, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: encoder.encode(buildWorksheetXml(s.rows, s.headerRowIndices)),
    })),
  ];

  return encodeZipStore(entries);
}

const MATRIX_NUTRIENT_KEYS = [
  "cp",
  "me_poultry",
  "tdn",
  "ee",
  "cf",
  "ca",
  "p",
  "avp",
  "lys",
  "sid_lys",
  "met",
  "metcys",
  "thr",
  "trp",
  "val",
  "na",
  "k",
  "cl",
  "s",
  "ndf",
  "adf",
  "starch",
  "betn",
  "tannin",
  "liquid_fat",
] as const;

export function generateFormulationXlsx(input: FormulationExportInput): Uint8Array {
  assertExportableResult(input.result);
  const { ingMap, nutMap } = buildLookupMaps(input);
  const { result, requirement, recipeName, decimalPlaces = 0 } = input;
  const batchKg = result.batchSizeKg ?? 100;
  const rationDmPct = computeRationDryMatterPct(result.composition, input.ingredients);
  const dmiEst = estimateDailyConsumption(requirement, rationDmPct);
  const dailyCostPerHead =
    result.costPerKg !== null
      ? result.basis === "dry_matter"
        ? dmiEst.dmiKgPerHead * result.costPerKg
        : dmiEst.asFedKgPerHead * result.costPerKg
      : null;

  // Sheet 1: Komposisi, Timbang 2-Versi (xx,xxx & Bulat) & Konsumsi Harian
  const sheet1Rows: CellValue[][] = [
    ["OpenFormu — Lembar Komposisi, Penimbangan Batch 2-Versi & Konsumsi Harian"],
    ["Nama Formula", recipeName, "Standar Ternak", requirement.name],
    [
      "Basis Model",
      result.basis === "dry_matter" ? "BK (Dry Matter)" : "As-Fed",
      "Status Solver",
      result.status === "optimal" ? "OPTIMAL" : "NEAR-FEASIBLE",
    ],
    [
      "Batch (kg)",
      Number(batchKg.toFixed(2)),
      "Biaya / kg (Rp)",
      result.costPerKg !== null ? Math.round(result.costPerKg) : "-",
      "Total Biaya Batch (Rp)",
      result.batchTotalCost !== null && result.batchTotalCost !== undefined
        ? Math.round(result.batchTotalCost)
        : "-",
    ],
    [
      "Kadar BK Ransum (%)",
      Number(rationDmPct.toFixed(2)),
      "Konsumsi BK/Ekor/Hari (kg)",
      Number(dmiEst.dmiKgPerHead.toFixed(3)),
      "Konsumsi Segar As-Fed/Ekor/Hari (kg)",
      Number(dmiEst.asFedKgPerHead.toFixed(3)),
      "Biaya Pakan/Ekor/Hari (Rp)",
      dailyCostPerHead !== null ? Math.round(dailyCostPerHead) : "-",
    ],
    ["Acuan & Saran Pemberian", dmiEst.sourceNoteId, dmiEst.feedingAdviceId],
    [],
    [
      "No",
      "ID Bahan",
      "Nama Bahan",
      "Kelas IFN",
      "Kategori",
      "BK (%)",
      "Basis Presisi (0.00x%)",
      "Basis Tampilan (%)",
      "Timbang As-Fed Presisi (0.00x%)",
      "Timbang As-Fed Tampilan (%)",
      "Takaran Presisi (xx.xxx kg)",
      "Takaran Bulat (kg)",
      "Konsumsi Segar/hr (kg/ekor)",
      "Konsumsi BK/hr (kg/ekor)",
      "Harga (Rp/kg)",
      "Kontribusi (Rp/kg)",
      "Subtotal Batch (Rp)",
      "Min Stabil (Rp/kg)",
      "Max Stabil (Rp/kg)",
    ],
  ];

  result.composition.forEach((item, idx) => {
    const ing = ingMap.get(item.ingredientId);
    const activePrice = ing ? (ing.priceOverride ?? ing.pricePerKg) : 0;
    const fClass = ing ? resolveFeedClass(ing) : "-";
    const dm = ing?.dryMatter ?? 88;
    const modelPct = item.fraction * 100;
    const asFedFraction = item.asFedFraction ?? item.fraction;
    const asFedPct = asFedFraction * 100;
    const weight = item.weightKg ?? asFedFraction * batchKg;
    const modelDigits = resolveDisplayDigits("%", "inclusion", decimalPlaces, modelPct);
    const asFedDigits = resolveDisplayDigits("%", "inclusion", decimalPlaces, asFedPct);
    const weightDigits = Math.max(1, decimalPlaces);
    const dailyAsFedItemKg = asFedFraction * dmiEst.asFedKgPerHead;
    const dailyDmItemKg = dailyAsFedItemKg * (dm / 100);
    const costContrib = item.costContribution ?? item.fraction * activePrice;

    sheet1Rows.push([
      idx + 1,
      item.ingredientId,
      ing?.name ?? item.ingredientId,
      `Kelas ${fClass}`,
      ing?.category ?? "-",
      Number(dm.toFixed(2)),
      Number(modelPct.toFixed(3)),
      Number(modelPct.toFixed(modelDigits)),
      Number(asFedPct.toFixed(3)),
      Number(asFedPct.toFixed(asFedDigits)),
      Number(weight.toFixed(3)),
      Number(weight.toFixed(weightDigits)),
      Number(dailyAsFedItemKg.toFixed(3)),
      Number(dailyDmItemKg.toFixed(3)),
      activePrice,
      Number(costContrib.toFixed(2)),
      Math.round(weight * activePrice),
      item.priceRange?.minPrice !== null && item.priceRange?.minPrice !== undefined
        ? Math.round(item.priceRange.minPrice)
        : "-",
      item.priceRange?.maxPrice !== null && item.priceRange?.maxPrice !== undefined
        ? Math.round(item.priceRange.maxPrice)
        : "-",
    ]);
  });

  // Sheet 2: Profil Nutrien Lengkap (2 Versi Presisi 0.00x & Tampilan)
  const constraintMap = new Map(requirement.constraints.map((c) => [c.nutrientId, c]));
  const sheet2Rows: CellValue[][] = [
    ["Profil Nutrien Hasil Formulasi (Presisi 0.00x & Tampilan)"],
    [
      "ID Nutrien",
      "Nama Nutrien",
      "Satuan",
      "Aktual Presisi (0.00x)",
      "Aktual Tampilan",
      "Batas Min",
      "Batas Max",
      "Target Ideal",
      "Selisih vs Min",
      "Status",
      "Shadow Price (Rp)",
    ],
  ];
  for (const nr of result.nutrients) {
    const meta = nutMap.get(nr.nutrientId);
    const c = constraintMap.get(nr.nutrientId);
    const valDigits = resolveDisplayDigits(meta?.unit, nr.nutrientId, decimalPlaces, nr.value);
    const minDigits = resolveDisplayDigits(meta?.unit, nr.nutrientId, decimalPlaces, nr.min);
    const maxDigits = resolveDisplayDigits(meta?.unit, nr.nutrientId, decimalPlaces, nr.max);
    const diffVsMin = nr.min !== undefined ? Number((nr.value - nr.min).toFixed(3)) : "-";
    sheet2Rows.push([
      nr.nutrientId,
      meta?.name ?? nr.nutrientId,
      meta?.unit ?? "%",
      Number(nr.value.toFixed(3)),
      Number(nr.value.toFixed(valDigits)),
      nr.min !== undefined ? Number(nr.min.toFixed(minDigits)) : "-",
      nr.max !== undefined ? Number(nr.max.toFixed(maxDigits)) : "-",
      c?.idealTarget !== undefined ? Number(c.idealTarget.toFixed(valDigits)) : "-",
      diffVsMin,
      nr.status,
      nr.shadowPrice !== null && nr.shadowPrice !== undefined
        ? Number(nr.shadowPrice.toFixed(2))
        : "-",
    ]);
  }

  // Sheet 3: Shadow Price & Sensitivitas Harga
  const sheet3Rows: CellValue[][] = [
    ["Analisis Ekonomi: Shadow Price Nutrien & Opportunity Cost Bahan 0%"],
    ["Shadow Price Kendala Nutrien"],
    ["ID Nutrien", "Nama Nutrien", "Status", "Shadow Price (Rp / unit kendala)"],
  ];
  for (const nr of result.nutrients) {
    if (nr.shadowPrice === undefined || nr.shadowPrice === null) continue;
    const meta = nutMap.get(nr.nutrientId);
    sheet3Rows.push([
      nr.nutrientId,
      meta?.name ?? nr.nutrientId,
      nr.status,
      Number(nr.shadowPrice.toFixed(2)),
    ]);
  }
  sheet3Rows.push([]);
  sheet3Rows.push(["Opportunity Cost Bahan Belum Masuk (0%)"]);
  sheet3Rows.push([
    "ID Bahan",
    "Nama Bahan",
    "Harga Saat Ini (Rp)",
    "Harga Target Masuk (Rp)",
    "Selisih Turun (Rp)",
  ]);
  for (const oc of result.opportunityCosts ?? []) {
    const ing = ingMap.get(oc.ingredientId);
    sheet3Rows.push([
      oc.ingredientId,
      ing?.name ?? oc.ingredientId,
      Math.round(oc.currentPrice),
      Math.round(oc.opportunityPrice),
      Math.round(oc.reducedCost),
    ]);
  }
  sheet3Rows.push([]);
  sheet3Rows.push(["Rentang Stabilitas Harga Bahan Terpilih"]);
  sheet3Rows.push([
    "ID Bahan",
    "Nama Bahan",
    "Harga Aktif (Rp)",
    "Min Stabil (Rp)",
    "Max Stabil (Rp)",
  ]);
  for (const item of result.composition) {
    const ing = ingMap.get(item.ingredientId);
    const activePrice = ing ? (ing.priceOverride ?? ing.pricePerKg) : 0;
    sheet3Rows.push([
      item.ingredientId,
      ing?.name ?? item.ingredientId,
      activePrice,
      item.priceRange?.minPrice !== null && item.priceRange?.minPrice !== undefined
        ? formatNum(item.priceRange.minPrice, 0)
        : "-",
      item.priceRange?.maxPrice !== null && item.priceRange?.maxPrice !== undefined
        ? formatNum(item.priceRange.maxPrice, 0)
        : "-",
    ]);
  }

  // Sheet 4: Matriks Nutrien Bahan Lengkap (Semua Sel Nutrien Terisi)
  const compMap = new Map(result.composition.map((c) => [c.ingredientId, c]));
  const matrixIngredients = input.ingredients.filter(
    (ing) => ing.isActive !== false || compMap.has(ing.id),
  );
  const nutrientHeaders = MATRIX_NUTRIENT_KEYS.map((key) => {
    const meta = nutMap.get(key);
    return meta ? `${meta.name} (${meta.unit})` : key.toUpperCase();
  });

  const sheet4Rows: CellValue[][] = [
    ["Matriks Kandungan Nutrien Lengkap Bahan Pakan Aktif & Terpilih (25 Parameter)"],
    [
      "No",
      "ID Bahan",
      "Nama Bahan (ID)",
      "Nama Bahan (EN)",
      "Kelas IFN",
      "Kategori",
      "Basis Data",
      "BK (%)",
      "Harga Aktif (Rp/kg)",
      "Min Inklusi (%)",
      "Max Inklusi (%)",
      "Porsi Ransum (0.00x%)",
      "Takaran Presisi (xx.xxx kg)",
      ...nutrientHeaders,
      "Sumber Referensi",
    ],
  ];

  matrixIngredients.forEach((ing, idx) => {
    const comp = compMap.get(ing.id);
    const fClass = resolveFeedClass(ing);
    const activePrice = ing.priceOverride ?? ing.pricePerKg;
    const modelPct = comp ? comp.fraction * 100 : 0;
    const asFedFrac = comp ? (comp.asFedFraction ?? comp.fraction) : 0;
    const weight = comp ? (comp.weightKg ?? asFedFrac * batchKg) : 0;
    const nutCells: CellValue[] = MATRIX_NUTRIENT_KEYS.map((key) => {
      const val = ing.nutrients[key];
      return typeof val === "number" && Number.isFinite(val) ? Number(val.toFixed(3)) : 0;
    });

    sheet4Rows.push([
      idx + 1,
      ing.id,
      ing.name,
      ing.nameEn ?? ing.name,
      `Kelas ${fClass}`,
      ing.category,
      ing.basis === "dry_matter" ? "BK (100% DM)" : "As-Fed",
      Number(ing.dryMatter.toFixed(2)),
      activePrice,
      Number((ing.inclusion?.min ?? 0).toFixed(3)),
      Number((ing.inclusion?.max ?? 100).toFixed(3)),
      Number(modelPct.toFixed(3)),
      Number(weight.toFixed(3)),
      ...nutCells,
      ing.source,
    ]);
  });

  return encodeWorkbookXlsx([
    { name: "Komposisi & Timbang", rows: sheet1Rows, headerRowIndices: new Set([0, 7]) },
    { name: "Profil Nutrien", rows: sheet2Rows, headerRowIndices: new Set([0, 1]) },
    { name: "Shadow Price", rows: sheet3Rows, headerRowIndices: new Set([0, 1, 2]) },
    { name: "Matriks Nutrien Bahan", rows: sheet4Rows, headerRowIndices: new Set([0, 1]) },
  ]);
}

/**
 * Ekspor seluruh katalog Database Bahan Pakan ke file Excel (.xlsx) lengkap
 * dengan semua 25 kolom nutrien terkalibrasi (Hartadi 1980, Kearl 1982, NRC 1994)
 * dan ringkasan 8 klasifikasi bahan pakan standar internasional (IFN).
 */
export function generateIngredientDatabaseXlsx(input: IngredientDatabaseXlsxInput): Uint8Array {
  const {
    ingredients,
    nutrientsCatalog = MOCK_NUTRIENTS,
    title = "OpenFormu — Database Kandungan Nutrien Bahan Pakan Lengkap (8 Kelas IFN)",
  } = input;
  const nutMap = new Map(nutrientsCatalog.map((n) => [n.id, n]));
  const nutrientHeaders = MATRIX_NUTRIENT_KEYS.map((key) => {
    const meta = nutMap.get(key);
    return meta ? `${meta.name} (${meta.unit})` : key.toUpperCase();
  });

  const sheet1Rows: CellValue[][] = [
    [title],
    [
      "No",
      "ID Bahan",
      "Nama Bahan (ID)",
      "Nama Bahan (EN)",
      "Kode Kelas IFN",
      "Nama Kelas IFN",
      "Kategori",
      "Basis Data",
      "BK (%)",
      "Harga (Rp/kg)",
      "Min Inklusi (%)",
      "Max Inklusi (%)",
      ...nutrientHeaders,
      "Sumber Referensi Ilmiah",
    ],
  ];

  const classMap = new Map(FEED_CLASSES.map((fc) => [fc.code, fc]));
  const countByClass = new Map<number, number>();

  ingredients.forEach((ing, idx) => {
    const code = resolveFeedClass(ing);
    countByClass.set(code, (countByClass.get(code) ?? 0) + 1);
    const fc = classMap.get(code);
    const activePrice = ing.priceOverride ?? ing.pricePerKg;
    const nutCells: CellValue[] = MATRIX_NUTRIENT_KEYS.map((key) => {
      const val = ing.nutrients[key];
      return typeof val === "number" && Number.isFinite(val) ? Number(val.toFixed(3)) : 0;
    });

    sheet1Rows.push([
      idx + 1,
      ing.id,
      ing.name,
      ing.nameEn ?? ing.name,
      code,
      fc?.nameId ?? `Kelas ${code}`,
      ing.category,
      ing.basis === "dry_matter" ? "BK (100% DM)" : "As-Fed",
      Number(ing.dryMatter.toFixed(2)),
      activePrice,
      Number((ing.inclusion?.min ?? 0).toFixed(3)),
      Number((ing.inclusion?.max ?? 100).toFixed(3)),
      ...nutCells,
      ing.source,
    ]);
  });

  const sheet2Rows: CellValue[][] = [
    ["Ringkasan 8 Klasifikasi Bahan Pakan Standar Internasional (IFN / NRC / Kearl / Hartadi)"],
    ["Kode IFN", "Nama Kelas (ID)", "Nama Kelas (EN)", "Jumlah Bahan", "Deskripsi Klasifikasi"],
    ...FEED_CLASSES.map((fc) => [
      `Kelas ${fc.code}`,
      fc.nameId,
      fc.nameEn,
      countByClass.get(fc.code) ?? 0,
      fc.descriptionId,
    ]),
  ];

  return encodeWorkbookXlsx([
    { name: "Katalog Nutrien Lengkap", rows: sheet1Rows, headerRowIndices: new Set([0, 1]) },
    { name: "Ringkasan 8 Kelas IFN", rows: sheet2Rows, headerRowIndices: new Set([0, 1]) },
  ]);
}
