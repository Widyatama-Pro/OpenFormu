export const tier4Cases = [
  {
    id: "T4-01",
    tier: 4,
    feature: "Scenario1",
    title: "Poultry Nutritionist Full Ration Cycle (Anti-Slop, Light, Desktop 1440px)",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp({ viewport: { width: 1440, height: 900 } });
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.setColorMode(page, "light");
        await H.navigateTo(page, "formulation");
        await H.selectThemedOption(page, "#preset-select", /Finisher|Starter/i);
        await H.waitForSolverIdle(page);

        const cpRow = page
          .locator(
            'section[aria-label="Panel Target Nutrien"], section[aria-label="Nutrient Targets Panel"]',
          )
          .locator("button[aria-expanded]")
          .first();
        await cpRow.click();
        await page.waitForTimeout(120);

        const tablist = page.getByRole("tablist", {
          name: /Sub-tampilan hasil|Formulation result views/i,
        });
        await tablist
          .getByRole("tab", { name: /Grafik|Charts/i })
          .first()
          .click();
        await page.waitForTimeout(150);

        await tablist
          .getByRole("tab", { name: /Harga Bayangan|Shadow Price/i })
          .first()
          .click();
        await page.waitForTimeout(150);
        await page
          .getByRole("button", { name: /Hitung Tangga Harga|Compute Price Ladder/i })
          .first()
          .click();
        await page.waitForTimeout(350);

        await tablist
          .getByRole("tab", { name: /What-If/i })
          .first()
          .click();
        await page.waitForTimeout(150);
        const slider = page.locator('input[type="range"][aria-label^="Slider What-If"]').first();
        await slider.fill("30");
        await slider.dispatchEvent("change");
        await H.waitForSolverIdle(page);
        await page
          .getByRole("button", { name: /Reset Semua Kunci|Reset All Locks/i })
          .first()
          .click();
        await H.waitForSolverIdle(page);

        const text = await page.locator("main").innerText();
        const layout = await H.probeLayoutAndOverflow(page);
        const surface = await H.probeAntiSlopSurface(page);
        return {
          hasOptimal: /\bOptimal\b/.test(text),
          layout,
          surface,
        };
      });
      assert.ok(res.hasOptimal, "Broiler ration cycle should remain Optimal");
      assert.noHorizontalOverflow(res.layout, "T4-01");
      assert.antiSlopSurface(res.surface, "T4-01");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T4-01");
    },
  },
  {
    id: "T4-02",
    tier: 4,
    feature: "Scenario2",
    title: "Dairy Farmer Mobile Field Check (Anti-Slop, Dark, Mobile 375px)",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp({ viewport: { width: 375, height: 812 } });
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.setColorMode(page, "dark");
        await H.navigateTo(page, "formulation");
        await H.selectThemedOption(page, "#commodity-select", /Sapi Perah|Dairy Cattle/i);
        await H.waitForSolverIdle(page);

        const stepper = page.getByRole("tablist", {
          name: /Tahapan formulasi mobile|Mobile formulation steps/i,
        });
        await stepper
          .getByRole("tab", { name: /2\.\s*Target/i })
          .first()
          .click();
        await page.waitForTimeout(150);
        await stepper
          .getByRole("tab", { name: /3\.\s*Hasil|3\.\s*Results/i })
          .first()
          .click();
        await page.waitForTimeout(180);

        const layout = await H.probeLayoutAndOverflow(page);
        const touch = await H.probeMobileTouchTargets(page, 44);
        const surface = await H.probeAntiSlopSurface(page);

        const moreBtn = page
          .locator('nav[aria-label="Navigasi bawah mobile"]')
          .getByRole("button", { name: /Menu/i })
          .first();
        await moreBtn.click();
        await H.verifyDialogFocusAndEscape(page, moreBtn, "T4-02-Drawer");

        return { layout, touch, surface };
      });
      assert.noHorizontalOverflow(res.layout, "T4-02");
      assert.mobileTouchTargets(res.touch, "T4-02");
      assert.antiSlopSurface(res.surface, "T4-02");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T4-02");
    },
  },
  {
    id: "T4-03",
    tier: 4,
    feature: "Scenario3",
    title: "Ingredient & Requirement Library Curation (Anti-Slop, EN, Tablet 768px)",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp({ viewport: { width: 768, height: 1024 } });
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.setLanguage(page, "en");
        await H.navigateTo(page, "ingredients");

        await page
          .getByRole("button", { name: /Add Feed/i })
          .first()
          .click();
        const dlg = page.locator('[role="dialog"]').first();
        await dlg.waitFor({ state: "visible", timeout: 4000 });
        await dlg.locator("input").first().fill("Dedak Padi Tablet Uji");
        await dlg.getByRole("button", { name: /Save Feed/i }).click();
        await dlg.waitFor({ state: "hidden", timeout: 4000 });

        await page.locator('input[type="search"]').first().fill("Dedak Padi Tablet Uji");
        await page.waitForTimeout(150);
        const ingText = await page.locator("main").innerText();

        await H.navigateTo(page, "requirements");
        await page
          .getByRole("button", { name: /Create New Profile/i })
          .first()
          .click();
        await dlg.waitFor({ state: "visible", timeout: 4000 });
        await dlg.locator("input").first().fill("Custom Tablet Broiler");
        await dlg.getByRole("button", { name: /Create & Apply/i }).click();
        await dlg.waitFor({ state: "hidden", timeout: 4000 });

        await H.waitForSolverIdle(page);
        const formLayout = await H.probeLayoutAndOverflow(page);
        return {
          addedIngredientVisible: ingText.includes("Dedak Padi Tablet Uji"),
          formLayout,
        };
      });
      assert.ok(res.addedIngredientVisible, "Newly added custom feed should appear in search");
      assert.noHorizontalOverflow(res.formLayout, "T4-03");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T4-03");
    },
  },
  {
    id: "T4-04",
    tier: 4,
    feature: "Scenario4",
    title:
      "Recipe Save, Export Dialog & Reload Persistence across Modes (Anti-Slop -> Biasa -> Enhanced)",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp({ viewport: { width: 1440, height: 900 } });
      const res = await session.runScript(async (page, _arg, H) => {
        await H.selectUiMode(page, "Anti-Slop");
        await H.navigateTo(page, "recipes");
        await page
          .getByRole("button", { name: /Simpan Sesi Saat Ini|Save Current Session/i })
          .first()
          .click();
        const dlg = page.locator('[role="dialog"]').first();
        await dlg.waitFor({ state: "visible", timeout: 4000 });
        await dlg.locator("input").first().fill("Proyek Uji Skenario 4");
        await dlg.getByRole("button", { name: /Simpan Proyek|Save Project/i }).click();
        await dlg.waitFor({ state: "hidden", timeout: 4000 });

        await page
          .getByRole("button", { name: /Ekspor PDF Aktif|Export Current PDF/i })
          .first()
          .click();
        await dlg.waitFor({ state: "visible", timeout: 4000 });
        await page.keyboard.press("Escape");
        await dlg.waitFor({ state: "hidden", timeout: 4000 });

        await H.selectUiMode(page, "Biasa");
        const biasaCap = await page.evaluate(() => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
          capsule: document
            .querySelector("[data-header-utility-capsule]")
            ?.getAttribute("data-header-utility-capsule"),
        }));

        await H.selectUiMode(page, "Enhanced");
        await page.reload({ waitUntil: "domcontentloaded" });
        await H.waitForHydration(page);
        await H.navigateTo(page, "recipes");
        const recipesAfterReload = await page.locator("main").innerText();
        const finalUiMode = await page.evaluate(
          () => document.documentElement.dataset.uiMode ?? null,
        );

        return {
          biasaCap,
          finalUiMode,
          hasSavedAfterReload: recipesAfterReload.includes("Proyek Uji Skenario 4"),
        };
      });
      assert.equal(res.biasaCap.uiMode, "biasa");
      assert.equal(res.biasaCap.capsule, "chrome");
      assert.equal(res.finalUiMode, "enhanced");
      assert.ok(res.hasSavedAfterReload, "Saved recipe must persist across reload");
      assert.noConsoleErrors(await session.getConsoleErrors(), "T4-04");
    },
  },
  {
    id: "T4-05",
    tier: 4,
    feature: "Scenario5",
    title: "Multi-Palette Stress Walkthrough (Anti-Slop across 5 palettes × Light/Dark + AMOLED)",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp({ viewport: { width: 1440, height: 900 } });
      const palettes = [
        "original-default",
        "template-01",
        "template-03",
        "template-04",
        "template-05",
      ];
      const checks = await session.runScript(
        async (page, arg, H) => {
          await H.selectUiMode(page, "Anti-Slop");
          const out = [];
          for (const pid of arg.palettes) {
            await H.navigateTo(page, "settings");
            await H.ensureSettingsBasicTab(page);
            await H.setPaletteId(page, pid);
            await H.setColorMode(page, "light");
            await H.navigateTo(page, "formulation");
            out.push({
              label: `${pid}-light`,
              pairs: await H.sampleContrastPairs(page),
              layout: await H.probeLayoutAndOverflow(page),
            });

            await H.navigateTo(page, "settings");
            await H.ensureSettingsBasicTab(page);
            await H.setColorMode(page, "dark");
            await H.setAmoled(page, true);
            await H.navigateTo(page, "formulation");
            out.push({
              label: `${pid}-dark-amoled`,
              pairs: await H.sampleContrastPairs(page),
              layout: await H.probeLayoutAndOverflow(page),
            });
          }
          return out;
        },
        { palettes },
      );

      for (const c of checks) {
        assert.noHorizontalOverflow(c.layout, c.label);
        await assert.checkContrastPairs(c.pairs, c.label);
      }
      assert.noConsoleErrors(await session.getConsoleErrors(), "T4-05");
    },
  },
  {
    id: "T4-06",
    tier: 4,
    feature: "Scenario6",
    title:
      "Legacy Upgrade & Infeasible Diagnostics Recovery (legacy false -> Anti-Slop -> conflict -> recovery)",
    run: async ({ session, assert }) => {
      await session.resetToFreshApp({
        localStorageSeed: { "openformu-theme-enhancer": "false" },
      });
      const res = await session.runScript(async (page, _arg, H) => {
        const migratedMode = await page.evaluate(
          () => document.documentElement.dataset.uiMode ?? null,
        );
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
        const cpRow = targetsPanel.locator("button[aria-expanded]").first();
        await cpRow.click();
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
        const alertSurface = await H.probeAntiSlopSurface(page, { checkCursor: false });

        await elasticSwitch.click();
        await H.waitForSolverIdle(page);
        const statusCount = await page.locator('[role="status"]').count();

        return {
          migratedMode,
          alertCount,
          statusCount,
          emDashCount: alertSurface.emDashCount,
        };
      });
      assert.equal(res.migratedMode, "biasa", "Legacy false must migrate to Biasa initially");
      assert.ok(res.alertCount >= 1, "Tight constraints must show role='alert' conflict banner");
      assert.equal(
        res.emDashCount,
        0,
        "Conflict diagnostics banner in Anti-Slop must contain 0 em dashes",
      );
      assert.ok(
        res.statusCount >= 1,
        "Toleransi Target should produce near-feasible status banner",
      );
      assert.noConsoleErrors(await session.getConsoleErrors(), "T4-06");
    },
  },
];
