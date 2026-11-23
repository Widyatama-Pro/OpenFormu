import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const activeSessions = new Set();

// Resolve playwright-cli directly via node on Windows to avoid DEP0190 warnings.
function resolvePlaywrightCliRunner() {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA ?? "";
    const globalCliJs = path.join(
      appData,
      "npm",
      "node_modules",
      "@playwright",
      "cli",
      "playwright-cli.js",
    );
    if (fs.existsSync(globalCliJs)) {
      return {
        command: process.execPath,
        prefixArgs: [globalCliJs],
      };
    }
    return {
      command: "cmd.exe",
      prefixArgs: ["/d", "/s", "/c", "playwright-cli.cmd"],
    };
  }

  return {
    command: "playwright-cli",
    prefixArgs: [],
  };
}

// Shared page helpers injected into run-code --filename scripts for opaque-box tests.
const PAGE_HELPERS_SOURCE = `
const H = {
  async waitForHydration(page, timeoutMs = 15000) {
    await page.waitForFunction(() => {
      const root = document.getElementById("root");
      return Boolean(root && root.children.length > 0 && document.querySelector("main"));
    }, null, { timeout: timeoutMs });
    await page.waitForTimeout(180);
  },

  async waitForSolverIdle(page, timeoutMs = 10000) {
    // Wait past usePrototypeStore's 120ms solve debounce before checking the toast.
    await page.waitForTimeout(220);
    try {
      await page.waitForFunction(() => {
        const toast = document.querySelector('[data-solving-toast="top-right"]');
        return !toast;
      }, null, { timeout: timeoutMs });
    } catch {
      // Solver toast may not appear if solve completed synchronously.
    }
    await page.waitForTimeout(120);
  },

  routeLabels: {
    formulation: { id: "Formulasi Ransum", shortId: "Formulasi", en: "Ration Formulation", shortEn: "Formulate" },
    ingredients: { id: "Database Bahan", shortId: "Bahan", en: "Ingredient DB", shortEn: "Feeds" },
    requirements: { id: "Profil Kebutuhan Ternak", shortId: "Ternak", en: "Livestock Profiles", shortEn: "Targets" },
    recipes: { id: "Resep & Ekspor", shortId: "Resep", en: "Recipes & Export", shortEn: "Recipes" },
    advanced: { id: "Modul Lanjutan", shortId: "Lanjutan", en: "Advanced Modules", shortEn: "Pro Lab" },
    settings: { id: "Pengaturan", shortId: "Setelan", en: "Settings", shortEn: "Settings" },
  },

  async navigateTo(page, routeKey) {
    const meta = H.routeLabels[routeKey];
    if (!meta) throw new Error("Unknown route key: " + routeKey);
    const vp = page.viewportSize() || { width: 1440, height: 900 };

    if (vp.width >= 1024) {
      const sidebar = page.locator('aside nav[aria-label="Menu modul"]');
      const btn = sidebar.locator("button").filter({
        hasText: new RegExp("^(" + H.escapeRe(meta.id) + "|" + H.escapeRe(meta.en) + ")$"),
      });
      if ((await btn.count()) > 0) {
        await btn.first().click();
      } else {
        const byAria = sidebar.locator(
          'button[aria-label="' + meta.id + '"], button[aria-label="' + meta.en + '"]',
        );
        await byAria.first().click();
      }
      await page.waitForTimeout(180);
      return;
    }

    if (vp.width < 768 && (routeKey === "formulation" || routeKey === "ingredients" || routeKey === "recipes")) {
      const bottomNav = page.locator('nav[aria-label="Navigasi bawah mobile"]');
      const btn = bottomNav.locator("button").filter({
        hasText: new RegExp("^(" + H.escapeRe(meta.shortId) + "|" + H.escapeRe(meta.shortEn) + ")$"),
      });
      await btn.first().click();
      await page.waitForTimeout(180);
      return;
    }

    if (vp.width < 768) {
      const moreBtn = page
        .locator('nav[aria-label="Navigasi bawah mobile"]')
        .getByRole("button", { name: /Menu/i });
      await moreBtn.first().click();
    } else {
      const tabletBtn = page
        .locator("header")
        .getByRole("button", { name: /menu navigasi|navigation menu/i });
      await tabletBtn.first().click();
    }

    const dialog = page.locator('[role="dialog"]');
    await dialog.first().waitFor({ state: "visible", timeout: 5000 });
    const routeBtn = dialog.locator("button").filter({
      hasText: new RegExp("^(" + H.escapeRe(meta.id) + "|" + H.escapeRe(meta.en) + ")$"),
    });
    await routeBtn.first().click();
    await page.waitForTimeout(200);
  },

  escapeRe(str) {
    return str.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&");
  },

  async ensureSettingsBasicTab(page) {
    const basicTab = page.locator('[role="tab"]').filter({
      hasText: /Pengaturan Dasar|Basic Settings/,
    });
    if ((await basicTab.count()) > 0) {
      await basicTab.first().click();
      await page.waitForTimeout(100);
    }
  },

  async ensureSettingsAdvancedTab(page) {
    const advTab = page.locator('[role="tab"]').filter({
      hasText: /Pengaturan Lanjutan|Advanced Settings/,
    });
    if ((await advTab.count()) > 0) {
      await advTab.first().click();
      await page.waitForTimeout(120);
    }
  },

  async selectUiMode(page, modeLabel) {
    await H.navigateTo(page, "settings");
    await H.ensureSettingsBasicTab(page);

    const exactRe = new RegExp("^" + H.escapeRe(modeLabel) + "(?:\\\\b|$)", "i");
    const radio = page.getByRole("radio", { name: exactRe });
    if ((await radio.count()) > 0) {
      await radio.first().click();
      await page.waitForTimeout(180);
      return;
    }

    const byData = page.locator('[data-theme-control="ui-mode"][data-ui-mode-value="' + modeLabel.toLowerCase() + '"]');
    if ((await byData.count()) > 0) {
      await byData.first().click();
      await page.waitForTimeout(180);
      return;
    }

    const btn = page.getByRole("button", { name: exactRe });
    if ((await btn.count()) > 0) {
      await btn.first().click();
      await page.waitForTimeout(180);
      return;
    }

    throw new Error(
      'Three-mode UI selector option "' + modeLabel + '" not found in Settings (expected role="radio" or button labeled "' + modeLabel + '").',
    );
  },

  async setColorMode(page, mode) {
    const btn = page.locator('[data-theme-control="mode"][data-mode-value="' + mode + '"]');
    if ((await btn.count()) === 0) {
      throw new Error('Color mode control "' + mode + '" not found.');
    }
    await btn.first().click();
    await page.waitForTimeout(180);
  },

  async setPaletteId(page, paletteId) {
    const current = await page.evaluate(() => document.documentElement.dataset.theme ?? null);
    if (current === paletteId) return;
    const nextBtn = page
      .getByRole("button", { name: /Tema berikutnya|Next theme/i })
      .or(page.locator('[data-theme-control="palette-next"]'));
    if ((await nextBtn.count()) === 0) {
      throw new Error('Palette stepper button "Next theme" not found.');
    }
    for (let i = 0; i < 6; i++) {
      await nextBtn.first().click();
      await page.waitForTimeout(120);
      const theme = await page.evaluate(() => document.documentElement.dataset.theme ?? null);
      if (theme === paletteId) {
        await page.waitForTimeout(80);
        return;
      }
    }
    throw new Error('Palette "' + paletteId + '" could not be selected via palette stepper.');
  },

  async setAmoled(page, enabled) {
    await H.ensureSettingsAdvancedTab(page);
    const sw = page
      .getByRole("switch", { name: /Android OLED/i })
      .or(page.locator('[data-theme-control="amoled"]'));
    if ((await sw.count()) === 0) {
      throw new Error("AMOLED toggle switch not found in Advanced Settings.");
    }
    const current = (await sw.first().getAttribute("aria-checked")) === "true";
    if (current !== enabled) {
      await sw.first().click();
      await page.waitForTimeout(180);
    }
  },

  async getCurrentLanguage(page) {
    return await page.evaluate(() => {
      const btn = document.querySelector(
        'header button[aria-label="Ganti bahasa ke English"], header button[aria-label="Switch language to Indonesian"]',
      );
      if (btn) {
        return btn.getAttribute("aria-label") === "Switch language to Indonesian" ? "en" : "id";
      }
      return document.documentElement.lang || "id";
    });
  },

  async setLanguage(page, lang) {
    const currentLang = await H.getCurrentLanguage(page);
    if (currentLang === lang) return;
    const toggle = page.locator(
      'header button[aria-label="Ganti bahasa ke English"], header button[aria-label="Switch language to Indonesian"]',
    );
    if ((await toggle.count()) > 0) {
      await toggle.first().click();
      await page.waitForTimeout(180);
      return;
    }
    throw new Error("Header language toggle button not found.");
  },

  async selectThemedOption(page, comboboxSelectorOrAria, optionTextRe) {
    const trigger = typeof comboboxSelectorOrAria === "string" && comboboxSelectorOrAria.startsWith("#")
      ? page.locator(comboboxSelectorOrAria)
      : page.getByRole("combobox", { name: comboboxSelectorOrAria });
    await trigger.first().click();
    await page.waitForTimeout(140);
    const opt = page.locator('[role="option"]').filter({ hasText: optionTextRe });
    await opt.first().waitFor({ state: "visible", timeout: 4000 });
    await opt.first().click();
    await page.waitForTimeout(160);
  },

  async probeLayoutAndOverflow(page) {
    return await page.evaluate(() => {
      const docEl = document.documentElement;
      const scrollWidth = docEl.scrollWidth;
      const clientWidth = docEl.clientWidth;
      const innerWidth = window.innerWidth;
      const h1s = Array.from(document.querySelectorAll("h1")).filter((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.height > 0;
      });
      return {
        scrollWidth,
        clientWidth,
        innerWidth,
        hasHorizontalOverflow: scrollWidth > clientWidth,
        visibleH1Count: h1s.length,
        hasHeader: Boolean(document.querySelector("header")),
        hasNav: Boolean(document.querySelector("nav")),
        hasMain: Boolean(document.querySelector("main")),
      };
    });
  },

  async probeMobileTouchTargets(page, minPx = 44) {
    return await page.evaluate((minSize) => {
      const vpWidth = window.innerWidth;
      if (vpWidth >= 768) return { checked: 0, violations: [] };
      const selectors = [
        "button",
        "a[href]",
        '[role="tab"]',
        '[role="radio"]',
        '[role="switch"]',
        '[role="combobox"]',
      ].join(",");
      const elements = Array.from(document.querySelectorAll(selectors));
      const violations = [];
      let checked = 0;

      for (const el of elements) {
        if (el.getAttribute("tabindex") === "-1") continue;
        if (el.getAttribute("aria-hidden") === "true") continue;
        if (el.dataset && el.dataset.themeControl === "palette") continue;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) {
          continue;
        }
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.right < 0 || rect.left > window.innerWidth) continue;
        if (rect.bottom < 0 || rect.top > window.innerHeight) continue;

        checked++;
        if (rect.width < minSize - 0.5 || rect.height < minSize - 0.5) {
          violations.push({
            tag: el.tagName.toLowerCase(),
            label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 60),
            width: Math.round(rect.width * 10) / 10,
            height: Math.round(rect.height * 10) / 10,
          });
        }
      }
      return { checked, violations };
    }, minPx);
  },

  async probeAntiSlopSurface(page, { checkCursor = true } = {}) {
    return await page.evaluate((opts) => {
      const visibleText = document.body ? document.body.innerText : "";
      const emDashLines = visibleText
        .split(/\\r?\\n/)
        .map((s) => s.trim())
        .filter((s) => s.includes("\\u2014"));

      const allEls = Array.from(document.querySelectorAll("*"));
      const backdropBlurElements = [];
      const infinitePulseElements = [];

      for (const el of allEls) {
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) {
          continue;
        }
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const bf = cs.backdropFilter || cs.webkitBackdropFilter || "none";
        if (bf && bf !== "none") {
          backdropBlurElements.push({
            tag: el.tagName.toLowerCase(),
            cls: String(el.className || "").slice(0, 60),
            backdropFilter: bf,
          });
        }

        const animCount = cs.animationIterationCount;
        const animName = cs.animationName;
        if (animCount === "infinite" && animName && animName !== "none") {
          if (/pulse|bounce|float|glow|orb|shimmer/i.test(animName)) {
            infinitePulseElements.push({
              tag: el.tagName.toLowerCase(),
              cls: String(el.className || "").slice(0, 60),
              animationName: animName,
            });
          }
        }
      }

      const cursorViolations = [];
      if (opts.checkCursor) {
        const interactive = Array.from(
          document.querySelectorAll('button:not(:disabled), a[href], [role="tab"], [role="radio"], [role="switch"]'),
        );
        for (const el of interactive) {
          const cs = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          if (cs.display === "none" || cs.visibility === "hidden" || rect.width === 0 || rect.height === 0) {
            continue;
          }
          if (el.getAttribute("aria-disabled") === "true") continue;
          if (cs.cursor !== "pointer") {
            cursorViolations.push({
              tag: el.tagName.toLowerCase(),
              label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 50),
              cursor: cs.cursor,
            });
          }
        }
      }

      return {
        emDashCount: emDashLines.length,
        emDashSamples: emDashLines.slice(0, 8),
        backdropBlurCount: backdropBlurElements.length,
        backdropBlurElements: backdropBlurElements.slice(0, 6),
        infinitePulseCount: infinitePulseElements.length,
        infinitePulseElements: infinitePulseElements.slice(0, 6),
        cursorViolations: cursorViolations.slice(0, 8),
      };
    }, { checkCursor });
  },

  async sampleContrastPairs(page) {
    return await page.evaluate(() => {
      const colorCtx = (() => {
        try {
          const c = document.createElement("canvas");
          c.width = 1;
          c.height = 1;
          return c.getContext("2d", { willReadFrequently: true });
        } catch {
          return null;
        }
      })();

      function parseCssColor(raw) {
        if (!raw || raw === "transparent") return [0, 0, 0, 0];
        const rgbaMatch = /rgba?\\(\\s*([\\d.]+)[,\\s]+([\\d.]+)[,\\s]+([\\d.]+)(?:[,/\\s]+([\\d.]+%?))?\\s*\\)/i.exec(raw);
        if (rgbaMatch) {
          const r = Math.round(Number(rgbaMatch[1]));
          const g = Math.round(Number(rgbaMatch[2]));
          const b = Math.round(Number(rgbaMatch[3]));
          let a = 1;
          if (rgbaMatch[4] !== undefined) {
            a = rgbaMatch[4].endsWith("%") ? parseFloat(rgbaMatch[4]) / 100 : parseFloat(rgbaMatch[4]);
          }
          return [r, g, b, a];
        }
        const srgbMatch = /color\\(srgb\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)(?:\\s*\\/\\s*([\\d.]+%?))?\\s*\\)/i.exec(raw);
        if (srgbMatch) {
          const r = Math.round(Number(srgbMatch[1]) * 255);
          const g = Math.round(Number(srgbMatch[2]) * 255);
          const b = Math.round(Number(srgbMatch[3]) * 255);
          let a = 1;
          if (srgbMatch[4] !== undefined) {
            a = srgbMatch[4].endsWith("%") ? parseFloat(srgbMatch[4]) / 100 : parseFloat(srgbMatch[4]);
          }
          return [r, g, b, a];
        }
        if (colorCtx) {
          try {
            colorCtx.clearRect(0, 0, 1, 1);
            colorCtx.fillStyle = "rgba(0, 0, 0, 0)";
            colorCtx.fillStyle = raw.trim();
            colorCtx.fillRect(0, 0, 1, 1);
            const d = colorCtx.getImageData(0, 0, 1, 1).data;
            return [d[0], d[1], d[2], d[3] / 255];
          } catch {
            return [0, 0, 0, 0];
          }
        }
        return [0, 0, 0, 0];
      }

      function compositeOver(fg, bg) {
        const alpha = Math.max(0, Math.min(1, fg[3]));
        const inv = 1 - alpha;
        return [
          Math.round(fg[0] * alpha + bg[0] * inv),
          Math.round(fg[1] * alpha + bg[1] * inv),
          Math.round(fg[2] * alpha + bg[2] * inv),
          1,
        ];
      }

      function toHex(rgb) {
        return (
          "#" +
          [rgb[0], rgb[1], rgb[2]]
            .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
            .join("")
            .toUpperCase()
        );
      }

      function extractGradientStops(bgImage) {
        if (!bgImage || bgImage === "none") return [];
        const matches =
          bgImage.match(/(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\\([^)]+\\)|#[0-9a-f]{3,8}/gi) || [];
        return matches.map(parseCssColor).filter((c) => c[3] > 0);
      }

      function paintBgCandidates(el, baseBg) {
        const cs = getComputedStyle(el);
        const bgCol = parseCssColor(cs.backgroundColor);
        let out = [baseBg];
        if (bgCol[3] > 0) {
          out = out.map((b) => compositeOver(bgCol, b));
        }
        const stops = extractGradientStops(cs.backgroundImage);
        if (stops.length > 0) {
          const next = [];
          for (const b of out) {
            for (const s of stops) {
              next.push(compositeOver(s, b));
            }
          }
          out = next;
        }
        // Check absolute-positioned full-button background layers (ignore thin edge accent bars).
        if (el.tagName === "BUTTON" || el.tagName === "A") {
          const elRect = el.getBoundingClientRect();
          for (const child of Array.from(el.children)) {
            const ccs = getComputedStyle(child);
            const cRect = child.getBoundingClientRect();
            const coversButton =
              elRect.width > 0 &&
              elRect.height > 0 &&
              cRect.width >= elRect.width * 0.5 &&
              cRect.height >= elRect.height * 0.5;
            if (
              coversButton &&
              ccs.position === "absolute" &&
              (ccs.pointerEvents === "none" || child.getAttribute("aria-hidden") === "true")
            ) {
              const cBg = parseCssColor(ccs.backgroundColor);
              const cStops = extractGradientStops(ccs.backgroundImage);
              if (cBg[3] > 0) out = out.map((b) => compositeOver(cBg, b));
              if (cStops.length > 0) {
                const next = [];
                for (const b of out) {
                  for (const s of cStops) next.push(compositeOver(s, b));
                }
                out = next;
              }
            }
          }
        }
        return out;
      }

      function resolveEffectiveBgCandidates(el) {
        const chain = [];
        let cur = el;
        while (cur && cur.nodeType === 1) {
          chain.push(cur);
          cur = cur.parentElement;
        }
        const modeDark = document.documentElement.dataset.mode === "dark" || document.documentElement.classList.contains("dark");
        let base = modeDark ? [15, 20, 18, 1] : [255, 255, 255, 1];
        const rootBg = parseCssColor(getComputedStyle(document.documentElement).backgroundColor);
        if (rootBg[3] > 0) base = compositeOver(rootBg, base);
        const bodyBg = parseCssColor(getComputedStyle(document.body).backgroundColor);
        if (bodyBg[3] > 0) base = compositeOver(bodyBg, base);

        let bgs = [base];
        for (let i = chain.length - 1; i >= 0; i--) {
          const nextSet = [];
          for (const b of bgs.slice(0, 4)) {
            for (const cand of paintBgCandidates(chain[i], b)) {
              nextSet.push(cand);
            }
          }
          bgs = nextSet.length > 0 ? nextSet : bgs;
        }
        const map = new Map();
        for (const rgb of bgs) map.set(toHex(rgb), rgb);
        return Array.from(map.values());
      }

      const candidates = Array.from(
        document.querySelectorAll(
          'h1, h2, h3, h4, h5, h6, p, label, button, a[href], th, td, span, li, div, strong, em, small, code, summary, [role="tab"], [role="radio"], [role="alert"], [role="status"]',
        ),
      ).filter((el) =>
        Array.from(el.childNodes).some(
          (node) => node.nodeType === Node.TEXT_NODE && (node.textContent || "").trim().length > 0,
        ),
      );

      const seen = new Set();
      const pairs = [];

      for (const el of candidates) {
        if (el.closest(".sr-only") || el.classList.contains("sr-only")) continue;
        if (el.closest('[aria-hidden="true"]')) continue;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) continue;
        const text = (el.textContent || "").trim();
        if (!text) continue;
        if (el.disabled || el.getAttribute("aria-disabled") === "true" || el.closest("button:disabled, [aria-disabled='true']")) continue;

        const fgRaw = parseCssColor(cs.color);
        if (fgRaw[3] === 0) continue;
        const bgCandidates = resolveEffectiveBgCandidates(el);
        const fontSize = parseFloat(cs.fontSize) || 14;
        const isLarge = fontSize >= 18;
        const minRatio = isLarge ? 3.0 : 4.5;

        for (const bgRgb of bgCandidates) {
          const fgRgb = fgRaw[3] < 1 ? compositeOver(fgRaw, bgRgb) : fgRaw;
          const fgHex = toHex(fgRgb);
          const bgHex = toHex(bgRgb);
          const key = fgHex + "|" + bgHex + "|" + minRatio;
          if (seen.has(key)) continue;
          seen.add(key);

          pairs.push({
            fgHex,
            bgHex,
            minRatio,
            isLarge,
            fontSize,
            sample: el.tagName.toLowerCase() + ': "' + text.slice(0, 36).replace(/\\s+/g, " ") + '"',
          });
        }
      }
      return pairs;
    });
  },

  async verifyDialogFocusAndEscape(page, triggerLocator, label = "dialog") {
    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    await dialog.first().waitFor({ state: "visible", timeout: 5000 });

    const focusInsideInitial = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"][aria-modal="true"]');
      return Boolean(dlg && document.activeElement && dlg.contains(document.activeElement));
    });
    if (!focusInsideInitial) {
      throw new Error(label + ": focus did not move inside [role=dialog] on open.");
    }

    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"][aria-modal="true"]');
        return Boolean(dlg && document.activeElement && dlg.contains(document.activeElement));
      });
      if (!inside) {
        throw new Error(label + ": Tab escaped [role=dialog] focus trap at step " + (i + 1));
      }
    }

    await page.keyboard.press("Shift+Tab");
    const insideReverse = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"][aria-modal="true"]');
      return Boolean(dlg && document.activeElement && dlg.contains(document.activeElement));
    });
    if (!insideReverse) {
      throw new Error(label + ": Shift+Tab escaped [role=dialog] focus trap.");
    }

    await page.keyboard.press("Escape");
    await dialog.first().waitFor({ state: "hidden", timeout: 4000 });

    if (triggerLocator) {
      const restored = await triggerLocator.first().evaluate((el) => document.activeElement === el);
      if (!restored) {
        throw new Error(label + ": focus was not restored to trigger element after Escape.");
      }
    }
  },

  async probeFocusIndicator(page) {
    return await page.evaluate(() => {
      const colorCtx = (() => {
        try {
          const c = document.createElement("canvas");
          c.width = 1;
          c.height = 1;
          return c.getContext("2d", { willReadFrequently: true });
        } catch {
          return null;
        }
      })();
      function parseCssColor(raw) {
        if (!raw || raw === "transparent") return [0, 0, 0, 0];
        const rgbaMatch = /rgba?\\(\\s*([\\d.]+)[,\\s]+([\\d.]+)[,\\s]+([\\d.]+)(?:[,/\\s]+([\\d.]+%?))?\\s*\\)/i.exec(raw);
        if (rgbaMatch) {
          const a = rgbaMatch[4] === undefined ? 1 : rgbaMatch[4].endsWith("%") ? parseFloat(rgbaMatch[4]) / 100 : parseFloat(rgbaMatch[4]);
          return [Math.round(Number(rgbaMatch[1])), Math.round(Number(rgbaMatch[2])), Math.round(Number(rgbaMatch[3])), a];
        }
        const srgbMatch = /color\\(srgb\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)(?:\\s*\\/\\s*([\\d.]+%?))?\\s*\\)/i.exec(raw);
        if (srgbMatch) {
          const a = srgbMatch[4] === undefined ? 1 : srgbMatch[4].endsWith("%") ? parseFloat(srgbMatch[4]) / 100 : parseFloat(srgbMatch[4]);
          return [Math.round(Number(srgbMatch[1]) * 255), Math.round(Number(srgbMatch[2]) * 255), Math.round(Number(srgbMatch[3]) * 255), a];
        }
        if (colorCtx) {
          try {
            colorCtx.clearRect(0, 0, 1, 1);
            colorCtx.fillStyle = "rgba(0, 0, 0, 0)";
            colorCtx.fillStyle = raw.trim();
            colorCtx.fillRect(0, 0, 1, 1);
            const d = colorCtx.getImageData(0, 0, 1, 1).data;
            return [d[0], d[1], d[2], d[3] / 255];
          } catch {
            return [0, 0, 0, 0];
          }
        }
        return [0, 0, 0, 0];
      }
      function compositeOver(fg, bg) {
        const a = Math.max(0, Math.min(1, fg[3]));
        return [
          Math.round(fg[0] * a + bg[0] * (1 - a)),
          Math.round(fg[1] * a + bg[1] * (1 - a)),
          Math.round(fg[2] * a + bg[2] * (1 - a)),
          1,
        ];
      }
      function toHex(rgb) {
        return "#" + [rgb[0], rgb[1], rgb[2]].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
      }
      const el = document.activeElement;
      if (!el || el === document.body) {
        return { hasIndicator: false, reason: "No focused element" };
      }
      const cs = getComputedStyle(el);
      const outlineStyle = cs.outlineStyle;
      const outlineWidth = parseFloat(cs.outlineWidth) || 0;
      const outlineColor = cs.outlineColor;
      const boxShadow = cs.boxShadow;
      const hasOutline = outlineStyle !== "none" && outlineWidth > 0;

      // Distinguish a focus ring shadow from a pre-existing decorative card shadow.
      let hasFocusShadow = false;
      if (!hasOutline && boxShadow && boxShadow !== "none") {
        el.blur();
        const unfocusedShadow = getComputedStyle(el).boxShadow;
        el.focus();
        hasFocusShadow = unfocusedShadow !== boxShadow;
      }

      const hasIndicator = hasOutline || hasFocusShadow;
      const isDark = document.documentElement.dataset.mode === "dark";
      let bg = isDark ? [15, 20, 18, 1] : [255, 255, 255, 1];
      let cur = el.parentElement;
      const chain = [];
      while (cur) { chain.push(cur); cur = cur.parentElement; }
      for (let i = chain.length - 1; i >= 0; i--) {
        const c = parseCssColor(getComputedStyle(chain[i]).backgroundColor);
        if (c[3] > 0) bg = compositeOver(c, bg);
      }
      let ringHex = null;
      if (hasOutline) {
        const oc = parseCssColor(outlineColor);
        if (oc[3] > 0) ringHex = toHex(oc[3] < 1 ? compositeOver(oc, bg) : oc);
      } else if (hasFocusShadow) {
        const colorToken = /(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\\([^)]+\\)|#[0-9a-f]{3,8}/i.exec(boxShadow);
        const sc = parseCssColor(colorToken ? colorToken[0] : boxShadow);
        if (sc[3] > 0) ringHex = toHex(sc[3] < 1 ? compositeOver(sc, bg) : sc);
      }
      return {
        hasIndicator,
        outlineStyle,
        outlineWidth,
        boxShadow,
        ringHex,
        bgHex: toHex(bg),
        tag: el.tagName.toLowerCase(),
      };
    });
  },
};
`;

function parseConsoleErrorOutput(raw) {
  const text = (raw ?? "").trim();
  const match = /Total messages:\s*(\d+)\s*\(Errors:\s*(\d+),\s*Warnings:\s*(\d+)\)/i.exec(text);
  const errorCount = match ? Number(match[2]) : 0;
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("Total messages:"));
  return {
    errorCount,
    lines,
    raw: text,
  };
}

// Use isolated os.tmpdir() cwd per session so .playwright-cli/ never pollutes the repo.
export async function createBrowserSession({ baseUrl, sessionPrefix = "openformu-e2e" }) {
  const runner = resolvePlaywrightCliRunner();
  const suffix = crypto.randomBytes(4).toString("hex");
  const sessionId = `${sessionPrefix}-${suffix}`;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "openformu-pwcli-"));
  const env = {
    ...process.env,
    NO_UPDATE_NOTIFIER: "1",
    CI: "1",
  };

  let opened = false;
  let scriptCounter = 0;

  async function execCli(args, { timeoutMs = 45000 } = {}) {
    const fullArgs = [...runner.prefixArgs, `-s=${sessionId}`, ...args];
    try {
      const { stdout, stderr } = await execFileAsync(runner.command, fullArgs, {
        cwd: tempDir,
        env,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true,
      });
      return { stdout: stdout ?? "", stderr: stderr ?? "" };
    } catch (err) {
      const out = err.stdout ? String(err.stdout).trim() : "";
      const errOut = err.stderr ? String(err.stderr).trim() : "";
      const detail = [out, errOut, err.message].filter(Boolean).join("\n");
      throw new Error(`playwright-cli ${args.join(" ")} failed:\n${detail}`);
    }
  }

  async function open() {
    await execCli(["open", "about:blank"], { timeoutMs: 30000 });
    opened = true;
    activeSessions.add(close);
  }

  async function runScript(fnOrSource, arg = {}, { timeoutMs = 45000 } = {}) {
    if (!opened) {
      await open();
    }
    scriptCounter += 1;
    const scriptPath = path.join(tempDir, `step-${scriptCounter}.js`);
    const fnSource = typeof fnOrSource === "function" ? fnOrSource.toString() : fnOrSource;
    const payload = JSON.stringify(arg);
    const wrapped = `async (page) => {\n${PAGE_HELPERS_SOURCE}\nconst arg = ${payload};\nconst __fn = ${fnSource};\nreturn await __fn(page, arg, H);\n}\n`;
    fs.writeFileSync(scriptPath, wrapped, "utf8");
    const { stdout } = await execCli(["run-code", `--filename=${scriptPath}`, "--raw"], {
      timeoutMs,
    });
    const trimmed = stdout.trim();
    if (!trimmed) return undefined;
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  async function clearConsole() {
    if (!opened) return;
    await execCli(["console", "--clear", "--raw"]);
  }

  async function getConsoleErrors() {
    if (!opened) return { errorCount: 0, lines: [], raw: "" };
    const { stdout } = await execCli(["console", "error", "--raw"]);
    return parseConsoleErrorOutput(stdout);
  }

  async function resetToFreshApp({
    viewport = { width: 1440, height: 900 },
    localStorageSeed = null,
    colorScheme = "light",
    reducedMotion = "no-preference",
  } = {}) {
    await runScript(
      async (page, opts) => {
        await page.setViewportSize(opts.viewport);
        await page.emulateMedia({
          colorScheme: opts.colorScheme,
          reducedMotion: opts.reducedMotion,
        });
        await page.goto(opts.baseUrl, { waitUntil: "domcontentloaded" });
        await page.evaluate(async (seed) => {
          localStorage.clear();
          sessionStorage.clear();
          if (seed && typeof seed === "object") {
            for (const [k, v] of Object.entries(seed)) {
              localStorage.setItem(k, String(v));
            }
          }
          await new Promise((resolve) => {
            try {
              const req = indexedDB.deleteDatabase("openformul-db");
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
              req.onblocked = () => resolve();
              setTimeout(resolve, 350);
            } catch {
              resolve();
            }
          });
        }, opts.localStorageSeed);
        await page.goto("about:blank");
      },
      { baseUrl, viewport, localStorageSeed, colorScheme, reducedMotion },
    );

    // Clear any prior-test messages right before the clean fresh navigation so mount errors are caught.
    await clearConsole();
    await runScript(
      async (page, opts, H) => {
        await page.goto(opts.baseUrl, { waitUntil: "domcontentloaded" });
        await H.waitForHydration(page);
        await H.waitForSolverIdle(page);
      },
      { baseUrl },
    );
  }

  async function close() {
    activeSessions.delete(close);
    try {
      if (opened) {
        opened = false;
        await execCli(["close"], { timeoutMs: 10000 });
      }
    } catch {
      // Best-effort browser close.
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors.
      }
    }
  }

  await open();

  return {
    sessionId,
    baseUrl,
    runScript,
    clearConsole,
    getConsoleErrors,
    resetToFreshApp,
    close,
  };
}

export async function closeAllActiveSessions() {
  const closers = Array.from(activeSessions);
  for (const fn of closers) {
    await fn();
  }
}
