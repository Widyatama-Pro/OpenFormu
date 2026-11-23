import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormulationCharts } from "../../src/components/analytics/FormulationCharts";
import { NutrientTargetsPanel } from "../../src/components/formulation/NutrientTargetsPanel";
import { MobileNavDrawer } from "../../src/components/layout/MobileNavDrawer";
import {
  GITHUB_RELEASES_URL,
  GITHUB_REPO_URL,
  SettingsPage,
} from "../../src/components/settings/SettingsPage";
import { ThemeSwitcherMenu } from "../../src/components/settings/ThemeSwitcherMenu";
import {
  DEFAULT_CONFIG,
  DEFAULT_PREFERENCES,
  MOCK_INGREDIENTS,
  MOCK_NUTRIENTS,
  MOCK_REQUIREMENTS,
  evaluateMockFormulation,
} from "../../src/data/mock-state";
import { ThemeProvider } from "../../src/theme";
import {
  computeDynamicBeefRequirement,
  computeDynamicDairyRequirement,
} from "../../src/utils/cattle-requirements";
import { isTauriRuntime, openExternalUrl } from "../../src/utils/external-link";

describe("Revisi 6 — OpenFormu Branding, Dynamic 2-Decimal Target Details, Simplified Settings & Mobile Contrast", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it("R6-01: Dynamic beef & dairy calculators memproduksi 2 desimal presisi & metadata dynamicCalculation", () => {
    const beef = computeDynamicBeefRequirement({
      bodyWeightKg: 350,
      adgKgPerDay: 1.0,
      physiologicalState: "growth",
    });
    expect(beef.requirement.dynamicCalculation).toBeDefined();
    expect(beef.requirement.dynamicCalculation!.steps.length).toBeGreaterThanOrEqual(6);
    const beefTdn = beef.requirement.constraints.find((c) => c.nutrientId === "tdn")!;
    expect(beefTdn.min).toBeDefined();
    expect(Math.round((beefTdn.min! * 100) % 100)).toBeGreaterThanOrEqual(0);

    const dairy = computeDynamicDairyRequirement({
      bodyWeightKg: 500,
      milkKgPerDay: 20,
      fatPct: 3.9,
      standard: "nrc_1988",
    });
    expect(dairy.requirement.dynamicCalculation).toBeDefined();
    expect(dairy.requirement.dynamicCalculation!.fcm4PctKg).toBeGreaterThan(15);
    expect(dairy.requirement.dynamicCalculation!.steps.some((s) => s.nutrientId === "fcm")).toBe(
      true,
    );
  });

  it("R6-02: NutrientTargetsPanel mendukung toggle detail 2 desimal (0,00) & panel Rincian Hitung untuk preset dinamis", async () => {
    const user = userEvent.setup();
    const beefDyn = computeDynamicBeefRequirement({
      bodyWeightKg: 350,
      adgKgPerDay: 0.9,
      physiologicalState: "growth",
    }).requirement;
    const beefConfig = { ...DEFAULT_CONFIG, activeBasis: "dry_matter" as const };
    const evalRes = evaluateMockFormulation(MOCK_INGREDIENTS, beefDyn, beefConfig);

    render(
      <NutrientTargetsPanel
        requirement={beefDyn}
        allNutrients={MOCK_NUTRIENTS}
        allIngredients={MOCK_INGREDIENTS}
        config={beefConfig}
        result={evalRes}
        activeBasis="dry_matter"
        targetInputMode="range"
        enableAdvance={false}
        decimalPlaces={0}
        simpleMode
        enableDigestible={false}
        onToggleDigestible={vi.fn()}
        nutrientResults={evalRes.nutrients}
        conflicts={[]}
        language="id"
        onUpdateConstraint={vi.fn()}
      />,
    );

    const decimalToggle = screen.getByRole("button", { name: /Tampilkan detail 2 angka/i });
    const calcToggle = screen.getByRole("button", { name: /rincian hitung/i });
    expect(decimalToggle).toHaveAttribute("aria-pressed", "false");
    expect(calcToggle).toHaveAttribute("aria-pressed", "false");

    await user.click(decimalToggle);
    expect(decimalToggle).toHaveAttribute("aria-pressed", "true");
    // Minimal 1 nilai aktual memakai format 2 desimal ",xx" setelah 0,00 diaktifkan
    const actualPills = document.querySelectorAll(".acrylic-value-pill");
    const hasTwoDecimals = Array.from(actualPills).some((el) =>
      /,\d{2}$/.test(el.textContent ?? ""),
    );
    expect(hasTwoDecimals).toBe(true);

    await user.click(calcToggle);
    expect(calcToggle).toHaveAttribute("aria-pressed", "true");
    const breakdown = screen.getByRole("region", {
      name: /Rincian Perhitungan Kebutuhan Dinamis/i,
    });
    expect(within(breakdown).getByText(/Kearl \(1982\) Table 14/i)).toBeInTheDocument();
    expect(within(breakdown).getByText(/Konsumsi Bahan Kering \(DMI\)/i)).toBeInTheDocument();
  });

  it("R6-03: Preset non-dinamis menyembunyikan tombol Rincian Hitung", () => {
    const req = MOCK_REQUIREMENTS[0]!;
    const evalRes = evaluateMockFormulation(MOCK_INGREDIENTS, req, DEFAULT_CONFIG);
    render(
      <NutrientTargetsPanel
        requirement={req}
        allNutrients={MOCK_NUTRIENTS}
        activeBasis="as_fed"
        enableAdvance={false}
        enableDigestible={false}
        onToggleDigestible={vi.fn()}
        nutrientResults={evalRes.nutrients}
        conflicts={[]}
        language="id"
        onUpdateConstraint={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /rincian hitung/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tampilkan detail 2 angka/i })).toBeInTheDocument();
  });

  it("R6-04: URL repo SettingsPage mengarah ke Widyatama-Pro/OpenFormu & ThemeSwitcherMenu navigasi keyboard panah", async () => {
    const user = userEvent.setup();
    expect(GITHUB_REPO_URL).toBe("https://github.com/Widyatama-Pro/OpenFormu");
    expect(GITHUB_RELEASES_URL).toBe("https://github.com/Widyatama-Pro/OpenFormu/releases");

    render(
      <ThemeProvider>
        <ThemeSwitcherMenu language="id" />
      </ThemeProvider>,
    );

    const group = screen.getByRole("group", { name: "Pilihan palet warna" });
    group.focus();
    expect(document.documentElement.getAttribute("data-theme")).toBe("template-04");
    await user.keyboard("{ArrowRight}");
    expect(document.documentElement.getAttribute("data-theme")).toBe("original-default");
    await user.keyboard("{ArrowLeft}");
    expect(document.documentElement.getAttribute("data-theme")).toBe("template-04");
  });

  it("R6-05: MobileNavDrawer memakai Trakteer surface adaptive tanpa teks amber pudar di tema terang", () => {
    render(
      <MobileNavDrawer
        open
        route="formulation"
        language="id"
        theme="light"
        onNavigate={vi.fn()}
        onToggleTheme={vi.fn()}
        onToggleLanguage={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const trakteer = screen.getByRole("link", { name: /Dukung via Trakteer/i });
    expect(trakteer.className).toContain("!from-amber-100/95");
    const primaryLabel = within(trakteer).getByText(/Dukung via Trakteer/i);
    const subLabel = within(trakteer).getByText(/Traktir kopi kreator/i);
    expect(primaryLabel.className).toContain("text-amber-950");
    expect(primaryLabel.className).not.toMatch(/(?:^|\s)text-amber-100(?:\s|$)/);
    expect(subLabel.className).toContain("text-amber-900/85");
  });

  it("R6-06: openExternalUrl membuka tab baru di Web browser dan mendeteksi Tauri runtime secara akurat", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    expect(isTauriRuntime()).toBe(false);
    await openExternalUrl("https://github.com/Widyatama-Pro/OpenFormu");
    expect(openSpy).toHaveBeenCalledWith(
      "https://github.com/Widyatama-Pro/OpenFormu",
      "_blank",
      "noopener,noreferrer",
    );

    (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    expect(isTauriRuntime()).toBe(true);
  });

  it("R6-07: SettingsPage & FormulationCharts merender normal tanpa Grafit Volt / Mode 1-2-3", () => {
    const res = evaluateMockFormulation(MOCK_INGREDIENTS, MOCK_REQUIREMENTS[0]!, DEFAULT_CONFIG);
    render(
      <ThemeProvider>
        <SettingsPage preferences={DEFAULT_PREFERENCES} onUpdate={vi.fn()} />
        <FormulationCharts
          composition={res.composition}
          nutrients={res.nutrients}
          allNutrients={MOCK_NUTRIENTS}
          ingredients={MOCK_INGREDIENTS}
          batchTotalCost={res.batchTotalCost ?? null}
        />
      </ThemeProvider>,
    );
    expect(screen.queryByText(/Grafit Volt/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Presisi Ergonomis/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Mode 1 · Ultra Glass/i)).not.toBeInTheDocument();
  });
});
