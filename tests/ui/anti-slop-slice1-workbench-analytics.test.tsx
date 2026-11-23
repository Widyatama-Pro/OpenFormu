import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { BatchMixerCalculator } from "../../src/components/analytics/BatchMixerCalculator";
import { ConflictDiagnosticsBanner } from "../../src/components/analytics/ConflictDiagnosticsBanner";
import { FormulationCharts } from "../../src/components/analytics/FormulationCharts";
import { ResultsPanel } from "../../src/components/analytics/ResultsPanel";
import { ShadowPriceTab } from "../../src/components/analytics/ShadowPriceTab";
import { WhatIfManualLock } from "../../src/components/analytics/WhatIfManualLock";
import { IngredientDesktopTable } from "../../src/components/formulation/IngredientDesktopTable";
import { IngredientDetailSheet } from "../../src/components/formulation/IngredientDetailSheet";
import { NutrientTargetsPanel } from "../../src/components/formulation/NutrientTargetsPanel";
import { PrecisionEngineDialog } from "../../src/components/formulation/PrecisionEngineDialog";
import { RatioConstraintsSection } from "../../src/components/formulation/RatioConstraintsSection";
import { WorkbenchToolbar } from "../../src/components/formulation/WorkbenchToolbar";
import { SettingsPage } from "../../src/components/settings/SettingsPage";
import { ThemeSwitcherMenu } from "../../src/components/settings/ThemeSwitcherMenu";
import { HARTADI_FEEDS } from "../../src/data/hartadi-feeds";
import {
  DEFAULT_CONFIG,
  DEFAULT_PREFERENCES,
  MOCK_INGREDIENTS,
  MOCK_NUTRIENTS,
  MOCK_REQUIREMENTS,
  evaluateMockFormulation,
} from "../../src/data/mock-state";
import * as solverModule from "../../src/solver";
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

describe("M3 Slice 1: Formulasi, Analitik, Pengaturan, Salinan Tanpa Em-Dash & A11y Popover", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("menghilangkan U+2014 (em-dash) di Slice 1 & Hartadi feeds saat uiMode=anti-slop tanpa mengubah data nutrien", () => {
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiMode, "anti-slop");

    const cornHartadi = HARTADI_FEEDS.find((item) => item.name.includes("Jagung Kuning Biji BK"));
    expect(cornHartadi).toBeDefined();
    expect(cornHartadi?.name).toBe("Jagung Kuning Biji BK (Hartadi)");
    expect(cornHartadi?.name).not.toContain("\u2014");
    expect(cornHartadi?.dryMatter).toBeGreaterThan(80);

    const { container } = render(<App />);
    expect(container.textContent).not.toContain("\u2014");

    const req = MOCK_REQUIREMENTS[0]!;
    const evalRes = evaluateMockFormulation(MOCK_INGREDIENTS, req, DEFAULT_CONFIG);
    const emptyResult: FormulationResult = {
      ...evalRes,
      status: "infeasible",
      costPerKg: 0,
      batchTotalCost: 0,
      composition: [],
      conflicts: [
        {
          code: "NUTRIENT_UNREACHABLE",
          severity: "error",
          targetId: "cp",
          message: "Protein terlalu tinggi untuk kombinasi bahan aktif",
          suggestion: "Tambahkan bungkil kedelai",
        },
      ],
    };

    const { container: analyticsContainer } = render(
      <ThemeProvider>
        <div>
          <ConflictDiagnosticsBanner
            status="infeasible"
            conflicts={emptyResult.conflicts ?? []}
            messages={["Konflik target nutrien"]}
            language="id"
          />
          <RatioConstraintsSection
            ratios={[
              {
                id: "ca_p",
                numerator: "ca",
                denominator: "avp",
                min: 1.8,
                max: 2.2,
              },
            ]}
            achievedMap={new Map()}
            language="id"
          />
          <ResultsPanel
            result={emptyResult}
            ingredients={MOCK_INGREDIENTS}
            allNutrients={MOCK_NUTRIENTS}
            requirement={req}
            config={DEFAULT_CONFIG}
            language="id"
            onSetBatchSize={vi.fn()}
            onToggleElastic={vi.fn()}
            onSetManualLock={vi.fn()}
            onClearManualLocks={vi.fn()}
          />
        </div>
      </ThemeProvider>,
    );
    expect(analyticsContainer.textContent).not.toContain("\u2014");
  });

  it("FormulationCharts menampilkan judul berbasis pertanyaan & radar SVG diperbesar di anti-slop, namun menjaga judul Enhanced", () => {
    const req = MOCK_REQUIREMENTS[0]!;
    const evalRes = evaluateMockFormulation(MOCK_INGREDIENTS, req, DEFAULT_CONFIG);

    window.localStorage.setItem(THEME_STORAGE_KEYS.uiMode, "enhanced");
    const { rerender, container } = render(
      <ThemeProvider>
        <FormulationCharts
          composition={evalRes.composition}
          nutrients={evalRes.nutrients}
          allNutrients={MOCK_NUTRIENTS}
          ingredients={MOCK_INGREDIENTS}
          batchTotalCost={evalRes.batchTotalCost ?? null}
          language="id"
        />
      </ThemeProvider>,
    );
    expect(screen.getByText("Radar Target Ideal vs Aktual")).toBeInTheDocument();
    expect(screen.getByText("Porsi Berat (%) vs Porsi Biaya (%)")).toBeInTheDocument();

    window.localStorage.clear();
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiMode, "anti-slop");
    rerender(
      <ThemeProvider key="anti-slop-charts">
        <FormulationCharts
          composition={evalRes.composition}
          nutrients={evalRes.nutrients}
          allNutrients={MOCK_NUTRIENTS}
          ingredients={MOCK_INGREDIENTS}
          batchTotalCost={evalRes.batchTotalCost ?? null}
          language="id"
        />
      </ThemeProvider>,
    );

    expect(screen.getByText("Seberapa Dekat Hasil Aktual ke Target Ideal?")).toBeInTheDocument();
    expect(
      screen.getByText("Bahan Mana yang Paling Menguras Biaya vs Porsi Berat?"),
    ).toBeInTheDocument();
    const radarSvg = container.querySelector('svg[viewBox="-12 -12 204 204"]');
    expect(radarSvg).not.toBeNull();
    expect(radarSvg?.getAttribute("class")).toContain("h-44");
    expect(container.textContent).not.toContain("\u2014");

    // Empty state eksplisit saat composition & nutrients kosong
    render(
      <ThemeProvider>
        <FormulationCharts
          composition={[]}
          nutrients={[]}
          allNutrients={MOCK_NUTRIENTS}
          ingredients={MOCK_INGREDIENTS}
          batchTotalCost={null}
          language="id"
        />
      </ThemeProvider>,
    );
    expect(
      screen.getByText(/Aktifkan minimal 3 batasan nutrien untuk menampilkan Radar Chart/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Belum ada komposisi bahan aktif/i)).toBeInTheDocument();
    expect(screen.getByText(/Belum ada batasan target nutrien aktif/i)).toBeInTheDocument();
  });

  it("IngredientDesktopTable popover Kolom memindahkan fokus, menjebak Tab, mengembalikan fokus saat Escape/Tutup, dan menjadi modal sheet pada 375px", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiMode, "anti-slop");

    const req = MOCK_REQUIREMENTS[0]!;
    const evalRes = evaluateMockFormulation(MOCK_INGREDIENTS, req, DEFAULT_CONFIG);

    render(
      <ThemeProvider>
        <IngredientDesktopTable
          ingredients={MOCK_INGREDIENTS.slice(0, 4)}
          allIngredients={MOCK_INGREDIENTS}
          allNutrients={MOCK_NUTRIENTS}
          composition={evalRes.composition}
          activeSpecies={req.species}
          showAdvanceColumns={false}
          language="id"
          onUpdateIngredient={vi.fn()}
          onResetPriceOverride={vi.fn()}
          onOpenDetail={vi.fn()}
        />
      </ThemeProvider>,
    );

    const trigger = screen.getByRole("button", { name: /Kolom/i });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: /Pilih kolom tabel yang ditampilkan/i });
    expect(dialog.contains(document.activeElement)).toBe(true);

    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: /Pilih kolom/i })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);

    // Tutup lewat tombol close eksplisit juga mengembalikan fokus ke trigger
    await user.click(trigger);
    const closeBtn = screen.getByRole("button", { name: /Tutup pengatur kolom/i });
    await user.click(closeBtn);
    expect(document.activeElement).toBe(trigger);

    // Mobile 375px sheet
    const restoreViewport = mockViewport(375);
    try {
      await user.click(trigger);
      const mobileDialog = screen.getByRole("dialog", {
        name: /Pilih kolom tabel yang ditampilkan/i,
      });
      expect(mobileDialog).toHaveAttribute("aria-modal", "true");
    } finally {
      restoreViewport();
    }
  });

  it("Slice 1 menyediakan empty state, error state (role=alert), label target sentuh >=44px, dan bebas elemen dekoratif slop di anti-slop", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiMode, "anti-slop");

    const req = MOCK_REQUIREMENTS[0]!;
    const evalRes = evaluateMockFormulation(MOCK_INGREDIENTS, req, DEFAULT_CONFIG);
    const ladderSpy = vi
      .spyOn(solverModule, "computeCriticalPriceLadder")
      .mockImplementation(() => {
        throw new Error("Simulasi gagal kurva harga");
      });

    const singleCorn = MOCK_INGREDIENTS.map((i) => ({
      ...i,
      isActive: i.id === "corn-ground",
    }));

    const { container } = render(
      <ThemeProvider>
        <div>
          <BatchMixerCalculator
            batchSizeKg={100}
            onSetBatchSize={vi.fn()}
            composition={[]}
            ingredients={MOCK_INGREDIENTS}
            activeBasis="as_fed"
            language="id"
          />
          <WhatIfManualLock
            ingredients={MOCK_INGREDIENTS.map((i) => ({ ...i, isActive: false }))}
            composition={[]}
            manualLocks={{}}
            language="id"
            onSetManualLock={vi.fn()}
            onClearLocks={vi.fn()}
          />
          <ShadowPriceTab
            nutrients={[]}
            allNutrients={MOCK_NUTRIENTS}
            composition={[]}
            opportunityCosts={[]}
            boundDuals={[]}
            ingredients={MOCK_INGREDIENTS}
            requirement={req}
            config={DEFAULT_CONFIG}
            language="id"
          />
          <ShadowPriceTab
            nutrients={evalRes.nutrients}
            allNutrients={MOCK_NUTRIENTS}
            composition={evalRes.composition}
            opportunityCosts={evalRes.opportunityCosts ?? []}
            boundDuals={evalRes.boundDuals ?? []}
            ingredients={MOCK_INGREDIENTS}
            requirement={req}
            config={DEFAULT_CONFIG}
            language="id"
          />
          <NutrientTargetsPanel
            requirement={req}
            allNutrients={MOCK_NUTRIENTS}
            allIngredients={singleCorn}
            config={DEFAULT_CONFIG}
            result={evaluateMockFormulation(singleCorn, req, DEFAULT_CONFIG)}
            activeBasis="as_fed"
            targetInputMode="range"
            onChangeTargetInputMode={vi.fn()}
            onActivateSuggestedIngredient={vi.fn()}
            enableAdvance={false}
            enableDigestible={false}
            onToggleDigestible={vi.fn()}
            nutrientResults={evalRes.nutrients}
            conflicts={[]}
            language="id"
            onUpdateConstraint={vi.fn()}
          />
          <ThemeSwitcherMenu language="id" />
          <PrecisionEngineDialog
            open
            onClose={vi.fn()}
            config={DEFAULT_CONFIG}
            allNutrients={MOCK_NUTRIENTS}
            language="id"
            focusSection="stochastic"
            onUpdatePrecision={vi.fn()}
          />
        </div>
      </ThemeProvider>,
    );

    // BatchMixer & WhatIf & ShadowPrice empty state + ladder error alert
    expect(screen.getByText(/Belum ada komposisi adukan untuk ditimbang/i)).toBeInTheDocument();
    expect(screen.getByText(/Belum ada bahan aktif untuk dikunci/i)).toBeInTheDocument();
    expect(screen.getByText(/Belum ada kendala nutrien yang dievaluasi/i)).toBeInTheDocument();
    const ladderBtns = screen.getAllByRole("button", { name: /Hitung Tangga Harga/i });
    await user.click(ladderBtns[1]!);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/Simulasi gagal kurva harga/i);
    });
    expect(ladderSpy).toHaveBeenCalled();

    // ThemeSwitcherMenu tombol < dan > memiliki h-11 w-11
    const prevPaletteBtn = screen.getByRole("button", { name: /Tema sebelumnya/i });
    const nextPaletteBtn = screen.getByRole("button", { name: /Tema berikutnya/i });
    expect(prevPaletteBtn.className).toContain("h-11");
    expect(prevPaletteBtn.className).toContain("w-11");
    expect(nextPaletteBtn.className).toContain("h-11");
    expect(nextPaletteBtn.className).toContain("w-11");

    // PrecisionEngineDialog memakai ring-[var(--color-primary)] (bukan accent) di anti-slop
    const dialog = screen.getByRole("dialog");
    expect(dialog.innerHTML).toContain("ring-[var(--color-primary)]");
    expect(dialog.innerHTML).not.toContain("ring-[var(--color-accent)]");
    expect(container.textContent).not.toContain("\u2014");

    // SettingsPage async reset error & busy label
    let rejectReset!: (err: Error) => void;
    const resetPromise = new Promise<void>((_, reject) => {
      rejectReset = reject;
    });
    render(
      <ThemeProvider>
        <SettingsPage
          preferences={DEFAULT_PREFERENCES}
          onUpdate={vi.fn()}
          storageStats={{
            storageMode: "indexeddb",
            ingredientCount: 10,
            requirementCount: 5,
            recipeCount: 2,
            estimatedBytes: 2048,
          }}
          onResetSampleData={() => resetPromise}
        />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("tab", { name: /Lanjutan/i }));
    const resetBtn = screen.getByRole("button", { name: /Reset Data Bawaan/i });
    await user.click(resetBtn);
    expect(screen.getByRole("button", { name: /Mereset\.\.\./i })).toBeDisabled();

    rejectReset(new Error("IndexedDB terkunci"));
    await waitFor(() => {
      const alerts = screen.getAllByRole("alert");
      expect(alerts.some((el) => /IndexedDB terkunci/.test(el.textContent ?? ""))).toBe(true);
    });
  });

  it("memastikan tombol mobile >=44px (BK/DM, No, Set N/A) dan kartu modal non-glass-card di anti-slop", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiMode, "anti-slop");

    const req = MOCK_REQUIREMENTS[0]!;
    const evalRes = evaluateMockFormulation(MOCK_INGREDIENTS, req, DEFAULT_CONFIG);
    const singleCorn = MOCK_INGREDIENTS.map((i) => ({
      ...i,
      isActive: i.id === "corn-ground",
    }));
    const singleCornEval = evaluateMockFormulation(singleCorn, req, DEFAULT_CONFIG);
    const invalidBoundsIngredient = {
      ...MOCK_INGREDIENTS[0]!,
      inclusion: { min: 40, max: 20 },
    };

    const { rerender } = render(
      <ThemeProvider>
        <div>
          <WorkbenchToolbar
            requirements={MOCK_REQUIREMENTS}
            activeRequirement={req}
            config={DEFAULT_CONFIG}
            result={evalRes}
            language="id"
            inspectorOpen={false}
            onToggleInspector={vi.fn()}
            onSelectPreset={vi.fn()}
            onApplyDynamicRequirement={vi.fn()}
            onSetBasis={vi.fn()}
            onSetMode={vi.fn()}
            onToggleElastic={vi.fn()}
            onOpenSaveDialog={vi.fn()}
            onOpenExportDialog={vi.fn()}
            onResetMock={vi.fn()}
          />
          <NutrientTargetsPanel
            requirement={{
              ...req,
              dynamicCalculation: {
                standardName: "NRC Beef 2000",
                method: "interpolated",
                inputsSummaryId: "BB 300 kg",
                inputsSummaryEn: "BW 300 kg",
                dmiKg: 8.57,
                steps: [
                  {
                    nutrientId: "cp",
                    labelId: "Protein Kasar",
                    labelEn: "Crude Protein",
                    dailyAmountLabel: "1.20 kg/hari",
                    resultLabel: "14.0%",
                    formulaText: "1.20 / 8.57",
                  },
                ],
              },
            }}
            allNutrients={MOCK_NUTRIENTS}
            allIngredients={singleCorn}
            config={DEFAULT_CONFIG}
            result={singleCornEval}
            activeBasis="as_fed"
            targetInputMode="range"
            onChangeTargetInputMode={vi.fn()}
            onActivateSuggestedIngredient={vi.fn()}
            enableAdvance={false}
            enableDigestible={false}
            onToggleDigestible={vi.fn()}
            nutrientResults={singleCornEval.nutrients}
            conflicts={[]}
            language="en"
            onUpdateConstraint={vi.fn()}
          />
          <IngredientDetailSheet
            ingredient={invalidBoundsIngredient}
            allNutrients={MOCK_NUTRIENTS}
            open
            onClose={vi.fn()}
            onUpdate={vi.fn()}
            onResetPrice={vi.fn()}
            language="id"
          />
        </div>
      </ThemeProvider>,
    );

    // 1. WorkbenchToolbar basis toggle button ("BK" / "DM") carries min-w-11
    const basisGroupId = screen.getByRole("group", {
      name: /Pilih basis As-Fed atau Bahan Kering/i,
    });
    const basisButtonsId = basisGroupId.querySelectorAll("button");
    expect(basisButtonsId).toHaveLength(2);
    expect(basisButtonsId[1]?.className).toContain("min-w-11");
    expect(basisButtonsId[1]?.className).toContain("sm:min-w-0");

    // 2. NutrientTargetsPanel EN "No" dismiss button carries min-w-11 & dynamic step uses solid bg
    const noButtons = screen.getAllByRole("button", { name: /^Dismiss /i });
    expect(noButtons.length).toBeGreaterThan(0);
    for (const btn of noButtons) {
      expect(btn.className).toContain("min-w-11");
    }
    await user.click(
      screen.getByRole("button", { name: /Toggle dynamic nutrient calculation breakdown/i }),
    );
    const stepBox = screen.getByText("14.0%").closest("div.rounded-lg");
    expect(stepBox?.className).toContain("bg-[var(--bg-sunken)]");
    expect(stepBox?.className).not.toContain("bg-[var(--bg-sunken)]/60");

    // 3. IngredientDetailSheet "Set N/A" buttons carry min-w-11 and "Harga & Batas" uses modal-section-card + danger border
    const setNaButtons = screen.getAllByRole("button", { name: "Set N/A" });
    expect(setNaButtons.length).toBeGreaterThan(0);
    for (const btn of setNaButtons) {
      expect(btn.className).toContain("min-w-11");
      expect(btn.className).toContain("min-h-11");
    }

    await user.click(screen.getByRole("tab", { name: /Harga & Batas/i }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector(".glass-card")).toBeNull();
    const minLimitCard = screen.getByText("Batas Min (%)").closest("div.modal-section-card");
    expect(minLimitCard).not.toBeNull();
    expect(minLimitCard?.className).toContain("rounded-xl");
    expect(minLimitCard?.className).toContain("border-[var(--status-danger-border)]");

    // Verify EN basis label also carries min-w-11
    rerender(
      <ThemeProvider>
        <WorkbenchToolbar
          requirements={MOCK_REQUIREMENTS}
          activeRequirement={req}
          config={DEFAULT_CONFIG}
          result={evalRes}
          language="en"
          inspectorOpen={false}
          onToggleInspector={vi.fn()}
          onSelectPreset={vi.fn()}
          onApplyDynamicRequirement={vi.fn()}
          onSetBasis={vi.fn()}
          onSetMode={vi.fn()}
          onToggleElastic={vi.fn()}
          onOpenSaveDialog={vi.fn()}
          onOpenExportDialog={vi.fn()}
          onResetMock={vi.fn()}
        />
      </ThemeProvider>,
    );
    const basisGroupEn = screen.getByRole("group", {
      name: /Select As-Fed or Dry Matter basis/i,
    });
    const basisButtonsEn = basisGroupEn.querySelectorAll("button");
    expect(basisButtonsEn[1]?.className).toContain("min-w-11");
  });
});
