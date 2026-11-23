import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  MOCK_INGREDIENTS,
  MOCK_NUTRIENTS,
  MOCK_REQUIREMENTS,
} from "../src/data/mock-state";
import { solveLpInNode } from "../src/solver/highsNodeRunner";
import { solveFormulationWithRunner } from "../src/solver/solveFormulation";
import {
  escapeCsvCell,
  generateFormulationCsv,
  generateFormulationXlsx,
  generateIngredientDatabaseXlsx,
} from "../src/storage/exportCsvXlsx";
import {
  generateFormulationPdf,
  generateIngredientDatabasePdf,
  generateRecipePdf,
} from "../src/storage/exportPdf";
import { MOCK_SAVED_RECIPES } from "../src/data/mock-state";
import type { FormulationResult } from "../src/types";

describe("Task 2 — Pure TS CSV, OOXML .xlsx & PDF 1.4 Generators + Safety Gates", () => {
  it("membangun CSV ber-UTF-8 BOM dan menetralisir formula injection Excel (=, +, -, @)", () => {
    expect(escapeCsvCell("=cmd|' /C calc'!A0")).toBe(`"'=cmd|' /C calc'!A0"`);
    expect(escapeCsvCell("+SUM(A1:A2)")).toBe(`"'+SUM(A1:A2)"`);
    expect(escapeCsvCell("Jagung, Kuning")).toBe(`"Jagung, Kuning"`);
  });

  it("menghasilkan CSV & file ZIP OOXML .xlsx valid dengan 3 worksheet dari hasil Optimal", async () => {
    const req = MOCK_REQUIREMENTS[0]!;
    const result = await solveFormulationWithRunner(
      MOCK_INGREDIENTS,
      req,
      { ...DEFAULT_CONFIG, optimizationMode: 1, batchSizeKg: 250 },
      solveLpInNode,
    );
    expect(result.status).toBe("optimal");

    const csv = generateFormulationCsv({
      recipeName: "Broiler Starter Uji",
      ingredients: MOCK_INGREDIENTS,
      nutrientsCatalog: MOCK_NUTRIENTS,
      requirement: req,
      result,
    });
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Broiler Starter Uji");
    expect(csv).toContain("KOMPOSISI BAHAN");
    expect(csv).toContain("PROFIL NUTRIEN");

    const xlsxBytes = generateFormulationXlsx({
      recipeName: "Broiler Starter Uji",
      ingredients: MOCK_INGREDIENTS,
      nutrientsCatalog: MOCK_NUTRIENTS,
      requirement: req,
      result,
    });
    // ZIP Local File Header magic bytes: PK\x03\x04
    expect(xlsxBytes[0]).toBe(0x50);
    expect(xlsxBytes[1]).toBe(0x4b);
    expect(xlsxBytes[2]).toBe(0x03);
    expect(xlsxBytes[3]).toBe(0x04);

    const asciiText = new TextDecoder("latin1").decode(xlsxBytes);
    expect(asciiText).toContain("xl/worksheets/sheet1.xml");
    expect(asciiText).toContain("xl/worksheets/sheet2.xml");
    expect(asciiText).toContain("xl/worksheets/sheet3.xml");
    expect(asciiText).toContain("xl/worksheets/sheet4.xml");
    expect(asciiText).toContain("Matriks Nutrien Bahan");
    expect(asciiText).toContain("[Content_Types].xml");

    const dbXlsx = generateIngredientDatabaseXlsx({
      ingredients: MOCK_INGREDIENTS.slice(0, 20),
      nutrientsCatalog: MOCK_NUTRIENTS,
    });
    const dbXlsxAscii = new TextDecoder("latin1").decode(dbXlsx);
    expect(dbXlsxAscii).toContain("Katalog Nutrien Lengkap");
    expect(dbXlsxAscii).toContain("Ringkasan 8 Kelas IFN");
  });

  it("menghasilkan dokumen PDF 1.4 valid untuk mode 'batch_only' dan 'full'", async () => {
    const req = MOCK_REQUIREMENTS[0]!;
    const result = await solveFormulationWithRunner(
      MOCK_INGREDIENTS,
      req,
      { ...DEFAULT_CONFIG, optimizationMode: 3, batchSizeKg: 500 },
      solveLpInNode,
    );
    expect(result.status).toBe("optimal");

    const batchPdf = generateFormulationPdf({
      recipeName: "Broiler Batch 500",
      mode: "batch_only",
      ingredients: MOCK_INGREDIENTS,
      nutrientsCatalog: MOCK_NUTRIENTS,
      requirement: req,
      result,
    });
    const batchAscii = new TextDecoder("latin1").decode(batchPdf);
    expect(batchAscii.startsWith("%PDF-1.4")).toBe(true);
    expect(batchAscii).toContain("LEMBAR TIMBANG BATCH");
    expect(batchAscii).not.toContain("PROFIL NUTRIEN AKTUAL");
    expect(batchAscii.trimEnd().endsWith("%%EOF")).toBe(true);

    const fullPdf = generateFormulationPdf({
      recipeName: "Broiler Full Audit",
      mode: "full",
      ingredients: MOCK_INGREDIENTS,
      nutrientsCatalog: MOCK_NUTRIENTS,
      requirement: req,
      result,
    });
    const fullAscii = new TextDecoder("latin1").decode(fullPdf);
    expect(fullAscii.startsWith("%PDF-1.4")).toBe(true);
    expect(fullAscii).toContain("PROFIL NUTRIEN AKTUAL");
    expect(fullAscii).toContain("ANALISIS EKONOMI");
    expect(fullAscii).toContain("TAIL KOP PENGESAHAN");
    expect(fullAscii).toContain("Konsumsi Harian");
    expect(fullAscii.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  it("memblokir ekspor saat status Infeasible serta memblokir PDF batch_only saat Near-Feasible", () => {
    const req = MOCK_REQUIREMENTS[0]!;
    const infeasibleResult: FormulationResult = {
      status: "infeasible",
      basis: "as_fed",
      costPerKg: null,
      batchTotalCost: null,
      batchSizeKg: 100,
      composition: [],
      nutrients: [],
      messages: ["Infeasible"],
      solvedAt: "2026-11-15T00:00:00.000Z",
    };

    expect(() =>
      generateFormulationPdf({
        recipeName: "Gagal",
        mode: "full",
        ingredients: MOCK_INGREDIENTS,
        nutrientsCatalog: MOCK_NUTRIENTS,
        requirement: req,
        result: infeasibleResult,
      }),
    ).toThrow(/Infeasible|Optimal/i);

    expect(() =>
      generateFormulationXlsx({
        recipeName: "Gagal",
        ingredients: MOCK_INGREDIENTS,
        nutrientsCatalog: MOCK_NUTRIENTS,
        requirement: req,
        result: infeasibleResult,
      }),
    ).toThrow(/Infeasible|Optimal/i);

    const nearFeasible: FormulationResult = {
      status: "near_feasible",
      basis: "as_fed",
      costPerKg: 7500,
      batchTotalCost: 750000,
      batchSizeKg: 100,
      composition: [{ ingredientId: MOCK_INGREDIENTS[0]!.id, fraction: 1, weightKg: 100 }],
      nutrients: [],
      messages: ["Near feasible"],
      solvedAt: "2026-11-15T00:00:00.000Z",
    };

    expect(() =>
      generateFormulationPdf({
        recipeName: "Near Feasible Batch",
        mode: "batch_only",
        ingredients: MOCK_INGREDIENTS,
        nutrientsCatalog: MOCK_NUTRIENTS,
        requirement: req,
        result: nearFeasible,
      }),
    ).toThrow(/Optimal/i);

    // Mode 'full' tetap diizinkan dengan label peringatan near_feasible eksplisit
    const diagPdf = generateFormulationPdf({
      recipeName: "Near Feasible Diagnostik",
      mode: "full",
      ingredients: MOCK_INGREDIENTS,
      nutrientsCatalog: MOCK_NUTRIENTS,
      requirement: req,
      result: nearFeasible,
    });
    const diagAscii = new TextDecoder("latin1").decode(diagPdf);
    expect(diagAscii).toContain("NEAR-FEASIBLE");
  });

  it("menghasilkan PDF Database 8 klasifikasi bahan pakan dan PDF Project Resep yang valid", () => {
    const dbPdf = generateIngredientDatabasePdf({
      ingredients: MOCK_INGREDIENTS.slice(0, 30),
    });
    const dbAscii = new TextDecoder("latin1").decode(dbPdf);
    expect(dbAscii.startsWith("%PDF-1.4")).toBe(true);
    expect(dbAscii).toContain("OPENFORMU");
    expect(dbAscii).toContain("KELAS 4 - SUMBER ENERGI");
    expect(dbAscii).toContain("KELAS 5 - SUMBER PROTEIN");
    expect(dbAscii.trimEnd().endsWith("%%EOF")).toBe(true);

    const recipePdf = generateRecipePdf({
      recipe: MOCK_SAVED_RECIPES[0]!,
      nutrientsCatalog: MOCK_NUTRIENTS,
    });
    const recAscii = new TextDecoder("latin1").decode(recipePdf);
    expect(recAscii.startsWith("%PDF-1.4")).toBe(true);
    expect(recAscii).toContain("RINGKASAN PROJECT RESEP");
    expect(recAscii).toContain("DAFTAR BAHAN PAKAN AKTIF");
    expect(recAscii.trimEnd().endsWith("%%EOF")).toBe(true);
  });
});
