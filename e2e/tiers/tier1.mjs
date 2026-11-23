export const tier1Cases = [
  // F1: Three-Mode UiMode State & Persistence
  {
    id: "T1-F1-01",
    tier: 1,
    feature: "F1",
    title: "Fresh storage defaults to Enhanced mode",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const state = await session.runScript(async (page) => {
        return await page.evaluate(() => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
          uiEnhancer: document.documentElement.dataset.uiEnhancer ?? null,
          storedUiMode: localStorage.getItem("openformu-ui-mode"),
        }));
      });
      assert.equal(state.uiMode, "enhanced", "Default data-ui-mode should be enhanced");
      assert.equal(state.uiEnhancer, "true", "Default data-ui-enhancer should be true");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F1-01");
    },
  },
  {
    id: "T1-F1-02",
    tier: 1,
    feature: "F1",
    title: "Switching to Anti-Slop writes openformu-ui-mode and sets data-ui-mode",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const state = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        return await page.evaluate(() => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
          uiEnhancer: document.documentElement.dataset.uiEnhancer ?? null,
          storedUiMode: localStorage.getItem("openformu-ui-mode"),
        }));
      });
      assert.equal(state.uiMode, "anti-slop", "data-ui-mode should become anti-slop");
      assert.equal(state.uiEnhancer, "false", "data-ui-enhancer compatibility mirror");
      assert.equal(state.storedUiMode, "anti-slop", "localStorage openformu-ui-mode");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F1-02");
    },
  },
  {
    id: "T1-F1-03",
    tier: 1,
    feature: "F1",
    title: "Full page reload preserves Anti-Slop selection",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const state = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await page.reload({ waitUntil: "domcontentloaded" });
        const prePaintMode = await page.evaluate(
          () => document.documentElement.dataset.uiMode ?? null,
        );
        await H.waitForHydration(page);
        const postMount = await page.evaluate(() => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
          stored: localStorage.getItem("openformu-ui-mode"),
        }));
        return { prePaintMode, ...postMount };
      });
      assert.equal(state.prePaintMode, "anti-slop", "Pre-paint hydration mode");
      assert.equal(state.uiMode, "anti-slop", "Post-mount data-ui-mode");
      assert.equal(state.stored, "anti-slop", "Persisted openformu-ui-mode");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F1-03");
    },
  },
  {
    id: "T1-F1-04",
    tier: 1,
    feature: "F1",
    title: "Legacy openformu-theme-enhancer='false' migrates to Biasa",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp({
        localStorageSeed: { "openformu-theme-enhancer": "false" },
      });
      const state = await session.runScript(async (page) => {
        return await page.evaluate(() => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
          uiEnhancer: document.documentElement.dataset.uiEnhancer ?? null,
        }));
      });
      assert.equal(state.uiMode, "biasa", "Legacy false must migrate to biasa");
      assert.equal(state.uiEnhancer, "false", "data-ui-enhancer must be false");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F1-04");
    },
  },
  {
    id: "T1-F1-05",
    tier: 1,
    feature: "F1",
    title: "Legacy openformu-theme-enhancer='true' migrates to Enhanced",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp({
        localStorageSeed: { "openformu-theme-enhancer": "true" },
      });
      const state = await session.runScript(async (page) => {
        return await page.evaluate(() => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
          uiEnhancer: document.documentElement.dataset.uiEnhancer ?? null,
        }));
      });
      assert.equal(state.uiMode, "enhanced", "Legacy true must migrate to enhanced");
      assert.equal(state.uiEnhancer, "true", "data-ui-enhancer must be true");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F1-05");
    },
  },

  // F2: Three-Mode Selector UI
  {
    id: "T1-F2-01",
    tier: 1,
    feature: "F2",
    title: "Settings renders 3-mode selector replacing 2-state UI Enhancer switch",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.navigateTo(page, "settings");
        await H.ensureSettingsBasicTab(page);
        const legacySwitchCount = await page
          .locator('button[role="switch"][aria-label="UI Enhancer"]')
          .count();
        const biasaCount = await page.getByRole("radio", { name: /^Biasa\b/i }).count();
        const enhancedCount = await page.getByRole("radio", { name: /^Enhanced\b/i }).count();
        const antiSlopCount = await page.getByRole("radio", { name: /^Anti-Slop\b/i }).count();
        return { legacySwitchCount, biasaCount, enhancedCount, antiSlopCount };
      });
      assert.equal(res.legacySwitchCount, 0, "Old 2-state UI Enhancer switch must be replaced");
      assert.ok(res.biasaCount >= 1, "Biasa radio option missing");
      assert.ok(res.enhancedCount >= 1, "Enhanced radio option missing");
      assert.ok(res.antiSlopCount >= 1, "Anti-Slop radio option missing");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F2-01");
    },
  },
  {
    id: "T1-F2-02",
    tier: 1,
    feature: "F2",
    title: "Clicking Biasa activates Biasa radio and DOM mode",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Biasa");
        const checked = await page
          .getByRole("radio", { name: /^Biasa\b/i })
          .first()
          .getAttribute("aria-checked");
        const uiMode = await page.evaluate(() => document.documentElement.dataset.uiMode ?? null);
        return { checked, uiMode };
      });
      assert.equal(res.checked, "true", "Biasa radio aria-checked");
      assert.equal(res.uiMode, "biasa", "DOM data-ui-mode");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F2-02");
    },
  },
  {
    id: "T1-F2-03",
    tier: 1,
    feature: "F2",
    title: "Clicking Anti-Slop activates Anti-Slop radio and DOM mode",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        const checked = await page
          .getByRole("radio", { name: /^Anti-Slop\b/i })
          .first()
          .getAttribute("aria-checked");
        const uiMode = await page.evaluate(() => document.documentElement.dataset.uiMode ?? null);
        return { checked, uiMode };
      });
      assert.equal(res.checked, "true", "Anti-Slop radio aria-checked");
      assert.equal(res.uiMode, "anti-slop", "DOM data-ui-mode");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F2-03");
    },
  },
  {
    id: "T1-F2-04",
    tier: 1,
    feature: "F2",
    title: "Clicking Enhanced restores Enhanced radio and DOM mode",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.selectUiMode(page, "Enhanced");
        const checked = await page
          .getByRole("radio", { name: /^Enhanced\b/i })
          .first()
          .getAttribute("aria-checked");
        const uiMode = await page.evaluate(() => document.documentElement.dataset.uiMode ?? null);
        return { checked, uiMode };
      });
      assert.equal(res.checked, "true", "Enhanced radio aria-checked");
      assert.equal(res.uiMode, "enhanced", "DOM data-ui-mode");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F2-04");
    },
  },
  {
    id: "T1-F2-05",
    tier: 1,
    feature: "F2",
    title: "Keyboard arrow and Space/Enter selection works on 3-mode radiogroup",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.navigateTo(page, "settings");
        await H.ensureSettingsBasicTab(page);

        const biasaRadio = page.getByRole("radio", { name: /^Biasa\b/i }).first();
        await biasaRadio.focus();
        await page.keyboard.press("Space");
        await page.waitForTimeout(120);
        const afterSpace = await page.evaluate(() => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
        }));
        const biasaChecked = await biasaRadio.getAttribute("aria-checked");

        const antiSlopRadio = page.getByRole("radio", { name: /^Anti-Slop\b/i }).first();
        await antiSlopRadio.focus();
        await page.keyboard.press("Enter");
        await page.waitForTimeout(120);
        const afterEnter = await page.evaluate(() => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
        }));
        const antiSlopChecked = await antiSlopRadio.getAttribute("aria-checked");

        await page.keyboard.press("ArrowLeft");
        await page.waitForTimeout(120);
        const afterLeft = await page.evaluate(() => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
          activeText: (document.activeElement?.textContent ?? "").trim(),
        }));

        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(120);
        const afterRight = await page.evaluate(() => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
          activeText: (document.activeElement?.textContent ?? "").trim(),
        }));

        return {
          afterSpace,
          biasaChecked,
          afterEnter,
          antiSlopChecked,
          afterLeft,
          afterRight,
        };
      });
      assert.equal(
        res.afterSpace.uiMode,
        "biasa",
        "Space on focused Biasa radio must select biasa",
      );
      assert.equal(res.biasaChecked, "true", "Biasa radio aria-checked after Space");
      assert.equal(
        res.afterEnter.uiMode,
        "anti-slop",
        "Enter on focused Anti-Slop radio must select anti-slop",
      );
      assert.equal(res.antiSlopChecked, "true", "Anti-Slop radio aria-checked after Enter");
      assert.equal(res.afterLeft.uiMode, "enhanced", "ArrowLeft must select enhanced");
      assert.ok(
        /Enhanced/i.test(res.afterLeft.activeText),
        "ArrowLeft must move focus to Enhanced radio",
      );
      assert.equal(res.afterRight.uiMode, "anti-slop", "ArrowRight must select anti-slop");
      assert.ok(
        /Anti-Slop/i.test(res.afterRight.activeText),
        "ArrowRight must move focus to Anti-Slop radio",
      );
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F2-05");
    },
  },

  // F3: Anti-Slop Design & WCAG AA Contrast
  {
    id: "T1-F3-01",
    tier: 1,
    feature: "F3",
    title: "Anti-Slop renders cleanly in Light mode",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const state = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.setColorMode(page, "light");
        await H.navigateTo(page, "formulation");
        const layout = await H.probeLayoutAndOverflow(page);
        const mode = await page.evaluate(() => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
          colorMode: document.documentElement.dataset.mode ?? null,
          hasDarkClass: document.documentElement.classList.contains("dark"),
        }));
        return { layout, mode };
      });
      assert.equal(state.mode.uiMode, "anti-slop");
      assert.equal(state.mode.colorMode, "light");
      assert.equal(state.mode.hasDarkClass, false);
      assert.noHorizontalOverflow(state.layout, "T1-F3-01");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F3-01");
    },
  },
  {
    id: "T1-F3-02",
    tier: 1,
    feature: "F3",
    title: "Anti-Slop renders cleanly in Dark mode",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const state = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.setColorMode(page, "dark");
        await H.navigateTo(page, "formulation");
        const layout = await H.probeLayoutAndOverflow(page);
        const mode = await page.evaluate(() => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
          colorMode: document.documentElement.dataset.mode ?? null,
          hasDarkClass: document.documentElement.classList.contains("dark"),
        }));
        return { layout, mode };
      });
      assert.equal(state.mode.uiMode, "anti-slop");
      assert.equal(state.mode.colorMode, "dark");
      assert.equal(state.mode.hasDarkClass, true);
      assert.noHorizontalOverflow(state.layout, "T1-F3-02");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F3-02");
    },
  },
  {
    id: "T1-F3-03",
    tier: 1,
    feature: "F3",
    title: "Anti-Slop passes WCAG AA contrast checks in default palette Light",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const pairs = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.setColorMode(page, "light");
        const settingsPairs = await H.sampleContrastPairs(page);
        await H.navigateTo(page, "formulation");
        const formPairs = await H.sampleContrastPairs(page);
        return [...settingsPairs, ...formPairs];
      });
      await assert.checkContrastPairs(pairs, "Anti-Slop default Light");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F3-03");
    },
  },
  {
    id: "T1-F3-04",
    tier: 1,
    feature: "F3",
    title: "Anti-Slop passes WCAG AA contrast checks in default palette Dark",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const pairs = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.setColorMode(page, "dark");
        const settingsPairs = await H.sampleContrastPairs(page);
        await H.navigateTo(page, "formulation");
        const formPairs = await H.sampleContrastPairs(page);
        return [...settingsPairs, ...formPairs];
      });
      await assert.checkContrastPairs(pairs, "Anti-Slop default Dark");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F3-04");
    },
  },
  {
    id: "T1-F3-05",
    tier: 1,
    feature: "F3",
    title: "Anti-Slop removes excessive backdrop-filter blur and infinite pulse animations",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const surface = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.navigateTo(page, "formulation");
        return await H.probeAntiSlopSurface(page, { checkCursor: false });
      });
      assert.ok(
        surface.backdropBlurCount <= 2,
        `Expected <= 2 blurred elements in Anti-Slop, got ${surface.backdropBlurCount}`,
      );
      assert.equal(
        surface.infinitePulseCount,
        0,
        `Expected 0 infinite pulse animations, got ${surface.infinitePulseCount}`,
      );
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F3-05");
    },
  },

  // F4: Shell, Navigation, Modals & Keyboard Accessibility
  {
    id: "T1-F4-01",
    tier: 1,
    feature: "F4",
    title: "Skip link exists and moves focus to #main-content",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page) => {
        const skipLink = page.locator('a[href="#main-content"]');
        const count = await skipLink.count();
        if (count === 0) return { count: 0, movedToMain: false };
        await skipLink.first().focus();
        await page.keyboard.press("Enter");
        await page.waitForTimeout(100);
        const movedToMain = await page.evaluate(() => {
          const main = document.getElementById("main-content") || document.querySelector("main");
          const active = document.activeElement;
          return Boolean(main && (active === main || main.contains(active)));
        });
        return { count, movedToMain };
      });
      assert.ok(res.count >= 1, "Skip link a[href='#main-content'] must exist");
      assert.ok(res.movedToMain, "Activating skip link must focus #main-content");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F4-01");
    },
  },
  {
    id: "T1-F4-02",
    tier: 1,
    feature: "F4",
    title: "Semantic header, nav, main landmarks and single visible h1 present",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        const form = await H.probeLayoutAndOverflow(page);
        await H.navigateTo(page, "settings");
        const settings = await H.probeLayoutAndOverflow(page);
        return { form, settings };
      });
      for (const [name, p] of [
        ["formulation", res.form],
        ["settings", res.settings],
      ]) {
        assert.ok(p.hasHeader, `${name}: <header> landmark missing`);
        assert.ok(p.hasNav, `${name}: <nav> landmark missing`);
        assert.ok(p.hasMain, `${name}: <main> landmark missing`);
        assert.equal(p.visibleH1Count, 1, `${name}: expected 1 visible <h1>`);
      }
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F4-02");
    },
  },
  {
    id: "T1-F4-03",
    tier: 1,
    feature: "F4",
    title: "ExportDialog and SaveRecipeDialog open and close cleanly on Escape",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      await session.runScript(async (page) => {
        const exportBtn = page.getByRole("button", { name: /Ekspor PDF|Export PDF/i }).first();
        await exportBtn.click();
        const dialog = page.locator('[role="dialog"][aria-modal="true"]').first();
        await dialog.waitFor({ state: "visible", timeout: 4000 });
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden", timeout: 4000 });

        const saveBtn = page.getByRole("button", { name: /^Simpan$|^Save$/i }).first();
        await saveBtn.click();
        await dialog.waitFor({ state: "visible", timeout: 4000 });
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden", timeout: 4000 });
      });
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F4-03");
    },
  },
  {
    id: "T1-F4-04",
    tier: 1,
    feature: "F4",
    title: "Enabled interactive controls have computed cursor: pointer",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const probe = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        return await H.probeAntiSlopSurface(page);
      });
      assert.equal(
        probe.cursorViolations.length,
        0,
        `Interactive controls missing cursor:pointer: ${JSON.stringify(probe.cursorViolations)}`,
      );
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F4-04");
    },
  },
  {
    id: "T1-F4-05",
    tier: 1,
    feature: "F4",
    title: "Desktop sidebar collapse button exposes aria-expanded and toggles state",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp({ viewport: { width: 1440, height: 900 } });
      const res = await session.runScript(async (page) => {
        const btn = page
          .locator(
            'aside button[aria-label*="sidebar" i], aside button[aria-label*="Perkecil" i], aside button[aria-label*="Perbesar" i]',
          )
          .first();
        const before = await btn.getAttribute("aria-expanded");
        await btn.click();
        await page.waitForTimeout(180);
        const after = await btn.getAttribute("aria-expanded");
        return { before, after };
      });
      assert.equal(res.before, "true", "Sidebar should start expanded on desktop");
      assert.equal(res.after, "false", "Sidebar should collapse after click");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F4-05");
    },
  },

  // F5: Full 6-Route Coverage, Copywriting & States
  {
    id: "T1-F5-01",
    tier: 1,
    feature: "F5",
    title: "All 6 routes render cleanly in Anti-Slop with visible heading",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const routes = [
        "formulation",
        "ingredients",
        "requirements",
        "recipes",
        "advanced",
        "settings",
      ];
      const results = await session.runScript(
        async (page, arg, H) => {
          await H.selectUiMode(page, "Anti-Slop");
          const out = [];
          for (const r of arg.routes) {
            await H.navigateTo(page, r);
            const layout = await H.probeLayoutAndOverflow(page);
            const heading = await page.locator("h1:visible").first().textContent();
            out.push({ route: r, layout, heading: (heading ?? "").trim() });
          }
          return out;
        },
        { routes },
      );
      for (const item of results) {
        assert.ok(item.heading.length > 0, `Route ${item.route} missing visible h1`);
        assert.noHorizontalOverflow(item.layout, `Route ${item.route}`);
      }
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F5-01");
    },
  },
  {
    id: "T1-F5-02",
    tier: 1,
    feature: "F5",
    title: "Zero em dashes (—) in visible Anti-Slop UI text on Formulation and Settings",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const probes = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        const settingsSurface = await H.probeAntiSlopSurface(page);
        await H.navigateTo(page, "formulation");
        const formSurface = await H.probeAntiSlopSurface(page);
        return { settingsSurface, formSurface };
      });
      assert.equal(
        probes.settingsSurface.emDashCount,
        0,
        `Em dashes found in Settings: ${probes.settingsSurface.emDashSamples.join(" | ")}`,
      );
      assert.equal(
        probes.formSurface.emDashCount,
        0,
        `Em dashes found in Formulation: ${probes.formSurface.emDashSamples.join(" | ")}`,
      );
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F5-02");
    },
  },
  {
    id: "T1-F5-03",
    tier: 1,
    feature: "F5",
    title: "Ingredient DB empty search shows actionable Empty state and Reset recovery",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.navigateTo(page, "ingredients");
        const search = page.locator('input[type="search"]').first();
        await search.fill("zzzznonexistentfeed12345");
        await page.waitForTimeout(150);
        const resetBtn = page.getByRole("button", { name: /Reset Pencarian|Reset Search/i });
        const resetCount = await resetBtn.count();
        if (resetCount > 0) {
          await resetBtn.first().click();
          await page.waitForTimeout(150);
        }
        const searchValAfter = await search.inputValue();
        return { resetCount, searchValAfter };
      });
      assert.ok(res.resetCount >= 1, "Empty state should show Reset Search recovery button");
      assert.equal(res.searchValAfter, "", "Reset button should clear search input");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F5-03");
    },
  },
  {
    id: "T1-F5-04",
    tier: 1,
    feature: "F5",
    title: "Invalid AddEditIngredientModal submit displays role='alert' error state",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.navigateTo(page, "formulation");
        await page
          .getByRole("button", { name: /Tambah Bahan Baru|Add New Feed/i })
          .first()
          .click();
        const dlg = page.locator('[role="dialog"]').first();
        await dlg.waitFor({ state: "visible", timeout: 4000 });
        await dlg.getByRole("button", { name: /Simpan Bahan|Save Feed/i }).click();
        const alertText = await dlg.locator('[role="alert"]').first().textContent();
        await page.keyboard.press("Escape");
        return { alertText: (alertText ?? "").trim() };
      });
      assert.ok(res.alertText.length > 0, "Expected non-empty role='alert' error message");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F5-04");
    },
  },
  {
    id: "T1-F5-05",
    tier: 1,
    feature: "F5",
    title: "Loading and status indicators render cleanly without generic 'Loading...' slop",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.navigateTo(page, "formulation");
        const tab = page.getByRole("tab", { name: /Harga Bayangan|Shadow Price/i }).first();
        await tab.click();
        await page.waitForTimeout(150);
        const ladderBtn = page
          .getByRole("button", { name: /Hitung Tangga Harga|Compute Price Ladder/i })
          .first();
        await ladderBtn.click();
        await page
          .getByText(/Titik Harga Bahan|Ingredient Price/i)
          .first()
          .waitFor({ state: "visible", timeout: 5000 });
        const bodyText = await page.evaluate(() => document.body.innerText);
        return {
          hasRawLoadingSlop: /\bLoading\.\.\./i.test(bodyText),
          hasLadderResult: /Titik Harga Bahan|Ingredient Price/i.test(bodyText),
        };
      });
      assert.equal(res.hasRawLoadingSlop, false, "Must not render generic 'Loading...' text");
      assert.ok(
        res.hasLadderResult,
        "Price Ladder table must render Titik Harga Bahan / Ingredient Price",
      );
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F5-05");
    },
  },

  // F6: Biasa & Enhanced Zero Regression
  {
    id: "T1-F6-01",
    tier: 1,
    feature: "F6",
    title: "Biasa mode retains solid chrome header utility capsule",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Biasa");
        await H.navigateTo(page, "formulation");
        return await page.evaluate(() => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
          uiEnhancer: document.documentElement.dataset.uiEnhancer ?? null,
          capsule: document
            .querySelector("[data-header-utility-capsule]")
            ?.getAttribute("data-header-utility-capsule"),
        }));
      });
      assert.equal(res.uiMode, "biasa");
      assert.equal(res.uiEnhancer, "false");
      assert.equal(res.capsule, "chrome", "Biasa mode must keep chrome header capsule");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F6-01");
    },
  },
  {
    id: "T1-F6-02",
    tier: 1,
    feature: "F6",
    title: "Biasa mode keeps non-glass flat surfaces and nav layout intact",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Biasa");
        await H.navigateTo(page, "formulation");
        const layout = await H.probeLayoutAndOverflow(page);
        const headerBlur = await page.evaluate(() => {
          const hdr = document.querySelector("header");
          return hdr ? getComputedStyle(hdr).backdropFilter : "none";
        });
        return { layout, headerBlur };
      });
      assert.noHorizontalOverflow(res.layout, "T1-F6-02");
      assert.equal(res.headerBlur, "none", "Biasa header should not have acrylic backdrop blur");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F6-02");
    },
  },
  {
    id: "T1-F6-03",
    tier: 1,
    feature: "F6",
    title: "Enhanced mode retains acrylic translucent shell and glass styling",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page) => {
        return await page.evaluate(() => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
          uiEnhancer: document.documentElement.dataset.uiEnhancer ?? null,
          capsule: document
            .querySelector("[data-header-utility-capsule]")
            ?.getAttribute("data-header-utility-capsule"),
        }));
      });
      assert.equal(res.uiMode, "enhanced");
      assert.equal(res.uiEnhancer, "true");
      assert.equal(res.capsule, "acrylic", "Enhanced mode must retain acrylic header capsule");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F6-03");
    },
  },
  {
    id: "T1-F6-04",
    tier: 1,
    feature: "F6",
    title: "Switching Anti-Slop -> Biasa removes Anti-Slop attribute and restores Biasa",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.selectUiMode(page, "Biasa");
        return await page.evaluate(() => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
          capsule: document
            .querySelector("[data-header-utility-capsule]")
            ?.getAttribute("data-header-utility-capsule"),
        }));
      });
      assert.equal(res.uiMode, "biasa");
      assert.equal(res.capsule, "chrome");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F6-04");
    },
  },
  {
    id: "T1-F6-05",
    tier: 1,
    feature: "F6",
    title: "Switching Anti-Slop -> Enhanced restores Enhanced acrylic styling cleanly",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.selectUiMode(page, "Enhanced");
        return await page.evaluate(() => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
          uiEnhancer: document.documentElement.dataset.uiEnhancer ?? null,
          capsule: document
            .querySelector("[data-header-utility-capsule]")
            ?.getAttribute("data-header-utility-capsule"),
        }));
      });
      assert.equal(res.uiMode, "enhanced");
      assert.equal(res.uiEnhancer, "true");
      assert.equal(res.capsule, "acrylic");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F6-05");
    },
  },

  // F7: Bilingual (ID/EN) & Multi-Viewport Consistency
  {
    id: "T1-F7-01",
    tier: 1,
    feature: "F7",
    title: "Language toggle ID <-> EN updates Settings heading and 3-mode labels cleanly",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        const idHeading = await page.locator("h1:visible").first().textContent();
        await H.setLanguage(page, "en");
        const enHeading = await page.locator("h1:visible").first().textContent();
        const enLang = await H.getCurrentLanguage(page);
        await H.setLanguage(page, "id");
        const backHeading = await page.locator("h1:visible").first().textContent();
        return {
          idHeading: (idHeading ?? "").trim(),
          enHeading: (enHeading ?? "").trim(),
          enLang,
          backHeading: (backHeading ?? "").trim(),
        };
      });
      assert.equal(res.idHeading, "Pengaturan Aplikasi");
      assert.equal(res.enHeading, "Application Settings");
      assert.equal(res.enLang, "en");
      assert.equal(res.backHeading, "Pengaturan Aplikasi");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F7-01");
    },
  },
  {
    id: "T1-F7-02",
    tier: 1,
    feature: "F7",
    title: "Palette stepper < / > cycles all 5 palettes cleanly in Anti-Slop",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const visited = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        const nextBtn = page.locator('[data-theme-control="palette-next"]').first();
        const ids = [];
        for (let i = 0; i < 5; i++) {
          const id = await page.evaluate(() => document.documentElement.dataset.theme ?? null);
          ids.push(id);
          await nextBtn.click();
          await page.waitForTimeout(100);
        }
        return ids;
      });
      assert.equal(
        new Set(visited).size,
        5,
        `Expected 5 distinct palettes, got ${visited.join(",")}`,
      );
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F7-02");
    },
  },
  {
    id: "T1-F7-03",
    tier: 1,
    feature: "F7",
    title: "Tablet (768px) header menu button opens drawer with all 6 routes",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp({ viewport: { width: 768, height: 1024 } });
      const labels = await session.runScript(async (page) => {
        const btn = page
          .locator("header")
          .getByRole("button", { name: /menu navigasi|navigation menu/i })
          .first();
        await btn.click();
        const dlg = page.locator('[role="dialog"]').first();
        await dlg.waitFor({ state: "visible", timeout: 4000 });
        const txt = await dlg.innerText();
        await page.keyboard.press("Escape");
        return txt;
      });
      for (const expected of [
        "Formulasi Ransum",
        "Database Bahan",
        "Profil Kebutuhan Ternak",
        "Resep & Ekspor",
        "Modul Lanjutan",
        "Pengaturan",
      ]) {
        assert.ok(labels.includes(expected), `Tablet drawer missing route: ${expected}`);
      }
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F7-03");
    },
  },
  {
    id: "T1-F7-04",
    tier: 1,
    feature: "F7",
    title: "Mobile (375px) bottom nav Menu opens secondary-only drawer without primary duplication",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp({ viewport: { width: 375, height: 812 } });
      const txt = await session.runScript(async (page) => {
        const moreBtn = page
          .locator('nav[aria-label="Navigasi bawah mobile"]')
          .getByRole("button", { name: /Menu/i })
          .first();
        await moreBtn.click();
        const dlg = page.locator('[role="dialog"]').first();
        await dlg.waitFor({ state: "visible", timeout: 4000 });
        const content = await dlg.innerText();
        await page.keyboard.press("Escape");
        return content;
      });
      assert.ok(txt.includes("Profil Kebutuhan Ternak"));
      assert.ok(txt.includes("Modul Lanjutan"));
      assert.ok(txt.includes("Pengaturan"));
      assert.ok(
        !txt.includes("Formulasi Ransum"),
        "Secondary drawer must not duplicate primary routes",
      );
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F7-04");
    },
  },
  {
    id: "T1-F7-05",
    tier: 1,
    feature: "F7",
    title: "Desktop (1440px) sidebar navigates all 6 routes and updates aria-current",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp({ viewport: { width: 1440, height: 900 } });
      const routes = [
        "ingredients",
        "requirements",
        "recipes",
        "advanced",
        "settings",
        "formulation",
      ];
      const checks = await session.runScript(
        async (page, arg, H) => {
          const out = [];
          for (const r of arg.routes) {
            await H.navigateTo(page, r);
            const activeCount = await page
              .locator('aside nav[aria-label="Menu modul"] button[aria-current="page"]')
              .count();
            out.push({ r, activeCount });
          }
          return out;
        },
        { routes },
      );
      for (const c of checks) {
        assert.equal(c.activeCount, 1, `Route ${c.r} must mark exactly 1 active sidebar button`);
      }
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F7-05");
    },
  },

  // F8: Real-World Farmer/Nutritionist Workflows & Console Cleanliness
  {
    id: "T1-F8-01",
    tier: 1,
    feature: "F8",
    title: "Default broiler ration solves to Optimal with valid Rp cost/kg",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.navigateTo(page, "formulation");
        await H.waitForSolverIdle(page);
        const bodyText = await page.locator("main").innerText();
        return {
          hasOptimal: /\bOptimal\b/.test(bodyText),
          hasCurrency: /Rp\s*[\d.,]+/.test(bodyText),
        };
      });
      assert.ok(res.hasOptimal, "Default broiler ration should solve to Optimal");
      assert.ok(res.hasCurrency, "Optimal solution should display Rp cost");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F8-01");
    },
  },
  {
    id: "T1-F8-02",
    tier: 1,
    feature: "F8",
    title: "Nutrient Targets panel expands row bounds and edits target value",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.navigateTo(page, "formulation");
        const rowBtn = page
          .locator(
            'section[aria-label="Panel Target Nutrien"], section[aria-label="Nutrient Targets Panel"]',
          )
          .locator("button[aria-expanded]")
          .first();
        const before = await rowBtn.getAttribute("aria-expanded");
        await rowBtn.click();
        await page.waitForTimeout(150);
        const after = await rowBtn.getAttribute("aria-expanded");
        return { before, after };
      });
      assert.equal(res.after, "true", "Clicking nutrient row should expand target inputs");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F8-02");
    },
  },
  {
    id: "T1-F8-03",
    tier: 1,
    feature: "F8",
    title: "Results panel switches cleanly across Composition, Charts, Shadow Price, and What-If",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.navigateTo(page, "formulation");
        const tablist = page.getByRole("tablist", {
          name: /Sub-tampilan hasil|Formulation result views/i,
        });
        const tabs = ["Grafik", "Harga Bayangan", "What-If", "Komposisi"];
        const visited = [];
        for (const label of tabs) {
          const t = tablist.getByRole("tab", { name: new RegExp(label, "i") }).first();
          await t.click();
          await page.waitForTimeout(150);
          visited.push(await t.getAttribute("aria-selected"));
        }
        return visited;
      });
      assert.ok(
        res.every((v) => v === "true"),
        "All 4 result tabs must activate cleanly",
      );
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F8-03");
    },
  },
  {
    id: "T1-F8-04",
    tier: 1,
    feature: "F8",
    title: "Ingredient DB search and IFN 8-class tab filter update displayed catalog",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.navigateTo(page, "ingredients");
        const tab4 = page
          .getByRole("tablist", { name: /Filter 8 klasifikasi|Filter 8 standard feed classes/i })
          .getByRole("tab", { name: /^4\./ });
        await tab4.first().click();
        await page.waitForTimeout(150);
        const search = page.locator('input[type="search"]').first();
        await search.fill("Jagung");
        await page.waitForTimeout(150);
        const mainText = await page.locator("main").innerText();
        return {
          hasJagung: /Jagung/i.test(mainText),
        };
      });
      assert.ok(res.hasJagung, "Filtered IFN Class 4 + 'Jagung' search must display corn feed");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F8-04");
    },
  },
  {
    id: "T1-F8-05",
    tier: 1,
    feature: "F8",
    title: "Saved Recipes SaveRecipeDialog saves project and ExportDialog opens cleanly",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp();
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.navigateTo(page, "recipes");
        await page
          .getByRole("button", { name: /Simpan Sesi Saat Ini|Save Current Session/i })
          .first()
          .click();
        const dlg = page.locator('[role="dialog"]').first();
        await dlg.waitFor({ state: "visible", timeout: 4000 });
        await dlg.locator("input").first().fill("Ransum Uji Tier1");
        await dlg.getByRole("button", { name: /Simpan Proyek|Save Project/i }).click();
        await dlg.waitFor({ state: "hidden", timeout: 4000 });
        const savedText = await page.locator("main").innerText();

        await page
          .getByRole("button", { name: /Ekspor PDF Aktif|Export Current PDF/i })
          .first()
          .click();
        await dlg.waitFor({ state: "visible", timeout: 4000 });
        const exportTitle = await dlg.locator("h2").first().textContent();
        await page.keyboard.press("Escape");
        return {
          hasSaved: savedText.includes("Ransum Uji Tier1"),
          exportTitle: (exportTitle ?? "").trim(),
        };
      });
      assert.ok(res.hasSaved, "Saved recipe project should appear in SavedRecipesPage");
      assert.ok(/Ekspor Laporan PDF|Export PDF Report/i.test(res.exportTitle));
      assert.noConsoleErrors(await session.getConsoleErrors(), "T1-F8-05");
    },
  },
];
