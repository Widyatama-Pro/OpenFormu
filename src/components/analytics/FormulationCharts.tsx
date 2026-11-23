import { memo } from "react";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import { getNutrientDisplayName, getNutrientShortName, pickLang } from "../../i18n";
import { useTheme } from "../../theme";
import type {
  AppLanguage,
  CompositionItem,
  Ingredient,
  Nutrient,
  NutrientResult,
} from "../../types";
import { cn } from "../../utils/cn";
import { formatNumberLocale, resolveDisplayDigits } from "../../utils/locale-number";
import { NeumorphicProgressTrack } from "../ui/NeumorphicProgressTrack";

export interface FormulationChartsProps {
  readonly composition: readonly CompositionItem[];
  readonly nutrients: readonly NutrientResult[];
  readonly allNutrients?: readonly Nutrient[];
  readonly ingredients: readonly Ingredient[];
  readonly batchTotalCost: number | null;
  readonly decimalPlaces?: 0 | 1 | 2;
  readonly simpleMode?: boolean;
  readonly language?: AppLanguage;
}

/** Visualisasi SVG ringkas & reaktif terhadap tema aktif: Radar Target vs Aktual, Bar Berat vs Biaya, dan Rentang Nutrien. */
export const FormulationCharts = memo(function FormulationCharts({
  composition,
  nutrients,
  allNutrients = MOCK_NUTRIENTS,
  ingredients,
  decimalPlaces = 0,
  simpleMode = true,
  language = "id",
}: FormulationChartsProps) {
  const { paletteId, resolvedMode, amoledPureBlack, uiMode } = useTheme();
  const isAntiSlop = uiMode === "anti-slop";
  const themeSignature = `${paletteId}-${resolvedMode}-${amoledPureBlack ? "amoled" : "std"}`;

  const ingMap = new Map(ingredients.map((i) => [i.id, i]));
  const nutMap = new Map(allNutrients.map((n) => [n.id, n]));
  const totalCostContribution = composition.reduce(
    (sum, item) => sum + Math.max(0, item.costContribution ?? 0),
    0,
  );

  const radarItems = nutrients
    .filter((n) => n.min !== undefined || n.max !== undefined)
    .slice(0, 6);

  const cx = 90;
  const cy = 90;
  const maxR = 54;

  const getPolygonPoints = (ratios: readonly number[]) =>
    ratios
      .map((r, i) => {
        const angle = (Math.PI * 2 * i) / Math.max(ratios.length, 1) - Math.PI / 2;
        const clamped = Math.max(0.15, Math.min(1.25, r));
        const px = cx + Math.cos(angle) * maxR * clamped;
        const py = cy + Math.sin(angle) * maxR * clamped;
        return `${px.toFixed(1)},${py.toFixed(1)}`;
      })
      .join(" ");

  const targetPolygon = getPolygonPoints(radarItems.map(() => 1));
  const actualRatios = radarItems.map((n) => {
    const ref =
      n.min !== undefined && n.max !== undefined
        ? (n.min + n.max) / 2
        : (n.min ?? n.max ?? (n.value || 1));
    return ref > 0 ? n.value / ref : 1;
  });
  const actualPolygon = getPolygonPoints(actualRatios);

  const chartCardClass = isAntiSlop
    ? "rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-3"
    : "glass-card rounded-xl p-2.5";

  return (
    <div data-theme-chart={themeSignature} className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
      {/* Radar Chart Target Ideal vs Hasil Aktual */}
      <div className={chartCardClass}>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-[var(--text-primary)]">
            {isAntiSlop
              ? pickLang(
                  language,
                  "Seberapa Dekat Hasil Aktual ke Target Ideal?",
                  "How Close Are Actual Nutrients to Targets?",
                )
              : pickLang(language, "Radar Target Ideal vs Aktual", "Ideal Target vs Actual Radar")}
          </h3>
          <div className="flex items-center gap-2.5 text-[10px] font-medium">
            <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
              <span
                className={cn(
                  "h-2 w-2 bg-[var(--chart-radar-target)]",
                  isAntiSlop ? "rounded-xs" : "rounded-full",
                )}
              />{" "}
              Target
            </span>
            <span className="inline-flex items-center gap-1 text-[var(--chart-radar-actual-stroke)]">
              <span
                className={cn(
                  "h-2 w-2 bg-[var(--chart-radar-actual-stroke)]",
                  isAntiSlop ? "rounded-xs" : "rounded-full",
                )}
              />{" "}
              {pickLang(language, "Aktual", "Actual")}
            </span>
          </div>
        </div>

        {radarItems.length < 3 ? (
          <p className="py-6 text-center text-xs text-[var(--text-secondary)]">
            {pickLang(
              language,
              "Aktifkan minimal 3 batasan nutrien untuk menampilkan Radar Chart.",
              "Enable at least 3 nutrient constraints to display the Radar Chart.",
            )}
          </p>
        ) : (
          <div className="flex justify-center">
            <svg
              viewBox={isAntiSlop ? "-12 -12 204 204" : "0 0 180 180"}
              className={isAntiSlop ? "h-44 w-44 sm:h-48 sm:w-48" : "h-32 w-32"}
              role="img"
              aria-label="Radar nutrien"
            >
              {[0.5, 1].map((ring) => (
                <circle
                  key={ring}
                  cx={cx}
                  cy={cy}
                  r={maxR * ring}
                  fill="none"
                  stroke="var(--chart-radar-grid)"
                  strokeDasharray={ring === 0.5 ? "3 3" : undefined}
                />
              ))}
              {radarItems.map((item, i) => {
                const angle = (Math.PI * 2 * i) / radarItems.length - Math.PI / 2;
                const x2 = cx + Math.cos(angle) * maxR;
                const y2 = cy + Math.sin(angle) * maxR;
                const lx = cx + Math.cos(angle) * (maxR + (isAntiSlop ? 18 : 16));
                const ly = cy + Math.sin(angle) * (maxR + (isAntiSlop ? 18 : 16));
                const meta = nutMap.get(item.nutrientId);
                const axisLabel = meta ? getNutrientShortName(meta, language) : item.nutrientId;
                return (
                  <g key={item.nutrientId}>
                    <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="var(--chart-radar-grid)" />
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="var(--text-secondary)"
                      className={isAntiSlop ? "text-[10.5px] font-bold" : "text-[9px] font-bold"}
                    >
                      {axisLabel}
                    </text>
                  </g>
                );
              })}
              <polygon
                points={targetPolygon}
                fill="none"
                stroke="var(--chart-radar-target)"
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
              <polygon
                points={actualPolygon}
                fill="var(--chart-radar-actual-fill)"
                stroke="var(--chart-radar-actual-stroke)"
                strokeWidth={1.75}
              />
            </svg>
          </div>
        )}
      </div>

      {/* Bar Chart Porsi Berat (%) vs Porsi Biaya (%) */}
      <div className={chartCardClass}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-[var(--text-primary)]">
            {isAntiSlop
              ? pickLang(
                  language,
                  "Bahan Mana yang Paling Menguras Biaya vs Porsi Berat?",
                  "Which Feeds Drive Ration Cost vs Weight Share?",
                )
              : pickLang(
                  language,
                  "Porsi Berat (%) vs Porsi Biaya (%)",
                  "Weight Share (%) vs Cost Share (%)",
                )}
          </h3>
          <div className="flex items-center gap-2.5 text-[10px] font-medium">
            <span className="inline-flex items-center gap-1 text-[var(--chart-weight-bar)]">
              <span className="h-2 w-2 rounded-xs bg-[var(--chart-weight-bar)]" />{" "}
              {pickLang(language, "Berat", "Weight")}
            </span>
            <span className="inline-flex items-center gap-1 text-[var(--chart-cost-bar)]">
              <span className="h-2 w-2 rounded-xs bg-[var(--chart-cost-bar)]" />{" "}
              {pickLang(language, "Biaya", "Cost")}
            </span>
          </div>
        </div>

        {composition.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--text-secondary)]">
            {pickLang(
              language,
              "Belum ada komposisi bahan aktif untuk membandingkan porsi berat dan biaya.",
              "No active feed composition yet to compare weight and cost shares.",
            )}
          </p>
        ) : (
          <div className="space-y-1.5">
            {composition.slice(0, 5).map((item) => {
              const ing = ingMap.get(item.ingredientId);
              const weightPct = item.fraction * 100;
              const costPct =
                totalCostContribution > 0 && item.costContribution !== undefined
                  ? (Math.max(0, item.costContribution) / totalCostContribution) * 100
                  : weightPct;
              const ingName = ing
                ? language === "id"
                  ? ing.name
                  : (ing.nameEn ?? ing.name)
                : item.ingredientId;

              return (
                <div key={item.ingredientId} className="space-y-0.5 text-[11px]">
                  <div className="flex justify-between gap-2">
                    <span className="truncate font-semibold text-[var(--text-primary)]">
                      {ingName}
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums text-[var(--text-secondary)]">
                      {formatNumberLocale(
                        weightPct,
                        resolveDisplayDigits("%", "inclusion", decimalPlaces, weightPct),
                      )}
                      % {pickLang(language, "berat", "wt")} ·{" "}
                      {formatNumberLocale(
                        costPct,
                        resolveDisplayDigits("%", "inclusion", decimalPlaces, costPct),
                      )}
                      % {pickLang(language, "biaya", "cost")}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-0.5">
                    <div
                      className={cn(
                        "h-1.5 w-full overflow-hidden rounded-full",
                        isAntiSlop ? "bg-[var(--bg-sunken)]" : "neu-well",
                      )}
                    >
                      <div
                        className="h-full rounded-full bg-[var(--chart-weight-bar)]"
                        style={{ width: `${Math.min(100, weightPct)}%` }}
                      />
                    </div>
                    <div
                      className={cn(
                        "h-1.5 w-full overflow-hidden rounded-full",
                        isAntiSlop ? "bg-[var(--bg-sunken)]" : "neu-well",
                      )}
                    >
                      <div
                        className="h-full rounded-full bg-[var(--chart-cost-bar)]"
                        style={{ width: `${Math.min(100, costPct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bar Rentang Pencapaian Nutrien */}
      <div className={cn(chartCardClass, "xl:col-span-2")}>
        <h3 className="mb-2 text-xs font-bold text-[var(--text-primary)]">
          {isAntiSlop
            ? pickLang(
                language,
                "Nutrien Mana yang Berada di Dalam Rentang Aman?",
                "Which Nutrients Stay Within Target Bounds?",
              )
            : pickLang(
                language,
                "Indikator Rentang Pencapaian Nutrien (Min–Max)",
                "Nutrient Target Range Indicators (Min–Max)",
              )}
        </h3>
        {radarItems.length === 0 ? (
          <p className="py-4 text-center text-xs text-[var(--text-secondary)]">
            {pickLang(
              language,
              "Belum ada batasan target nutrien aktif untuk dipantau rentangnya.",
              "No active nutrient target bounds to display range indicators.",
            )}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {radarItems.map((n) => {
              const meta = nutMap.get(n.nutrientId);
              const lo = n.min ?? 0;
              const hi = n.max ?? (n.min !== undefined ? n.min * 1.25 : n.value * 1.25);
              const scaleMax = Math.max(hi * 1.15, n.value * 1.05, 1);
              const minPct = (lo / scaleMax) * 100;
              const maxPct = (hi / scaleMax) * 100;
              const valPct = Math.min(100, Math.max(0, (n.value / scaleMax) * 100));
              const nutName = meta
                ? getNutrientDisplayName(meta, language, simpleMode)
                : n.nutrientId;

              return (
                <div key={n.nutrientId} className="space-y-1 text-[11px]">
                  <div className="flex justify-between gap-1">
                    <span className="truncate font-semibold text-[var(--text-primary)]">
                      {nutName}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-[var(--text-secondary)]">
                      {formatNumberLocale(
                        n.value,
                        resolveDisplayDigits(meta?.unit, n.nutrientId, decimalPlaces, n.value),
                      )}{" "}
                      {meta?.unit ?? ""}
                    </span>
                  </div>
                  <NeumorphicProgressTrack
                    percent={valPct}
                    rangeStartPct={minPct}
                    rangeWidthPct={Math.max(4, maxPct - minPct)}
                    tone={n.status === "met" ? "emerald" : "coral"}
                    showThumb
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
