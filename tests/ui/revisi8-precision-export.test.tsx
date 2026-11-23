import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  BatchMixerCalculator,
  computeRationDryMatterPct,
  estimateDailyConsumption,
} from "../../src/components/analytics/BatchMixerCalculator";
import { NumericCellInput } from "../../src/components/formulation/NumericCellInput";
import {
  DEFAULT_CONFIG,
  HARTADI_FEEDS,
  KEARL_REQUIREMENTS,
  MOCK_INGREDIENTS,
  MOCK_NUTRIENTS,
  MOCK_REQUIREMENTS,
  NRC_1994_POULTRY_REQUIREMENTS,
  evaluateMockFormulation,
} from "../../src/data/mock-state";
import {
  generateFormulationXlsx,
  generateIngredientDatabaseXlsx,
} from "../../src/storage/exportCsvXlsx";
import { generateFormulationPdf, generateIngredientDatabasePdf } from "../../src/storage/exportPdf";

describe("Revisi 8 — Input Numerik Bebas-Kosong, Presisi 0.00x, Konsumsi Harian (BK/As-Fed), Kalibrasi Kearl/NRC, .xlsx 4-Sheet & PDF Head/Tail Kop", () => {
  it("R8-01 & R8-02: NumericCellInput dapat dikosongkan ('') saat mengetik tanpa memaksa angka 0 dan mempertahankan desimal 0,00x (0,5 / 0,005)", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();

    render(
      <NumericCellInput
        value={1}
        fractionDigits={1}
        ariaLabel="Min % Premix"
        commitOnChange
        fallbackOnEmpty={0}
        onCommit={onCommit}
      />,
    );

    const input = screen.getByLabelText<HTMLInputElement>("Min % Premix");
    expect(input.value).toBe("1,0");

    // Saat pengguna menghapus seluruh isi input di tengah fokus, nilai input boleh "" (kosong)
    await user.clear(input);
    expect(input.value).toBe("");

    // Ketik 0,5 tanpa terganggu angka 0 di depan ("00,5")
    await user.type(input, "0,5");
    expect(input.value).toBe("0,5");
    expect(onCommit).toHaveBeenLastCalledWith(0.5);

    // Blur merapikan tampilan
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith(0.5);
  });

  it("R8-03: BatchMixerCalculator menampilkan Total Konsumsi Harian (BK & Segar As-Fed) dan 2 Versi Presisi (xx,xxx & Bulat)", async () => {
    const user = userEvent.setup();
    const kearlReq = KEARL_REQUIREMENTS[0]!; // Sapi Potong 200 kg (BK 5,40 kg)
    const dmPct = 86.5;
    const est = estimateDailyConsumption(kearlReq, dmPct);
    expect(est.dmiKgPerHead).toBeCloseTo(5.4, 2);
    expect(est.asFedKgPerHead).toBeCloseTo(5.4 / 0.865, 2);

    const mockRes = evaluateMockFormulation(
      MOCK_INGREDIENTS,
      MOCK_REQUIREMENTS[0]!,
      DEFAULT_CONFIG,
    );
    const calcDm = computeRationDryMatterPct(mockRes.composition, MOCK_INGREDIENTS);
    expect(calcDm).toBeGreaterThan(80);
    expect(calcDm).toBeLessThan(95);

    render(
      <BatchMixerCalculator
        composition={mockRes.composition}
        ingredients={MOCK_INGREDIENTS}
        activeBasis="as_fed"
        batchSizeKg={100}
        onSetBatchSize={vi.fn()}
        costPerKg={6500}
        requirement={kearlReq}
        language="id"
      />,
    );

    expect(
      screen.getByText(/Total Konsumsi Harian Ternak \(BK & Segar As-Fed\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Takaran Presisi \(100 kg\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Takaran Bulat \(kg\)/i)).toBeInTheDocument();

    // Beralih ke mode Bulat menyembunyikan kolom Takaran Presisi (100 kg)
    const roundedBtn = screen.getByRole("button", { name: /^Bulat$/i });
    await user.click(roundedBtn);
    expect(screen.queryByText(/Takaran Presisi \(100 kg\)/i)).not.toBeInTheDocument();
  });

  it("R8-04 & R8-05: Katalog terkalibrasi Kearl 1982 & NRC 1994 bebas duplikat, ekspor .xlsx 4-sheet lengkap, dan PDF memiliki Head Kop & Tail Kop", () => {
    // 1. Pastikan bahan Hartadi + Kearl + NRC memiliki nilai sid_lys, avp, na, k, cl, s terkalibrasi
    const corn = MOCK_INGREDIENTS.find((i) => i.id === "corn-ground")!;
    expect(corn.nutrients.na).toBeGreaterThan(0);
    expect(corn.nutrients.k).toBeGreaterThan(0);
    expect(corn.nutrients.betn).toBeGreaterThan(0);

    const moringa = HARTADI_FEEDS.find((i) => i.id === "kearl-t26-moringa-leaves")!;
    expect(moringa).toBeDefined();
    expect(moringa.nutrients.cp).toBeCloseTo(27.9, 1);
    expect(moringa.nutrients.sid_lys).toBeGreaterThan(1.0);
    expect(moringa.nutrients.avp).toBeGreaterThan(0.1);

    const canola = HARTADI_FEEDS.find((i) => i.id === "nrc94-canola-meal")!;
    expect(canola).toBeDefined();
    expect(canola.nutrients.cp).toBeCloseTo(40.9, 1);
    expect(canola.nutrients.na).toBe(970);

    expect(NRC_1994_POULTRY_REQUIREMENTS.some((r) => r.species === "quail")).toBe(true);
    expect(NRC_1994_POULTRY_REQUIREMENTS.some((r) => r.species === "turkey")).toBe(true);
    expect(KEARL_REQUIREMENTS.some((r) => r.species === "buffalo")).toBe(true);

    // 2. Uji ekspor .xlsx 4-sheet dan database .xlsx 2-sheet
    const mockRes = evaluateMockFormulation(
      MOCK_INGREDIENTS,
      MOCK_REQUIREMENTS[0]!,
      DEFAULT_CONFIG,
    );
    const xlsxBytes = generateFormulationXlsx({
      recipeName: "Uji Revisi 8",
      ingredients: MOCK_INGREDIENTS,
      nutrientsCatalog: MOCK_NUTRIENTS,
      requirement: MOCK_REQUIREMENTS[0]!,
      result: { ...mockRes, status: "optimal" },
    });
    const xlsxText = new TextDecoder("latin1").decode(xlsxBytes);
    expect(xlsxText).toContain("Komposisi &amp; Timbang");
    expect(xlsxText).toContain("Profil Nutrien");
    expect(xlsxText).toContain("Shadow Price");
    expect(xlsxText).toContain("Matriks Nutrien Bahan");
    expect(xlsxText).toContain("Takaran Presisi (xx.xxx kg)");

    const dbXlsxBytes = generateIngredientDatabaseXlsx({
      ingredients: MOCK_INGREDIENTS.slice(0, 15),
      nutrientsCatalog: MOCK_NUTRIENTS,
    });
    const dbXlsxText = new TextDecoder("latin1").decode(dbXlsxBytes);
    expect(dbXlsxText).toContain("Katalog Nutrien Lengkap");
    expect(dbXlsxText).toContain("Ringkasan 8 Kelas IFN");

    // 3. Uji PDF Head Kop & Tail Kop
    const pdfBytes = generateFormulationPdf({
      recipeName: "Uji PDF Kop",
      mode: "full",
      ingredients: MOCK_INGREDIENTS,
      nutrientsCatalog: MOCK_NUTRIENTS,
      requirement: MOCK_REQUIREMENTS[0]!,
      result: { ...mockRes, status: "optimal" },
    });
    const pdfText = new TextDecoder("latin1").decode(pdfBytes);
    expect(pdfText).toContain("NO. DOK: OF-RSL-AF");
    expect(pdfText).toContain("TAIL KOP PENGESAHAN, VERIFIKASI MUTU & OTORISASI DOKUMEN");
    expect(pdfText).toContain("Konsumsi Harian");

    const dbPdfBytes = generateIngredientDatabasePdf({
      ingredients: MOCK_INGREDIENTS.slice(0, 15),
    });
    const dbPdfText = new TextDecoder("latin1").decode(dbPdfBytes);
    expect(dbPdfText).toContain("NO. DOK: OF-DB-15ING");
    expect(dbPdfText).toContain("TAIL KOP PENGESAHAN");
  });
});
