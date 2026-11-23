import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { StrictMode, useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "../../src/components/layout/AppShell";
import { DesktopSidebar } from "../../src/components/layout/DesktopSidebar";
import { MobileBottomNav } from "../../src/components/layout/MobileBottomNav";
import { MobileNavDrawer } from "../../src/components/layout/MobileNavDrawer";
import { Badge } from "../../src/components/ui/Badge";
import { Button } from "../../src/components/ui/Button";
import { Card } from "../../src/components/ui/Card";
import { GlossySquircleIcon } from "../../src/components/ui/GlossySquircleIcon";
import { NumericCellInput } from "../../src/components/formulation/NumericCellInput";
import { SegmentedTabs } from "../../src/components/ui/SegmentedTabs";
import { SheetDialog } from "../../src/components/ui/SheetDialog";
import { Switch } from "../../src/components/ui/Switch";
import { ThemedSelect } from "../../src/components/ui/ThemedSelect";
import {
  TRAKTEER_SUPPORT_URL,
  TrakteerSupportButton,
} from "../../src/components/ui/TrakteerSupportButton";
import { THEME_STORAGE_KEYS, ThemeProvider } from "../../src/theme";

function parseHex(hex: string): readonly [number, number, number] {
  const clean = hex.trim().replace(/^#/, "");
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ];
}

function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function contrastRatio(hexA: string, hexB: string): number {
  const [r1, g1, b1] = parseHex(hexA).map(linearize) as [number, number, number];
  const [r2, g2, b2] = parseHex(hexB).map(linearize) as [number, number, number];
  const lumA = 0.2126 * r1 + 0.7152 * g1 + 0.0722 * b1;
  const lumB = 0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2;
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

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

describe("Milestone M2 — Anti-Slop Shell, Accessibility & Core Primitives", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-mode");
    document.documentElement.removeAttribute("data-ui-mode");
    document.documentElement.removeAttribute("data-ui-enhancer");
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("AppShell in anti-slop renders skip link to #main-content, labeled Menu button, min-h-11 header controls, and zero em dashes", () => {
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiMode, "anti-slop");

    const { container } = render(
      <ThemeProvider>
        <AppShell
          route="formulation"
          onNavigate={vi.fn()}
          language="id"
          theme="light"
          onToggleTheme={vi.fn()}
          onToggleLanguage={vi.fn()}
        >
          <div>Konten utama</div>
        </AppShell>
      </ThemeProvider>,
    );

    const skipLink = screen.getByRole("link", { name: /Lompati ke konten utama/i });
    expect(skipLink).toHaveAttribute("href", "#main-content");
    expect(skipLink.className).toContain("skip-link");

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveAttribute("tabindex", "-1");

    const header = container.querySelector("header");
    expect(header?.className).not.toContain("backdrop-blur-md");

    const capsule = container.querySelector('[data-header-utility-capsule="anti-slop"]');
    expect(capsule).not.toBeNull();

    const tabletMenuBtn = screen.getByRole("button", { name: /Menu navigasi/i });
    expect(within(tabletMenuBtn).getByText("Menu")).toBeInTheDocument();
    expect(tabletMenuBtn.className).toContain("min-h-11");

    for (const btn of within(capsule as HTMLElement).getAllByRole("button")) {
      expect(btn.className).toContain("min-h-11");
    }

    expect(
      within(capsule as HTMLElement).getByRole("button", { name: /Tema & UI Enhancer/i }),
    ).toBeInTheDocument();
    expect(container.textContent).not.toContain("—");
  });

  it("DesktopSidebar cleanly isolates anti-slop, biasa, and enhanced modes", () => {
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiMode, "anti-slop");
    const { container, rerender } = render(
      <ThemeProvider>
        <DesktopSidebar
          route="ingredients"
          onNavigate={vi.fn()}
          language="id"
          expanded
          onToggleExpanded={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(container.querySelector(".nav-liquid-cutout")).toBeNull();
    expect(container.querySelector(".glowing-nav-pill")).toBeNull();
    expect(screen.getByText("Pustaka & Resep")).toBeInTheDocument();
    expect(screen.getByText("Sistem")).toBeInTheDocument();

    const homeBtn = screen.getByRole("button", { name: "OpenFormu: Beranda Formulasi" });
    expect(homeBtn).toBeInTheDocument();
    expect(homeBtn.getAttribute("aria-label")).not.toContain("—");

    const activeBtn = screen.getByRole("button", { name: "Database Bahan" });
    expect(activeBtn).toHaveAttribute("aria-current", "page");
    expect(activeBtn.className).toContain("font-bold");

    const collapseBtn = screen.getByRole("button", { name: /Perkecil sidebar navigasi/i });
    expect(collapseBtn).toHaveAttribute("aria-expanded", "true");

    // Collapsed anti-slop keeps active border/fill marker & aria-expanded="false"
    rerender(
      <ThemeProvider>
        <DesktopSidebar
          route="ingredients"
          onNavigate={vi.fn()}
          language="id"
          expanded={false}
          onToggleExpanded={vi.fn()}
        />
      </ThemeProvider>,
    );
    const collapsedActive = screen.getByRole("button", { name: "Database Bahan" });
    expect(collapsedActive.className).toContain("border-[var(--color-primary)]");
    expect(screen.getByRole("button", { name: /Perbesar sidebar navigasi/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    // Biasa keeps .nav-liquid-cutout and Enhanced keeps .glowing-nav-pill
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiMode, "biasa");
    const { container: biasaContainer } = render(
      <ThemeProvider>
        <DesktopSidebar
          route="formulation"
          onNavigate={vi.fn()}
          language="id"
          expanded
          onToggleExpanded={vi.fn()}
        />
      </ThemeProvider>,
    );
    expect(biasaContainer.querySelector(".nav-liquid-cutout")).not.toBeNull();

    window.localStorage.setItem(THEME_STORAGE_KEYS.uiMode, "enhanced");
    const { container: enhancedContainer } = render(
      <ThemeProvider>
        <DesktopSidebar
          route="formulation"
          onNavigate={vi.fn()}
          language="id"
          expanded
          onToggleExpanded={vi.fn()}
        />
      </ThemeProvider>,
    );
    expect(enhancedContainer.querySelector(".glowing-nav-pill")).not.toBeNull();
  });

  it("MobileBottomNav renders visible 'Menu' label in both ID and EN and MobileNavDrawer marks aria-current in anti-slop", () => {
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiMode, "anti-slop");

    const { rerender } = render(
      <ThemeProvider>
        <MobileBottomNav
          route="formulation"
          onNavigate={vi.fn()}
          onOpenDrawer={vi.fn()}
          language="id"
        />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button", { name: /Menu/i })).toHaveTextContent("Menu");

    rerender(
      <ThemeProvider>
        <MobileBottomNav
          route="formulation"
          onNavigate={vi.fn()}
          onOpenDrawer={vi.fn()}
          language="en"
        />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button", { name: /Menu/i })).toHaveTextContent("Menu");
    expect(screen.queryByText("More")).not.toBeInTheDocument();

    render(
      <ThemeProvider>
        <MobileNavDrawer
          open
          secondaryOnly
          onClose={vi.fn()}
          route="settings"
          onNavigate={vi.fn()}
          language="en"
          theme="light"
          onToggleTheme={vi.fn()}
          onToggleLanguage={vi.fn()}
        />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button", { name: "Settings" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("SheetDialog traps Tab/Shift+Tab focus, closes on Escape, and restores focus to trigger", async () => {
    const user = userEvent.setup();

    function DialogHarness() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            Buka Dialog
          </button>
          <SheetDialog open={open} onClose={() => setOpen(false)} title="Dialog Uji">
            <input type="text" aria-label="Input Pertama" />
            <button type="button" onClick={() => setOpen(false)}>
              Simpan
            </button>
          </SheetDialog>
        </div>
      );
    }

    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "Buka Dialog" });
    trigger.focus();
    await user.click(trigger);

    const closeBtn = screen.getByRole("button", { name: "Tutup panel" });
    const inputEl = screen.getByLabelText("Input Pertama");
    const saveBtn = screen.getByRole("button", { name: "Simpan" });

    expect(document.activeElement).toBe(closeBtn);

    await user.tab();
    expect(document.activeElement).toBe(inputEl);
    await user.tab();
    expect(document.activeElement).toBe(saveBtn);
    await user.tab();
    expect(document.activeElement).toBe(closeBtn);

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(saveBtn);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it("SheetDialog respects child autoFocus on open and restores focus to trigger on Escape under StrictMode", async () => {
    const user = userEvent.setup();

    function AutoFocusHarness() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            Buka AutoFocus
          </button>
          <SheetDialog open={open} onClose={() => setOpen(false)} title="Dialog AutoFocus">
            <input type="text" aria-label="Input AutoFocus" autoFocus />
            <button type="button" onClick={() => setOpen(false)}>
              Simpan AF
            </button>
          </SheetDialog>
        </div>
      );
    }

    render(
      <StrictMode>
        <AutoFocusHarness />
      </StrictMode>,
    );

    const trigger = screen.getByRole("button", { name: "Buka AutoFocus" });
    trigger.focus();
    await user.click(trigger);

    const closeBtn = screen.getByRole("button", { name: "Tutup panel" });
    const autoFocusInput = screen.getByLabelText("Input AutoFocus");
    const saveBtn = screen.getByRole("button", { name: "Simpan AF" });

    expect(document.activeElement).toBe(autoFocusInput);

    await user.tab();
    expect(document.activeElement).toBe(saveBtn);
    await user.tab();
    expect(document.activeElement).toBe(closeBtn);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(saveBtn);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it("Nested ThemedSelect inside SheetDialog on mobile (375px) traps Tab in inner sheet and Escape closes only inner select", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiMode, "anti-slop");
    const restoreViewport = mockViewport(375);

    function MobileNestedHarness() {
      const [open, setOpen] = useState(false);
      const [val, setVal] = useState("a1");
      return (
        <ThemeProvider>
          <button type="button" onClick={() => setOpen(true)}>
            Buka Modal Mobile
          </button>
          <SheetDialog open={open} onClose={() => setOpen(false)} title="Modal Luar Mobile">
            <ThemedSelect
              ariaLabel="Pilih Kelas Mobile"
              modalTitle="Sheet Pilih Kelas"
              searchable
              value={val}
              onChange={setVal}
              options={[
                { value: "a1", label: "Hijauan Kering" },
                { value: "a2", label: "Sumber Energi" },
              ]}
            />
          </SheetDialog>
        </ThemeProvider>
      );
    }

    try {
      render(<MobileNestedHarness />);
      const outerTrigger = screen.getByRole("button", { name: "Buka Modal Mobile" });
      outerTrigger.focus();
      await user.click(outerTrigger);

      expect(screen.getByRole("dialog", { name: "Modal Luar Mobile" })).toBeInTheDocument();

      const selectTrigger = screen.getByRole("combobox", { name: "Pilih Kelas Mobile" });
      await user.click(selectTrigger);

      const innerDialog = screen.getByRole("dialog", { name: "Sheet Pilih Kelas" });
      expect(innerDialog.contains(document.activeElement)).toBe(true);

      await user.tab();
      expect(innerDialog.contains(document.activeElement)).toBe(true);
      await user.tab({ shift: true });
      expect(innerDialog.contains(document.activeElement)).toBe(true);

      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog", { name: "Sheet Pilih Kelas" })).not.toBeInTheDocument();
      expect(screen.getByRole("dialog", { name: "Modal Luar Mobile" })).toBeInTheDocument();
      expect(document.activeElement).toBe(selectTrigger);

      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog", { name: "Modal Luar Mobile" })).not.toBeInTheDocument();
      expect(document.activeElement).toBe(outerTrigger);
    } finally {
      restoreViewport();
    }
  });

  it("Nested searchable and non-searchable ThemedSelect inside SheetDialog on desktop (1280px) handles Tab and Escape cleanly", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiMode, "anti-slop");
    const restoreViewport = mockViewport(1280);

    function DesktopNestedHarness() {
      const [open, setOpen] = useState(false);
      const [searchableVal, setSearchableVal] = useState("s1");
      const [plainVal, setPlainVal] = useState("p1");
      return (
        <ThemeProvider>
          <button type="button" onClick={() => setOpen(true)}>
            Buka Modal Desktop
          </button>
          <SheetDialog open={open} onClose={() => setOpen(false)} title="Modal Luar Desktop">
            <ThemedSelect
              ariaLabel="Select Searchable"
              searchable
              value={searchableVal}
              onChange={setSearchableVal}
              options={[
                { value: "s1", label: "Opsi Satu" },
                { value: "s2", label: "Opsi Dua" },
              ]}
            />
            <ThemedSelect
              ariaLabel="Select Plain"
              value={plainVal}
              onChange={setPlainVal}
              options={[
                { value: "p1", label: "Basis BK" },
                { value: "p2", label: "As-Fed" },
              ]}
            />
            <button type="button">Aksi Berikutnya</button>
          </SheetDialog>
        </ThemeProvider>
      );
    }

    try {
      render(<DesktopNestedHarness />);
      const outerTrigger = screen.getByRole("button", { name: "Buka Modal Desktop" });
      outerTrigger.focus();
      await user.click(outerTrigger);

      const searchableTrigger = screen.getByRole("combobox", { name: "Select Searchable" });
      await user.click(searchableTrigger);

      const searchInput = screen.getByRole("searchbox");
      expect(document.activeElement).toBe(searchInput);

      // Tab inside searchable popover advances into options instead of jumping to SheetDialog close button
      await user.tab();
      const option1 = screen.getByRole("option", { name: "Opsi Satu" });
      expect(document.activeElement).toBe(option1);
      expect(screen.getByRole("dialog", { name: "Modal Luar Desktop" })).toBeInTheDocument();

      await user.tab();
      const option2 = screen.getByRole("option", { name: "Opsi Dua" });
      expect(document.activeElement).toBe(option2);

      // Tab past the last popover focusable closes only the select and returns focus to its trigger
      await user.tab();
      expect(screen.queryByRole("listbox", { name: "Select Searchable" })).not.toBeInTheDocument();
      expect(screen.getByRole("dialog", { name: "Modal Luar Desktop" })).toBeInTheDocument();
      expect(document.activeElement).toBe(searchableTrigger);

      // Escape while searchable popover is open closes only the select
      await user.click(searchableTrigger);
      expect(screen.getByRole("listbox", { name: "Select Searchable" })).toBeInTheDocument();
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("listbox", { name: "Select Searchable" })).not.toBeInTheDocument();
      expect(screen.getByRole("dialog", { name: "Modal Luar Desktop" })).toBeInTheDocument();
      expect(document.activeElement).toBe(searchableTrigger);

      // Non-searchable desktop select closes on Escape without closing SheetDialog, and Tab closes & advances
      const plainTrigger = screen.getByRole("combobox", { name: "Select Plain" });
      await user.click(plainTrigger);
      expect(screen.getByRole("listbox", { name: "Select Plain" })).toBeInTheDocument();
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("listbox", { name: "Select Plain" })).not.toBeInTheDocument();
      expect(screen.getByRole("dialog", { name: "Modal Luar Desktop" })).toBeInTheDocument();
      expect(document.activeElement).toBe(plainTrigger);

      await user.click(plainTrigger);
      expect(screen.getByRole("listbox", { name: "Select Plain" })).toBeInTheDocument();
      await user.tab();
      expect(screen.queryByRole("listbox", { name: "Select Plain" })).not.toBeInTheDocument();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Aksi Berikutnya" }));

      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog", { name: "Modal Luar Desktop" })).not.toBeInTheDocument();
      expect(document.activeElement).toBe(outerTrigger);
    } finally {
      restoreViewport();
    }
  });

  it("Nested SheetDialog inside SheetDialog keeps Tab in inner dialog and closes top-most first on Escape", async () => {
    const user = userEvent.setup();

    function DoubleDialogHarness() {
      const [outerOpen, setOuterOpen] = useState(false);
      const [innerOpen, setInnerOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOuterOpen(true)}>
            Buka Luar
          </button>
          <SheetDialog open={outerOpen} onClose={() => setOuterOpen(false)} title="Dialog Luar">
            <button type="button" onClick={() => setInnerOpen(true)}>
              Buka Dalam
            </button>
            <SheetDialog open={innerOpen} onClose={() => setInnerOpen(false)} title="Dialog Dalam">
              <input type="text" aria-label="Input Dalam" />
            </SheetDialog>
          </SheetDialog>
        </div>
      );
    }

    render(<DoubleDialogHarness />);
    const outerTrigger = screen.getByRole("button", { name: "Buka Luar" });
    outerTrigger.focus();
    await user.click(outerTrigger);

    const innerTrigger = screen.getByRole("button", { name: "Buka Dalam" });
    innerTrigger.focus();
    await user.click(innerTrigger);

    const innerDialog = screen.getByRole("dialog", { name: "Dialog Dalam" });
    const innerInput = screen.getByLabelText("Input Dalam");
    expect(innerDialog.contains(document.activeElement)).toBe(true);

    await user.tab();
    expect(document.activeElement).toBe(innerInput);
    await user.tab();
    expect(innerDialog.contains(document.activeElement)).toBe(true);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Dialog Dalam" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Dialog Luar" })).toBeInTheDocument();
    expect(document.activeElement).toBe(innerTrigger);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Dialog Luar" })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(outerTrigger);
  });

  it("SegmentedTabs maintains roving tabIndex and supports Home/End/ArrowRight/ArrowLeft in anti-slop", () => {
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiMode, "anti-slop");
    const onChange = vi.fn();

    render(
      <ThemeProvider>
        <SegmentedTabs
          ariaLabel="Tab Formulasi"
          value="two"
          onChange={onChange}
          options={[
            { value: "one", label: "Satu", panelId: "panel-one" },
            { value: "two", label: "Dua", panelId: "panel-two" },
            { value: "three", label: "Tiga", panelId: "panel-three" },
          ]}
        />
      </ThemeProvider>,
    );

    const tablist = screen.getByRole("tablist", { name: "Tab Formulasi" });
    expect(tablist.className).not.toContain("acrylic-control-capsule");

    const tab1 = screen.getByRole("tab", { name: "Satu" });
    const tab2 = screen.getByRole("tab", { name: "Dua" });
    const tab3 = screen.getByRole("tab", { name: "Tiga" });

    expect(tab1).toHaveAttribute("tabindex", "-1");
    expect(tab2).toHaveAttribute("tabindex", "0");
    expect(tab3).toHaveAttribute("tabindex", "-1");
    expect(tab1).toHaveAttribute("aria-controls", "panel-one");

    tab2.focus();
    fireEvent.keyDown(tab2, { key: "End" });
    expect(onChange).toHaveBeenCalledWith("three");
    expect(document.activeElement).toBe(tab3);

    fireEvent.keyDown(tab3, { key: "Home" });
    expect(onChange).toHaveBeenCalledWith("one");
    expect(document.activeElement).toBe(tab1);

    fireEvent.keyDown(tab1, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenCalledWith("three");
  });

  it("Core UI primitives render flat anti-slop surfaces without glows, specular SVG, or em dashes", () => {
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiMode, "anti-slop");

    const { container } = render(
      <ThemeProvider>
        <div>
          <GlossySquircleIcon tone="mint" icon={<span>M</span>} />
          <Badge tone="emerald">Optimal</Badge>
          <Card data-testid="card">Isi kartu</Card>
          <Button disabled>Tersimpan</Button>
          <Switch checked={false} onCheckedChange={vi.fn()} label="Sakelar Uji" />
          <ThemedSelect ariaLabel="Pemilih Uji" value="" onChange={vi.fn()} options={[]} />
          <TrakteerSupportButton variant="settings" language="id" />
          <TrakteerSupportButton variant="sidebar" compact={false} language="id" />
          <TrakteerSupportButton variant="sidebar" compact language="id" />
        </div>
      </ThemeProvider>,
    );

    // GlossySquircleIcon: no specular <svg> or inline gradient
    const squircle = container.querySelector('span[aria-hidden="true"]');
    expect(squircle?.querySelector("svg")).toBeNull();
    expect(squircle?.getAttribute("style")).toBeNull();

    // Badge: flat rounded-md without glow-pill-emerald
    const badge = screen.getByText("Optimal");
    expect(badge.className).toContain("rounded-md");
    expect(badge.className).not.toContain("glow-pill-emerald");

    // Card: flat rounded-xl without glass-card
    const card = screen.getByTestId("card");
    expect(card.className).toContain("rounded-xl");
    expect(card.className).not.toContain("glass-card");

    // Disabled Button keeps pointer-events enabled so cursor: not-allowed applies
    const disabledBtn = screen.getByRole("button", { name: "Tersimpan" });
    expect(disabledBtn.className).not.toContain("disabled:pointer-events-none");

    // Switch accepts data-* / rest props and keeps >= 44px mobile hit box
    render(
      <ThemeProvider>
        <Switch
          checked
          onCheckedChange={vi.fn()}
          label="Mode AMOLED"
          data-theme-control="amoled"
          data-testid="amoled-switch"
          aria-describedby="amoled-hint"
        />
      </ThemeProvider>,
    );
    const sw = screen.getByRole("switch", { name: "Sakelar Uji" });
    expect(sw.className).toContain("min-h-11");
    expect(sw.className).toContain("min-w-11");

    const amoledSw = screen.getByTestId("amoled-switch");
    expect(amoledSw).toHaveAttribute("data-theme-control", "amoled");
    expect(amoledSw).toHaveAttribute("aria-describedby", "amoled-hint");
    expect(amoledSw.className).toContain("min-h-11");
    expect(amoledSw.className).toContain("min-w-11");

    // NumericCellInput uses "-" instead of "—" and min-h-11 rounded-md in anti-slop
    render(
      <ThemeProvider>
        <NumericCellInput value={null} onCommit={vi.fn()} ariaLabel="Harga Uji" />
      </ThemeProvider>,
    );
    const numInput = screen.getByRole("textbox", { name: "Harga Uji" });
    expect(numInput).toHaveAttribute("placeholder", "-");
    expect(numInput.className).toContain("min-h-11");
    expect(numInput.className).toContain("rounded-md");

    // ThemedSelect fallback uses "-" instead of "—" in anti-slop
    const combobox = screen.getByRole("combobox", { name: "Pemilih Uji" });
    expect(combobox).toHaveTextContent("-");
    expect(combobox.textContent).not.toContain("—");

    // Trakteer links preserve external target and omit .trakteer-glass-card
    expect(container.querySelector(".trakteer-glass-card")).toBeNull();
    const links = screen.getAllByRole("link", { name: /Dukung via Trakteer/i });
    expect(links).toHaveLength(3);
    for (const link of links) {
      expect(link).toHaveAttribute("href", TRAKTEER_SUPPORT_URL);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("anti-slop.css passes WCAG AA unrounded contrast ratios across all 15 palette variants (5 palettes x Light/Dark/AMOLED)", () => {
    const cssPath = resolve(process.cwd(), "src/theme/anti-slop.css");
    const css = readFileSync(cssPath, "utf8");
    const blockRegex =
      /\[data-ui-mode="anti-slop"\]\[data-theme="([^"]+)"\]\[data-mode="([^"]+)"\]\s*\{([^}]+)\}/g;

    const blocks: { theme: string; mode: string; tokens: Record<string, string> }[] = [];
    for (const match of css.matchAll(blockRegex)) {
      const tokens: Record<string, string> = {};
      for (const line of match[3]!.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) {
        tokens[line[1]!] = line[2]!;
      }
      blocks.push({ theme: match[1]!, mode: match[2]!, tokens });
    }
    expect(blocks).toHaveLength(10);

    const variants = blocks.flatMap((b) =>
      b.mode === "dark"
        ? [
            { name: `${b.theme}-dark`, tokens: b.tokens },
            {
              name: `${b.theme}-dark-amoled`,
              tokens: { ...b.tokens, "--bg-canvas": "#000000", "--bg-sunken": "#000000" },
            },
          ]
        : [{ name: `${b.theme}-light`, tokens: b.tokens }],
    );
    expect(variants).toHaveLength(15);

    const failures: string[] = [];
    for (const { name, tokens: t } of variants) {
      for (const surf of ["--bg-canvas", "--bg-surface", "--bg-surface-elevated", "--bg-sunken"]) {
        for (const txt of [
          "--text-primary",
          "--text-secondary",
          "--text-muted",
          "--color-primary",
          "--status-success",
          "--status-warning",
          "--status-danger",
          "--status-info",
        ]) {
          const r = contrastRatio(t[txt]!, t[surf]!);
          if (r < 4.5) failures.push(`${name}: ${txt} on ${surf} = ${r.toFixed(3)}`);
        }
        for (const ui of ["--border-subtle", "--border-strong", "--focus-ring"]) {
          const r = contrastRatio(t[ui]!, t[surf]!);
          if (r < 3.0) failures.push(`${name}: ${ui} on ${surf} = ${r.toFixed(3)}`);
        }
      }
      for (const st of ["success", "warning", "danger", "info"]) {
        const textR = contrastRatio(t[`--status-${st}`]!, t[`--status-${st}-soft`]!);
        if (textR < 4.5) failures.push(`${name}: --status-${st} on soft = ${textR.toFixed(3)}`);
        const borderR = contrastRatio(t[`--status-${st}-border`]!, t[`--status-${st}-soft`]!);
        if (borderR < 3.0) {
          failures.push(`${name}: --status-${st}-border on soft = ${borderR.toFixed(3)}`);
        }
      }
      if (contrastRatio(t["--text-on-primary"]!, t["--color-primary"]!) < 4.5) {
        failures.push(`${name}: --text-on-primary on --color-primary`);
      }
      if (contrastRatio(t["--text-on-primary"]!, t["--color-primary-hover"]!) < 4.5) {
        failures.push(`${name}: --text-on-primary on --color-primary-hover`);
      }
      if (contrastRatio(t["--color-accent-contrast"]!, t["--color-accent"]!) < 4.5) {
        failures.push(`${name}: --color-accent-contrast on --color-accent`);
      }
      if (contrastRatio(t["--text-on-danger"]!, t["--status-danger"]!) < 4.5) {
        failures.push(`${name}: --text-on-danger on --status-danger`);
      }
      if (contrastRatio(t["--text-primary"]!, t["--primary-soft"]!) < 4.5) {
        failures.push(`${name}: --text-primary on --primary-soft`);
      }
      if (contrastRatio(t["--shell-chrome-fg"]!, t["--shell-chrome-bg"]!) < 4.5) {
        failures.push(`${name}: --shell-chrome-fg on --shell-chrome-bg`);
      }
      if (contrastRatio(t["--shell-chrome-accent"]!, t["--shell-chrome-bg"]!) < 4.5) {
        failures.push(`${name}: --shell-chrome-accent on --shell-chrome-bg`);
      }
      if (contrastRatio(t["--shell-chrome-border"]!, t["--shell-chrome-bg"]!) < 3.0) {
        failures.push(`${name}: --shell-chrome-border on --shell-chrome-bg`);
      }
      if (contrastRatio(t["--shell-chrome-border"]!, t["--shell-chrome-btn-bg"]!) < 3.0) {
        failures.push(`${name}: --shell-chrome-border on --shell-chrome-btn-bg`);
      }
    }

    expect(failures).toEqual([]);
  });

  it("ThemedSelect mobile sheet moves initial focus inside [role=dialog] synchronously on open, traps Tab, and restores focus on Escape", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(THEME_STORAGE_KEYS.uiMode, "anti-slop");

    const origWidthDescriptor = Object.getOwnPropertyDescriptor(window, "innerWidth");
    const origMatchMediaDescriptor = Object.getOwnPropertyDescriptor(window, "matchMedia");
    Object.defineProperty(window, "innerWidth", { value: 375, configurable: true, writable: true });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(max-width: 767px)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    try {
      render(
        <ThemeProvider>
          <ThemedSelect
            ariaLabel="Standar Ternak Mobile"
            modalTitle="Pilih Standar"
            searchable
            value="a1"
            onChange={vi.fn()}
            options={[
              { value: "a1", label: "Broiler Starter" },
              { value: "a2", label: "Layer Peak" },
            ]}
          />
        </ThemeProvider>,
      );

      const trigger = screen.getByRole("combobox", { name: "Standar Ternak Mobile" });
      await user.click(trigger);

      const dialog = screen.getByRole("dialog", { name: "Pilih Standar" });
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog.contains(document.activeElement)).toBe(true);

      // Tab wraps into dialog controls and stays trapped inside [role=dialog]
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
      await user.tab({ shift: true });
      expect(dialog.contains(document.activeElement)).toBe(true);

      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(document.activeElement).toBe(trigger);
    } finally {
      if (origWidthDescriptor) {
        Object.defineProperty(window, "innerWidth", origWidthDescriptor);
      }
      if (origMatchMediaDescriptor) {
        Object.defineProperty(window, "matchMedia", origMatchMediaDescriptor);
      } else {
        Reflect.deleteProperty(window, "matchMedia");
      }
    }
  });

  it("anti-slop.css orders -webkit-backdrop-filter before backdrop-filter, sets solid sticky tokens, and places 767px touch targets unlayered", () => {
    const cssPath = resolve(process.cwd(), "src/theme/anti-slop.css");
    const css = readFileSync(cssPath, "utf8");

    expect(css).toContain(':root[data-ui-mode="anti-slop"] thead');
    expect(css).toContain(':root[data-ui-mode="anti-slop"] th');
    expect(css).toContain(':root[data-ui-mode="anti-slop"] td');
    expect(css).toContain(':root[data-ui-mode="anti-slop"] [class*="backdrop-blur"]');
    expect(css).toContain("--tw-backdrop-blur: initial;");
    expect(css).toContain("backdrop-filter: none !important;");
    expect(css).toContain("-webkit-backdrop-filter: none !important;");
    expect(css).toContain("--glass-sticky-bg: var(--bg-sunken);");
    expect(css).toContain("--glass-table-bg: var(--bg-surface);");
    expect(css).not.toContain("[data-shell-chrome=");

    for (const block of css.matchAll(/\{([^{}]*backdrop-filter[^{}]*)\}/g)) {
      const body = block[1]!;
      const webkitIdx = body.indexOf("-webkit-backdrop-filter: none !important;");
      const standardIdx = body.indexOf("\n    backdrop-filter: none !important;");
      expect(webkitIdx).toBeGreaterThanOrEqual(0);
      expect(standardIdx).toBeGreaterThan(webkitIdx);
    }

    const componentsIdx = css.indexOf("@layer components {");
    const touchTargetIdx = css.indexOf("@media (pointer: coarse), (max-width: 767px)");
    expect(componentsIdx).toBeGreaterThan(-1);
    expect(touchTargetIdx).toBeGreaterThan(componentsIdx);
    const betweenLayerAndTouch = css.slice(componentsIdx, touchTargetIdx);
    const openBraces = (betweenLayerAndTouch.match(/\{/g) ?? []).length;
    const closeBraces = (betweenLayerAndTouch.match(/\}/g) ?? []).length;
    expect(openBraces).toBe(closeBraces);
    expect(css).not.toContain("(max-width: 768px)");
  });
});
