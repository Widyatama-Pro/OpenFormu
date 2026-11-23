import { describe, expect, it } from "vitest";
import { HARTADI_FEEDS } from "../src/data/hartadi-feeds";
import { KEARL_REQUIREMENTS, NRC_1988_DAIRY_REQUIREMENTS } from "../src/data/kearl-requirements";
import {
  DEFAULT_CONFIG,
  MOCK_INGREDIENTS,
  MOCK_REQUIREMENTS,
  NRC_1994_POULTRY_REQUIREMENTS,
} from "../src/data/mock-state";
import { parseFeedJson, serializeRecipeToFeedJson } from "../src/storage/recipeTransfer";
import type { Nutrient, Recipe } from "../src/types";
import {
  exportIngredientsToCsv,
  parseAndMergeIngredientsCsv,
} from "../src/utils/ingredientCsvImport";
import { applyTsvGridPaste } from "../src/utils/tsvPaste";
import {
  validateCustomNutrient,
  validateFormulationConfig,
  validateIngredient,
  validateRequirement,
  validateUserPreferences,
} from "../src/utils/validators";

describe("Task 1 — Validators, .feed.json Transfer, CSV Partial Merge & TSV Paste", () => {
  it("memvalidasi seluruh kurasi data Hartadi + Kearl + NRC (1988 & 1994) terhadap skema kanonik tanpa duplikasi", () => {
    expect(HARTADI_FEEDS.length).toBe(344);
    const hartadiIds = new Set<string>();
    const hartadiIfns = new Set<string>();
    for (const ing of HARTADI_FEEDS) {
      expect(ing.isActive).toBe(false);
      expect(ing.source.trim().length).toBeGreaterThan(10);
      expect(hartadiIds.has(ing.id)).toBe(false);
      hartadiIds.add(ing.id);
      const ifnMatch = /IFN\s+(\d-\d{2}-\d{3})/.exec(ing.source);
      if (ifnMatch?.[1]) {
        expect(hartadiIfns.has(ifnMatch[1])).toBe(false);
        hartadiIfns.add(ifnMatch[1]);
      }
      const checked = validateIngredient(ing);
      expect(checked.ok).toBe(true);
    }

    expect(KEARL_REQUIREMENTS.length).toBe(98);
    const reqIds = new Set<string>();
    for (const req of KEARL_REQUIREMENTS) {
      expect(req.basis).toBe("dry_matter");
      expect(req.source?.includes("Kearl (1982)")).toBe(true);
      expect(reqIds.has(req.id)).toBe(false);
      reqIds.add(req.id);
      const checked = validateRequirement(req);
      expect(checked.ok).toBe(true);
    }

    expect(NRC_1988_DAIRY_REQUIREMENTS.length).toBe(24);
    for (const req of NRC_1988_DAIRY_REQUIREMENTS) {
      expect(req.basis).toBe("dry_matter");
      expect(req.source?.includes("NRC (1988)")).toBe(true);
      expect(reqIds.has(req.id)).toBe(false);
      reqIds.add(req.id);
      const checked = validateRequirement(req);
      expect(checked.ok).toBe(true);
    }

    expect(NRC_1994_POULTRY_REQUIREMENTS.length).toBe(18);
    for (const req of NRC_1994_POULTRY_REQUIREMENTS) {
      expect(req.basis).toBe("as_fed");
      expect(req.source?.includes("NRC (1994)")).toBe(true);
      expect(reqIds.has(req.id)).toBe(false);
      reqIds.add(req.id);
      const checked = validateRequirement(req);
      expect(checked.ok).toBe(true);
    }
  });

  it("menolak bahan dengan BK <= 0, harga negatif, atau min > max", () => {
    const badDm = validateIngredient({
      ...MOCK_INGREDIENTS[0],
      dryMatter: 0,
    });
    expect(badDm.ok).toBe(false);

    const badBounds = validateIngredient({
      ...MOCK_INGREDIENTS[0],
      inclusion: { min: 40, max: 20 },
    });
    expect(badBounds.ok).toBe(false);

    const badPrice = validateIngredient({
      ...MOCK_INGREDIENTS[0],
      pricePerKg: -500,
    });
    expect(badPrice.ok).toBe(false);
  });

  it("melakukan round-trip .feed.json dan menolak JSON korup atau schemaVersion tak dikenal", () => {
    const sampleRecipe: Recipe = {
      schemaVersion: 1,
      id: "recipe-test-1",
      name: "Uji Broiler",
      notes: "Catatan formulasi",
      ingredients: MOCK_INGREDIENTS.slice(0, 4),
      requirement: MOCK_REQUIREMENTS[0]!,
      config: DEFAULT_CONFIG,
      result: null,
      createdAt: "2026-11-15T00:00:00.000Z",
      updatedAt: "2026-11-15T00:00:00.000Z",
    };

    const json = serializeRecipeToFeedJson(sampleRecipe);
    const parsed = parseFeedJson(json);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.name).toBe("Uji Broiler");
      expect(parsed.data.ingredients.length).toBe(4);
      expect(parsed.data.requirement.id).toBe(MOCK_REQUIREMENTS[0]!.id);
    }

    expect(parseFeedJson("{bukan json").ok).toBe(false);
    expect(parseFeedJson(JSON.stringify({ schemaVersion: 99, id: "x" })).ok).toBe(false);
  });

  it("melakukan partial merge CSV dengan BOM, delimiter titik-koma, dan koma desimal", () => {
    const first = MOCK_INGREDIENTS[0]!;
    const csv = [
      "\uFEFFid;nama;harga;pk;tdn",
      `${first.id};${first.name};5650;;82,5`,
      ";Pakan Uji Baru;4200;19,4;71,0",
    ].join("\n");

    const res = parseAndMergeIngredientsCsv(csv, MOCK_INGREDIENTS);
    expect(res.errors.length).toBe(0);
    expect(res.updatedCount).toBe(1);
    expect(res.addedCount).toBe(1);

    const updatedCorn = res.ingredients.find((item) => item.id === first.id);
    expect(updatedCorn?.pricePerKg).toBe(5650);
    expect(updatedCorn?.nutrients.tdn).toBe(82.5);
    // Kolom pk dikosongkan -> nilai lama Jagung harus dipertahankan
    expect(updatedCorn?.nutrients.cp).toBe(first.nutrients.cp);

    const added = res.ingredients.find((item) => item.name === "Pakan Uji Baru");
    expect(added).toBeDefined();
    expect(added?.nutrients.cp).toBe(19.4);
  });

  it("menerapkan paste TSV multi-sel Excel secara presisi dan mengabaikan sel di luar batas", () => {
    const active = MOCK_INGREDIENTS.filter((i) => i.isActive !== false).slice(0, 3);
    const orderedCols = ["price", "dm", "min", "max", "cp", "me_poultry"] as const;

    // Paste 2 baris x 3 kolom dimulai dari kolom "price" baris 0
    const tsv = "6.100\t88,5\t10\t75\n10.800\t90\t5\t40\t46,5\t2250\n";
    const result = applyTsvGridPaste({
      clipboardText: tsv,
      activeIngredients: active,
      allIngredients: active,
      orderedCols,
      startRowIdx: 0,
      startColKey: "price",
    });

    expect(result.isGrid).toBe(true);
    expect(result.appliedCells).toBe(10);
    expect(result.ingredients[0]?.priceOverride).toBe(6100);
    expect(result.ingredients[0]?.dryMatter).toBe(88.5);
    expect(result.ingredients[0]?.inclusion?.min).toBe(10);
    expect(result.ingredients[1]?.nutrients.cp).toBe(46.5);
    expect(result.ingredients[1]?.nutrients.me_poultry).toBe(2250);

    // Paste tunggal tanpa tab/newline tidak diperlakukan sebagai grid
    const single = applyTsvGridPaste({
      clipboardText: "5200",
      activeIngredients: active,
      allIngredients: active,
      orderedCols,
      startRowIdx: 0,
      startColKey: "price",
    });
    expect(single.isGrid).toBe(false);
  });

  it("memvalidasi nutrien kustom (nama, satuan, basis) dan mendukung ekspor/impor CSV nutrien kustom", () => {
    const validCustom = validateCustomNutrient({
      id: "custom_beta_glukan",
      name: "Beta-Glukan",
      unit: "%",
      defaultBasis: "dry_matter",
    });
    expect(validCustom.ok).toBe(true);
    if (validCustom.ok) {
      expect(validCustom.data.isCustom).toBe(true);
      expect(validCustom.data.defaultBasis).toBe("dry_matter");
    }

    const badUnit = validateCustomNutrient({
      id: "custom_x",
      name: "Invalid Unit",
      unit: "oz",
    });
    expect(badUnit.ok).toBe(false);

    const cfgCheck = validateFormulationConfig({
      ...DEFAULT_CONFIG,
      customNutrients: [
        {
          id: "custom_beta_glukan",
          name: "Beta-Glukan",
          unit: "%",
          defaultBasis: "dry_matter",
        },
      ],
    });
    expect(cfgCheck.ok).toBe(true);

    const customList: readonly Nutrient[] = [
      {
        id: "custom_beta_glukan",
        name: "Beta-Glukan",
        unit: "%",
        isCustom: true,
        defaultBasis: "dry_matter",
      },
    ];
    const sample = MOCK_INGREDIENTS.slice(0, 2).map((ing, i) => ({
      ...ing,
      nutrients: { ...ing.nutrients, custom_beta_glukan: i === 0 ? 1.25 : 0.4 },
    }));
    const exported = exportIngredientsToCsv(sample, customList);
    expect(exported).toContain("custom_beta_glukan (%)");

    const reimported = parseAndMergeIngredientsCsv(
      `id,Beta-Glukan (%)\n${sample[0]!.id},2.35`,
      sample,
      customList,
    );
    expect(reimported.errors).toEqual([]);
    expect(reimported.updatedCount).toBe(1);
    expect(reimported.ingredients[0]?.nutrients.custom_beta_glukan).toBe(2.35);
  });

  it("memvalidasi uiMode (biasa | enhanced | anti-slop), membersihkan input tidak valid, dan menjaga kompatibilitas uiEnhancer", () => {
    for (const mode of ["biasa", "enhanced", "anti-slop"] as const) {
      const res = validateUserPreferences({
        language: "id",
        theme: "light",
        uiMode: mode,
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.uiMode).toBe(mode);
      }
    }

    for (const badMode of ["slop", 123, null, "__proto__", "constructor"]) {
      const res = validateUserPreferences({
        language: "en",
        theme: "dark",
        uiMode: badMode,
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.uiMode).toBeUndefined();
        expect("uiMode" in res.data).toBe(false);
      }
    }

    const legacy = validateUserPreferences({
      language: "id",
      theme: "light",
      uiEnhancer: false,
      defaultBasis: "as_fed",
      defaultBatchKg: 100,
      zeroInclusionDefaultPct: 1,
    });
    expect(legacy.ok).toBe(true);
    if (legacy.ok) {
      expect(legacy.data.uiEnhancer).toBe(false);
      expect(legacy.data.uiMode).toBeUndefined();
    }
  });
});
