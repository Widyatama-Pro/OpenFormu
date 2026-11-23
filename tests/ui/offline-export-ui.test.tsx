import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IngredientLibraryPage } from "../../src/components/database/IngredientLibraryPage";
import { IngredientDesktopTable } from "../../src/components/formulation/IngredientDesktopTable";
import { ExportDialog } from "../../src/components/recipes/ExportDialog";
import { SavedRecipesPage } from "../../src/components/recipes/SavedRecipesPage";
import { SettingsPage } from "../../src/components/settings/SettingsPage";
import {
  DEFAULT_CONFIG,
  DEFAULT_PREFERENCES,
  MOCK_INGREDIENTS,
  MOCK_REQUIREMENTS,
  MOCK_SAVED_RECIPES,
  evaluateMockFormulation,
} from "../../src/data/mock-state";
import type { FormulationResult } from "../../src/types";
import * as downloadUtils from "../../src/utils/download";

function makeOptimalResult(): FormulationResult {
  const base = evaluateMockFormulation(MOCK_INGREDIENTS, MOCK_REQUIREMENTS[0]!, DEFAULT_CONFIG);
  return {
    ...base,
    status: "optimal",
    costPerKg: 6450,
    batchTotalCost: 645000,
    batchSizeKg: 100,
    composition: [
      {
        ingredientId: "corn-ground",
        fraction: 0.58,
        asFedFraction: 0.58,
        weightKg: 58,
        costContribution: 319000,
      },
      {
        ingredientId: "sbm-44",
        fraction: 0.32,
        asFedFraction: 0.32,
        weightKg: 32,
        costContribution: 262400,
      },
      {
        ingredientId: "rice-bran",
        fraction: 0.1,
        asFedFraction: 0.1,
        weightKg: 10,
        costContribution: 30000,
      },
    ],
  };
}

describe("UI Export PDF-Only, 8 Kelas Database, TSV Paste & Settings Formulasi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ExportDialog: khusus PDF (Lengkap & Lembar Timbang Gudang) dengan gerbang keamanan Near-Feasible / Infeasible", async () => {
    const binSpy = vi.spyOn(downloadUtils, "downloadBinaryFile").mockImplementation(() => {});
    const user = userEvent.setup();

    const optimalResult = makeOptimalResult();
    const { rerender } = render(
      <ExportDialog
        open
        onClose={vi.fn()}
        ingredients={MOCK_INGREDIENTS}
        requirement={MOCK_REQUIREMENTS[0]!}
        config={DEFAULT_CONFIG}
        result={optimalResult}
      />,
    );

    // Pastikan CSV / Excel / .feed.json sudah dihapus dari dialog ekspor peternak
    expect(screen.queryByRole("button", { name: /Unduh CSV/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Unduh Excel/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /\.feed\.json/i })).not.toBeInTheDocument();

    const pdfFullBtn = screen.getByRole("button", { name: /PDF Lembar Formula Lengkap/i });
    const pdfBatchBtn = screen.getByRole("button", { name: /PDF Lembar Timbang Gudang/i });

    expect(pdfFullBtn).toBeEnabled();
    expect(pdfBatchBtn).toBeEnabled();

    await user.click(pdfFullBtn);
    await user.click(pdfBatchBtn);

    expect(binSpy).toHaveBeenCalledTimes(2);
    expect(binSpy.mock.calls[0]![1]).toMatch(/-lengkap\.pdf$/);
    expect(binSpy.mock.calls[1]![1]).toMatch(/-batch\.pdf$/);

    // Near-Feasible -> Lembar Timbang Gudang terkunci, PDF Lengkap tetap aktif dengan peringatan
    rerender(
      <ExportDialog
        open
        onClose={vi.fn()}
        ingredients={MOCK_INGREDIENTS}
        requirement={MOCK_REQUIREMENTS[0]!}
        config={DEFAULT_CONFIG}
        result={{ ...optimalResult, status: "near_feasible" }}
      />,
    );
    expect(
      screen.getByText(/Mode Toleransi Target — Formula Mendekati Standar/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Dokumen bertanda kompromi nutrisi/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /PDF Lembar Timbang Gudang/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /PDF Lembar Formula Lengkap/i })).toBeEnabled();

    // Infeasible -> seluruh tombol PDF dinonaktifkan
    rerender(
      <ExportDialog
        open
        onClose={vi.fn()}
        ingredients={MOCK_INGREDIENTS}
        requirement={MOCK_REQUIREMENTS[0]!}
        config={DEFAULT_CONFIG}
        result={{
          ...optimalResult,
          status: "infeasible",
          costPerKg: null,
          batchTotalCost: null,
          composition: [],
        }}
      />,
    );
    expect(screen.getByRole("button", { name: /PDF Lembar Formula Lengkap/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /PDF Lembar Timbang Gudang/i })).toBeDisabled();
  });

  it("SavedRecipesPage: sederhana dengan ekspor PDF per resep, buka resep, dan hapus resep", async () => {
    const binSpy = vi.spyOn(downloadUtils, "downloadBinaryFile").mockImplementation(() => {});
    const onDeleteRecipe = vi.fn();
    const onLoadRecipe = vi.fn();
    const user = userEvent.setup();

    render(
      <SavedRecipesPage
        recipes={MOCK_SAVED_RECIPES}
        language="id"
        onLoadRecipe={onLoadRecipe}
        onOpenSaveCurrent={vi.fn()}
        onOpenExport={vi.fn()}
        onDeleteRecipe={onDeleteRecipe}
      />,
    );

    const pdfButtons = screen.getAllByRole("button", { name: /^Ekspor PDF$/i });
    expect(pdfButtons.length).toBe(MOCK_SAVED_RECIPES.length);
    await user.click(pdfButtons[0]!);
    expect(binSpy).toHaveBeenCalledTimes(1);
    expect(binSpy.mock.calls[0]![1]).toMatch(/\.pdf$/);

    const openButtons = screen.getAllByRole("button", { name: /^Buka$/i });
    await user.click(openButtons[0]!);
    expect(onLoadRecipe).toHaveBeenCalledWith(MOCK_SAVED_RECIPES[0]!.id);

    const firstDeleteBtn = screen.getByRole("button", {
      name: `Hapus resep ${MOCK_SAVED_RECIPES[0]!.name}`,
    });
    await user.click(firstDeleteBtn);
    expect(onDeleteRecipe).toHaveBeenCalledWith(MOCK_SAVED_RECIPES[0]!.id);
  });

  it("IngredientLibraryPage: mengelompokkan bahan ke 8 kelas standar tanpa tombol ekspor database", () => {
    render(
      <IngredientLibraryPage
        ingredients={MOCK_INGREDIENTS.slice(0, 20)}
        language="id"
        onToggleActive={vi.fn()}
        onOpenAdd={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /Ekspor CSV/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Impor CSV/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ekspor Excel/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ekspor PDF/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tambah Bahan/i })).toBeInTheDocument();

    expect(screen.getByRole("tab", { name: /1\. Hijauan Kering/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /4\. Sumber Energi/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /5\. Sumber Protein/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /8\. Aditif/i })).toBeInTheDocument();
  });

  it("IngredientDesktopTable: mendukung Paste TSV blok dari Excel/Sheets & abaikan tempelan skalar 1 sel", () => {
    const onBatchUpdate = vi.fn();
    const starterSubset = MOCK_INGREDIENTS.slice(0, 4);

    render(
      <IngredientDesktopTable
        ingredients={starterSubset}
        allIngredients={MOCK_INGREDIENTS}
        showAdvanceColumns={false}
        tableViewTier="standard"
        language="id"
        onUpdateIngredient={vi.fn()}
        onResetPriceOverride={vi.fn()}
        onOpenDetail={vi.fn()}
        onBatchIngredientsUpdate={onBatchUpdate}
      />,
    );

    const priceCornInput = screen.getByLabelText("Harga/kg Jagung Giling Kuning");

    // 1. Tempelan skalar tunggal -> tidak memanggil batch update
    fireEvent.paste(priceCornInput, {
      clipboardData: { getData: () => "6200" },
    });
    expect(onBatchUpdate).not.toHaveBeenCalled();

    // 2. Tempelan 2x2 TSV (Harga/kg + BK %) -> memperbarui 2 baris sekaligus
    fireEvent.paste(priceCornInput, {
      clipboardData: { getData: () => "6.100\t88,5\n9.300\t90" },
    });
    expect(onBatchUpdate).toHaveBeenCalledTimes(1);
    const updatedAll = onBatchUpdate.mock.calls[0]![0] as typeof MOCK_INGREDIENTS;
    expect(updatedAll.find((i) => i.id === "corn-ground")?.priceOverride).toBe(6100);
    expect(updatedAll.find((i) => i.id === "corn-ground")?.dryMatter).toBe(88.5);
    expect(updatedAll.find((i) => i.id === "sbm-44")?.priceOverride).toBe(9300);
    expect(screen.getByText(/4 sel ditempel dari spreadsheet/i)).toBeInTheDocument();
  });

  it("SettingsPage: mengelola Mode Simpel/Lanjutan, NDF, Anti-Nol Otomatis, Presisi LP, dan penyimpanan lokal", async () => {
    const onResetSampleData = vi.fn().mockResolvedValue(undefined);
    const onClearAllUserData = vi.fn().mockResolvedValue(undefined);
    const onExportAllBackup = vi.fn();
    const onToggleAdvance = vi.fn();
    const onToggleShowNdf = vi.fn();
    const onSetGlobalZeroInclusion = vi.fn();
    const onOpenPrecisionDialog = vi.fn();
    const user = userEvent.setup();

    render(
      <SettingsPage
        preferences={DEFAULT_PREFERENCES}
        onUpdate={vi.fn()}
        config={DEFAULT_CONFIG}
        onToggleAdvance={onToggleAdvance}
        onToggleShowNdf={onToggleShowNdf}
        onSetGlobalZeroInclusion={onSetGlobalZeroInclusion}
        onOpenPrecisionDialog={onOpenPrecisionDialog}
        storageStats={{
          storageMode: "indexeddb",
          ingredientCount: 23,
          requirementCount: 25,
          recipeCount: 3,
          estimatedBytes: 42500,
        }}
        onExportAllBackup={onExportAllBackup}
        onResetSampleData={onResetSampleData}
        onClearAllUserData={onClearAllUserData}
      />,
    );

    expect(screen.getByText(/Desimal Tampilan Angka/i)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Pengaturan Lanjutan/i }));
    expect(screen.getByText(/Penyimpanan Lokal Aktif/i)).toBeInTheDocument();
    expect(screen.getByText(/23 bahan/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mode Lanjutan" }));
    expect(onToggleAdvance).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole("switch", { name: /Tampilkan Parameter NDF dan ADF/i }));
    expect(onToggleShowNdf).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole("switch", { name: /Aktifkan Aturan Anti-Nol Otomatis/i }));
    expect(onSetGlobalZeroInclusion).toHaveBeenCalledWith(false, 1);

    await user.click(screen.getByRole("button", { name: /Atur Presisi LP/i }));
    expect(onOpenPrecisionDialog).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /Unduh Cadangan Data/i }));
    expect(onExportAllBackup).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /Reset Data Bawaan/i }));
    expect(onResetSampleData).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /Hapus Semua Data Lokal/i }));
    expect(onClearAllUserData).not.toHaveBeenCalled();

    const confirmBtn = within(screen.getByRole("alert")).getByRole("button", {
      name: /Konfirmasi Hapus Permanen/i,
    });
    await user.click(confirmBtn);
    expect(onClearAllUserData).toHaveBeenCalledTimes(1);
  });
});
