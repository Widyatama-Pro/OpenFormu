const ALL_PALETTES = [
  "original-default",
  "template-01",
  "template-03",
  "template-04",
  "template-05",
];

const ALL_ROUTES = [
  "formulation",
  "ingredients",
  "requirements",
  "recipes",
  "advanced",
  "settings",
];

export const tier2Cases = [
  // F1: Storage Boundary & Corruption
  {
    id: "T2-F1-01",
    tier: 2,
    feature: "F1",
    title: "Corrupt openformu-ui-mode='invalid' falls back safely to Enhanced",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp({
        localStorageSeed: { "openformu-ui-mode": "invalid" },
      });
      const state = await session.runScript(async (page) => {
        return await page.evaluate(() => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
          uiEnhancer: document.documentElement.dataset.uiEnhancer ?? null,
        }));
      });
      assert.equal(state.uiMode, "enhanced");
      assert.equal(state.uiEnhancer, "true");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F1-01");
    },
  },
  {
    id: "T2-F1-02",
    tier: 2,
    feature: "F1",
    title: "Empty/null/__proto__/numeric openformu-ui-mode values fall back safely to Enhanced",
    run: async ({ session, assert }) => {
      for (const badVal of ["", "null", "123", "__proto__"]) {
        await session.resetToFreshApp({
          localStorageSeed: { "openformu-ui-mode": badVal },
        });
        const uiMode = await session.runScript(async (page) => {
          return await page.evaluate(() => document.documentElement.dataset.uiMode ?? null);
        });
        assert.equal(uiMode, "enhanced", `Bad value ${JSON.stringify(badVal)} must fallback`);
        assert.noConsoleErrors(await session.getConsoleErrors(), `T2-F1-02:${badVal}`);
      }
    },
  },
  {
    id: "T2-F1-03",
    tier: 2,
    feature: "F1",
    title: "Corrupt openformu-theme-enhancer='corrupt' falls back safely to Enhanced",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp({
        localStorageSeed: { "openformu-theme-enhancer": "corrupt" },
      });
      const state = await session.runScript(async (page) => {
        return await page.evaluate(() => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
          uiEnhancer: document.documentElement.dataset.uiEnhancer ?? null,
        }));
      });
      assert.equal(state.uiMode, "enhanced");
      assert.equal(state.uiEnhancer, "true");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F1-03");
    },
  },
  {
    id: "T2-F1-04",
    tier: 2,
    feature: "F1",
    title: "Legacy openformul-theme-enhancer='false' migrates safely to Biasa",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp({
        localStorageSeed: { "openformul-theme-enhancer": "false" },
      });
      const state = await session.runScript(async (page) => {
        return await page.evaluate(() => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
          uiEnhancer: document.documentElement.dataset.uiEnhancer ?? null,
        }));
      });
      assert.equal(state.uiMode, "biasa");
      assert.equal(state.uiEnhancer, "false");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F1-04");
    },
  },
  {
    id: "T2-F1-05",
    tier: 2,
    feature: "F1",
    title: "Rapid mode toggling Biasa -> Anti-Slop -> Enhanced -> Anti-Slop leaves clean state",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const state = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Biasa");
        await H.selectUiMode(page, "Anti-Slop");
        await H.selectUiMode(page, "Enhanced");
        await H.selectUiMode(page, "Anti-Slop");
        return await page.evaluate(() => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
          uiEnhancer: document.documentElement.dataset.uiEnhancer ?? null,
          stored: localStorage.getItem("openformu-ui-mode"),
        }));
      });
      assert.equal(state.uiMode, "anti-slop");
      assert.equal(state.uiEnhancer, "false");
      assert.equal(state.stored, "anti-slop");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F1-05");
    },
  },

  // F2: Selector Boundary & Persistence
  {
    id: "T2-F2-01",
    tier: 2,
    feature: "F2",
    title: "Switching mode in Settings reflects immediately on Formulation without reload",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const modeAfterNav = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.navigateTo(page, "formulation");
        return await page.evaluate(() => document.documentElement.dataset.uiMode ?? null);
      });
      assert.equal(modeAfterNav, "anti-slop");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F2-01");
    },
  },
  {
    id: "T2-F2-02",
    tier: 2,
    feature: "F2",
    title: "Mode selection persists across Settings tabs and Language toggle",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.ensureSettingsAdvancedTab(page);
        await H.setLanguage(page, "en");
        await H.ensureSettingsBasicTab(page);
        const checked = await page
          .getByRole("radio", { name: /^Anti-Slop\b/i })
          .first()
          .getAttribute("aria-checked");
        const uiMode = await page.evaluate(() => document.documentElement.dataset.uiMode ?? null);
        return { checked, uiMode };
      });
      assert.equal(res.checked, "true");
      assert.equal(res.uiMode, "anti-slop");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F2-02");
    },
  },
  {
    id: "T2-F2-03",
    tier: 2,
    feature: "F2",
    title: "Repeated click on already-selected Anti-Slop radio is idempotent",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.selectUiMode(page, "Anti-Slop");
        return await page.evaluate(() => document.documentElement.dataset.uiMode ?? null);
      });
      assert.equal(res, "anti-slop");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F2-03");
    },
  },
  {
    id: "T2-F2-04",
    tier: 2,
    feature: "F2",
    title: "Anti-Slop persists across Light -> Dark -> System -> AMOLED changes",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const state = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.setColorMode(page, "dark");
        await H.setColorMode(page, "system");
        await H.setColorMode(page, "dark");
        await H.setAmoled(page, true);
        return await page.evaluate(() => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
          colorMode: document.documentElement.dataset.mode ?? null,
          amoled: document.documentElement.dataset.amoled ?? null,
        }));
      });
      assert.equal(state.uiMode, "anti-slop");
      assert.equal(state.colorMode, "dark");
      assert.equal(state.amoled, "true");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F2-04");
    },
  },
  {
    id: "T2-F2-05",
    tier: 2,
    feature: "F2",
    title: "Reset Sample Data in Advanced Settings preserves valid UiMode and stability",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const state = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.ensureSettingsAdvancedTab(page);
        const resetBtn = page
          .getByRole("button", { name: /Reset Data Bawaan|Reset Sample Data/i })
          .first();
        await resetBtn.click();
        await page.waitForTimeout(350);
        return await page.evaluate(() => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
        }));
      });
      assert.ok(["biasa", "enhanced", "anti-slop"].includes(state.uiMode));
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F2-05");
    },
  },

  // F3: Full 5-Palette × Light/Dark/AMOLED Contrast & Reduced Motion
  {
    id: "T2-F3-01",
    tier: 2,
    feature: "F3",
    title: "Anti-Slop Light mode passes WCAG AA contrast across all 5 palettes",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const results = await session.runScript(
        async (page, arg, H) => {
          await H.selectUiMode(page, "Anti-Slop");
          await H.setColorMode(page, "light");
          const out = [];
          for (const pid of arg.palettes) {
            await H.navigateTo(page, "settings");
            await H.ensureSettingsBasicTab(page);
            await H.setPaletteId(page, pid);
            const settingsPairs = await H.sampleContrastPairs(page);
            await H.navigateTo(page, "formulation");
            const formPairs = await H.sampleContrastPairs(page);
            out.push({ pid, pairs: [...settingsPairs, ...formPairs] });
          }
          return out;
        },
        { palettes: ALL_PALETTES },
      );
      for (const item of results) {
        await assert.checkContrastPairs(item.pairs, `Anti-Slop Light ${item.pid}`);
      }
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F3-01");
    },
  },
  {
    id: "T2-F3-02",
    tier: 2,
    feature: "F3",
    title: "Anti-Slop Dark mode passes WCAG AA contrast across all 5 palettes",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const results = await session.runScript(
        async (page, arg, H) => {
          await H.selectUiMode(page, "Anti-Slop");
          await H.setColorMode(page, "dark");
          const out = [];
          for (const pid of arg.palettes) {
            await H.navigateTo(page, "settings");
            await H.ensureSettingsBasicTab(page);
            await H.setPaletteId(page, pid);
            const settingsPairs = await H.sampleContrastPairs(page);
            await H.navigateTo(page, "formulation");
            const formPairs = await H.sampleContrastPairs(page);
            out.push({ pid, pairs: [...settingsPairs, ...formPairs] });
          }
          return out;
        },
        { palettes: ALL_PALETTES },
      );
      for (const item of results) {
        await assert.checkContrastPairs(item.pairs, `Anti-Slop Dark ${item.pid}`);
      }
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F3-02");
    },
  },
  {
    id: "T2-F3-03",
    tier: 2,
    feature: "F3",
    title: "Anti-Slop Dark + AMOLED (#000000) passes WCAG AA contrast across all 5 palettes",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const results = await session.runScript(
        async (page, arg, H) => {
          await H.selectUiMode(page, "Anti-Slop");
          await H.setColorMode(page, "dark");
          await H.setAmoled(page, true);
          const out = [];
          for (const pid of arg.palettes) {
            await H.navigateTo(page, "settings");
            await H.ensureSettingsBasicTab(page);
            await H.setPaletteId(page, pid);
            const settingsPairs = await H.sampleContrastPairs(page);
            await H.navigateTo(page, "formulation");
            const formPairs = await H.sampleContrastPairs(page);
            out.push({ pid, pairs: [...settingsPairs, ...formPairs] });
          }
          return out;
        },
        { palettes: ALL_PALETTES },
      );
      for (const item of results) {
        await assert.checkContrastPairs(item.pairs, `Anti-Slop AMOLED ${item.pid}`);
      }
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F3-03");
    },
  },
  {
    id: "T2-F3-04",
    tier: 2,
    feature: "F3",
    title: ":focus-visible indicator in Anti-Slop Light & Dark is visible and >= 3.0:1 contrast",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const probes = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        const out = [];
        for (const mode of ["light", "dark"]) {
          await H.setColorMode(page, mode);
          const radio = page.getByRole("radio", { name: /^Anti-Slop\b/i }).first();
          await radio.focus();
          await page.keyboard.press("Tab");
          await page.waitForTimeout(80);
          out.push({ mode, ...(await H.probeFocusIndicator(page)) });
        }
        return out;
      });
      for (const p of probes) {
        assert.ok(p.hasIndicator, `Missing :focus-visible indicator in Anti-Slop ${p.mode}`);
        if (p.ringHex && p.bgHex) {
          await assert.checkContrastPairs(
            [
              {
                fgHex: p.ringHex,
                bgHex: p.bgHex,
                minRatio: 3.0,
                sample: `focus-visible (${p.mode} ${p.tag})`,
              },
            ],
            `Focus ring ${p.mode}`,
          );
        }
      }
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F3-04");
    },
  },
  {
    id: "T2-F3-05",
    tier: 2,
    feature: "F3",
    title: "prefers-reduced-motion: reduce minimizes animations and transitions in Anti-Slop",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp({ reducedMotion: "reduce" });
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.navigateTo(page, "formulation");
        return await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll("button")).slice(0, 12);
          const longDurations = [];
          for (const b of btns) {
            const cs = getComputedStyle(b);
            const dur = parseFloat(cs.transitionDuration) || 0;
            if (dur > 0.05) {
              longDurations.push({ label: (b.textContent ?? "").trim(), dur });
            }
          }
          return {
            matchesReduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
            longDurations,
          };
        });
      });
      assert.ok(res.matchesReduced, "Emulated reducedMotion must match media query");
      assert.equal(
        res.longDurations.length,
        0,
        `Transitions exceeded reduced-motion threshold: ${JSON.stringify(res.longDurations)}`,
      );
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F3-05");
    },
  },

  // F4: Focus Trap, Escape & Focus Restore Across ALL Modals/Drawers
  {
    id: "T2-F4-01",
    tier: 2,
    feature: "F4",
    title: "ExportDialog and SaveRecipeDialog trap focus, close on Escape, and restore focus",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.navigateTo(page, "formulation");

        const exportTrigger = page.getByRole("button", { name: /Ekspor PDF|Export PDF/i }).first();
        await exportTrigger.focus();
        await exportTrigger.click();
        await H.verifyDialogFocusAndEscape(page, exportTrigger, "ExportDialog");

        const saveTrigger = page.getByRole("button", { name: /^Simpan$|^Save$/i }).first();
        await saveTrigger.focus();
        await saveTrigger.click();
        await H.verifyDialogFocusAndEscape(page, saveTrigger, "SaveRecipeDialog");
      });
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F4-01");
    },
  },
  {
    id: "T2-F4-02",
    tier: 2,
    feature: "F4",
    title:
      "AddEditIngredientModal and IngredientDetailSheet trap focus, close on Escape, and restore focus",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.navigateTo(page, "formulation");

        const addTrigger = page
          .getByRole("button", { name: /Tambah Bahan Baru|Add New Feed/i })
          .first();
        await addTrigger.focus();
        await addTrigger.click();
        await H.verifyDialogFocusAndEscape(page, addTrigger, "AddEditIngredientModal");

        const detailTrigger = page.locator('button[aria-label^="Edit detail "]').first();
        await detailTrigger.focus();
        await detailTrigger.click();
        await H.verifyDialogFocusAndEscape(page, detailTrigger, "IngredientDetailSheet");
      });
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F4-02");
    },
  },
  {
    id: "T2-F4-03",
    tier: 2,
    feature: "F4",
    title:
      "PrecisionEngineDialog and Requirement create modal trap focus, close on Escape, and restore focus",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.ensureSettingsAdvancedTab(page);

        const precTrigger = page
          .getByRole("button", { name: /Atur Presisi LP|Configure Precision LP/i })
          .first();
        await precTrigger.focus();
        await precTrigger.click();
        await H.verifyDialogFocusAndEscape(page, precTrigger, "PrecisionEngineDialog");

        await H.navigateTo(page, "requirements");
        const reqTrigger = page
          .getByRole("button", { name: /Buat Profil Baru|Create New Profile/i })
          .first();
        await reqTrigger.focus();
        await reqTrigger.click();
        await H.verifyDialogFocusAndEscape(page, reqTrigger, "RequirementCreateDialog");
      });
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F4-03");
    },
  },
  {
    id: "T2-F4-04",
    tier: 2,
    feature: "F4",
    title: "MobileNavDrawer (768px & 375px) traps focus, closes on Escape, and restores focus",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp({ viewport: { width: 768, height: 1024 } });
      await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        const tabletTrigger = page
          .locator("header")
          .getByRole("button", { name: /menu navigasi|navigation menu/i })
          .first();
        await tabletTrigger.focus();
        await tabletTrigger.click();
        await H.verifyDialogFocusAndEscape(page, tabletTrigger, "MobileNavDrawer-Tablet");

        await page.setViewportSize({ width: 375, height: 812 });
        await page.waitForTimeout(150);
        const mobileTrigger = page
          .locator('nav[aria-label="Navigasi bawah mobile"]')
          .getByRole("button", { name: /Menu/i })
          .first();
        await mobileTrigger.focus();
        await mobileTrigger.click();
        await H.verifyDialogFocusAndEscape(page, mobileTrigger, "MobileNavDrawer-Mobile");
      });
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F4-04");
    },
  },
  {
    id: "T2-F4-05",
    tier: 2,
    feature: "F4",
    title: "ThemedSelect desktop listbox and mobile sheet close on Escape and restore focus",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp({ viewport: { width: 1440, height: 900 } });
      await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.navigateTo(page, "formulation");
        const desktopCombo = page.locator("#commodity-select").first();
        await desktopCombo.focus();
        await desktopCombo.click();
        await page.locator('[role="listbox"]').first().waitFor({ state: "visible", timeout: 4000 });
        await page.keyboard.press("Escape");
        await page.locator('[role="listbox"]').first().waitFor({ state: "hidden", timeout: 4000 });
        const restoredDesktop = await desktopCombo.evaluate((el) => document.activeElement === el);
        if (!restoredDesktop) {
          throw new Error("Desktop ThemedSelect did not restore focus on Escape.");
        }

        await page.setViewportSize({ width: 375, height: 812 });
        await page.waitForTimeout(180);
        const mobileCombo = page.locator("#commodity-select").first();
        await mobileCombo.focus();
        await mobileCombo.click();
        await H.verifyDialogFocusAndEscape(page, mobileCombo, "ThemedSelect-MobileSheet");
      });
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F4-05");
    },
  },

  // F5: Breakpoints, Touch Targets, Em-Dash Audit & Boundary Inputs
  {
    id: "T2-F5-01",
    tier: 2,
    feature: "F5",
    title:
      "Narrow 320px and 375px mobile viewports have zero horizontal overflow across all 6 routes",
    run: async ({ session, assert }) => {
      for (const vp of [
        { width: 320, height: 640 },
        { width: 375, height: 812 },
      ]) {
        await session.resetToFreshApp({ viewport: vp });
        const checks = await session.runScript(
          async (page, arg, H) => {
            await H.selectUiMode(page, "Anti-Slop");
            const out = [];
            for (const r of arg.routes) {
              await H.navigateTo(page, r);
              out.push({ r, layout: await H.probeLayoutAndOverflow(page) });
            }
            return out;
          },
          { routes: ALL_ROUTES },
        );
        for (const item of checks) {
          assert.noHorizontalOverflow(item.layout, `${vp.width}px ${item.r}`);
        }
        assert.noConsoleErrors(await session.getConsoleErrors(), `T2-F5-01-${vp.width}`);
      }
    },
  },
  {
    id: "T2-F5-02",
    tier: 2,
    feature: "F5",
    title:
      "640px, 768px, 1024px, and 1440px viewports have zero horizontal overflow across all 6 routes",
    run: async ({ session, assert }) => {
      for (const vp of [
        { width: 640, height: 800 },
        { width: 768, height: 1024 },
        { width: 1024, height: 768 },
        { width: 1440, height: 900 },
      ]) {
        await session.resetToFreshApp({ viewport: vp });
        const checks = await session.runScript(
          async (page, arg, H) => {
            await H.selectUiMode(page, "Anti-Slop");
            const out = [];
            for (const r of arg.routes) {
              await H.navigateTo(page, r);
              out.push({ r, layout: await H.probeLayoutAndOverflow(page) });
            }
            return out;
          },
          { routes: ALL_ROUTES },
        );
        for (const item of checks) {
          assert.noHorizontalOverflow(item.layout, `${vp.width}px ${item.r}`);
        }
        assert.noConsoleErrors(await session.getConsoleErrors(), `T2-F5-02-${vp.width}`);
      }
    },
  },
  {
    id: "T2-F5-03",
    tier: 2,
    feature: "F5",
    title: "Mobile 375px touch targets meet >=44x44px across Settings, Formulation, and Bottom Nav",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp({ viewport: { width: 375, height: 812 } });
      const probes = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        const settings = await H.probeMobileTouchTargets(page, 44);
        await H.navigateTo(page, "formulation");
        const formulation = await H.probeMobileTouchTargets(page, 44);
        return { settings, formulation };
      });
      assert.mobileTouchTargets(probes.settings, "375px Settings Anti-Slop");
      assert.mobileTouchTargets(probes.formulation, "375px Formulation Anti-Slop");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F5-03");
    },
  },
  {
    id: "T2-F5-04",
    tier: 2,
    feature: "F5",
    title: "Zero em dashes (—) across all 6 routes and opened modals in Anti-Slop (ID & EN)",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const probes = await session.runScript(
        async (page, arg, H) => {
          await H.selectUiMode(page, "Anti-Slop");
          const out = [];
          for (const lang of ["id", "en"]) {
            await H.setLanguage(page, lang);
            for (const r of arg.routes) {
              await H.navigateTo(page, r);
              const surface = await H.probeAntiSlopSurface(page, { checkCursor: false });
              out.push({ label: `${lang}:${r}`, surface });
            }
            await H.navigateTo(page, "formulation");
            await page
              .getByRole("button", { name: /Ekspor PDF|Export PDF/i })
              .first()
              .click();
            await page
              .locator('[role="dialog"]')
              .first()
              .waitFor({ state: "visible", timeout: 4000 });
            out.push({
              label: `${lang}:ExportDialog`,
              surface: await H.probeAntiSlopSurface(page, { checkCursor: false }),
            });
            await page.keyboard.press("Escape");
          }
          return out;
        },
        { routes: ALL_ROUTES },
      );
      for (const p of probes) {
        assert.antiSlopSurface(p.surface, p.label, { checkCursor: false });
      }
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F5-04");
    },
  },
  {
    id: "T2-F5-05",
    tier: 2,
    feature: "F5",
    title: "Impossible nutrient constraint triggers role='alert' and Toleransi Target recovers",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.navigateTo(page, "formulation");
        const elasticSwitch = page
          .getByRole("switch", { name: /toleransi batas|flexible bounds/i })
          .first();
        if ((await elasticSwitch.getAttribute("aria-checked")) === "true") {
          await elasticSwitch.click();
          await H.waitForSolverIdle(page);
        }

        const targetsPanel = page.locator(
          'section[aria-label="Panel Target Nutrien"], section[aria-label="Nutrient Targets Panel"]',
        );
        const cpRowBtn = targetsPanel.locator("button[aria-expanded]").first();
        await cpRowBtn.click();
        await page.waitForTimeout(120);
        const maxInput = targetsPanel.locator("input").nth(1);
        await maxInput.fill("99");
        await maxInput.press("Enter");
        await page.waitForTimeout(80);
        const minInput = targetsPanel.locator("input").first();
        await minInput.fill("45");
        await minInput.press("Enter");
        await H.waitForSolverIdle(page);

        const alertCount = await page.locator('[role="alert"]').count();
        const alertText =
          alertCount > 0 ? await page.locator('[role="alert"]').first().innerText() : "";

        await elasticSwitch.click();
        await H.waitForSolverIdle(page);
        const statusCount = await page.locator('[role="status"]').count();

        return { alertCount, alertText, statusCount };
      });
      assert.ok(res.alertCount >= 1, "Impossible 95% nutrient target must trigger role='alert'");
      assert.ok(res.alertText.length > 0);
      assert.ok(res.statusCount >= 1, "Flexible bounds should display near-feasible status");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F5-05");
    },
  },

  // F6: Biasa & Enhanced Boundary Parity
  {
    id: "T2-F6-01",
    tier: 2,
    feature: "F6",
    title: "Biasa mode works in Light & Dark across all 6 routes with zero overflow",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const checks = await session.runScript(
        async (page, arg, H) => {
          await H.selectUiMode(page, "Biasa");
          const out = [];
          for (const cm of ["light", "dark"]) {
            await H.navigateTo(page, "settings");
            await H.ensureSettingsBasicTab(page);
            await H.setColorMode(page, cm);
            for (const r of arg.routes) {
              await H.navigateTo(page, r);
              out.push({ label: `biasa-${cm}-${r}`, layout: await H.probeLayoutAndOverflow(page) });
            }
          }
          return out;
        },
        { routes: ALL_ROUTES },
      );
      for (const c of checks) {
        assert.noHorizontalOverflow(c.layout, c.label);
      }
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F6-01");
    },
  },
  {
    id: "T2-F6-02",
    tier: 2,
    feature: "F6",
    title: "Enhanced mode works in Light & Dark across all 6 routes with zero overflow",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const checks = await session.runScript(
        async (page, arg, H) => {
          const out = [];
          for (const cm of ["light", "dark"]) {
            await H.navigateTo(page, "settings");
            await H.ensureSettingsBasicTab(page);
            await H.setColorMode(page, cm);
            for (const r of arg.routes) {
              await H.navigateTo(page, r);
              out.push({
                label: `enhanced-${cm}-${r}`,
                layout: await H.probeLayoutAndOverflow(page),
              });
            }
          }
          return out;
        },
        { routes: ALL_ROUTES },
      );
      for (const c of checks) {
        assert.noHorizontalOverflow(c.layout, c.label);
      }
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F6-02");
    },
  },
  {
    id: "T2-F6-03",
    tier: 2,
    feature: "F6",
    title:
      "Switching Anti-Slop -> Biasa -> Enhanced preserves active palette, language, and AMOLED",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const state = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.setLanguage(page, "en");
        await H.setColorMode(page, "dark");
        await H.setPaletteId(page, "template-03");
        await H.setAmoled(page, true);
        await H.selectUiMode(page, "Biasa");
        await H.selectUiMode(page, "Enhanced");
        const currentLang = await H.getCurrentLanguage(page);
        return await page.evaluate(
          (langVal) => ({
            uiMode: document.documentElement.dataset.uiMode ?? null,
            theme: document.documentElement.dataset.theme ?? null,
            mode: document.documentElement.dataset.mode ?? null,
            amoled: document.documentElement.dataset.amoled ?? null,
            lang: langVal,
          }),
          currentLang,
        );
      });
      assert.equal(state.uiMode, "enhanced");
      assert.equal(state.theme, "template-03");
      assert.equal(state.mode, "dark");
      assert.equal(state.amoled, "true");
      assert.equal(state.lang, "en");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F6-03");
    },
  },
  {
    id: "T2-F6-04",
    tier: 2,
    feature: "F6",
    title: "Rendering & Motion Engine Smooth/Standard works cleanly alongside Biasa and Enhanced",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Biasa");
        await page.locator('[data-engine-preset="standard"]').first().click();
        await page.waitForTimeout(100);
        const stdChecked = await page
          .locator('[data-engine-preset="standard"]')
          .first()
          .getAttribute("aria-checked");
        await H.selectUiMode(page, "Enhanced");
        await page.locator('[data-engine-preset="smooth"]').first().click();
        await page.waitForTimeout(100);
        const smoothChecked = await page
          .locator('[data-engine-preset="smooth"]')
          .first()
          .getAttribute("aria-checked");
        return { stdChecked, smoothChecked };
      });
      assert.equal(res.stdChecked, "true");
      assert.equal(res.smoothChecked, "true");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F6-04");
    },
  },
  {
    id: "T2-F6-05",
    tier: 2,
    feature: "F6",
    title: "Biasa retains chrome and Enhanced retains acrylic header after full route round-trip",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Biasa");
        await H.navigateTo(page, "recipes");
        await H.navigateTo(page, "formulation");
        const biasaCap = await page.evaluate(() =>
          document
            .querySelector("[data-header-utility-capsule]")
            ?.getAttribute("data-header-utility-capsule"),
        );
        await H.selectUiMode(page, "Enhanced");
        await H.navigateTo(page, "ingredients");
        await H.navigateTo(page, "formulation");
        const enhancedCap = await page.evaluate(() =>
          document
            .querySelector("[data-header-utility-capsule]")
            ?.getAttribute("data-header-utility-capsule"),
        );
        return { biasaCap, enhancedCap };
      });
      assert.equal(res.biasaCap, "chrome");
      assert.equal(res.enhancedCap, "acrylic");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F6-05");
    },
  },

  // F7: Bilingual EN/ID & Viewport Edge Cases
  {
    id: "T2-F7-01",
    tier: 2,
    feature: "F7",
    title: "All 6 routes in EN + Anti-Slop at 1440px render English headings cleanly",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp({ viewport: { width: 1440, height: 900 } });
      const headings = await session.runScript(
        async (page, arg, H) => {
          await H.selectUiMode(page, "Anti-Slop");
          await H.setLanguage(page, "en");
          const out = {};
          for (const r of arg.routes) {
            await H.navigateTo(page, r);
            out[r] = ((await page.locator("h1:visible").first().textContent()) ?? "").trim();
          }
          return out;
        },
        { routes: ALL_ROUTES },
      );
      assert.ok(/Ration Formulation/i.test(headings.formulation));
      assert.ok(/Feed Ingredient Database/i.test(headings.ingredients));
      assert.ok(/Livestock Requirement Profiles/i.test(headings.requirements));
      assert.ok(/Saved Recipe Projects/i.test(headings.recipes));
      assert.ok(/Advanced Modules/i.test(headings.advanced));
      assert.ok(/Application Settings/i.test(headings.settings));
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F7-01");
    },
  },
  {
    id: "T2-F7-02",
    tier: 2,
    feature: "F7",
    title: "All 6 routes in EN + Anti-Slop at 375px have zero overflow",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp({ viewport: { width: 375, height: 812 } });
      const checks = await session.runScript(
        async (page, arg, H) => {
          await H.selectUiMode(page, "Anti-Slop");
          await H.setLanguage(page, "en");
          const out = [];
          for (const r of arg.routes) {
            await H.navigateTo(page, r);
            out.push({ r, layout: await H.probeLayoutAndOverflow(page) });
          }
          return out;
        },
        { routes: ALL_ROUTES },
      );
      for (const item of checks) {
        assert.noHorizontalOverflow(item.layout, `EN 375px ${item.r}`);
      }
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F7-02");
    },
  },
  {
    id: "T2-F7-03",
    tier: 2,
    feature: "F7",
    title: "Dynamic Beef and Dairy cattle inputs render cleanly at 1440px and 375px",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp({ viewport: { width: 1440, height: 900 } });
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.navigateTo(page, "formulation");
        await H.selectThemedOption(page, "#commodity-select", /Sapi Potong|Beef Cattle/i);
        const beefDesktop = await H.probeLayoutAndOverflow(page);
        await H.selectThemedOption(page, "#commodity-select", /Sapi Perah|Dairy Cattle/i);
        const dairyDesktop = await H.probeLayoutAndOverflow(page);

        await page.setViewportSize({ width: 375, height: 812 });
        await page.waitForTimeout(160);
        const dairyMobile = await H.probeLayoutAndOverflow(page);
        return { beefDesktop, dairyDesktop, dairyMobile };
      });
      assert.noHorizontalOverflow(res.beefDesktop, "Beef desktop");
      assert.noHorizontalOverflow(res.dairyDesktop, "Dairy desktop");
      assert.noHorizontalOverflow(res.dairyMobile, "Dairy mobile");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F7-03");
    },
  },
  {
    id: "T2-F7-04",
    tier: 2,
    feature: "F7",
    title: "Display decimal places (0, 1, 2) update formatting without breaking LP optimality",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        async function readMacroShareCells() {
          await H.navigateTo(page, "formulation");
          await H.waitForSolverIdle(page);
          return await page.evaluate(() => {
            const resultsPanel = document.querySelector(
              'section[aria-label="Panel Hasil Formulasi"], section[aria-label="Formulation Results Panel"]',
            );
            const main = document.querySelector("main");
            const shareCells = Array.from(
              (resultsPanel || document).querySelectorAll("table tbody tr td:nth-child(2)"),
            )
              .map((td) => (td.textContent || "").trim())
              .filter((txt) => {
                const m = /^(\d+)(?:[.,]\d+)?\s*%$/.exec(txt);
                return Boolean(m && Number(m[1]) >= 2);
              });
            return {
              hasOptimal: /\bOptimal\b/.test(main ? main.innerText : ""),
              shareCells,
            };
          });
        }

        await H.selectUiMode(page, "Anti-Slop");
        const dec0 = await readMacroShareCells();

        await H.navigateTo(page, "settings");
        await H.ensureSettingsBasicTab(page);
        await H.selectThemedOption(
          page,
          /Desimal Tampilan Angka|Display Decimal Places/i,
          /1 desimal|1 decimal/i,
        );
        const dec1 = await readMacroShareCells();

        await H.navigateTo(page, "settings");
        await H.ensureSettingsBasicTab(page);
        await H.selectThemedOption(
          page,
          /Desimal Tampilan Angka|Display Decimal Places/i,
          /2 desimal|2 decimals/i,
        );
        const dec2 = await readMacroShareCells();

        return { dec0, dec1, dec2 };
      });

      assert.ok(res.dec0.hasOptimal, "Default 0-decimal state should be Optimal");
      assert.ok(
        res.dec0.shareCells.length > 0,
        "Expected macro >= 2% composition rows in 0-decimal state",
      );
      assert.ok(
        res.dec0.shareCells.every((c) => /^\d+\s*%$/.test(c)),
        `0-decimal mode must format macro >= 2% rows as integers, got: ${res.dec0.shareCells.join(", ")}`,
      );

      assert.ok(res.dec1.hasOptimal, "1-decimal state should remain Optimal");
      assert.ok(
        res.dec1.shareCells.every((c) => /^\d+[.,]\d{1}\s*%$/.test(c)),
        `1-decimal mode must format macro >= 2% rows with 1 decimal, got: ${res.dec1.shareCells.join(", ")}`,
      );

      assert.ok(res.dec2.hasOptimal, "2-decimal state should remain Optimal");
      assert.ok(
        res.dec2.shareCells.every((c) => /^\d+[.,]\d{2}\s*%$/.test(c)),
        `2-decimal mode must format macro >= 2% rows with 2 decimals, got: ${res.dec2.shareCells.join(", ")}`,
      );
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F7-04");
    },
  },
  {
    id: "T2-F7-05",
    tier: 2,
    feature: "F7",
    title: "Nutrient abbreviation toggle switches PK/EM to full names cleanly",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        const sw = page
          .getByRole("switch", { name: /Singkatan Nama Nutrien|Abbreviated Nutrient Names/i })
          .first();
        await sw.click();
        await H.navigateTo(page, "formulation");
        const panelText = await page
          .locator(
            'section[aria-label="Panel Target Nutrien"], section[aria-label="Nutrient Targets Panel"]',
          )
          .innerText();
        return {
          hasFullProtein: /Protein Kasar|Crude Protein/i.test(panelText),
        };
      });
      assert.ok(res.hasFullProtein, "Turning off abbreviations should show full nutrient names");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F7-05");
    },
  },

  // F8: Solver / Dialog / Storage Corner Cases
  {
    id: "T2-F8-01",
    tier: 2,
    feature: "F8",
    title:
      "Advanced Modules ready-to-use cards jump to Shadow Price, What-If, and Precision dialogs",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.navigateTo(page, "advanced");
        await page
          .getByRole("button", { name: /Buka Harga Bayangan|Open Shadow Price/i })
          .first()
          .click();
        await page.waitForTimeout(180);
        await H.navigateTo(page, "advanced");
        await page
          .getByRole("button", { name: /Buka Simulasi What-If|Open What-If Simulator/i })
          .first()
          .click();
        await page.waitForTimeout(180);
        await H.navigateTo(page, "advanced");
        await page
          .getByRole("button", { name: /Buka Sasaran Fraksional|Open Fractional Target/i })
          .first()
          .click();
        await page.locator('[role="dialog"]').first().waitFor({ state: "visible", timeout: 4000 });
        await page.keyboard.press("Escape");
      });
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F8-01");
    },
  },
  {
    id: "T2-F8-02",
    tier: 2,
    feature: "F8",
    title: "BatchMixerCalculator presets and Mode Operator toggle work cleanly",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.navigateTo(page, "formulation");
        await page
          .getByRole("button", { name: /^500 kg$/i })
          .first()
          .click();
        await page.waitForTimeout(120);
        const opCheck = page
          .getByRole("checkbox", { name: /Mode Operator|Operator Mode/i })
          .or(page.locator("label", { hasText: /Mode Operator/i }).locator("input"))
          .first();
        if ((await opCheck.count()) > 0) {
          await opCheck.click();
          await page.waitForTimeout(100);
          await opCheck.click();
        }
        return await page.locator("main").innerText();
      });
      assert.ok(res.includes("500"), "500 kg batch preset should reflect in calculator");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F8-02");
    },
  },
  {
    id: "T2-F8-03",
    tier: 2,
    feature: "F8",
    title: "What-If manual lock fixes ingredient % and Reset Semua Kunci clears locks",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.navigateTo(page, "formulation");
        await page
          .getByRole("tab", { name: /What-If/i })
          .first()
          .click();
        await page.waitForTimeout(150);
        const slider = page.locator('input[type="range"][aria-label^="Slider What-If"]').first();
        await slider.fill("35");
        await slider.dispatchEvent("change");
        await H.waitForSolverIdle(page);
        const resetLocksBtn = page
          .getByRole("button", { name: /Reset Semua Kunci|Reset All Locks/i })
          .first();
        const hadResetBtn = (await resetLocksBtn.count()) > 0;
        if (hadResetBtn) {
          await resetLocksBtn.click();
          await H.waitForSolverIdle(page);
        }
        return {
          hadResetBtn,
          resetVisibleAfter: (await resetLocksBtn.count()) > 0,
        };
      });
      assert.ok(res.hadResetBtn, "Locking ingredient in What-If must show Reset All Locks");
      assert.equal(res.resetVisibleAfter, false, "Resetting locks should clear locked state");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F8-03");
    },
  },
  {
    id: "T2-F8-04",
    tier: 2,
    feature: "F8",
    title: "Shadow Price computes critical price ladder steps cleanly",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.navigateTo(page, "formulation");
        await page
          .getByRole("tab", { name: /Harga Bayangan|Shadow Price/i })
          .first()
          .click();
        await page.waitForTimeout(150);
        await page
          .getByRole("button", { name: /Hitung Tangga Harga|Compute Price Ladder/i })
          .first()
          .click();
        await page.waitForTimeout(400);
        const text = await page
          .locator(
            'section[aria-label="Panel Hasil Formulasi"], section[aria-label="Formulation Results Panel"]',
          )
          .innerText();
        return { hasRp: /Rp\s*[\d.,]+/.test(text) };
      });
      assert.ok(res.hasRp, "Shadow Price ladder should display price breakpoints");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F8-04");
    },
  },
  {
    id: "T2-F8-05",
    tier: 2,
    feature: "F8",
    title: "Deleting all saved recipes displays clean Empty state in SavedRecipesPage",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.navigateTo(page, "recipes");
        while (
          (await page
            .locator('button[aria-label^="Hapus resep "], button[aria-label^="Delete recipe "]')
            .count()) > 0
        ) {
          await page
            .locator('button[aria-label^="Hapus resep "], button[aria-label^="Delete recipe "]')
            .first()
            .click();
          await page.waitForTimeout(100);
        }
        const text = await page.locator("main").innerText();
        return { hasEmptyPrompt: /Belum ada resep tersimpan|No saved recipes yet/i.test(text) };
      });
      assert.ok(res.hasEmptyPrompt, "Deleting all recipes must reveal Empty state message");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T2-F8-05");
    },
  },
];
