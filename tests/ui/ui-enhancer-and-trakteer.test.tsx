import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { SettingsPage } from "../../src/components/settings/SettingsPage";
import { TRAKTEER_SUPPORT_URL } from "../../src/components/ui/TrakteerSupportButton";
import { DEFAULT_PREFERENCES } from "../../src/data/mock-state";
import { OPENFORMU_PALETTE_CATALOG, THEME_STORAGE_KEYS, ThemeProvider } from "../../src/theme";
import { validateUserPreferences } from "../../src/utils/validators";

describe("UI Enhancer (5 Palettes Stepper), Simplified Engine & Trakteer Integration", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-mode");
    document.documentElement.removeAttribute("data-ui-mode");
    document.documentElement.removeAttribute("data-ui-enhancer");
    document.documentElement.removeAttribute("data-engine-mode");
    document.documentElement.removeAttribute("data-motion-engine");
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("mengaktifkan mode Enhanced secara default pada seluruh 5 palet dan menyediakan pemilih 3 mode (Biasa, Enhanced, Anti-Slop)", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    render(
      <ThemeProvider>
        <SettingsPage preferences={DEFAULT_PREFERENCES} onUpdate={onUpdate} />
      </ThemeProvider>,
    );

    expect(OPENFORMU_PALETTE_CATALOG).toHaveLength(5);
    expect(OPENFORMU_PALETTE_CATALOG[0]?.id).toBe("template-04");
    expect(document.documentElement.getAttribute("data-theme")).toBe("template-04");
    expect(document.documentElement.getAttribute("data-mode")).toBe("dark");
    expect(document.documentElement.getAttribute("data-ui-mode")).toBe("enhanced");
    expect(document.documentElement.getAttribute("data-ui-enhancer")).toBe("true");
    expect(document.documentElement.getAttribute("data-engine-mode")).toBe("ultra");
    expect(document.documentElement.getAttribute("data-motion-engine")).toBe("gpu_flip");

    const nextBtn = screen.getByRole("button", { name: /Tema berikutnya/i });
    const seenPalettes = new Set<string>();
    for (let i = 0; i < OPENFORMU_PALETTE_CATALOG.length; i++) {
      const current = document.documentElement.getAttribute("data-theme")!;
      seenPalettes.add(current);
      expect(document.documentElement.getAttribute("data-ui-mode")).toBe("enhanced");
      expect(document.documentElement.getAttribute("data-ui-enhancer")).toBe("true");
      if (i < OPENFORMU_PALETTE_CATALOG.length - 1) {
        await user.click(nextBtn);
      }
    }
    expect(seenPalettes.size).toBe(5);

    const radioGroup = screen.getByRole("radiogroup", { name: /Mode Tampilan Antarmuka/i });
    expect(radioGroup).toBeInTheDocument();

    const biasaRadio = screen.getByRole("radio", { name: /^Biasa/i });
    const enhancedRadio = screen.getByRole("radio", { name: /^Enhanced/i });
    const antiSlopRadio = screen.getByRole("radio", { name: /^Anti-Slop/i });

    expect(enhancedRadio).toHaveAttribute("aria-checked", "true");
    expect(biasaRadio).toHaveAttribute("aria-checked", "false");
    expect(antiSlopRadio).toHaveAttribute("aria-checked", "false");

    await user.click(biasaRadio);
    expect(document.documentElement.getAttribute("data-ui-mode")).toBe("biasa");
    expect(document.documentElement.getAttribute("data-ui-enhancer")).toBe("false");
    expect(window.localStorage.getItem(THEME_STORAGE_KEYS.uiMode)).toBe("biasa");
    expect(window.localStorage.getItem(THEME_STORAGE_KEYS.uiEnhancer)).toBe("false");
    expect(onUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ uiMode: "biasa", uiEnhancer: false }),
    );

    await user.click(antiSlopRadio);
    expect(document.documentElement.getAttribute("data-ui-mode")).toBe("anti-slop");
    expect(document.documentElement.getAttribute("data-ui-enhancer")).toBe("false");
    expect(window.localStorage.getItem(THEME_STORAGE_KEYS.uiMode)).toBe("anti-slop");
    expect(window.localStorage.getItem(THEME_STORAGE_KEYS.uiEnhancer)).toBe("false");
    expect(onUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ uiMode: "anti-slop", uiEnhancer: false }),
    );
    expect(document.querySelector(".lucide-sparkles")).toBeNull();

    // Navigasi keyboard ArrowLeft / ArrowRight & Space/Enter pada radiogroup
    antiSlopRadio.focus();
    await user.keyboard("{ArrowRight}");
    expect(document.documentElement.getAttribute("data-ui-mode")).toBe("biasa");
    expect(document.activeElement).toBe(biasaRadio);

    await user.keyboard("{ArrowRight}");
    expect(document.documentElement.getAttribute("data-ui-mode")).toBe("enhanced");
    expect(document.documentElement.getAttribute("data-ui-enhancer")).toBe("true");
    expect(document.activeElement).toBe(enhancedRadio);

    await user.keyboard("{ArrowLeft}");
    expect(document.documentElement.getAttribute("data-ui-mode")).toBe("biasa");
    expect(document.activeElement).toBe(biasaRadio);

    antiSlopRadio.focus();
    await user.keyboard(" ");
    expect(document.documentElement.getAttribute("data-ui-mode")).toBe("anti-slop");

    enhancedRadio.focus();
    await user.keyboard("{Enter}");
    expect(document.documentElement.getAttribute("data-ui-mode")).toBe("enhanced");
  });

  it("menyederhanakan Performa & Animasi Tampilan menjadi Smooth dan Ringan dengan keterangan hover", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    render(
      <ThemeProvider>
        <SettingsPage preferences={DEFAULT_PREFERENCES} onUpdate={onUpdate} />
      </ThemeProvider>,
    );

    expect(screen.queryByLabelText("Intensitas Blur Kaca")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Intensitas Glow")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Performa & Animasi Tampilan/i }),
    ).toBeInTheDocument();

    const ringanRadio = screen.getByRole("radio", { name: /^Ringan$/i });
    const smoothRadio = screen.getByRole("radio", { name: /^Smooth$/i });
    expect(smoothRadio).toHaveAttribute("aria-checked", "true");
    expect(smoothRadio).toHaveAttribute("title", expect.stringMatching(/kaca akrilik mulus/i));
    expect(ringanRadio).toHaveAttribute("title", expect.stringMatching(/Rendering ringan/i));

    await user.click(ringanRadio);
    expect(document.documentElement.getAttribute("data-engine-mode")).toBe("crisp");
    expect(document.documentElement.getAttribute("data-motion-engine")).toBe("css_native");
    expect(document.documentElement.style.getPropertyValue("--ui-blur-px")).toBe("0px");

    await user.click(smoothRadio);
    expect(document.documentElement.getAttribute("data-engine-mode")).toBe("ultra");
    expect(document.documentElement.getAttribute("data-motion-engine")).toBe("gpu_flip");
  });

  it("menerapkan default Android (Indigo Glasial, Terang, Enhanced, Ringan) secara otomatis pada platform Android", () => {
    const uaSpy = vi
      .spyOn(window.navigator, "userAgent", "get")
      .mockReturnValue("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36");

    try {
      render(
        <ThemeProvider>
          <SettingsPage preferences={DEFAULT_PREFERENCES} onUpdate={vi.fn()} />
        </ThemeProvider>,
      );

      expect(document.documentElement.getAttribute("data-theme")).toBe("template-04");
      expect(document.documentElement.getAttribute("data-mode")).toBe("light");
      expect(document.documentElement.getAttribute("data-ui-mode")).toBe("enhanced");
      expect(document.documentElement.getAttribute("data-engine-mode")).toBe("crisp");
      expect(document.documentElement.getAttribute("data-motion-engine")).toBe("css_native");
      expect(document.documentElement.style.getPropertyValue("--ui-blur-px")).toBe("0px");
      expect(screen.getByRole("radio", { name: /^Ringan$/i })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    } finally {
      uaSpy.mockRestore();
    }
  });

  it("menampilkan tombol dukungan Trakteer dengan tautan aman di Sidebar maupun SettingsPage", async () => {
    const user = userEvent.setup();
    render(<App />);

    const sidebarTrakteer = screen.getByRole("link", { name: /Dukung via Trakteer/i });
    expect(sidebarTrakteer).toHaveAttribute("href", TRAKTEER_SUPPORT_URL);
    expect(sidebarTrakteer).toHaveAttribute("target", "_blank");
    expect(sidebarTrakteer).toHaveAttribute("rel", "noopener noreferrer");

    // Buka halaman Pengaturan dan pastikan kartu Trakteer juga tersedia di sana
    await user.click(screen.getAllByRole("button", { name: /Pengaturan/i })[0]!);
    const trakteerLinks = screen.getAllByRole("link", { name: /Dukung via Trakteer/i });
    expect(trakteerLinks.length).toBeGreaterThanOrEqual(2);
    for (const link of trakteerLinks) {
      expect(link).toHaveAttribute("href", TRAKTEER_SUPPORT_URL);
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("memvalidasi opsi uiMode, uiEnhancer, renderingEngine, motionEngine, glassBlurPx & glowIntensityPct di validateUserPreferences", () => {
    const valid = validateUserPreferences({
      language: "id",
      theme: "light",
      uiMode: "anti-slop",
      uiEnhancer: false,
      renderingEngine: "balanced",
      motionEngine: "gpu_flip",
      glassBlurPx: 16,
      glowIntensityPct: 110,
    });
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.data.uiMode).toBe("anti-slop");
      expect(valid.data.uiEnhancer).toBe(false);
      expect(valid.data.renderingEngine).toBe("balanced");
      expect(valid.data.motionEngine).toBe("gpu_flip");
      expect(valid.data.glassBlurPx).toBe(16);
      expect(valid.data.glowIntensityPct).toBe(110);
    }

    const clamped = validateUserPreferences({
      language: "en",
      theme: "dark",
      uiMode: "__proto__",
      renderingEngine: "invalid",
      motionEngine: "invalid",
      glassBlurPx: 999,
      glowIntensityPct: -20,
    });
    expect(clamped.ok).toBe(true);
    if (clamped.ok) {
      expect(clamped.data.uiMode).toBeUndefined();
      expect(clamped.data.renderingEngine).toBeUndefined();
      expect(clamped.data.motionEngine).toBeUndefined();
      expect(clamped.data.glassBlurPx).toBeUndefined();
      expect(clamped.data.glowIntensityPct).toBeUndefined();
    }
  });
});
