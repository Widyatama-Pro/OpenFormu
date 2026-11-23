import {
  computeRationDryMatterPct,
  estimateDailyConsumption,
} from "../components/analytics/BatchMixerCalculator";
import { FEED_CLASSES, resolveFeedClass } from "../data/feed-classes";
import type { FormulationResult, Ingredient, Nutrient, Recipe, Requirement } from "../types";
import { resolveDisplayDigits } from "../utils/locale-number";
import { assertExportableResult } from "./exportCsvXlsx";

export type PdfExportMode = "full" | "batch_only";

export interface PdfExportInput {
  readonly recipeName: string;
  readonly mode: PdfExportMode;
  readonly ingredients: readonly Ingredient[];
  readonly nutrientsCatalog: readonly Nutrient[];
  readonly requirement: Requirement;
  readonly result: FormulationResult;
  readonly decimalPlaces?: 0 | 1 | 2 | undefined;
}

export interface IngredientDatabasePdfInput {
  readonly ingredients: readonly Ingredient[];
  readonly title?: string;
  readonly decimalPlaces?: 0 | 1 | 2 | undefined;
}

export interface RecipePdfInput {
  readonly recipe: Recipe;
  readonly nutrientsCatalog: readonly Nutrient[];
  readonly decimalPlaces?: 0 | 1 | 2 | undefined;
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_L = 40;
const MARGIN_R = 40;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const START_Y = 800;
const BOTTOM_Y = 54;

function toWinAnsiAscii(text: string): string {
  return text
    .replace(/[–—]/g, "-")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/±/g, "+/-")
    .replace(/×/g, "x")
    .replace(/·/g, "|")
    .replace(/μ/g, "u")
    .replace(/₂/g, "2")
    .replace(/[^\x20-\x7E]/g, "?");
}

function escapePdfString(text: string): string {
  return toWinAnsiAscii(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function formatIdr(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return `Rp ${Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function formatNum(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return value.toFixed(digits);
}

function truncateText(text: string, maxLen: number): string {
  const clean = toWinAnsiAscii(text);
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, Math.max(0, maxLen - 3))}...`;
}

/** Estimasi lebar teks Helvetica (pt) untuk perataan kanan yang rapi. */
function estimateTextWidth(text: string, fontSize: number, bold = false): number {
  const clean = toWinAnsiAscii(text);
  let units = 0;
  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i]!;
    if (ch === "i" || ch === "l" || ch === "I" || ch === "." || ch === "," || ch === ":") {
      units += 0.28;
    } else if (ch === " ") {
      units += 0.28;
    } else if (ch === "m" || ch === "w" || ch === "M" || ch === "W" || ch === "%") {
      units += 0.78;
    } else if (ch >= "A" && ch <= "Z") {
      units += 0.65;
    } else {
      units += 0.52;
    }
  }
  return units * fontSize * (bold ? 1.04 : 1);
}

interface PdfColumnCell {
  readonly text: string;
  readonly x: number;
  readonly width: number;
  readonly align?: "left" | "right" | "center";
  readonly bold?: boolean;
  readonly maxChars?: number;
}

type PdfRowOp =
  | {
      readonly kind: "head_kop";
      readonly docCode: string;
      readonly institutionTitle: string;
      readonly title: string;
      readonly subtitle: string;
      readonly printedAt: string;
      readonly height: number;
    }
  | {
      readonly kind: "tail_kop";
      readonly docCode: string;
      readonly referenceNote: string;
      readonly leftRole: string;
      readonly centerRole: string;
      readonly rightRole: string;
      readonly height: number;
    }
  | {
      readonly kind: "alert";
      readonly text: string;
      readonly height: number;
    }
  | {
      readonly kind: "section";
      readonly title: string;
      readonly subtitle?: string;
      readonly height: number;
    }
  | {
      readonly kind: "kv";
      readonly label: string;
      readonly value: string;
      readonly boldValue?: boolean;
      readonly height: number;
    }
  | {
      readonly kind: "table_header";
      readonly cells: readonly PdfColumnCell[];
      readonly height: number;
    }
  | {
      readonly kind: "table_row";
      readonly cells: readonly PdfColumnCell[];
      readonly shaded?: boolean;
      readonly bold?: boolean;
      readonly height: number;
    }
  | {
      readonly kind: "text";
      readonly text: string;
      readonly bold?: boolean;
      readonly size?: number;
      readonly muted?: boolean;
      readonly height: number;
    }
  | {
      readonly kind: "spacer";
      readonly height: number;
    };

function paginateOps(ops: readonly PdfRowOp[]): PdfRowOp[][] {
  const pages: PdfRowOp[][] = [];
  let current: PdfRowOp[] = [];
  let y = START_Y;

  for (const op of ops) {
    const pageTopY = pages.length === 0 && current.length === 0 ? START_Y : START_Y - 22;
    if (current.length === 0) {
      y = pageTopY;
    }
    if (y - op.height < BOTTOM_Y && current.length > 0) {
      pages.push(current);
      current = [];
      y = START_Y - 22; // Running Head Kop space on page 2+
    }
    current.push(op);
    y -= op.height;
  }
  if (current.length > 0 || pages.length === 0) {
    pages.push(current);
  }
  return pages;
}

function drawAlignedCell(
  ops: string[],
  cell: PdfColumnCell,
  baselineY: number,
  fontSize: number,
  rowBold: boolean,
  rgb = "0.059 0.090 0.165",
): void {
  const isBold = cell.bold ?? rowBold;
  const fontKey = isBold ? "/F2" : "/F1";
  const display = cell.maxChars
    ? truncateText(cell.text, cell.maxChars)
    : toWinAnsiAscii(cell.text);
  const textW = estimateTextWidth(display, fontSize, isBold);
  let drawX = cell.x;
  if (cell.align === "right") {
    drawX = Math.max(cell.x, cell.x + cell.width - textW);
  } else if (cell.align === "center") {
    drawX = cell.x + Math.max(0, (cell.width - textW) / 2);
  }
  ops.push(
    `${rgb} rg BT ${fontKey} ${fontSize} Tf ${drawX.toFixed(1)} ${baselineY.toFixed(1)} Td (${escapePdfString(display)}) Tj ET`,
  );
}

function renderStructuredPageStream(
  pageOps: readonly PdfRowOp[],
  pageNum: number,
  totalPages: number,
  runningTitle: string,
  runningDocCode: string,
): string {
  const out: string[] = [];
  let y = START_Y;

  // Running Head Kop on pages 2..N
  if (pageNum > 1) {
    out.push(
      `0.059 0.239 0.243 rg BT /F2 8 Tf ${MARGIN_L} ${(START_Y - 8).toFixed(1)} Td (${escapePdfString(
        `HEAD KOP LANJUTAN | ${truncateText(runningTitle, 64)}`,
      )}) Tj ET`,
    );
    const codeRight = `DOK: ${runningDocCode} | Hal. ${pageNum}/${totalPages}`;
    const codeW = estimateTextWidth(codeRight, 7.5, false);
    out.push(
      `0.35 0.42 0.50 rg BT /F1 7.5 Tf ${(MARGIN_L + CONTENT_W - codeW).toFixed(1)} ${(START_Y - 8).toFixed(1)} Td (${escapePdfString(
        codeRight,
      )}) Tj ET`,
    );
    out.push(
      `0.059 0.239 0.243 RG 1.2 w ${MARGIN_L} ${(START_Y - 13).toFixed(1)} m ${(MARGIN_L + CONTENT_W).toFixed(1)} ${(START_Y - 13).toFixed(1)} l S`,
    );
    out.push(
      `0.063 0.725 0.506 RG 0.5 w ${MARGIN_L} ${(START_Y - 15).toFixed(1)} m ${(MARGIN_L + CONTENT_W).toFixed(1)} ${(START_Y - 15).toFixed(1)} l S`,
    );
    y = START_Y - 22;
  }

  for (const op of pageOps) {
    if (op.kind === "head_kop") {
      const topBarY = y - 14;
      // Top Institutional Head Kop Eyebrow Band
      out.push(
        `0.945 0.965 0.961 rg ${MARGIN_L} ${topBarY.toFixed(1)} ${CONTENT_W.toFixed(1)} 14 re f`,
      );
      out.push(
        `0.059 0.239 0.243 rg BT /F2 7.5 Tf ${(MARGIN_L + 8).toFixed(1)} ${(topBarY + 4).toFixed(1)} Td (${escapePdfString(
          op.institutionTitle,
        )}) Tj ET`,
      );
      const docMeta = `NO. DOK: ${op.docCode} | TGL CETAK: ${op.printedAt}`;
      const docMetaW = estimateTextWidth(docMeta, 7.2, true);
      out.push(
        `0.059 0.239 0.243 rg BT /F2 7.2 Tf ${(MARGIN_L + CONTENT_W - docMetaW - 8).toFixed(1)} ${(topBarY + 4).toFixed(1)} Td (${escapePdfString(
          docMeta,
        )}) Tj ET`,
      );

      // Main Head Kop Banner Box (#0F3D3E)
      const boxH = op.height - 22;
      const boxY = topBarY - boxH;
      out.push(
        `0.059 0.239 0.243 rg ${MARGIN_L} ${boxY.toFixed(1)} ${CONTENT_W.toFixed(1)} ${boxH.toFixed(1)} re f`,
      );
      out.push(
        `1 1 1 rg BT /F2 12.5 Tf ${(MARGIN_L + 12).toFixed(1)} ${(boxY + boxH - 17).toFixed(1)} Td (${escapePdfString(
          op.title,
        )}) Tj ET`,
      );
      out.push(
        `0.78 0.96 0.88 rg BT /F1 8.2 Tf ${(MARGIN_L + 12).toFixed(1)} ${(boxY + 8).toFixed(1)} Td (${escapePdfString(
          op.subtitle,
        )}) Tj ET`,
      );

      // Architectural Double Line Kop Rule under banner
      const rule1Y = boxY - 2;
      const rule2Y = boxY - 4.5;
      out.push(
        `0.059 0.239 0.243 RG 1.8 w ${MARGIN_L} ${rule1Y.toFixed(1)} m ${(MARGIN_L + CONTENT_W).toFixed(1)} ${rule1Y.toFixed(1)} l S`,
      );
      out.push(
        `0.063 0.725 0.506 RG 0.7 w ${MARGIN_L} ${rule2Y.toFixed(1)} m ${(MARGIN_L + CONTENT_W).toFixed(1)} ${rule2Y.toFixed(1)} l S`,
      );
    } else if (op.kind === "tail_kop") {
      const topRuleY = y - 4;
      // Double Divider Rule above Tail Kop
      out.push(
        `0.059 0.239 0.243 RG 1.4 w ${MARGIN_L} ${topRuleY.toFixed(1)} m ${(MARGIN_L + CONTENT_W).toFixed(1)} ${topRuleY.toFixed(1)} l S`,
      );
      out.push(
        `0.063 0.725 0.506 RG 0.6 w ${MARGIN_L} ${(topRuleY - 2.2).toFixed(1)} m ${(MARGIN_L + CONTENT_W).toFixed(1)} ${(topRuleY - 2.2).toFixed(1)} l S`,
      );

      // Tail Kop Header Bar
      const hdrY = topRuleY - 16;
      out.push(
        `0.945 0.961 0.976 rg ${MARGIN_L} ${hdrY.toFixed(1)} ${CONTENT_W.toFixed(1)} 12 re f`,
      );
      out.push(
        `0.059 0.239 0.243 rg BT /F2 7.5 Tf ${(MARGIN_L + 8).toFixed(1)} ${(hdrY + 3).toFixed(1)} Td (${escapePdfString(
          "TAIL KOP PENGESAHAN, VERIFIKASI MUTU & OTORISASI DOKUMEN",
        )}) Tj ET`,
      );
      const docTag = `KODE VERIFIKASI: ${op.docCode}`;
      const docTagW = estimateTextWidth(docTag, 7.2, false);
      out.push(
        `0.35 0.42 0.50 rg BT /F1 7.2 Tf ${(MARGIN_L + CONTENT_W - docTagW - 8).toFixed(1)} ${(hdrY + 3).toFixed(1)} Td (${escapePdfString(
          docTag,
        )}) Tj ET`,
      );

      // 3-Column Signature & Verification Boxes
      const colGap = 8;
      const colW = (CONTENT_W - colGap * 2) / 3;
      const boxH = 42;
      const boxY = hdrY - boxH - 3;
      const roles = [op.leftRole, op.centerRole, op.rightRole];

      roles.forEach((role, idx) => {
        const bx = MARGIN_L + idx * (colW + colGap);
        out.push(
          `0.985 0.990 0.995 rg ${bx.toFixed(1)} ${boxY.toFixed(1)} ${colW.toFixed(1)} ${boxH.toFixed(1)} re f`,
        );
        out.push(
          `0.78 0.83 0.88 RG 0.6 w ${bx.toFixed(1)} ${boxY.toFixed(1)} ${colW.toFixed(1)} ${boxH.toFixed(1)} re S`,
        );
        out.push(
          `0.059 0.239 0.243 rg BT /F2 7.5 Tf ${(bx + 6).toFixed(1)} ${(boxY + boxH - 11).toFixed(1)} Td (${escapePdfString(
            truncateText(role, 32),
          )}) Tj ET`,
        );
        // Dotted signature line
        out.push(
          `0.65 0.72 0.80 RG 0.5 w ${(bx + 8).toFixed(1)} ${(boxY + 13).toFixed(1)} m ${(bx + colW - 8).toFixed(1)} ${(boxY + 13).toFixed(1)} l S`,
        );
        out.push(
          `0.42 0.48 0.56 rg BT /F1 6.8 Tf ${(bx + 8).toFixed(1)} ${(boxY + 4).toFixed(1)} Td (${escapePdfString(
            "Nama / Paraf & Stempel / Tanggal",
          )}) Tj ET`,
        );
      });

      // Reference & Scientific Integrity Strip at bottom of Tail Kop
      const refY = boxY - 12;
      out.push(
        `0.35 0.42 0.50 rg BT /F1 7.0 Tf ${MARGIN_L} ${refY.toFixed(1)} Td (${escapePdfString(
          truncateText(op.referenceNote, 112),
        )}) Tj ET`,
      );
    } else if (op.kind === "alert") {
      const boxY = y - op.height + 4;
      const boxH = op.height - 4;
      out.push(
        `0.996 0.953 0.780 rg ${MARGIN_L} ${boxY.toFixed(1)} ${CONTENT_W.toFixed(1)} ${boxH.toFixed(1)} re f`,
      );
      out.push(
        `0.851 0.467 0.024 RG 0.8 w ${MARGIN_L} ${boxY.toFixed(1)} ${CONTENT_W.toFixed(1)} ${boxH.toFixed(1)} re S`,
      );
      out.push(
        `0.573 0.251 0.055 rg BT /F2 8.5 Tf ${(MARGIN_L + 8).toFixed(1)} ${(boxY + 6).toFixed(1)} Td (${escapePdfString(op.text)}) Tj ET`,
      );
    } else if (op.kind === "section") {
      const lineY = y - op.height + 4;
      out.push(
        `0.059 0.239 0.243 rg BT /F2 10 Tf ${MARGIN_L} ${(y - 12).toFixed(1)} Td (${escapePdfString(op.title)}) Tj ET`,
      );
      if (op.subtitle) {
        out.push(
          `0.39 0.45 0.54 rg BT /F1 8 Tf ${(MARGIN_L + 290).toFixed(1)} ${(y - 12).toFixed(1)} Td (${escapePdfString(truncateText(op.subtitle, 42))}) Tj ET`,
        );
      }
      out.push(
        `0.063 0.725 0.506 RG 1.0 w ${MARGIN_L} ${lineY.toFixed(1)} m ${(MARGIN_L + CONTENT_W).toFixed(1)} ${lineY.toFixed(1)} l S`,
      );
    } else if (op.kind === "kv") {
      const baseY = y - 10;
      out.push(
        `0.35 0.42 0.50 rg BT /F2 8.5 Tf ${MARGIN_L} ${baseY.toFixed(1)} Td (${escapePdfString(op.label)}) Tj ET`,
      );
      const valFont = op.boldValue ? "/F2" : "/F1";
      out.push(
        `0.059 0.090 0.165 rg BT ${valFont} 8.5 Tf ${(MARGIN_L + 108).toFixed(1)} ${baseY.toFixed(1)} Td (${escapePdfString(truncateText(op.value, 85))}) Tj ET`,
      );
    } else if (op.kind === "table_header") {
      const rectY = y - op.height + 2;
      const rectH = op.height - 2;
      out.push(
        `0.945 0.961 0.976 rg ${MARGIN_L} ${rectY.toFixed(1)} ${CONTENT_W.toFixed(1)} ${rectH.toFixed(1)} re f`,
      );
      out.push(
        `0.796 0.835 0.882 RG 0.6 w ${MARGIN_L} ${rectY.toFixed(1)} m ${(MARGIN_L + CONTENT_W).toFixed(1)} ${rectY.toFixed(1)} l S`,
      );
      for (const cell of op.cells) {
        drawAlignedCell(out, cell, rectY + 5, 7.8, true, "0.20 0.25 0.33");
      }
    } else if (op.kind === "table_row") {
      const rectY = y - op.height + 1;
      const rectH = op.height - 1;
      if (op.shaded) {
        out.push(
          `0.976 0.984 0.992 rg ${MARGIN_L} ${rectY.toFixed(1)} ${CONTENT_W.toFixed(1)} ${rectH.toFixed(1)} re f`,
        );
      }
      out.push(
        `0.886 0.910 0.941 RG 0.4 w ${MARGIN_L} ${rectY.toFixed(1)} m ${(MARGIN_L + CONTENT_W).toFixed(1)} ${rectY.toFixed(1)} l S`,
      );
      for (const cell of op.cells) {
        drawAlignedCell(out, cell, rectY + 4.5, 7.8, op.bold === true);
      }
    } else if (op.kind === "text") {
      const size = op.size ?? 8.5;
      const fontKey = op.bold ? "/F2" : "/F1";
      const rgb = op.muted ? "0.38 0.45 0.54" : "0.059 0.090 0.165";
      out.push(
        `${rgb} rg BT ${fontKey} ${size} Tf ${MARGIN_L} ${(y - size - 1).toFixed(1)} Td (${escapePdfString(truncateText(op.text, 108))}) Tj ET`,
      );
    }
    y -= op.height;
  }

  // Page Footer (Tail Kop Halaman) dengan garis ganda dan identitas dokumen
  out.push(
    `0.059 0.239 0.243 RG 0.8 w ${MARGIN_L} 40 m ${(MARGIN_L + CONTENT_W).toFixed(1)} 40 l S`,
  );
  out.push(
    `0.063 0.725 0.506 RG 0.4 w ${MARGIN_L} 38 m ${(MARGIN_L + CONTENT_W).toFixed(1)} 38 l S`,
  );
  out.push(
    `0.35 0.42 0.50 rg BT /F2 7.2 Tf ${MARGIN_L} 27 Td (${escapePdfString(
      `OpenFormu — Sistem Formulasi Ransum Presisi | Dok: ${runningDocCode}`,
    )}) Tj ET`,
  );
  const pageTag = `Halaman ${pageNum} / ${totalPages}`;
  const pageTagW = estimateTextWidth(pageTag, 7.2, true);
  out.push(
    `0.35 0.42 0.50 rg BT /F2 7.2 Tf ${(MARGIN_L + CONTENT_W - pageTagW).toFixed(1)} 27 Td (${escapePdfString(pageTag)}) Tj ET`,
  );

  return out.join("\n");
}

function assemblePdfDocument(pageStreams: readonly string[]): Uint8Array {
  const objects: string[] = [];
  const pageIds: number[] = [];

  for (let i = 0; i < pageStreams.length; i += 1) {
    pageIds.push(5 + i * 2);
  }

  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>\nendobj\n`,
  );
  objects.push(
    "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n",
  );
  objects.push(
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n",
  );

  for (let i = 0; i < pageStreams.length; i += 1) {
    const pageObjId = 5 + i * 2;
    const contentObjId = pageObjId + 1;
    const stream = pageStreams[i] ?? "";
    objects.push(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(2)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`,
    );
    objects.push(
      `${contentObjId} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
    );
  }

  const encoder = new TextEncoder();
  const chunks: string[] = ["%PDF-1.4\n"];
  const offsets: number[] = [0];
  let byteOffset = "%PDF-1.4\n".length;

  for (const obj of objects) {
    offsets.push(byteOffset);
    chunks.push(obj);
    byteOffset += encoder.encode(obj).length;
  }

  const xrefStart = byteOffset;
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");
  for (let i = 1; i <= objects.length; i += 1) {
    const off = String(offsets[i] ?? 0).padStart(10, "0");
    chunks.push(`${off} 00000 n \n`);
  }
  chunks.push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
  );

  return encoder.encode(chunks.join(""));
}

function renderOpsToPdf(
  ops: readonly PdfRowOp[],
  runningTitle = "OPENFORMU - DOKUMEN FORMULASI",
  runningDocCode = "OF-DOC-001",
): Uint8Array {
  const pages = paginateOps(ops);
  const streams = pages.map((pageOps, idx) =>
    renderStructuredPageStream(pageOps, idx + 1, pages.length, runningTitle, runningDocCode),
  );
  return assemblePdfDocument(streams);
}

export function generateFormulationPdf(input: PdfExportInput): Uint8Array {
  assertExportableResult(input.result, {
    requireStrictOptimal: input.mode === "batch_only",
  });

  const {
    recipeName,
    mode,
    ingredients,
    nutrientsCatalog,
    requirement,
    result,
    decimalPlaces = 0,
  } = input;
  const ingMap = new Map(ingredients.map((i) => [i.id, i]));
  const nutMap = new Map(nutrientsCatalog.map((n) => [n.id, n]));
  const batchKg = result.batchSizeKg ?? 100;
  const dateStr = new Date().toLocaleDateString("id-ID");
  const docCode =
    mode === "batch_only"
      ? `OF-BTH-${Math.round(batchKg)}KG`
      : `OF-RSL-${result.basis === "dry_matter" ? "BK" : "AF"}`;
  const rationDmPct = computeRationDryMatterPct(result.composition, ingredients);
  const dmiEst = estimateDailyConsumption(requirement, rationDmPct);

  const ops: PdfRowOp[] = [];
  const docTitle =
    mode === "batch_only"
      ? "OPENFORMU - LEMBAR TIMBANG BATCH PRODUKSI"
      : "OPENFORMU - LAPORAN FORMULASI PAKAN LENGKAP";

  ops.push({
    kind: "head_kop",
    docCode,
    institutionTitle: "OPENFORMU | SISTEM FORMULASI RANSUM & NUTRISI TERNAK PRESISI",
    title: docTitle,
    subtitle:
      mode === "batch_only"
        ? `Instruksi Penimbangan Operator Gudang (2 Versi Presisi xx,xxx & Bulat)`
        : `Laporan Komposisi, Konsumsi Harian (BK & Segar), Profil Nutrien & Harga Bayangan`,
    printedAt: dateStr,
    height: 62,
  });

  if (result.status === "near_feasible") {
    ops.push({
      kind: "alert",
      text: "PERINGATAN: STATUS NEAR-FEASIBLE (TOLERANSI TARGET) - SEBAGIAN TARGET NUTRIEN BELUM TERCAPAI PENUH",
      height: 24,
    });
  }

  ops.push({ kind: "spacer", height: 6 });
  ops.push({ kind: "kv", label: "Nama Formula", value: recipeName, boldValue: true, height: 14 });
  ops.push({
    kind: "kv",
    label: "Standar Ternak",
    value: `${requirement.name}${requirement.phase ? ` (${requirement.phase})` : ""}`,
    height: 14,
  });
  ops.push({
    kind: "kv",
    label: "Basis & Skala",
    value: `${result.basis === "dry_matter" ? "Bahan Kering (BK / DM)" : "As-Fed"} | Status: ${result.status.toUpperCase()} | Batch: ${batchKg.toFixed(1)} kg | Kadar BK Ransum: ${rationDmPct.toFixed(1)}%`,
    height: 14,
  });
  ops.push({
    kind: "kv",
    label: "Konsumsi Harian",
    value: `BK: ${dmiEst.dmiKgPerHead.toFixed(3)} kg/ekor/hr | Segar (As-Fed): ${dmiEst.asFedKgPerHead.toFixed(3)} kg/ekor/hr (${dmiEst.dmiPctBw ? `${dmiEst.dmiPctBw.toFixed(2)}% BB` : dmiEst.sourceNoteId})`,
    boldValue: true,
    height: 14,
  });

  if (mode === "full") {
    const dailyCost =
      result.costPerKg !== null
        ? (result.basis === "dry_matter" ? dmiEst.dmiKgPerHead : dmiEst.asFedKgPerHead) *
          result.costPerKg
        : null;
    ops.push({
      kind: "kv",
      label: "Biaya Ransum",
      value: `${formatIdr(result.costPerKg)} / kg | Total Batch (${batchKg.toFixed(0)} kg): ${formatIdr(result.batchTotalCost)} | Biaya Harian: ${formatIdr(dailyCost)}/ekor/hr`,
      boldValue: true,
      height: 16,
    });
  }

  ops.push({ kind: "spacer", height: 6 });
  ops.push({
    kind: "section",
    title: "1. KOMPOSISI BAHAN & TAKARAN TIMBANG 2-VERSI (PRESISI xx,xxx & BULAT)",
    height: 20,
  });

  if (mode === "batch_only") {
    ops.push({
      kind: "table_header",
      height: 18,
      cells: [
        { text: "No", x: MARGIN_L + 3, width: 18, align: "left" },
        { text: "Nama Bahan Pakan", x: MARGIN_L + 23, width: 200, align: "left" },
        { text: "Porsi %", x: MARGIN_L + 225, width: 52, align: "right" },
        { text: "As-Fed %", x: MARGIN_L + 280, width: 52, align: "right" },
        { text: "Presisi (kg)", x: MARGIN_L + 335, width: 68, align: "right" },
        { text: "Bulat (kg)", x: MARGIN_L + 406, width: 64, align: "right" },
        { text: "Cek", x: MARGIN_L + 476, width: 34, align: "center" },
      ],
    });
  } else {
    ops.push({
      kind: "table_header",
      height: 18,
      cells: [
        { text: "No", x: MARGIN_L + 3, width: 18, align: "left" },
        { text: "Nama Bahan Pakan", x: MARGIN_L + 22, width: 166, align: "left" },
        { text: "Basis %", x: MARGIN_L + 190, width: 46, align: "right" },
        { text: "As-Fed %", x: MARGIN_L + 238, width: 46, align: "right" },
        { text: "Presisi (kg)", x: MARGIN_L + 286, width: 56, align: "right" },
        { text: "Bulat (kg)", x: MARGIN_L + 344, width: 50, align: "right" },
        { text: "Harga/kg", x: MARGIN_L + 396, width: 56, align: "right" },
        { text: "Subtotal", x: MARGIN_L + 454, width: 58, align: "right" },
      ],
    });
  }

  let totalWeight = 0;
  let totalAsFed = 0;
  result.composition.forEach((item, idx) => {
    const ing = ingMap.get(item.ingredientId);
    const activePrice = ing ? (ing.priceOverride ?? ing.pricePerKg) : 0;
    const asFedPct = (item.asFedFraction ?? item.fraction) * 100;
    const weight = item.weightKg ?? (item.asFedFraction ?? item.fraction) * batchKg;
    totalWeight += weight;
    totalAsFed += asFedPct;

    const modelPct = item.fraction * 100;
    const weightDigits = Math.max(1, decimalPlaces);

    if (mode === "batch_only") {
      ops.push({
        kind: "table_row",
        shaded: idx % 2 === 1,
        height: 16,
        cells: [
          { text: String(idx + 1), x: MARGIN_L + 3, width: 18, align: "left" },
          {
            text: ing?.name ?? item.ingredientId,
            x: MARGIN_L + 23,
            width: 200,
            align: "left",
            maxChars: 38,
          },
          {
            text: `${formatNum(modelPct, 3)}%`,
            x: MARGIN_L + 225,
            width: 52,
            align: "right",
          },
          {
            text: `${formatNum(asFedPct, 3)}%`,
            x: MARGIN_L + 280,
            width: 52,
            align: "right",
          },
          {
            text: `${formatNum(weight, 3)} kg`,
            x: MARGIN_L + 335,
            width: 68,
            align: "right",
            bold: true,
          },
          {
            text: `${formatNum(weight, weightDigits)} kg`,
            x: MARGIN_L + 406,
            width: 64,
            align: "right",
          },
          { text: "[  ]", x: MARGIN_L + 476, width: 34, align: "center" },
        ],
      });
    } else {
      ops.push({
        kind: "table_row",
        shaded: idx % 2 === 1,
        height: 16,
        cells: [
          { text: String(idx + 1), x: MARGIN_L + 3, width: 18, align: "left" },
          {
            text: ing?.name ?? item.ingredientId,
            x: MARGIN_L + 22,
            width: 166,
            align: "left",
            maxChars: 31,
          },
          {
            text: `${formatNum(modelPct, 3)}%`,
            x: MARGIN_L + 190,
            width: 46,
            align: "right",
          },
          {
            text: `${formatNum(asFedPct, 3)}%`,
            x: MARGIN_L + 238,
            width: 46,
            align: "right",
          },
          {
            text: formatNum(weight, 3),
            x: MARGIN_L + 286,
            width: 56,
            align: "right",
            bold: true,
          },
          {
            text: formatNum(weight, weightDigits),
            x: MARGIN_L + 344,
            width: 50,
            align: "right",
          },
          { text: formatIdr(activePrice), x: MARGIN_L + 396, width: 56, align: "right" },
          {
            text: formatIdr(item.costContribution ?? 0),
            x: MARGIN_L + 454,
            width: 58,
            align: "right",
          },
        ],
      });
    }
  });

  const totalWeightDigits = Math.max(1, decimalPlaces);

  ops.push({
    kind: "table_row",
    bold: true,
    shaded: true,
    height: 18,
    cells:
      mode === "batch_only"
        ? [
            { text: "TOTAL KOMPOSISI", x: MARGIN_L + 23, width: 200, align: "left" },
            {
              text: "100.000%",
              x: MARGIN_L + 225,
              width: 52,
              align: "right",
            },
            {
              text: `${formatNum(totalAsFed, 3)}%`,
              x: MARGIN_L + 280,
              width: 52,
              align: "right",
            },
            {
              text: `${formatNum(totalWeight, 3)} kg`,
              x: MARGIN_L + 335,
              width: 68,
              align: "right",
            },
            {
              text: `${formatNum(totalWeight, totalWeightDigits)} kg`,
              x: MARGIN_L + 406,
              width: 64,
              align: "right",
            },
          ]
        : [
            { text: "TOTAL KOMPOSISI", x: MARGIN_L + 22, width: 166, align: "left" },
            {
              text: "100.000%",
              x: MARGIN_L + 190,
              width: 46,
              align: "right",
            },
            {
              text: `${formatNum(totalAsFed, 3)}%`,
              x: MARGIN_L + 238,
              width: 46,
              align: "right",
            },
            {
              text: `${formatNum(totalWeight, 3)} kg`,
              x: MARGIN_L + 286,
              width: 56,
              align: "right",
            },
            {
              text: `${formatNum(totalWeight, totalWeightDigits)} kg`,
              x: MARGIN_L + 344,
              width: 50,
              align: "right",
            },
            {
              text: formatIdr(result.batchTotalCost),
              x: MARGIN_L + 454,
              width: 58,
              align: "right",
            },
          ],
  });

  if (mode === "full") {
    ops.push({ kind: "spacer", height: 10 });
    ops.push({
      kind: "section",
      title: "2. PROFIL NUTRIEN AKTUAL (PRESISI 0,00x & BULAT) VS TARGET",
      height: 20,
    });
    ops.push({
      kind: "table_header",
      height: 18,
      cells: [
        { text: "Nutrien", x: MARGIN_L + 4, width: 165, align: "left" },
        { text: "Satuan", x: MARGIN_L + 172, width: 44, align: "left" },
        { text: "Presisi 0,00x", x: MARGIN_L + 220, width: 62, align: "right" },
        { text: "Bulat", x: MARGIN_L + 286, width: 52, align: "right" },
        { text: "Min", x: MARGIN_L + 342, width: 48, align: "right" },
        { text: "Max", x: MARGIN_L + 394, width: 48, align: "right" },
        { text: "Status", x: MARGIN_L + 446, width: 66, align: "right" },
      ],
    });

    result.nutrients.forEach((nr, idx) => {
      const meta = nutMap.get(nr.nutrientId);
      const digits = resolveDisplayDigits(meta?.unit, nr.nutrientId, decimalPlaces, nr.value);
      const minDigits = resolveDisplayDigits(meta?.unit, nr.nutrientId, decimalPlaces, nr.min);
      const maxDigits = resolveDisplayDigits(meta?.unit, nr.nutrientId, decimalPlaces, nr.max);
      const statusLabel =
        nr.status === "met"
          ? "TERPENUHI"
          : nr.status === "below_min"
            ? "KURANG"
            : nr.status === "above_max"
              ? "LEBIH"
              : "BEBAS";
      ops.push({
        kind: "table_row",
        shaded: idx % 2 === 1,
        height: 16,
        cells: [
          {
            text: meta?.name ?? nr.nutrientId,
            x: MARGIN_L + 4,
            width: 165,
            align: "left",
            maxChars: 30,
          },
          { text: meta?.unit ?? "%", x: MARGIN_L + 172, width: 44, align: "left" },
          {
            text: formatNum(nr.value, 3),
            x: MARGIN_L + 220,
            width: 62,
            align: "right",
            bold: true,
          },
          {
            text: formatNum(nr.value, digits),
            x: MARGIN_L + 286,
            width: 52,
            align: "right",
          },
          { text: formatNum(nr.min, minDigits), x: MARGIN_L + 342, width: 48, align: "right" },
          { text: formatNum(nr.max, maxDigits), x: MARGIN_L + 394, width: 48, align: "right" },
          { text: statusLabel, x: MARGIN_L + 446, width: 66, align: "right" },
        ],
      });
    });

    ops.push({ kind: "spacer", height: 10 });
    ops.push({
      kind: "section",
      title: "3. ANALISIS EKONOMI (HARGA BAYANGAN & HARGA IMPAS)",
      height: 20,
    });

    const bindingNutrients = result.nutrients.filter(
      (n) =>
        n.shadowPrice !== undefined && n.shadowPrice !== null && Math.abs(n.shadowPrice) > 1e-4,
    );
    if (bindingNutrients.length === 0) {
      ops.push({
        kind: "text",
        text: "Tidak ada kendala nutrien yang mengikat harga bayangan secara signifikan.",
        muted: true,
        height: 14,
      });
    } else {
      for (const n of bindingNutrients) {
        const meta = nutMap.get(n.nutrientId);
        ops.push({
          kind: "text",
          text: `- ${meta?.name ?? n.nutrientId}: Harga Bayangan ${formatIdr(n.shadowPrice)} / 1 unit batas nutrien`,
          height: 14,
        });
      }
    }

    const occ = result.opportunityCosts ?? [];
    if (occ.length > 0) {
      ops.push({ kind: "spacer", height: 4 });
      ops.push({
        kind: "text",
        text: "Harga Impas Bahan Belum Terpakai (Target Harga Layak Beli):",
        bold: true,
        height: 14,
      });
      for (const item of occ.slice(0, 8)) {
        const ing = ingMap.get(item.ingredientId);
        ops.push({
          kind: "text",
          text: `- ${truncateText(ing?.name ?? item.ingredientId, 34)}: Harga skrg ${formatIdr(item.currentPrice)} -> Layak beli <= ${formatIdr(item.opportunityPrice)}/kg`,
          height: 13,
        });
      }
    }
  }

  ops.push({ kind: "spacer", height: 10 });
  ops.push({
    kind: "tail_kop",
    docCode,
    leftRole: "1. Disusun Oleh (Nutrisionis / Formulator)",
    centerRole: "2. Diverifikasi Oleh (QC / Kepala Gudang)",
    rightRole: "3. Disetujui Oleh (Manajer Peternakan)",
    referenceNote:
      "Referensi Ilmiah: SNI (BSN) | NRC Poultry 9th Ed (1994) | NRC Dairy (1988) | Kearl (1982) | Hartadi et al. (1980) | Solver LP HiGHS 1e-6",
    height: 82,
  });

  return renderOpsToPdf(ops, docTitle, docCode);
}

/**
 * Ekspor PDF rapi untuk tab Database Bahan Pakan, dikelompokkan berdasarkan
 * 8 klasifikasi bahan pakan standar internasional (IFN / NRC / Hartadi 1980).
 */
export function generateIngredientDatabasePdf(input: IngredientDatabasePdfInput): Uint8Array {
  const {
    ingredients,
    title = "DATABASE KANDUNGAN BAHAN PAKAN (8 KLASIFIKASI STANDAR)",
    decimalPlaces = 0,
  } = input;
  const dateStr = new Date().toLocaleDateString("id-ID");
  const docCode = `OF-DB-${ingredients.length}ING`;
  const docTitle = `OPENFORMU - ${title}`;

  const ops: PdfRowOp[] = [
    {
      kind: "head_kop",
      docCode,
      institutionTitle: "OPENFORMU | KATALOG LABORATORIUM NUTRISI & KLASIFIKASI IFN",
      title: docTitle,
      subtitle: `Total ${ingredients.length} bahan pakan dikelompokkan berdasarkan 8 kelas standar internasional`,
      printedAt: dateStr,
      height: 62,
    },
    { kind: "spacer", height: 6 },
  ];

  const byClass = new Map<number, Ingredient[]>();
  for (const fc of FEED_CLASSES) {
    byClass.set(fc.code, []);
  }
  for (const ing of ingredients) {
    const code = resolveFeedClass(ing);
    byClass.get(code)?.push(ing);
  }

  for (const fc of FEED_CLASSES) {
    const items = byClass.get(fc.code) ?? [];
    if (items.length === 0) continue;

    ops.push({
      kind: "section",
      title: `KELAS ${fc.code} - ${fc.nameId.toUpperCase()} (${items.length} bahan)`,
      subtitle: fc.descriptionId,
      height: 20,
    });

    ops.push({
      kind: "table_header",
      height: 17,
      cells: [
        { text: "No", x: MARGIN_L + 3, width: 20, align: "left" },
        { text: "Nama Bahan", x: MARGIN_L + 24, width: 174, align: "left" },
        { text: "Basis", x: MARGIN_L + 200, width: 28, align: "center" },
        { text: "Harga/kg", x: MARGIN_L + 230, width: 56, align: "right" },
        { text: "BK%", x: MARGIN_L + 290, width: 34, align: "right" },
        { text: "PK%", x: MARGIN_L + 328, width: 34, align: "right" },
        { text: "EM/TDN", x: MARGIN_L + 366, width: 50, align: "right" },
        { text: "SK%", x: MARGIN_L + 420, width: 30, align: "right" },
        { text: "Ca%", x: MARGIN_L + 454, width: 28, align: "right" },
        { text: "P%", x: MARGIN_L + 484, width: 28, align: "right" },
      ],
    });

    items.forEach((ing, idx) => {
      const me = ing.nutrients.me_poultry;
      const tdn = ing.nutrients.tdn;
      const tdnDigits = resolveDisplayDigits("%", "tdn", decimalPlaces, tdn);
      const energyStr =
        me !== null && me !== undefined
          ? `${Math.round(me)}`
          : tdn !== null && tdn !== undefined
            ? `${tdn.toFixed(tdnDigits)}%`
            : "-";

      ops.push({
        kind: "table_row",
        shaded: idx % 2 === 1,
        height: 15,
        cells: [
          { text: String(idx + 1), x: MARGIN_L + 3, width: 20, align: "left" },
          { text: ing.name, x: MARGIN_L + 24, width: 174, align: "left", maxChars: 33 },
          {
            text: ing.basis === "as_fed" ? "AF" : "BK",
            x: MARGIN_L + 200,
            width: 28,
            align: "center",
          },
          {
            text: formatIdr(ing.priceOverride ?? ing.pricePerKg),
            x: MARGIN_L + 230,
            width: 56,
            align: "right",
          },
          {
            text: formatNum(
              ing.dryMatter,
              resolveDisplayDigits("%", "dm", decimalPlaces, ing.dryMatter),
            ),
            x: MARGIN_L + 290,
            width: 34,
            align: "right",
          },
          {
            text: formatNum(
              ing.nutrients.cp,
              resolveDisplayDigits("%", "cp", decimalPlaces, ing.nutrients.cp),
            ),
            x: MARGIN_L + 328,
            width: 34,
            align: "right",
          },
          { text: energyStr, x: MARGIN_L + 366, width: 50, align: "right" },
          {
            text: formatNum(
              ing.nutrients.cf,
              resolveDisplayDigits("%", "cf", decimalPlaces, ing.nutrients.cf),
            ),
            x: MARGIN_L + 420,
            width: 30,
            align: "right",
          },
          {
            text: formatNum(
              ing.nutrients.ca,
              resolveDisplayDigits("%", "ca", decimalPlaces, ing.nutrients.ca),
            ),
            x: MARGIN_L + 454,
            width: 28,
            align: "right",
          },
          {
            text: formatNum(
              ing.nutrients.p,
              resolveDisplayDigits("%", "p", decimalPlaces, ing.nutrients.p),
            ),
            x: MARGIN_L + 484,
            width: 28,
            align: "right",
          },
        ],
      });
    });

    ops.push({ kind: "spacer", height: 8 });
  }

  ops.push({
    kind: "tail_kop",
    docCode,
    leftRole: "1. Disusun Oleh (Analis Lab Nutrisi)",
    centerRole: "2. Diverifikasi Oleh (Kepala QC Pakan)",
    rightRole: "3. Disahkan Oleh (Manajer Nutrisi)",
    referenceNote:
      "Sumber Pustaka: Hartadi et al. (1980) | Kearl (1982) | NRC Poultry 9th Ed (1994) | NRC Dairy (1988) | 8 Kelas IFN",
    height: 82,
  });

  return renderOpsToPdf(ops, docTitle, docCode);
}

/**
 * Ekspor PDF rapi untuk satu resep tersimpan pada halaman Project Resep.
 * Jika resep sudah memiliki hasil formulasi optimal/near-feasible, gunakan laporan lengkap;
 * jika belum dihitung, buat dokumen spesifikasi resep (daftar bahan aktif & target nutrien).
 */
export function generateRecipePdf(input: RecipePdfInput): Uint8Array {
  const { recipe, nutrientsCatalog, decimalPlaces = 0 } = input;
  if (
    recipe.result &&
    (recipe.result.status === "optimal" || recipe.result.status === "near_feasible") &&
    recipe.result.composition.length > 0
  ) {
    return generateFormulationPdf({
      recipeName: recipe.name,
      mode: "full",
      ingredients: recipe.ingredients,
      nutrientsCatalog,
      requirement: recipe.requirement,
      result: recipe.result,
      decimalPlaces,
    });
  }

  const nutMap = new Map(nutrientsCatalog.map((n) => [n.id, n]));
  const activeFeeds = recipe.ingredients.filter((i) => i.isActive !== false);
  const dateStr = new Date().toLocaleDateString("id-ID");
  const docCode = `OF-RCP-${activeFeeds.length}ACT`;
  const docTitle = "OPENFORMU - RINGKASAN PROJECT RESEP";

  const ops: PdfRowOp[] = [
    {
      kind: "head_kop",
      docCode,
      institutionTitle: "OPENFORMU | ARSIP SPESIFIKASI PROJECT RESEP & STANDAR NUTRIEN",
      title: docTitle,
      subtitle: `Dokumen Spesifikasi Bahan & Target Nutrien`,
      printedAt: dateStr,
      height: 62,
    },
    { kind: "spacer", height: 6 },
    { kind: "kv", label: "Nama Resep", value: recipe.name, boldValue: true, height: 14 },
    { kind: "kv", label: "Standar Ternak", value: recipe.requirement.name, height: 14 },
    {
      kind: "kv",
      label: "Basis & Batch",
      value: `${recipe.config?.activeBasis === "dry_matter" ? "Bahan Kering (BK)" : "As-Fed"} | Batch ${recipe.config?.batchSizeKg ?? 100} kg | ${activeFeeds.length} bahan aktif`,
      height: 14,
    },
  ];

  if (recipe.notes) {
    ops.push({ kind: "kv", label: "Catatan", value: recipe.notes, height: 14 });
  }

  ops.push({ kind: "spacer", height: 8 });
  ops.push({ kind: "section", title: "1. DAFTAR BAHAN PAKAN AKTIF", height: 20 });
  ops.push({
    kind: "table_header",
    height: 18,
    cells: [
      { text: "No", x: MARGIN_L + 4, width: 22, align: "left" },
      { text: "Nama Bahan", x: MARGIN_L + 28, width: 215, align: "left" },
      { text: "Harga/kg", x: MARGIN_L + 248, width: 64, align: "right" },
      { text: "BK %", x: MARGIN_L + 318, width: 42, align: "right" },
      { text: "Min %", x: MARGIN_L + 366, width: 44, align: "right" },
      { text: "Max %", x: MARGIN_L + 416, width: 44, align: "right" },
      { text: "PK %", x: MARGIN_L + 466, width: 44, align: "right" },
    ],
  });

  activeFeeds.forEach((ing, idx) => {
    ops.push({
      kind: "table_row",
      shaded: idx % 2 === 1,
      height: 16,
      cells: [
        { text: String(idx + 1), x: MARGIN_L + 4, width: 22, align: "left" },
        { text: ing.name, x: MARGIN_L + 28, width: 215, align: "left", maxChars: 40 },
        {
          text: formatIdr(ing.priceOverride ?? ing.pricePerKg),
          x: MARGIN_L + 248,
          width: 64,
          align: "right",
        },
        {
          text: formatNum(
            ing.dryMatter,
            resolveDisplayDigits("%", "dm", decimalPlaces, ing.dryMatter),
          ),
          x: MARGIN_L + 318,
          width: 42,
          align: "right",
        },
        {
          text: formatNum(
            ing.inclusion?.min ?? 0,
            resolveDisplayDigits("%", "inclusion", decimalPlaces, ing.inclusion?.min ?? 0),
          ),
          x: MARGIN_L + 366,
          width: 44,
          align: "right",
        },
        {
          text: formatNum(
            ing.inclusion?.max ?? 100,
            resolveDisplayDigits("%", "inclusion", decimalPlaces, ing.inclusion?.max ?? 100),
          ),
          x: MARGIN_L + 416,
          width: 44,
          align: "right",
        },
        {
          text: formatNum(
            ing.nutrients.cp,
            resolveDisplayDigits("%", "cp", decimalPlaces, ing.nutrients.cp),
          ),
          x: MARGIN_L + 466,
          width: 44,
          align: "right",
        },
      ],
    });
  });

  ops.push({ kind: "spacer", height: 10 });
  ops.push({ kind: "section", title: "2. TARGET KEBUTUHAN NUTRIEN", height: 20 });
  ops.push({
    kind: "table_header",
    height: 18,
    cells: [
      { text: "Nutrien", x: MARGIN_L + 4, width: 230, align: "left" },
      { text: "Satuan", x: MARGIN_L + 240, width: 60, align: "left" },
      { text: "Minimum", x: MARGIN_L + 310, width: 90, align: "right" },
      { text: "Maksimum", x: MARGIN_L + 410, width: 95, align: "right" },
    ],
  });

  recipe.requirement.constraints
    .filter((c) => c.enabled !== false && (c.min !== undefined || c.max !== undefined))
    .forEach((c, idx) => {
      const meta = nutMap.get(c.nutrientId);
      const minDigits = resolveDisplayDigits(meta?.unit, c.nutrientId, decimalPlaces, c.min);
      const maxDigits = resolveDisplayDigits(meta?.unit, c.nutrientId, decimalPlaces, c.max);
      ops.push({
        kind: "table_row",
        shaded: idx % 2 === 1,
        height: 16,
        cells: [
          { text: meta?.name ?? c.nutrientId, x: MARGIN_L + 4, width: 230, align: "left" },
          { text: meta?.unit ?? "%", x: MARGIN_L + 240, width: 60, align: "left" },
          { text: formatNum(c.min, minDigits), x: MARGIN_L + 310, width: 90, align: "right" },
          { text: formatNum(c.max, maxDigits), x: MARGIN_L + 410, width: 95, align: "right" },
        ],
      });
    });

  ops.push({ kind: "spacer", height: 10 });
  ops.push({
    kind: "tail_kop",
    docCode,
    leftRole: "1. Disusun Oleh (Formulator)",
    centerRole: "2. Diverifikasi Oleh (Supervisor Pakan)",
    rightRole: "3. Disetujui Oleh (Manajer Unit)",
    referenceNote:
      "Referensi Standar: SNI (BSN) | NRC Poultry 9th Ed (1994) | NRC Dairy (1988) | Kearl (1982) | Hartadi et al. (1980)",
    height: 82,
  });

  return renderOpsToPdf(ops, docTitle, docCode);
}
