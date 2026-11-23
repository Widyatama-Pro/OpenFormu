const PAIRWISE_MATRIX = [
  {
    id: "T3-01",
    mode: "Anti-Slop",
    modeKey: "anti-slop",
    theme: "light",
    amoled: false,
    palette: "original-default",
    lang: "id",
    viewport: { width: 1440, height: 900 },
  },
  {
    id: "T3-02",
    mode: "Anti-Slop",
    modeKey: "anti-slop",
    theme: "dark",
    amoled: false,
    palette: "template-01",
    lang: "en",
    viewport: { width: 375, height: 812 },
  },
  {
    id: "T3-03",
    mode: "Anti-Slop",
    modeKey: "anti-slop",
    theme: "dark",
    amoled: true,
    palette: "template-03",
    lang: "id",
    viewport: { width: 768, height: 1024 },
  },
  {
    id: "T3-04",
    mode: "Anti-Slop",
    modeKey: "anti-slop",
    theme: "light",
    amoled: false,
    palette: "template-04",
    lang: "en",
    viewport: { width: 768, height: 1024 },
  },
  {
    id: "T3-05",
    mode: "Anti-Slop",
    modeKey: "anti-slop",
    theme: "dark",
    amoled: false,
    palette: "template-05",
    lang: "id",
    viewport: { width: 1440, height: 900 },
  },
  {
    id: "T3-06",
    mode: "Anti-Slop",
    modeKey: "anti-slop",
    theme: "dark",
    amoled: true,
    palette: "original-default",
    lang: "en",
    viewport: { width: 375, height: 812 },
  },
  {
    id: "T3-07",
    mode: "Enhanced",
    modeKey: "enhanced",
    theme: "light",
    amoled: false,
    palette: "template-01",
    lang: "en",
    viewport: { width: 1440, height: 900 },
  },
  {
    id: "T3-08",
    mode: "Enhanced",
    modeKey: "enhanced",
    theme: "dark",
    amoled: true,
    palette: "template-04",
    lang: "id",
    viewport: { width: 375, height: 812 },
  },
  {
    id: "T3-09",
    mode: "Enhanced",
    modeKey: "enhanced",
    theme: "dark",
    amoled: false,
    palette: "template-05",
    lang: "en",
    viewport: { width: 768, height: 1024 },
  },
  {
    id: "T3-10",
    mode: "Biasa",
    modeKey: "biasa",
    theme: "light",
    amoled: false,
    palette: "template-03",
    lang: "id",
    viewport: { width: 375, height: 812 },
  },
  {
    id: "T3-11",
    mode: "Biasa",
    modeKey: "biasa",
    theme: "dark",
    amoled: false,
    palette: "original-default",
    lang: "en",
    viewport: { width: 1440, height: 900 },
  },
  {
    id: "T3-12",
    mode: "Biasa",
    modeKey: "biasa",
    theme: "dark",
    amoled: true,
    palette: "template-05",
    lang: "id",
    viewport: { width: 768, height: 1024 },
  },
];

export const tier3Cases = PAIRWISE_MATRIX.map((combo) => ({
  id: combo.id,
  tier: 3,
  feature: "Pairwise",
  title: `${combo.mode} × ${combo.theme}${combo.amoled ? "+AMOLED" : ""} × ${combo.palette} × ${combo.lang.toUpperCase()} × ${combo.viewport.width}px`,
  run: async ({ session, assert }) => {
    await session.resetToFreshApp({ viewport: combo.viewport });
    const res = await session.runScript(async (page, arg, H) => {
      await H.selectUiMode(page, arg.mode);
      await H.setLanguage(page, arg.lang);
      await H.setColorMode(page, arg.theme);
      await H.setPaletteId(page, arg.palette);
      if (arg.amoled) {
        await H.setAmoled(page, true);
      }

      const routeChecks = [];
      for (const r of ["settings", "formulation", "ingredients", "recipes"]) {
        await H.navigateTo(page, r);
        const layout = await H.probeLayoutAndOverflow(page);
        const surface = arg.modeKey === "anti-slop" ? await H.probeAntiSlopSurface(page) : null;
        const touch =
          arg.modeKey === "anti-slop" && arg.viewport.width < 768
            ? await H.probeMobileTouchTargets(page, 44)
            : null;
        const pairs = arg.modeKey === "anti-slop" ? await H.sampleContrastPairs(page) : [];
        routeChecks.push({ r, layout, surface, touch, pairs });
      }

      const currentLang = await H.getCurrentLanguage(page);
      const domState = await page.evaluate(
        (langVal) => ({
          uiMode: document.documentElement.dataset.uiMode ?? null,
          theme: document.documentElement.dataset.theme ?? null,
          mode: document.documentElement.dataset.mode ?? null,
          amoled: document.documentElement.dataset.amoled ?? null,
          lang: langVal,
        }),
        currentLang,
      );

      return { domState, routeChecks };
    }, combo);

    assert.equal(res.domState.uiMode, combo.modeKey, `${combo.id} uiMode`);
    assert.equal(res.domState.theme, combo.palette, `${combo.id} palette`);
    assert.equal(res.domState.mode, combo.theme, `${combo.id} color mode`);
    assert.equal(res.domState.lang, combo.lang, `${combo.id} language`);
    if (combo.amoled) {
      assert.equal(res.domState.amoled, "true", `${combo.id} amoled`);
    }

    for (const rc of res.routeChecks) {
      assert.noHorizontalOverflow(rc.layout, `${combo.id}:${rc.r}`);
      if (rc.surface) {
        assert.antiSlopSurface(rc.surface, `${combo.id}:${rc.r}`);
      }
      if (rc.touch) {
        assert.mobileTouchTargets(rc.touch, `${combo.id}:${rc.r}`);
      }
      if (rc.pairs && rc.pairs.length > 0) {
        await assert.checkContrastPairs(rc.pairs, `${combo.id}:${rc.r}`);
      }
    }

    assert.noConsoleErrors(await session.getConsoleErrors(), combo.id);
  },
}));
