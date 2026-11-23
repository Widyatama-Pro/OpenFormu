import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddEditIngredientModal } from "../../src/components/database/AddEditIngredientModal";
import { IngredientLibraryPage } from "../../src/components/database/IngredientLibraryPage";
import { RequirementLibraryPage } from "../../src/components/database/RequirementLibraryPage";
import { ExportDialog } from "../../src/components/recipes/ExportDialog";
import { SaveRecipeDialog } from "../../src/components/recipes/SaveRecipeDialog";
import { SavedRecipesPage } from "../../src/components/recipes/SavedRecipesPage";
import {
  DEFAULT_CONFIG,
  MOCK_INGREDIENTS,
  MOCK_NUTRIENTS,
  MOCK_REQUIREMENTS,
  MOCK_SAVED_RECIPES,
  evaluateMockFormulation,
} from "../../src/data/mock-state";
import * as storageModule from "../../src/storage";
import { THEME_STORAGE_KEYS, ThemeProvider } from "../../src/theme";
import type { FormulationResult } from "../../src/types";

function mockViewport(width: number): () => void {
  const origWidthDescriptor = Object.getOwnPropertyDescriptor(window, "innerWidth");
  const origMatchMediaDescriptor = Object.getOwnPropertyDescriptor(window, "matchMedia");
  Object.defineProperty(window, "innerWidth", {
    value: width,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: width < 768 && query === "(max-width: 767px)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  return () => {
    if (origWidthDescriptor) {
      Object.defineProperty(window, "innerWidth", origWidthDescriptor);
    }
    if (origMatchMediaDescriptor) {
      Object.defineProperty(window, "matchMedia", origMatchMediaDescriptor);
    } else {
      Reflect.deleteProperty(window, "matchMedia");
    }
  };
}

describe("M3 Slice 2: Database Bahan, Standar Nutrien, Resep Tersimpan & Dialog Ekspor (Anti-Slop)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("IngredientLibraryPage: popover Kolom aksesibel (focus trap, Escape/Tutup restore focus, 375px modal sheet), empty DB CTA & error PDF role=alert", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiMode, "anti-slop");

    const pdfSpy = vi
      .spyOn(storageModule, "generateIngredientDatabasePdf")
      .mockImplementation(() => {
        throw new Error("PDF font tidak tersedia");
      });

    const onOpenAdd = vi.fn();
    render(
      <ThemeProvider>
        <IngredientLibraryPage
          ingredients={MOCK_INGREDIENTS.slice(0, 6)}
          allNutrients={MOCK_NUTRIENTS}
          language="id"
          onToggleActive={vi.fn()}
          onOpenAdd={onOpenAdd}
        />
      </ThemeProvider>,
    );

    // Popover Kolom a11y
    const trigger = screen.getByRole("button", { name: /Kolom/i });
    expect(trigger.className).toContain("min-h-11");
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: /Pilih kolom database yang ditampilkan/i });
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);

    // Close button restores focus
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: /Tutup pengatur kolom/i }));
    expect(document.activeElement).toBe(trigger);

    // Mobile 375px sheet modal
    const restoreViewport = mockViewport(375);
    try {
      await user.click(trigger);
      const mobileDialog = screen.getByRole("dialog", {
        name: /Pilih kolom database yang ditampilkan/i,
      });
      expect(mobileDialog).toHaveAttribute("aria-modal", "true");
      await user.keyboard("{Escape}");
    } finally {
      restoreViewport();
    }

    // Export PDF failure renders role=alert + min-h-11 Tutup button
    await user.click(screen.getByRole("button", { name: /Ekspor PDF/i }));
    expect(pdfSpy).toHaveBeenCalled();
    const alertBox = screen.getByRole("alert");
    expect(alertBox).toHaveTextContent(/PDF font tidak tersedia/i);
    expect(within(alertBox).getByRole("button", { name: "Tutup" }).className).toContain("min-h-11");

    // Scroll buttons 44px on mobile
    expect(screen.getByRole("button", { name: /Geser tab kelas ke kiri/i }).className).toContain(
      "h-11",
    );
    expect(screen.getByRole("button", { name: /Geser tab kelas ke kanan/i }).className).toContain(
      "h-11",
    );

    // Empty database CTA
    render(
      <ThemeProvider>
        <IngredientLibraryPage
          ingredients={[]}
          allNutrients={MOCK_NUTRIENTS}
          language="id"
          onToggleActive={vi.fn()}
          onOpenAdd={onOpenAdd}
        />
      </ThemeProvider>,
    );
    expect(screen.getByText(/Database bahan pakan masih kosong/i)).toBeInTheDocument();
  });

  it("RequirementLibraryPage: bebas U+2014, tombol Use/Gunakan min-h-11, empty filter CTA & form htmlFor/validasi role=alert", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiMode, "anti-slop");

    const onSelectAndUse = vi.fn();
    const { container } = render(
      <ThemeProvider>
        <RequirementLibraryPage
          requirements={MOCK_REQUIREMENTS}
          activeRequirementId={MOCK_REQUIREMENTS[0]!.id}
          language="id"
          onSelectAndUse={onSelectAndUse}
          onCreateProfile={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(container.textContent).not.toContain("\u2014");

    const useButtons = screen.getAllByRole("button", { name: /Gunakan|Aktif/i });
    expect(useButtons[0]!.className).toContain("min-h-11");
    expect(useButtons[0]!.className).toContain("min-w-11");

    // Empty search -> Reset Filter CTA
    const searchInput = screen.getByRole("searchbox");
    await user.type(searchInput, "tidak-ada-standar-ini-xyz");
    expect(screen.getByText(/Tidak ada standar kebutuhan ternak yang cocok/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Reset Filter/i }));
    expect(
      screen.queryByText(/Tidak ada standar kebutuhan ternak yang cocok/i),
    ).not.toBeInTheDocument();

    // Create profile dialog: htmlFor label binding & empty submit error role=alert
    await user.click(screen.getByRole("button", { name: /Buat Profil Baru/i }));
    const nameInput = screen.getByLabelText(/Nama Profil/i);
    expect(nameInput.id).not.toBe("");
    await user.click(screen.getByRole("button", { name: /Buat & Pakai/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Nama profil kebutuhan wajib diisi/i);
  });

  it("SavedRecipesPage, SaveRecipeDialog, AddEditIngredientModal & ExportDialog memenuhi kontrak R-27, A11y label & anti-slop tanpa em-dash", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiMode, "anti-slop");

    vi.spyOn(storageModule, "generateRecipePdf").mockImplementation(() => {
      throw new Error("Gagal cetak resep");
    });

    const onOpenSaveCurrent = vi.fn();
    const { rerender } = render(
      <ThemeProvider>
        <SavedRecipesPage
          recipes={[]}
          language="id"
          onLoadRecipe={vi.fn()}
          onOpenSaveCurrent={onOpenSaveCurrent}
          onOpenExport={vi.fn()}
          onDeleteRecipe={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText(/Belum ada resep tersimpan/i)).toBeInTheDocument();
    const saveBtns = screen.getAllByRole("button", { name: /Simpan Sesi Saat Ini/i });
    expect(saveBtns.length).toBeGreaterThanOrEqual(2);
    await user.click(saveBtns[1]!);
    expect(onOpenSaveCurrent).toHaveBeenCalledTimes(1);

    rerender(
      <ThemeProvider>
        <SavedRecipesPage
          recipes={MOCK_SAVED_RECIPES}
          language="id"
          onLoadRecipe={vi.fn()}
          onOpenSaveCurrent={onOpenSaveCurrent}
          onOpenExport={vi.fn()}
          onDeleteRecipe={vi.fn()}
        />
      </ThemeProvider>,
    );

    const exportBtns = screen.getAllByRole("button", { name: /Ekspor PDF/i });
    await user.click(exportBtns[1]!);
    expect(screen.getByRole("alert")).toHaveTextContent(/Gagal cetak resep/i);

    // SaveRecipeDialog syncs defaultName on open & binds htmlFor/id
    const { rerender: rerenderSave } = render(
      <ThemeProvider>
        <SaveRecipeDialog
          open
          defaultName="Ransum Awal"
          language="id"
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      </ThemeProvider>,
    );
    const saveNameInput = screen.getByLabelText(/Nama Resep/i);
    expect(saveNameInput).toHaveValue("Ransum Awal");
    rerenderSave(
      <ThemeProvider>
        <SaveRecipeDialog
          open={false}
          defaultName="Ransum Awal"
          language="id"
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      </ThemeProvider>,
    );
    rerenderSave(
      <ThemeProvider>
        <SaveRecipeDialog
          open
          defaultName="Ransum Layer Baru"
          language="id"
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText(/Nama Resep/i)).toHaveValue("Ransum Layer Baru");

    // AddEditIngredientModal clears error on close/reopen and binds htmlFor
    const { rerender: rerenderAdd } = render(
      <ThemeProvider>
        <AddEditIngredientModal open language="id" onClose={vi.fn()} onSave={vi.fn()} />
      </ThemeProvider>,
    );
    const feedNameInput = screen.getByLabelText(/^Nama Bahan$/i);
    expect(feedNameInput.id).not.toBe("");
    await user.click(screen.getByRole("button", { name: /Simpan Bahan/i }));
    const addModalDialog = screen.getByRole("dialog", { name: /Tambah Bahan Pakan/i });
    expect(within(addModalDialog).getByRole("alert")).toHaveTextContent(/Nama bahan wajib diisi/i);

    rerenderAdd(
      <ThemeProvider>
        <AddEditIngredientModal open={false} language="id" onClose={vi.fn()} onSave={vi.fn()} />
      </ThemeProvider>,
    );
    rerenderAdd(
      <ThemeProvider>
        <AddEditIngredientModal open language="id" onClose={vi.fn()} onSave={vi.fn()} />
      </ThemeProvider>,
    );
    await waitFor(() => {
      expect(screen.queryByText(/Nama bahan wajib diisi/i)).not.toBeInTheDocument();
    });

    // ExportDialog in anti-slop: zero U+2014, no glass-card, uses disabled:cursor-not-allowed
    const nearRes: FormulationResult = {
      ...evaluateMockFormulation(MOCK_INGREDIENTS, MOCK_REQUIREMENTS[0]!, DEFAULT_CONFIG),
      status: "near_feasible",
    };
    render(
      <ThemeProvider>
        <ExportDialog
          open
          onClose={vi.fn()}
          ingredients={MOCK_INGREDIENTS}
          requirement={MOCK_REQUIREMENTS[0]!}
          config={DEFAULT_CONFIG}
          result={nearRes}
          language="id"
        />
      </ThemeProvider>,
    );
    const exportDialog = screen.getByRole("dialog", { name: /Ekspor Laporan PDF/i });
    expect(exportDialog.textContent).not.toContain("\u2014");
    expect(exportDialog.innerHTML).not.toContain("glass-card");
    const batchBtn = within(exportDialog).getByRole("button", {
      name: /PDF Lembar Timbang Gudang/i,
    });
    expect(batchBtn).toBeDisabled();
    expect(batchBtn.className).toContain("disabled:cursor-not-allowed");
    expect(batchBtn.className).not.toContain("disabled:pointer-events-none");
  });
});
