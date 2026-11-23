import { memo, useEffect, useMemo, useState } from "react";
import { Info, TrendingUp } from "lucide-react";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import { getNutrientDisplayName, getNutrientFullName, pickLang } from "../../i18n";
import { computeCriticalPriceLadder, type CriticalStep } from "../../solver";
import { useOptionalThemeContext } from "../../theme";
import type {
  AppLanguage,
  BoundDualItem,
  CompositionItem,
  FormulationConfig,
  Ingredient,
  Nutrient,
  NutrientResult,
  OpportunityCostItem,
  Requirement,
} from "../../types";
import { cn } from "../../utils/cn";
import {
  formatCurrencyIdr,
  formatNumberLocale,
  resolveDisplayDigits,
} from "../../utils/locale-number";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ThemedSelect } from "../ui/ThemedSelect";

export interface ShadowPriceTabProps {
  readonly nutrients: readonly NutrientResult[];
  readonly allNutrients?: readonly Nutrient[];
  readonly composition: readonly CompositionItem[];
  readonly opportunityCosts: readonly OpportunityCostItem[];
  readonly boundDuals: readonly BoundDualItem[];
  readonly ingredients: readonly Ingredient[];
  readonly requirement?: Requirement;
  readonly config?: FormulationConfig;
  readonly decimalPlaces?: 0 | 1 | 2;
  readonly simpleMode?: boolean;
  readonly language?: AppLanguage;
}

export const ShadowPriceTab = memo(function ShadowPriceTab({
  nutrients,
  allNutrients = MOCK_NUTRIENTS,
  composition,
  opportunityCosts,
  boundDuals,
  ingredients,
  requirement,
  config,
  decimalPlaces = 0,
  simpleMode = true,
  language = "id",
}: ShadowPriceTabProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";
  const emptyDash = isAntiSlop ? "-" : "—";
  const ingMap = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const nutMap = useMemo(() => new Map(allNutrients.map((n) => [n.id, n])), [allNutrients]);

  const activeIngredients = useMemo(
    () => ingredients.filter((i) => i.isActive !== false),
    [ingredients],
  );
  const [selectedIngId, setSelectedIngId] = useState<string>(
    () => composition[0]?.ingredientId ?? activeIngredients[0]?.id ?? "",
  );
  const [ladderSteps, setLadderSteps] = useState<readonly CriticalStep[] | null>(null);
  const [ladderLoading, setLadderLoading] = useState(false);
  const [ladderError, setLadderError] = useState<string | null>(null);

  const effectiveTargetId = useMemo(() => {
    if (activeIngredients.some((i) => i.id === selectedIngId)) return selectedIngId;
    return composition[0]?.ingredientId ?? activeIngredients[0]?.id ?? "";
  }, [activeIngredients, composition, selectedIngId]);

  useEffect(() => {
    setLadderSteps(null);
    setLadderError(null);
  }, [effectiveTargetId, requirement?.id, config?.activeBasis, config?.optimizationMode]);

  const handleComputeLadder = async () => {
    if (!requirement || !config || !effectiveTargetId) return;
    setLadderLoading(true);
    setLadderError(null);
    try {
      const steps = await computeCriticalPriceLadder(
        ingredients,
        requirement,
        config,
        effectiveTargetId,
      );
      setLadderSteps(steps);
    } catch (err) {
      setLadderSteps(null);
      setLadderError(
        err instanceof Error
          ? err.message
          : pickLang(
              language,
              "Gagal menghitung kurva tangga harga. Silakan coba lagi.",
              "Failed to compute price ladder. Please try again.",
            ),
      );
    } finally {
      setLadderLoading(false);
    }
  };

  const cardSurfaceClass = isAntiSlop
    ? "rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-3"
    : "glass-card rounded-xl p-3";

  return (
    <div className="space-y-3 text-xs">
      {/* Kotak penjelasan ramah peternak tentang fungsi Harga Bayangan */}
      <div className="flex items-start gap-2.5 rounded-xl border border-[var(--status-success-border)] bg-[var(--status-success-soft)] p-3 text-[11px] text-[var(--text-primary)]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-success)]" aria-hidden="true" />
        <div className="space-y-0.5 leading-relaxed">
          <p className="font-bold text-[var(--status-success)]">
            {pickLang(language, "Apa itu Harga Bayangan (Shadow Price)?", "What is Shadow Price?")}
          </p>
          <p className="text-[var(--text-secondary)]">
            {pickLang(
              language,
              "Harga Bayangan menunjukkan perkiraan perubahan biaya pakan per kg jika target suatu nutrien diubah 1 satuan. Contoh: jika PK bernilai Rp 180, menurunkan syarat minimal PK sebesar 1% dapat menghemat sekitar Rp 180/kg pakan. Nilai Rp 0 (Longgar) artinya batas nutrien tersebut tidak sedang menaikkan biaya.",
              "Shadow Price estimates how much feed cost per kg changes when a nutrient bound shifts by 1 unit. A value of Rp 0 (Slack) means that constraint is not currently driving up ration cost.",
            )}
          </p>
        </div>
      </div>

      {/* Harga Bayangan Nutrisi */}
      <div className={cardSurfaceClass}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-[var(--text-primary)]">
            {pickLang(
              language,
              "Harga Bayangan Kendala Nutrisi",
              "Nutrient Constraint Shadow Prices",
            )}
          </h3>
          <Badge tone="emerald">
            {pickLang(language, "Analisis Sensitivitas", "Sensitivity Analysis")}
          </Badge>
        </div>

        {nutrients.length === 0 ? (
          <p className="py-4 text-center text-xs text-[var(--text-secondary)]">
            {pickLang(
              language,
              "Belum ada kendala nutrien yang dievaluasi. Aktifkan bahan dan target nutrien untuk melihat harga bayangan.",
              "No evaluated nutrient constraints yet. Enable feeds and targets to inspect shadow prices.",
            )}
          </p>
        ) : (
          <>
            {/* Mobile Cards (< md) */}
            <div className="space-y-2 md:hidden">
              {nutrients.map((n) => {
                const meta = nutMap.get(n.nutrientId);
                const sp = n.shadowPrice ?? 0;
                const nutLabel = meta
                  ? getNutrientDisplayName(meta, language, simpleMode)
                  : n.nutrientId;
                const nutTitle = meta ? getNutrientFullName(meta, language) : n.nutrientId;
                const validRangeText =
                  n.rhsRange && (n.rhsRange.min !== null || n.rhsRange.max !== null)
                    ? `${
                        n.rhsRange.min !== null
                          ? formatNumberLocale(
                              n.rhsRange.min,
                              resolveDisplayDigits(
                                meta?.unit,
                                n.nutrientId,
                                decimalPlaces,
                                n.rhsRange.min,
                              ),
                            )
                          : "0"
                      } – ${
                        n.rhsRange.max !== null
                          ? formatNumberLocale(
                              n.rhsRange.max,
                              resolveDisplayDigits(
                                meta?.unit,
                                n.nutrientId,
                                decimalPlaces,
                                n.rhsRange.max,
                              ),
                            )
                          : "∞"
                      }`
                    : emptyDash;

                return (
                  <div
                    key={n.nutrientId}
                    className={cn(
                      "rounded-xl border border-[var(--border-subtle)] p-2.5",
                      isAntiSlop ? "bg-[var(--bg-surface)]" : "bg-[var(--bg-surface)]/80",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        title={nutTitle}
                        className="min-w-0 truncate font-bold text-[var(--text-primary)]"
                      >
                        {nutLabel} ({meta?.unit ?? ""})
                      </span>
                      {n.isDegenerate ? (
                        <Badge tone="rose">{pickLang(language, "Degenerat", "Degenerate")}</Badge>
                      ) : (
                        <Badge tone={sp !== 0 ? "amber" : "neutral"}>
                          {sp !== 0
                            ? pickLang(language, "Mengikat Biaya", "Binding")
                            : pickLang(language, "Longgar", "Slack")}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[var(--border-subtle)] pt-2 text-[11px] tabular-nums">
                      <div className="min-w-0">
                        <span className="block text-[10px] font-medium text-[var(--text-muted)]">
                          {pickLang(language, "Harga Bayangan", "Shadow Price")}
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {sp !== 0 ? formatCurrencyIdr(sp) : "Rp 0"}
                        </span>
                        {n.isDegenerate &&
                          (n.shadowPriceDown !== undefined || n.shadowPriceUp !== undefined) && (
                            <span className="block text-[10px] text-[var(--text-muted)]">
                              ↓{" "}
                              {n.shadowPriceDown != null
                                ? formatCurrencyIdr(n.shadowPriceDown)
                                : emptyDash}{" "}
                              · ↑{" "}
                              {n.shadowPriceUp != null
                                ? formatCurrencyIdr(n.shadowPriceUp)
                                : emptyDash}
                            </span>
                          )}
                      </div>
                      <div className="min-w-0 text-right">
                        <span className="block text-[10px] font-medium text-[var(--text-muted)]">
                          {pickLang(language, "Rentang Batas Valid", "Valid Bound Range")}
                        </span>
                        <span className="font-semibold text-[var(--text-secondary)]">
                          {validRangeText}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse">
                <thead className="border-b border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-2.5 py-2 text-left whitespace-nowrap">
                      {pickLang(language, "Nutrien", "Nutrient")}
                    </th>
                    <th className="px-2.5 py-2 text-right whitespace-nowrap">
                      {pickLang(language, "Harga Bayangan", "Shadow Price")}
                    </th>
                    <th className="px-2.5 py-2 text-right whitespace-nowrap">
                      {pickLang(language, "Rentang Batas Valid", "Valid Bound Range")}
                    </th>
                    <th className="px-2.5 py-2 text-right whitespace-nowrap">
                      {pickLang(language, "Status Batas", "Bound Status")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {nutrients.map((n) => {
                    const meta = nutMap.get(n.nutrientId);
                    const sp = n.shadowPrice ?? 0;
                    const nutLabel = meta
                      ? getNutrientDisplayName(meta, language, simpleMode)
                      : n.nutrientId;
                    const nutTitle = meta ? getNutrientFullName(meta, language) : n.nutrientId;
                    return (
                      <tr key={n.nutrientId}>
                        <td
                          title={nutTitle}
                          className="px-2.5 py-2 font-semibold whitespace-nowrap text-[var(--text-primary)]"
                        >
                          {nutLabel} ({meta?.unit ?? ""})
                        </td>
                        <td className="px-2.5 py-2 text-right font-medium whitespace-nowrap tabular-nums text-[var(--text-primary)]">
                          <div>{sp !== 0 ? formatCurrencyIdr(sp) : "Rp 0"}</div>
                          {n.isDegenerate &&
                            (n.shadowPriceDown !== undefined || n.shadowPriceUp !== undefined) && (
                              <div className="text-[10px] font-normal text-[var(--text-muted)]">
                                ↓{" "}
                                {n.shadowPriceDown != null
                                  ? formatCurrencyIdr(n.shadowPriceDown)
                                  : emptyDash}{" "}
                                · ↑{" "}
                                {n.shadowPriceUp != null
                                  ? formatCurrencyIdr(n.shadowPriceUp)
                                  : emptyDash}
                              </div>
                            )}
                        </td>
                        <td className="px-2.5 py-2 text-right font-medium whitespace-nowrap tabular-nums text-[var(--text-secondary)]">
                          {n.rhsRange && (n.rhsRange.min !== null || n.rhsRange.max !== null)
                            ? `${
                                n.rhsRange.min !== null
                                  ? formatNumberLocale(
                                      n.rhsRange.min,
                                      resolveDisplayDigits(
                                        meta?.unit,
                                        n.nutrientId,
                                        decimalPlaces,
                                        n.rhsRange.min,
                                      ),
                                    )
                                  : "0"
                              } – ${
                                n.rhsRange.max !== null
                                  ? formatNumberLocale(
                                      n.rhsRange.max,
                                      resolveDisplayDigits(
                                        meta?.unit,
                                        n.nutrientId,
                                        decimalPlaces,
                                        n.rhsRange.max,
                                      ),
                                    )
                                  : "∞"
                              }`
                            : emptyDash}
                        </td>
                        <td className="px-2.5 py-2 text-right whitespace-nowrap">
                          {n.isDegenerate ? (
                            <Badge tone="rose">
                              {pickLang(language, "Degenerat", "Degenerate")}
                            </Badge>
                          ) : (
                            <Badge tone={sp !== 0 ? "amber" : "neutral"}>
                              {sp !== 0
                                ? pickLang(language, "Mengikat Biaya", "Binding")
                                : pickLang(language, "Longgar", "Slack")}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Peta Tangga Harga Beli */}
      {requirement && config && activeIngredients.length > 0 && (
        <div className={cardSurfaceClass}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                <TrendingUp className="h-3.5 w-3.5 text-[var(--status-info)]" aria-hidden="true" />
                <span>
                  {pickLang(
                    language,
                    "Peta Tangga Harga Beli (Titik Layak Beli)",
                    "Buy / No-Buy Price Ladder",
                  )}
                </span>
              </h3>
              <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                {pickLang(
                  language,
                  "Menunjukkan pada titik harga berapa persentase suatu bahan berubah dalam racikan.",
                  "Shows the exact price breakpoints where an ingredient's inclusion share shifts.",
                )}
              </p>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <div className="min-w-0 flex-1 sm:w-48 sm:flex-none">
                <ThemedSelect
                  ariaLabel={pickLang(
                    language,
                    "Pilih bahan untuk kurva tangga harga",
                    "Select ingredient for price ladder",
                  )}
                  modalTitle={pickLang(
                    language,
                    "Pilih Bahan Kurva Harga",
                    "Select Ingredient for Price Ladder",
                  )}
                  value={effectiveTargetId}
                  language={language}
                  popoverMinWidthPx={230}
                  onChange={setSelectedIngId}
                  options={activeIngredients.map((ing) => ({
                    value: ing.id,
                    label: language === "id" ? ing.name : (ing.nameEn ?? ing.name),
                  }))}
                  className="min-h-11 py-0 text-[11px] md:h-8 md:min-h-8"
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={ladderLoading}
                onClick={() => void handleComputeLadder()}
                className="shrink-0 whitespace-nowrap"
              >
                {ladderLoading
                  ? pickLang(language, "Menghitung...", "Computing...")
                  : pickLang(language, "Hitung Tangga Harga", "Compute Price Ladder")}
              </Button>
            </div>
          </div>

          {ladderLoading && (
            <div role="status" className="space-y-2 py-2">
              <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                {pickLang(
                  language,
                  "Menghitung titik perubahan harga bahan...",
                  "Computing ingredient price breakpoints...",
                )}
              </p>
              {!isAntiSlop && (
                <>
                  <div className="skeleton-shimmer h-4 w-2/3 rounded" />
                  <div className="skeleton-shimmer h-14 w-full rounded-lg" />
                </>
              )}
            </div>
          )}

          {!ladderLoading && ladderError && (
            <div
              role="alert"
              className="rounded-lg border border-[var(--status-danger-border)] bg-[var(--status-danger-soft)] p-2.5 text-[11px] font-medium text-[var(--status-danger)]"
            >
              {ladderError}
            </div>
          )}

          {!ladderLoading && !ladderError && ladderSteps && ladderSteps.length === 0 && (
            <p className="text-[11px] text-[var(--text-secondary)]">
              {pickLang(
                language,
                "Kurva tangga tidak tersedia pada kondisi target tidak terpenuhi.",
                "Price ladder unavailable when formulation is infeasible.",
              )}
            </p>
          )}

          {!ladderLoading && !ladderError && ladderSteps && ladderSteps.length > 0 && (
            <div style={{ touchAction: "pan-x pan-y" }} className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="border-b border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-2.5 py-2 text-left whitespace-nowrap">
                      {pickLang(language, "Titik Harga Bahan", "Ingredient Price")}
                    </th>
                    <th className="px-2.5 py-2 text-right whitespace-nowrap">
                      {pickLang(language, "Inklusi Target", "Target Inclusion")}
                    </th>
                    <th className="px-2.5 py-2 text-right whitespace-nowrap">
                      {pickLang(language, "Biaya Ransum / kg", "Ration Cost / kg")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {ladderSteps.map((step, idx) => {
                    const frac =
                      step.composition.find((c) => c.ingredientId === effectiveTargetId)
                        ?.fraction ?? 0;
                    return (
                      <tr key={`${step.price}-${idx}`}>
                        <td className="px-2.5 py-2 font-semibold whitespace-nowrap tabular-nums text-[var(--text-primary)]">
                          {formatCurrencyIdr(step.price)}
                        </td>
                        <td className="px-2.5 py-2 text-right font-semibold whitespace-nowrap tabular-nums text-[var(--status-success)]">
                          {formatNumberLocale(
                            frac * 100,
                            resolveDisplayDigits("%", "inclusion", decimalPlaces, frac * 100),
                          )}
                          %
                        </td>
                        <td className="px-2.5 py-2 text-right whitespace-nowrap tabular-nums text-[var(--text-secondary)]">
                          {step.costPerKg !== null ? formatCurrencyIdr(step.costPerKg) : emptyDash}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Rentang Harga Aman & Harga Impas bahan belum terpakai */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className={cardSurfaceClass}>
          <h3 className="mb-2 font-bold text-[var(--text-primary)]">
            {pickLang(
              language,
              "Rentang Harga Aman Bahan Terpilih",
              "Safe Price Range (Selected Feeds)",
            )}
          </h3>
          {composition.length === 0 ? (
            <p className="text-[11px] text-[var(--text-secondary)]">
              {pickLang(
                language,
                "Belum ada bahan terpilih dalam komposisi untuk menghitung rentang harga aman.",
                "No selected feeds in the composition yet to compute safe price ranges.",
              )}
            </p>
          ) : (
            <div className="space-y-1.5">
              {composition.map((item) => {
                const ing = ingMap.get(item.ingredientId);
                const ingLabel = ing
                  ? language === "id"
                    ? ing.name
                    : (ing.nameEn ?? ing.name)
                  : item.ingredientId;
                return (
                  <div
                    key={item.ingredientId}
                    className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-1.5 last:border-b-0"
                  >
                    <span className="truncate font-semibold text-[var(--text-primary)]">
                      {ingLabel}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-[var(--text-secondary)]">
                      {item.priceRange?.minPrice !== null && item.priceRange?.minPrice !== undefined
                        ? formatCurrencyIdr(item.priceRange.minPrice)
                        : "0"}{" "}
                      –{" "}
                      {item.priceRange?.maxPrice !== null && item.priceRange?.maxPrice !== undefined
                        ? formatCurrencyIdr(item.priceRange.maxPrice)
                        : "∞"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={cardSurfaceClass}>
          <h3 className="mb-2 font-bold text-[var(--text-primary)]">
            {pickLang(
              language,
              "Harga Impas Bahan Belum Dipakai (0%)",
              "Opportunity Cost (Unused Feeds 0%)",
            )}
          </h3>
          {opportunityCosts.length === 0 ? (
            <p className="text-[11px] text-[var(--text-secondary)]">
              {pickLang(
                language,
                "Semua bahan aktif sudah masuk dalam formula.",
                "All active ingredients are included in the ration.",
              )}
            </p>
          ) : (
            <div className="space-y-2">
              {opportunityCosts.map((opp) => {
                const ing = ingMap.get(opp.ingredientId);
                const ingLabel = ing
                  ? language === "id"
                    ? ing.name
                    : (ing.nameEn ?? ing.name)
                  : opp.ingredientId;
                return (
                  <div
                    key={opp.ingredientId}
                    className={cn(
                      "rounded-lg p-2",
                      isAntiSlop
                        ? "border border-[var(--border-subtle)] bg-[var(--bg-sunken)]"
                        : "neu-well",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5 font-semibold text-[var(--text-primary)]">
                      <span className="min-w-0 truncate">{ingLabel}</span>
                      <span className="shrink-0 tabular-nums text-[var(--status-success)]">
                        {pickLang(language, "Layak ≤", "Break-even ≤")}{" "}
                        {formatCurrencyIdr(opp.opportunityPrice)}/kg
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] tabular-nums text-[var(--text-secondary)]">
                      {pickLang(
                        language,
                        `Harga saat ini ${formatCurrencyIdr(opp.currentPrice)} (turunkan ${formatCurrencyIdr(opp.reducedCost)} agar masuk ransum)`,
                        `Current price ${formatCurrencyIdr(opp.currentPrice)} (drop by ${formatCurrencyIdr(opp.reducedCost)} to enter ration)`,
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {boundDuals.length > 0 && (
            <div className="mt-3 border-t border-[var(--border-subtle)] pt-2">
              <p className="mb-1 text-[11px] font-bold text-[var(--text-primary)]">
                {pickLang(
                  language,
                  "Dampak Batas Bahan (Menempel Min/Maks)",
                  "Bound Duals (Feeds at Min/Max Bounds)",
                )}
              </p>
              {boundDuals.map((bd) => {
                const ing = ingMap.get(bd.ingredientId);
                const ingLabel = ing
                  ? language === "id"
                    ? ing.name
                    : (ing.nameEn ?? ing.name)
                  : bd.ingredientId;
                return (
                  <div
                    key={bd.ingredientId}
                    className="flex justify-between text-[11px] tabular-nums text-[var(--text-secondary)]"
                  >
                    <span>
                      {ingLabel} ({bd.boundHit === "min" ? "Min" : "Maks"})
                    </span>
                    <span>{formatNumberLocale(bd.dualValue, 0)} Rp/%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
