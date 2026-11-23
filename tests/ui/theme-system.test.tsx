import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FormulationCharts } from "../../src/components/analytics/FormulationCharts";
import { AppShell } from "../../src/components/layout/AppShell";
import { SettingsPage } from "../../src/components/settings/SettingsPage";
import { ThemeSwitcherMenu } from "../../src/components/settings/ThemeSwitcherMenu";
import {
  DEFAULT_CONFIG,
  DEFAULT_PREFERENCES,
  MOCK_INGREDIENTS,
  MOCK_NUTRIENTS,
  MOCK_REQUIREMENTS,
  evaluateMockFormulation,
} from "../../src/data/mock-state";
import { generateFormulationPdf } from "../../src/storage";
import {
  OPENFORMU_PALETTE_CATALOG,
  PALETTE_FALLBACK_HEX,
  THEME_STORAGE_KEYS,
  ThemeProvider,
  computeRelativeLuminance,
  resolveSystemBarAppearance,
  syncAndroidSystemBars,
  syncPwaThemeMeta,
  useTheme,
} from "../../src/theme";
import type { FormulationResult, ResolvedThemeMode } from "../../src/types";
import { validateUserPreferences } from "../../src/utils/validators";

interface MockCapacitorWindow extends Window {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    Plugins?: {
      StatusBar?: {
        setBackgroundColor?: (opts: { color: string }) => Promise<void>;
        setStyle?: (opts: { style: string }) => Promise<void>;
        setOverlaysWebView?: (opts: { overlay: boolean }) => Promise<void>;
      };
      NavigationBar?: {
        setNavigationBarColor?: (opts: { color: string; darkButtons?: boolean }) => Promise<void>;
      };
    };
  };
}

function makeOptimalFormulationResult(): FormulationResult {
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

function ThemeChartProbe() {
  const { setPaletteId, setModeSetting } = useTheme();
  const result = makeOptimalFormulationResult();
  return (
    <div>
      <button type="button" onClick={() => setPaletteId("template-03")}>
        Switch Slate
      </button>
      <button type="button" onClick={() => setModeSetting("dark")}>
        Switch Dark
      </button>
      <FormulationCharts
        composition={result.composition}
        nutrients={result.nutrients}
        allNutrients={MOCK_NUTRIENTS}
        ingredients={MOCK_INGREDIENTS}
        batchTotalCost={result.batchTotalCost ?? null}
      />
    </div>
  );
}

describe("OpenFormu Multi-Theme Design System (10 Variants, PWA, Android & PDF)", () => {
  const originalMatchMediaDesc = Object.getOwnPropertyDescriptor(window, "matchMedia");

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-mode");
    document.documentElement.removeAttribute("data-amoled");
    document.documentElement.removeAttribute("data-ui-mode");
    document.documentElement.removeAttribute("data-ui-enhancer");
    document.documentElement.classList.remove("dark", "theme-transition-ready");
    document.head
      .querySelectorAll(
        'meta[name="theme-color"], meta[name="apple-mobile-web-app-status-bar-style"], meta[name="msapplication-navbutton-color"]',
      )
      .forEach((el) => el.remove());
  });

  afterEach(() => {
    if (originalMatchMediaDesc) {
      Object.defineProperty(window, "matchMedia", originalMatchMediaDesc);
    } else {
      Reflect.deleteProperty(window, "matchMedia");
    }
    delete (window as MockCapacitorWindow).Capacitor;
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("berpindah instan ke seluruh 10 kombinasi (5 palet × Terang/Gelap), sinkron class .dark & localStorage", async () => {
    const user = userEvent.setup();
    const onThemeChange = vi.fn();

    render(
      <ThemeProvider>
        <ThemeSwitcherMenu language="id" onThemeChange={onThemeChange} />
      </ThemeProvider>,
    );

    const modes: readonly ResolvedThemeMode[] = ["light", "dark"];
    for (const mode of modes) {
      const modeBtn = document.querySelector<HTMLButtonElement>(
        `[data-theme-control="mode"][data-mode-value="${mode}"]`,
      );
      expect(modeBtn).not.toBeNull();
      await user.click(modeBtn!);

      for (const palette of OPENFORMU_PALETTE_CATALOG) {
        const paletteBtn = document.querySelector<HTMLButtonElement>(
          `[data-theme-control="palette"][data-palette-id="${palette.id}"]`,
        );
        expect(paletteBtn).not.toBeNull();
        await user.click(paletteBtn!);

        expect(document.documentElement.getAttribute("data-theme")).toBe(palette.id);
        expect(document.documentElement.getAttribute("data-mode")).toBe(mode);
        expect(document.documentElement.classList.contains("dark")).toBe(mode === "dark");
        expect(window.localStorage.getItem(THEME_STORAGE_KEYS.id)).toBe(palette.id);
        expect(window.localStorage.getItem(THEME_STORAGE_KEYS.mode)).toBe(mode);

        const metaTheme = document.head.querySelector<HTMLMetaElement>(
          'meta[name="theme-color"]:not([media])',
        );
        expect(metaTheme?.content).toBe(PALETTE_FALLBACK_HEX[palette.id][mode].canvas);
      }
    }

    expect(onThemeChange).toHaveBeenCalledTimes(12);
  });

  it("memulihkan palet, mode, dan AMOLED dari localStorage saat ThemeProvider dipasang ulang", () => {
    window.localStorage.setItem(THEME_STORAGE_KEYS.id, "template-04");
    window.localStorage.setItem(THEME_STORAGE_KEYS.mode, "dark");
    window.localStorage.setItem(THEME_STORAGE_KEYS.amoled, "true");

    render(
      <ThemeProvider>
        <ThemeSwitcherMenu language="id" />
      </ThemeProvider>,
    );

    expect(document.documentElement.getAttribute("data-theme")).toBe("template-04");
    expect(document.documentElement.getAttribute("data-mode")).toBe("dark");
    expect(document.documentElement.getAttribute("data-amoled")).toBe("true");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    const activePaletteDot = document.querySelector<HTMLButtonElement>(
      '[data-theme-control="palette"][data-palette-id="template-04"]',
    );
    expect(activePaletteDot?.getAttribute("aria-pressed")).toBe("true");
  });

  it("mendukung mode Sistem via matchMedia dan merespons perubahan preferensi OS", async () => {
    const user = userEvent.setup();
    let prefersDark = false;
    let changeHandler: ((event: MediaQueryListEvent) => void) | null = null;

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn((query: string) => ({
        matches: query.includes("dark") ? prefersDark : false,
        media: query,
        onchange: null,
        addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
          changeHandler = listener;
        },
        removeEventListener: () => {
          changeHandler = null;
        },
        dispatchEvent: () => true,
      })),
    });

    render(
      <ThemeProvider>
        <ThemeSwitcherMenu language="id" />
      </ThemeProvider>,
    );

    const systemBtn = document.querySelector<HTMLButtonElement>(
      '[data-theme-control="mode"][data-mode-value="system"]',
    );
    await user.click(systemBtn!);
    expect(document.documentElement.getAttribute("data-mode")).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEYS.mode)).toBe("system");

    prefersDark = true;
    act(() => {
      changeHandler?.({
        matches: true,
        media: "(prefers-color-scheme: dark)",
      } as MediaQueryListEvent);
    });

    expect(document.documentElement.getAttribute("data-mode")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("hanya mengaktifkan AMOLED #000000 saat Mode Gelap dan memperbarui meta PWA", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider defaultPalette="template-05" defaultMode="light" defaultAmoled={false}>
        <ThemeSwitcherMenu language="id" />
      </ThemeProvider>,
    );

    const amoledSwitch = document.querySelector<HTMLButtonElement>('[data-theme-control="amoled"]');
    expect(amoledSwitch).not.toBeNull();
    await user.click(amoledSwitch!);

    // In light mode, AMOLED must NOT darken the canvas or apply data-amoled
    expect(document.documentElement.getAttribute("data-mode")).toBe("light");
    expect(document.documentElement.hasAttribute("data-amoled")).toBe(false);
    expect(
      document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])')
        ?.content,
    ).toBe(PALETTE_FALLBACK_HEX["template-05"].light.canvas);

    const darkBtn = document.querySelector<HTMLButtonElement>(
      '[data-theme-control="mode"][data-mode-value="dark"]',
    );
    await user.click(darkBtn!);

    expect(document.documentElement.getAttribute("data-mode")).toBe("dark");
    expect(document.documentElement.getAttribute("data-amoled")).toBe("true");
    expect(
      document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])')
        ?.content,
    ).toBe("#000000");

    const appleMeta = document.head.querySelector<HTMLMetaElement>(
      'meta[name="apple-mobile-web-app-status-bar-style"]',
    );
    expect(appleMeta?.content).toBe("black-translucent");

    const lightSync = syncPwaThemeMeta({ paletteId: "original-default", mode: "light" });
    expect(lightSync.canvasHex).toBe("#F5F4EF");
    expect(
      document.head.querySelector<HTMLMetaElement>(
        'meta[name="apple-mobile-web-app-status-bar-style"]',
      )?.content,
    ).toBe("default");
  });

  it("menghitung luminansi Android & menyinkronkan Capacitor StatusBar + NavigationBar", async () => {
    expect(computeRelativeLuminance("#FFFFFF")).toBeCloseTo(1, 3);
    expect(computeRelativeLuminance("#000000")).toBe(0);

    expect(resolveSystemBarAppearance("#F5F4EF")).toMatchObject({
      iconStyle: "LIGHT",
      isDarkBackground: false,
    });
    expect(resolveSystemBarAppearance("#0E0F0B")).toMatchObject({
      iconStyle: "DARK",
      isDarkBackground: true,
    });

    const setBackgroundColor = vi.fn(() => Promise.resolve());
    const setStyle = vi.fn(() => Promise.resolve());
    const setNavigationBarColor = vi.fn(() => Promise.resolve());

    (window as MockCapacitorWindow).Capacitor = {
      isNativePlatform: () => true,
      Plugins: {
        StatusBar: { setBackgroundColor, setStyle },
        NavigationBar: { setNavigationBarColor },
      },
    };

    const res = await syncAndroidSystemBars({
      paletteId: "template-05",
      mode: "dark",
      amoledPureBlack: true,
    });

    expect(res).toMatchObject({
      backgroundColor: "#000000",
      iconStyle: "DARK",
      isDarkBackground: true,
      appliedToCapacitor: true,
    });
    expect(setBackgroundColor).toHaveBeenCalledWith({ color: "#000000" });
    expect(setStyle).toHaveBeenCalledWith({ style: "DARK" });
    expect(setNavigationBarColor).toHaveBeenCalledWith({
      color: "#000000",
      darkButtons: false,
    });
  });

  it("menempatkan pemilih 5 palet di SettingsPage (bukan di header AppShell)", () => {
    const onUpdate = vi.fn();
    render(
      <ThemeProvider>
        <AppShell
          route="formulation"
          onNavigate={vi.fn()}
          language="id"
          theme="light"
          onToggleTheme={vi.fn()}
          onToggleLanguage={vi.fn()}
        >
          <SettingsPage preferences={DEFAULT_PREFERENCES} onUpdate={onUpdate} />
        </AppShell>
      </ThemeProvider>,
    );

    const headerEl = document.querySelector("header");
    expect(headerEl?.querySelectorAll('[data-theme-control="palette"]').length ?? 0).toBe(0);

    const settingsPalettes = document.querySelectorAll('[data-theme-control="palette"]');
    expect(settingsPalettes.length).toBe(5);
    expect(document.querySelector('[data-theme-control="palette-prev"]')).not.toBeNull();
    expect(document.querySelector('[data-theme-control="palette-next"]')).not.toBeNull();
    expect(document.querySelectorAll('[data-theme-control="mode"]').length).toBe(3);
    expect(headerEl?.querySelectorAll('[data-theme-control="ui-mode"]').length ?? 0).toBe(0);
    expect(document.querySelectorAll('[data-theme-control="ui-mode"]').length).toBe(3);
  });

  it("mereaktifkan penanda tema pada FormulationCharts saat palet atau mode berubah & fallback aman palet lama", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("openformul-theme-id", "prd-custom");
    render(
      <ThemeProvider>
        <ThemeChartProbe />
      </ThemeProvider>,
    );

    const getSignature = () =>
      document.querySelector("[data-theme-chart]")?.getAttribute("data-theme-chart");

    // Palet lama yg sudah dihapus ("prd-custom") jatuh aman ke "original-default"
    expect(getSignature()).toBe("original-default-light-std");
    await user.click(screen.getByRole("button", { name: "Switch Slate" }));
    expect(getSignature()).toBe("template-03-light-std");
    await user.click(screen.getByRole("button", { name: "Switch Dark" }));
    expect(getSignature()).toBe("template-03-dark-std");
  });

  it("memvalidasi field tema UserPreferences di validateUserPreferences tanpa menerima input berbahaya", () => {
    const valid = validateUserPreferences({
      language: "id",
      theme: "dark",
      themePalette: "template-03",
      themeModeSetting: "system",
      amoledPureBlack: true,
      uiMode: "anti-slop",
      defaultBasis: "as_fed",
      defaultBatchKg: 250,
      zeroInclusionDefaultPct: 2,
    });

    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.data.themePalette).toBe("template-03");
      expect(valid.data.themeModeSetting).toBe("system");
      expect(valid.data.amoledPureBlack).toBe(true);
      expect(valid.data.uiMode).toBe("anti-slop");
    }

    const sanitized = validateUserPreferences({
      language: "en",
      theme: "light",
      themePalette: "__proto__",
      themeModeSetting: "invalid-mode",
      amoledPureBlack: "yes",
      uiMode: "__proto__",
    });

    expect(sanitized.ok).toBe(true);
    if (sanitized.ok) {
      expect(sanitized.data.themePalette).toBeUndefined();
      expect(sanitized.data.themeModeSetting).toBeUndefined();
      expect(sanitized.data.amoledPureBlack).toBeUndefined();
      expect(sanitized.data.uiMode).toBeUndefined();
    }
  });

  it("menjaga dokumen PDF tetap memakai palet kertas terang walau UI dalam Mode Gelap AMOLED", () => {
    document.documentElement.setAttribute("data-theme", "template-01");
    document.documentElement.setAttribute("data-mode", "dark");
    document.documentElement.setAttribute("data-amoled", "true");
    document.documentElement.classList.add("dark");

    const result = makeOptimalFormulationResult();
    const fullBytes = generateFormulationPdf({
      recipeName: "Broiler Starter Uji Gelap",
      mode: "full",
      ingredients: MOCK_INGREDIENTS,
      nutrientsCatalog: MOCK_NUTRIENTS,
      requirement: MOCK_REQUIREMENTS[0]!,
      result,
    });
    const batchBytes = generateFormulationPdf({
      recipeName: "Broiler Starter Uji Gelap",
      mode: "batch_only",
      ingredients: MOCK_INGREDIENTS,
      nutrientsCatalog: MOCK_NUTRIENTS,
      requirement: MOCK_REQUIREMENTS[0]!,
      result,
    });

    const fullText = new TextDecoder("latin1").decode(fullBytes);
    const batchText = new TextDecoder("latin1").decode(batchBytes);

    expect(fullText.startsWith("%PDF-1.4")).toBe(true);
    expect(batchText.startsWith("%PDF-1.4")).toBe(true);
    // Crisp white-paper body ink (dark slate) & light table header RGB remain intact
    expect(fullText).toContain("0.945 0.961 0.976 rg");
    expect(fullText).toContain("0.059 0.090 0.165 rg");
    expect(batchText).toContain("0.945 0.961 0.976 rg");
  });

  it("memulihkan uiMode dari localStorage, memigrasi openformu-theme-enhancer lama, dan menerapkan hidrasi pre-paint index.html", () => {
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiMode, "anti-slop");

    const firstRender = render(
      <ThemeProvider>
        <ThemeSwitcherMenu language="id" />
      </ThemeProvider>,
    );

    expect(document.documentElement.getAttribute("data-ui-mode")).toBe("anti-slop");
    expect(document.documentElement.getAttribute("data-ui-enhancer")).toBe("false");
    expect(screen.getByRole("radio", { name: /^Anti-Slop/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    firstRender.unmount();

    // Legacy migration: openformu-theme-enhancer = "false" -> "biasa" when openformu-ui-mode is absent
    window.localStorage.clear();
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiEnhancer, "false");
    const legacyRender = render(
      <ThemeProvider>
        <ThemeSwitcherMenu language="id" />
      </ThemeProvider>,
    );
    expect(document.documentElement.getAttribute("data-ui-mode")).toBe("biasa");
    expect(document.documentElement.getAttribute("data-ui-enhancer")).toBe("false");
    expect(screen.getByRole("radio", { name: /^Biasa/i })).toHaveAttribute("aria-checked", "true");
    legacyRender.unmount();

    // openformu-ui-mode takes precedence over legacy openformu-theme-enhancer
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiMode, "anti-slop");
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiEnhancer, "true");
    const precedenceRender = render(
      <ThemeProvider>
        <ThemeSwitcherMenu language="id" />
      </ThemeProvider>,
    );
    expect(document.documentElement.getAttribute("data-ui-mode")).toBe("anti-slop");
    expect(document.documentElement.getAttribute("data-ui-enhancer")).toBe("false");
    precedenceRender.unmount();

    // Pre-paint script in index.html sets data-ui-mode and data-ui-enhancer before React mounts
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
    const scriptMatch = html.match(/<script>\s*(\(function \(\) \{[\s\S]*?\}\)\(\);)\s*<\/script>/);
    expect(scriptMatch?.[1]).toBeDefined();

    window.localStorage.clear();
    window.localStorage.setItem("openformu-ui-mode", "anti-slop");
    document.documentElement.removeAttribute("data-ui-mode");
    document.documentElement.removeAttribute("data-ui-enhancer");
    runInNewContext(scriptMatch![1]!, {
      localStorage: window.localStorage,
      document,
      window,
    });
    expect(document.documentElement.getAttribute("data-ui-mode")).toBe("anti-slop");
    expect(document.documentElement.getAttribute("data-ui-enhancer")).toBe("false");

    window.localStorage.clear();
    window.localStorage.setItem("openformul-theme-enhancer", "false");
    runInNewContext(scriptMatch![1]!, {
      localStorage: window.localStorage,
      document,
      window,
    });
    expect(document.documentElement.getAttribute("data-ui-mode")).toBe("biasa");
    expect(document.documentElement.getAttribute("data-ui-enhancer")).toBe("false");
  });

  it("menggunakan canvasHex pada syncAndroidSystemBars untuk mode anti-slop terang dan primaryHex untuk mode biasa terang", async () => {
    const antiSlopLight = await syncAndroidSystemBars({
      paletteId: "original-default",
      mode: "light",
      uiMode: "anti-slop",
      uiEnhancer: false,
    });
    expect(antiSlopLight.backgroundColor).toBe("#F5F4EF");
    expect(antiSlopLight.isDarkBackground).toBe(false);

    const biasaLight = await syncAndroidSystemBars({
      paletteId: "original-default",
      mode: "light",
      uiMode: "biasa",
      uiEnhancer: false,
    });
    expect(biasaLight.backgroundColor).toBe("#142B27");
    expect(biasaLight.isDarkBackground).toBe(true);
  });
});
