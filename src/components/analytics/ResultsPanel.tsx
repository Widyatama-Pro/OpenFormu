import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Activity, CheckCircle2, Target } from "lucide-react";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import {
  getFormulationStatusLabel,
  getNutrientDisplayName,
  getNutrientFullName,
  pickLang,
} from "../../i18n";
import { isUpperBoundOnlyNutrient, resolveSingleTargetValue } from "../../solver";
import { useOptionalThemeContext } from "../../theme";
import type {
  AppLanguage,
  FormulationConfig,
  FormulationResult,
  Ingredient,
  Nutrient,
  NutrientResult,
  Requirement,
} from "../../types";
import { cn } from "../../utils/cn";
import {
  formatCurrencyIdr,
  formatNumberLocale,
  resolveDisplayDigits,
} from "../../utils/locale-number";
import { isPoultrySpecies, isRuminantSpecies } from "../../utils/species";
import { NutrientStatusBadge } from "../formulation/NutrientStatusBadge";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { SegmentedTabs } from "../ui/SegmentedTabs";
import { Switch } from "../ui/Switch";
import { BatchMixerCalculator } from "./BatchMixerCalculator";
import { ConflictDiagnosticsBanner } from "./ConflictDiagnosticsBanner";
import { FormulationCharts } from "./FormulationCharts";
import { ShadowPriceTab } from "./ShadowPriceTab";
import { WhatIfManualLock } from "./WhatIfManualLock";

const NDF_IDS = new Set(["ndf", "adf"]);
const BETN_IDS = new Set(["betn"]);

export type ResultSubTab = "batch" | "charts" | "dual" | "whatif";
export type ResultSpotlightTarget = "dual" | "whatif" | "rumen" | null;

export interface ResultsPanelProps {
  readonly result: FormulationResult;
  readonly ingredients: readonly Ingredient[];
  readonly allNutrients?: readonly Nutrient[];
  readonly requirement?: Requirement;
  readonly config: FormulationConfig;
  readonly decimalPlaces?: 0 | 1 | 2;
  readonly simpleMode?: boolean;
  readonly language?: AppLanguage;
  readonly hideKpiStrip?: boolean;
  readonly activeSubTab?: ResultSubTab;
  readonly spotlightTarget?: ResultSpotlightTarget;
  readonly onClearSpotlight?: () => void;
  readonly onSubTabChange?: (tab: ResultSubTab) => void;
  readonly onSetBatchSize: (kg: number) => void;
  readonly onToggleElastic: (enabled: boolean) => void;
  readonly onSetManualLock: (id: string, pct: number | null) => void;
  readonly onClearManualLocks: () => void;
}

export const ResultsPanel = memo(function ResultsPanel({
  result,
  ingredients,
  allNutrients,
  requirement,
  config,
  decimalPlaces = 0,
  simpleMode = !config.enableAdvanceNutrients,
  language = "id",
  hideKpiStrip = false,
  activeSubTab,
  spotlightTarget = null,
  onClearSpotlight,
  onSubTabChange,
  onSetBatchSize,
  onToggleElastic,
  onSetManualLock,
  onClearManualLocks,
}: ResultsPanelProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";
  const emptyDash = isAntiSlop ? "-" : "—";
  const [internalSubTab, setInternalSubTab] = useState<ResultSubTab>("batch");
  const subTab = activeSubTab ?? internalSubTab;
  const setSubTab = (next: ResultSubTab) => {
    setInternalSubTab(next);
    onSubTabChange?.(next);
    onClearSpotlight?.();
  };

  const dualRef = useRef<HTMLDivElement | null>(null);
  const whatIfRef = useRef<HTMLDivElement | null>(null);
  const rumenRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!spotlightTarget) return;
    const targetEl =
      spotlightTarget === "dual" && subTab === "dual"
        ? dualRef.current
        : spotlightTarget === "whatif" && subTab === "whatif"
          ? whatIfRef.current
          : spotlightTarget === "rumen" && subTab === "batch"
            ? rumenRef.current
            : null;
    if (!targetEl || typeof targetEl.scrollIntoView !== "function") return;
    const id = requestAnimationFrame(() => {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(id);
  }, [spotlightTarget, subTab]);

  const nutrientsCatalog = useMemo(
    () => allNutrients ?? [...MOCK_NUTRIENTS, ...(config.customNutrients ?? [])],
    [allNutrients, config.customNutrients],
  );

  const isPoultry = isPoultrySpecies(requirement?.species);
  const isRuminant = isRuminantSpecies(requirement?.species);
  const showNdf = config.showNdf === true;
  const showBetn = config.showBetn === true;
  const enableAdvance = config.enableAdvanceNutrients;
  const enableDigestible = config.enableDigestibleBasis;
  const singleMode = (config.targetInputMode ?? "range") === "single";

  const visibleSummaryNutrients = useMemo(() => {
    return nutrientsCatalog.filter((nut) => {
      if (nut.isCustom) return true;
      if (isPoultry && nut.id === "tdn") return false;
      if (isRuminant && nut.id === "me_poultry") return false;
      const isBasic = (nut.tier ?? "basic") === "basic";
      if (isBasic) return true;
      if (showBetn && BETN_IDS.has(nut.id)) return true;
      if (showNdf && NDF_IDS.has(nut.id)) return true;
      if (!enableAdvance) return false;
      if (nut.isDigestibleVariant && !enableDigestible) return false;
      return true;
    });
  }, [nutrientsCatalog, isPoultry, isRuminant, showBetn, showNdf, enableAdvance, enableDigestible]);

  const nutrientResultMap = useMemo(
    () => new Map<string, NutrientResult>(result.nutrients.map((n) => [n.nutrientId, n])),
    [result.nutrients],
  );

  const { metTargetCount, totalEvaluatedTargetCount } = useMemo(() => {
    const constrained = visibleSummaryNutrients.filter(
      (n) => (nutrientResultMap.get(n.id)?.status ?? "unconstrained") !== "unconstrained",
    );
    const pool = constrained.length > 0 ? constrained : visibleSummaryNutrients;
    const met = pool.filter((n) => nutrientResultMap.get(n.id)?.status === "met").length;
    return {
      metTargetCount: met,
      totalEvaluatedTargetCount: pool.length,
    };
  }, [visibleSummaryNutrients, nutrientResultMap]);

  const statusBadge =
    result.status === "optimal" ? (
      <Badge tone="emerald">{getFormulationStatusLabel(language, "optimal")}</Badge>
    ) : result.status === "near_feasible" ? (
      <Badge tone="amber">{getFormulationStatusLabel(language, "near_feasible")}</Badge>
    ) : (
      <Badge tone="rose">{getFormulationStatusLabel(language, result.status)}</Badge>
    );

  const fracNutMeta = config.fractionalObjective
    ? nutrientsCatalog.find((n) => n.id === config.fractionalObjective?.nutrientId)
    : undefined;

  return (
    <Card
      interactive={false}
      highlight={result.status === "infeasible" ? "coral" : "none"}
      className={cn(
        "selectable-panel flex flex-col lg:h-full lg:overflow-hidden",
        !isAntiSlop && "acrylic-panel",
      )}
    >
      {!hideKpiStrip && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="block text-[11px] font-semibold text-[var(--text-secondary)]">
                {pickLang(language, "Biaya / kg", "Cost / kg")} (
                {result.basis === "as_fed" ? "As-Fed" : pickLang(language, "BK", "DM")})
              </span>
              <span className="text-base font-bold tracking-tight tabular-nums text-[var(--status-warning)]">
                {result.costPerKg !== null ? formatCurrencyIdr(result.costPerKg) : emptyDash}
              </span>
            </div>

            <div className="border-l border-[var(--border-subtle)] pl-4">
              <span className="block text-[11px] font-semibold text-[var(--text-secondary)]">
                {pickLang(language, "Biaya", "Cost")} / {config.batchSizeKg} kg
              </span>
              <span className="text-base font-bold tracking-tight tabular-nums text-[var(--status-success)]">
                {result.batchTotalCost !== null && result.batchTotalCost !== undefined
                  ? formatCurrencyIdr(result.batchTotalCost)
                  : emptyDash}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
              <Switch
                checked={config.enableElasticFallback}
                onCheckedChange={onToggleElastic}
                label={pickLang(
                  language,
                  "Aktifkan toleransi batas saat target terlalu ketat",
                  "Enable flexible bounds when targets are too tight",
                )}
              />
              <span>{pickLang(language, "Toleransi Target", "Flexible Bounds")}</span>
            </label>
            {statusBadge}
          </div>
        </div>
      )}

      {result.status !== "infeasible" && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-2.5 py-2 sm:px-3">
          <SegmentedTabs
            fitMobile
            ariaLabel={pickLang(
              language,
              "Sub-tampilan hasil formulasi",
              "Formulation result views",
            )}
            value={subTab}
            onChange={setSubTab}
            options={[
              {
                value: "batch",
                label: pickLang(language, "Komposisi & Batch", "Composition & Batch"),
                mobileLabel: pickLang(language, "Komposisi", "Mix"),
                badge: result.composition.length,
              },
              { value: "charts", label: pickLang(language, "Grafik", "Charts") },
              {
                value: "dual",
                label: pickLang(language, "Harga Bayangan", "Shadow Price"),
                mobileLabel: pickLang(language, "Bayangan", "Shadow"),
              },
              {
                value: "whatif",
                label: "What-If",
                badge: Object.keys(config.manualLocks ?? {}).length || undefined,
              },
            ]}
          />

          <div className="flex flex-wrap items-center gap-1.5">
            {result.fractionalCost !== undefined && result.fractionalCost !== null && (
              <Badge tone="sky">
                {formatCurrencyIdr(result.fractionalCost)} /{" "}
                {fracNutMeta
                  ? getNutrientDisplayName(fracNutMeta, language, simpleMode)
                  : config.fractionalObjective?.nutrientId}
              </Badge>
            )}
            {result.stochasticIterations !== undefined && (
              <Badge tone="amber">
                SLP {result.stochasticIterations} {pickLang(language, "iter", "iter")}
              </Badge>
            )}
          </div>
        </div>
      )}

      <div className="custom-scrollbar space-y-3 p-3 lg:flex-1 lg:overflow-y-auto">
        <ConflictDiagnosticsBanner
          status={result.status}
          conflicts={result.conflicts ?? []}
          messages={result.messages}
          iis={result.iis ?? []}
          relaxationPenalty={result.relaxationPenalty}
          language={language}
        />

        {result.status !== "infeasible" && (
          <>
            {subTab === "batch" && (
              <>
                <BatchMixerCalculator
                  batchSizeKg={config.batchSizeKg}
                  onSetBatchSize={onSetBatchSize}
                  composition={result.composition}
                  ingredients={ingredients}
                  activeBasis={result.basis}
                  requirement={requirement}
                  costPerKg={result.costPerKg}
                  decimalPlaces={decimalPlaces}
                  language={language}
                />

                {/* Tabel Ringkasan Capaian Nutrien Hasil Formulasi (Target vs Aktual & Kedekatan) */}
                {visibleSummaryNutrients.length > 0 && (
                  <div
                    aria-label={pickLang(
                      language,
                      "Ringkasan Capaian Nutrien Hasil Formulasi",
                      "Formulation Nutrient Achievement Summary",
                    )}
                    className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5 text-[var(--status-success)]" />
                        <h3 className="text-xs font-bold text-[var(--text-primary)]">
                          {pickLang(
                            language,
                            "Capaian Nutrien Hasil Formulasi (Target vs Aktual)",
                            "Formulated Nutrient Achievement (Target vs Actual)",
                          )}
                        </h3>
                      </div>
                      <Badge
                        tone={
                          metTargetCount === totalEvaluatedTargetCount &&
                          totalEvaluatedTargetCount > 0
                            ? "emerald"
                            : "amber"
                        }
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>
                          {metTargetCount}/{totalEvaluatedTargetCount}{" "}
                          {pickLang(language, "Terpenuhi", "Met")}
                        </span>
                      </Badge>
                    </div>

                    <div className="custom-scrollbar overflow-x-auto">
                      <table className="w-full border-collapse text-xs">
                        <thead
                          className={cn(
                            "text-[11px] font-bold tracking-wide text-[var(--text-secondary)]",
                            isAntiSlop ? "bg-[var(--bg-sunken)]" : "bg-[var(--bg-sunken)]/65",
                          )}
                        >
                          <tr>
                            <th className="px-3 py-1.5 text-left">
                              {pickLang(language, "Nutrien", "Nutrient")}
                            </th>
                            <th className="px-2.5 py-1.5 text-right">
                              {pickLang(language, "Target Dipasang", "Target Set")}
                            </th>
                            <th className="px-2.5 py-1.5 text-right">
                              {pickLang(language, "Hasil Aktual", "Actual Result")}
                            </th>
                            <th className="px-2.5 py-1.5 text-right">
                              {pickLang(language, "Selisih / Kedekatan", "Proximity / Delta")}
                            </th>
                            <th className="px-3 py-1.5 text-right">
                              {pickLang(language, "Status", "Status")}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                          {visibleSummaryNutrients.map((nut) => {
                            const res = nutrientResultMap.get(nut.id);
                            const constraint = requirement?.constraints.find(
                              (c) => c.nutrientId === nut.id,
                            );
                            const singleTarget = constraint
                              ? resolveSingleTargetValue(constraint)
                              : null;
                            const isUpperOnly = isUpperBoundOnlyNutrient(nut.id, constraint);
                            const minVal = res?.min ?? constraint?.min;
                            const maxVal = res?.max ?? constraint?.max;
                            const digits = resolveDisplayDigits(
                              nut.unit,
                              nut.id,
                              decimalPlaces,
                              res?.value ?? singleTarget ?? minVal ?? maxVal,
                            );
                            const displayName = getNutrientDisplayName(nut, language, simpleMode);
                            const fullName = getNutrientFullName(nut, language);

                            const targetText = singleMode
                              ? singleTarget !== null
                                ? isUpperOnly
                                  ? `≤ ${formatNumberLocale(singleTarget, digits)} ${nut.unit}`
                                  : `${formatNumberLocale(singleTarget, digits)} ${nut.unit}`
                                : pickLang(language, "Bebas", "Free")
                              : minVal !== undefined && maxVal !== undefined
                                ? `${formatNumberLocale(minVal, digits)}–${formatNumberLocale(maxVal, digits)} ${nut.unit}`
                                : minVal !== undefined
                                  ? `≥ ${formatNumberLocale(minVal, digits)} ${nut.unit}`
                                  : maxVal !== undefined
                                    ? `≤ ${formatNumberLocale(maxVal, digits)} ${nut.unit}`
                                    : pickLang(language, "Bebas", "Free");

                            const actualVal = res?.value;
                            const refTarget = singleMode
                              ? singleTarget
                              : minVal !== undefined && maxVal !== undefined
                                ? actualVal !== undefined
                                  ? actualVal < minVal
                                    ? minVal
                                    : actualVal > maxVal
                                      ? maxVal
                                      : actualVal
                                  : (minVal + maxVal) / 2
                                : (minVal ?? maxVal ?? null);

                            const deltaVal =
                              actualVal !== undefined &&
                              refTarget !== null &&
                              refTarget !== undefined
                                ? actualVal - refTarget
                                : null;

                            const deltaText =
                              deltaVal === null
                                ? emptyDash
                                : Math.abs(deltaVal) < 1e-4
                                  ? pickLang(language, "Tepat Target", "Exact Fit")
                                  : `${deltaVal > 0 ? "+" : ""}${formatNumberLocale(deltaVal, digits)} ${nut.unit}`;

                            const isAlert =
                              res?.status === "below_min" || res?.status === "above_max";

                            return (
                              <tr
                                key={nut.id}
                                className={cn(
                                  "transition-colors hover:bg-[var(--bg-surface)]",
                                  isAlert &&
                                    (isAntiSlop
                                      ? "bg-[var(--status-danger-soft)]"
                                      : "bg-[var(--status-danger-soft)]/50"),
                                )}
                              >
                                <td
                                  title={`${fullName} (${nut.unit})`}
                                  className="px-3 py-1.5 font-semibold text-[var(--text-primary)]"
                                >
                                  <span>{displayName}</span>{" "}
                                  <span className="text-[10px] font-normal text-[var(--text-muted)]">
                                    ({nut.unit})
                                  </span>
                                </td>
                                <td className="px-2.5 py-1.5 text-right tabular-nums text-[var(--text-secondary)]">
                                  {targetText}
                                </td>
                                <td className="px-2.5 py-1.5 text-right font-bold tabular-nums text-[var(--text-primary)]">
                                  {actualVal !== undefined
                                    ? `${formatNumberLocale(actualVal, nut.unit === "%" ? 2 : digits)} ${nut.unit}`
                                    : emptyDash}
                                </td>
                                <td
                                  className={cn(
                                    "px-2.5 py-1.5 text-right font-semibold tabular-nums",
                                    isAlert
                                      ? "text-[var(--status-danger)]"
                                      : "text-[var(--status-success)]",
                                  )}
                                >
                                  {deltaText}
                                </td>
                                <td className="px-3 py-1.5 text-right">
                                  <NutrientStatusBadge
                                    status={res?.status ?? "unconstrained"}
                                    deviation={res?.deviation}
                                    digits={digits}
                                    language={language}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {result.rumenEvaluation && (
                  <div
                    ref={rumenRef}
                    onPointerDown={onClearSpotlight}
                    onClick={onClearSpotlight}
                    className={cn(
                      "rounded-xl p-3 text-xs transition-shadow",
                      isAntiSlop
                        ? "border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]"
                        : "glass-card",
                      spotlightTarget === "rumen" && "feature-spotlight-glow",
                    )}
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                        <Activity className="h-3.5 w-3.5 text-[var(--status-success)]" />
                        <span>
                          {pickLang(
                            language,
                            "Evaluator Rumen (CNCPS / NASEM)",
                            "Rumen Biology Evaluator (CNCPS / NASEM)",
                          )}
                        </span>
                      </h3>
                      <Badge
                        tone={
                          result.rumenEvaluation.acidosisRisk === "low"
                            ? "emerald"
                            : result.rumenEvaluation.acidosisRisk === "moderate"
                              ? "amber"
                              : "rose"
                        }
                      >
                        {pickLang(language, "Risiko Asidosis", "Acidosis Risk")}:{" "}
                        {result.rumenEvaluation.acidosisRisk === "low"
                          ? pickLang(language, "Rendah", "Low")
                          : result.rumenEvaluation.acidosisRisk === "moderate"
                            ? pickLang(language, "Sedang", "Moderate")
                            : pickLang(language, "Tinggi", "High")}
                      </Badge>
                    </div>
                    <div className="neu-well grid grid-cols-2 gap-2.5 rounded-lg p-2.5 tabular-nums sm:grid-cols-4">
                      <div>
                        <span className="block text-[10px] text-[var(--text-secondary)]">
                          {pickLang(language, "Hijauan / NDF", "Forage / NDF")}
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {formatNumberLocale(
                            result.rumenEvaluation.forageFractionPct,
                            resolveDisplayDigits(
                              "%",
                              "inclusion",
                              decimalPlaces,
                              result.rumenEvaluation.forageFractionPct,
                            ),
                          )}
                          % /{" "}
                          {formatNumberLocale(
                            result.rumenEvaluation.ndfPct,
                            resolveDisplayDigits(
                              "%",
                              "ndf",
                              decimalPlaces,
                              result.rumenEvaluation.ndfPct,
                            ),
                          )}
                          %
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-[var(--text-secondary)]">
                          peuNDF240 / Est. DMI
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {formatNumberLocale(
                            result.rumenEvaluation.peuNdf240Pct,
                            resolveDisplayDigits(
                              "%",
                              "ndf",
                              decimalPlaces,
                              result.rumenEvaluation.peuNdf240Pct,
                            ),
                          )}
                          % / {formatNumberLocale(result.rumenEvaluation.estimatedDmiPctBw, 2)}% BW
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-[var(--text-secondary)]">
                          {pickLang(language, "Laju Alir kp (F/C)", "Passage kp (F/C)")}
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {formatNumberLocale(result.rumenEvaluation.kpForagePctPerH, 2)} /{" "}
                          {formatNumberLocale(result.rumenEvaluation.kpConcPctPerH, 2)} %/h
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-[var(--text-secondary)]">
                          {pickLang(language, "MCP / Metana eCH4", "MCP / Methane eCH4")}
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {formatNumberLocale(result.rumenEvaluation.microbialProteinGPerKgDm, 0)} /{" "}
                          {formatNumberLocale(result.rumenEvaluation.predictedMethaneGPerKgDm, 1)}{" "}
                          g/kg
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {subTab === "charts" && (
              <FormulationCharts
                composition={result.composition}
                nutrients={result.nutrients}
                allNutrients={nutrientsCatalog}
                ingredients={ingredients}
                batchTotalCost={result.batchTotalCost ?? null}
                decimalPlaces={decimalPlaces}
                simpleMode={simpleMode}
                language={language}
              />
            )}

            {subTab === "dual" && (
              <div
                ref={dualRef}
                onPointerDown={onClearSpotlight}
                onClick={onClearSpotlight}
                className={cn(
                  "rounded-xl transition-shadow",
                  spotlightTarget === "dual" && "feature-spotlight-glow p-1.5",
                )}
              >
                <ShadowPriceTab
                  nutrients={result.nutrients}
                  allNutrients={nutrientsCatalog}
                  composition={result.composition}
                  opportunityCosts={result.opportunityCosts ?? []}
                  boundDuals={result.boundDuals ?? []}
                  ingredients={ingredients}
                  {...(requirement ? { requirement } : {})}
                  config={config}
                  decimalPlaces={decimalPlaces}
                  simpleMode={simpleMode}
                  language={language}
                />
              </div>
            )}

            {subTab === "whatif" && (
              <div
                ref={whatIfRef}
                onPointerDown={onClearSpotlight}
                onClick={onClearSpotlight}
                className={cn(
                  "rounded-xl transition-shadow",
                  spotlightTarget === "whatif" && "feature-spotlight-glow p-1.5",
                )}
              >
                <WhatIfManualLock
                  ingredients={ingredients}
                  composition={result.composition}
                  manualLocks={config.manualLocks ?? {}}
                  decimalPlaces={decimalPlaces}
                  onSetManualLock={onSetManualLock}
                  onClearLocks={onClearManualLocks}
                  language={language}
                />
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
});
