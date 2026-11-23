/* eslint-disable react-refresh/only-export-components */
import { memo, useMemo, useState } from "react";
import { EyeOff, Scale, Utensils } from "lucide-react";
import { getCategoryLabel, pickLang } from "../../i18n";
import { useOptionalThemeContext } from "../../theme";
import type { AppLanguage, Basis, CompositionItem, Ingredient, Requirement } from "../../types";
import { cn } from "../../utils/cn";
import { formatCurrencyIdr, formatNumberLocale } from "../../utils/locale-number";
import { isPoultrySpecies } from "../../utils/species";
import { NumericCellInput } from "../formulation/NumericCellInput";
import { Badge } from "../ui/Badge";

export type BatchPrecisionMode = "dual" | "exact_3dec" | "rounded";

export interface DailyConsumptionEstimate {
  readonly dmiKgPerHead: number;
  readonly asFedKgPerHead: number;
  readonly rationDmPct: number;
  readonly bodyWeightKg: number | null;
  readonly dmiPctBw: number | null;
  readonly asFedPctBw: number | null;
  readonly sourceNoteId: string;
  readonly sourceNoteEn: string;
  readonly feedingAdviceId: string;
  readonly feedingAdviceEn: string;
}

export function computeRationDryMatterPct(
  composition: readonly CompositionItem[],
  ingredients: readonly Ingredient[],
): number {
  if (composition.length === 0) return 88;
  const ingMap = new Map(ingredients.map((i) => [i.id, i]));
  let totalAsFed = 0;
  let totalDmInAsFed = 0;
  for (const item of composition) {
    const ing = ingMap.get(item.ingredientId);
    const dm = ing?.dryMatter && ing.dryMatter > 0 ? ing.dryMatter : 88;
    const afShare = item.asFedFraction ?? item.fraction;
    totalAsFed += afShare;
    totalDmInAsFed += afShare * dm;
  }
  return totalAsFed > 0 ? Math.max(10, Math.min(100, totalDmInAsFed / totalAsFed)) : 88;
}

export function estimateDailyConsumption(
  requirement: Requirement | undefined,
  rationDmPct: number,
): DailyConsumptionEstimate {
  const safeDmPct = Math.max(10, Math.min(100, rationDmPct));
  const src = `${requirement?.name ?? ""} ${requirement?.phase ?? ""} ${requirement?.source ?? ""}`;

  // 1. Cek Bobot Badan (BB) bila tertera pada profil
  const bwMatch =
    src.match(/(?:BB|BW|Live\s*Wt|Weight)\s*[:=]?\s*(\d{2,4})\s*kg/i) ??
    src.match(/\b(150|200|250|300|350|400|450|500|550|600|650|700|800)\s*kg\b/i);
  const bodyWeightKg = bwMatch ? Number(bwMatch[1]) : null;

  // 2. Cek DMI eksplisit dari dynamicCalculation atau teks source Kearl/NRC
  let dmiKgPerHead: number | null =
    requirement?.dynamicCalculation?.dmiKg !== undefined &&
    Number.isFinite(requirement.dynamicCalculation.dmiKg) &&
    requirement.dynamicCalculation.dmiKg > 0
      ? requirement.dynamicCalculation.dmiKg
      : null;

  if (dmiKgPerHead === null) {
    const dmiMatch = src.match(/(?:BK|DMI)\s+([\d.,]+)\s*kg/i);
    if (dmiMatch?.[1]) {
      const parsed = Number(dmiMatch[1].replace(",", "."));
      if (Number.isFinite(parsed) && parsed > 0) {
        dmiKgPerHead = parsed;
      }
    }
  }

  const isPoultry = isPoultrySpecies(requirement?.species);
  let sourceNoteId: string;
  let sourceNoteEn: string;

  if (dmiKgPerHead !== null) {
    sourceNoteId = requirement?.dynamicCalculation
      ? `Dihitung dari ${requirement.dynamicCalculation.standardName}`
      : "Diekstrak dari tabel kebutuhan BK harian standar (Kearl 1982 / NRC)";
    sourceNoteEn = requirement?.dynamicCalculation
      ? `Computed from ${requirement.dynamicCalculation.standardName}`
      : "Extracted from standard daily DM requirement table (Kearl 1982 / NRC)";
  } else if (isPoultry) {
    const lower = src.toLowerCase();
    let asFedEstimateKg: number;
    if (lower.includes("puyuh") || lower.includes("quail")) {
      asFedEstimateKg = 0.024;
    } else if (lower.includes("itik") || lower.includes("duck")) {
      asFedEstimateKg = lower.includes("starter") ? 0.075 : 0.16;
    } else if (requirement?.species === "broiler") {
      if (lower.includes("pre-starter") || lower.includes("1–7") || lower.includes("0–3")) {
        asFedEstimateKg = 0.035;
      } else if (lower.includes("starter") || lower.includes("8–21")) {
        asFedEstimateKg = 0.085;
      } else {
        asFedEstimateKg = 0.155;
      }
    } else {
      if (lower.includes("pre-starter") || lower.includes("0–6")) {
        asFedEstimateKg = 0.025;
      } else if (lower.includes("starter") || lower.includes("grower")) {
        asFedEstimateKg = 0.065;
      } else {
        asFedEstimateKg = 0.115;
      }
    }
    dmiKgPerHead = asFedEstimateKg * (safeDmPct / 100);
    sourceNoteId = "Estimasi konsumsi pakan harian unggas sesuai fase (NRC 1994 / SNI)";
    sourceNoteEn = "Estimated daily poultry feed intake for active phase (NRC 1994 / SNI)";
  } else if (requirement?.species === "goat" || requirement?.species === "sheep") {
    dmiKgPerHead = bodyWeightKg ? bodyWeightKg * 0.032 : 1.05;
    sourceNoteId = "Estimasi konsumsi BK ruminansia kecil (~3,2% BB, Kearl 1982)";
    sourceNoteEn = "Small ruminant DM intake estimate (~3.2% BW, Kearl 1982)";
  } else if (requirement?.species === "cattle_dairy") {
    dmiKgPerHead = bodyWeightKg ? bodyWeightKg * 0.03 : 12.5;
    sourceNoteId = "Estimasi konsumsi BK sapi perah (~3,0% BB, Kearl 1982 / NRC 1988)";
    sourceNoteEn = "Dairy cattle DM intake estimate (~3.0% BW, Kearl 1982 / NRC 1988)";
  } else {
    dmiKgPerHead = bodyWeightKg ? bodyWeightKg * 0.024 : 7.4;
    sourceNoteId = "Estimasi konsumsi BK sapi potong (~2,4% BB, Kearl 1982)";
    sourceNoteEn = "Beef cattle DM intake estimate (~2.4% BW, Kearl 1982)";
  }

  const asFedKgPerHead = dmiKgPerHead / (safeDmPct / 100);
  const dmiPctBw = bodyWeightKg && bodyWeightKg > 0 ? (dmiKgPerHead / bodyWeightKg) * 100 : null;
  const asFedPctBw =
    bodyWeightKg && bodyWeightKg > 0 ? (asFedKgPerHead / bodyWeightKg) * 100 : null;

  const feedingAdviceId = isPoultry
    ? `Saran: berikan pakan segar ${formatNumberLocale(asFedKgPerHead * 1000, 1)} g/ekor/hari (setara ${formatNumberLocale(dmiKgPerHead * 1000, 1)} g BK) terbagi pagi & sore dengan air minum bersih ad libitum.`
    : `Saran: berikan ${formatNumberLocale(asFedKgPerHead, 2)} kg pakan segar (As-Fed)/ekor/hari untuk memenuhi ${formatNumberLocale(dmiKgPerHead, 2)} kg BK/hari (BK ransum ${formatNumberLocale(safeDmPct, 1)}%), dibagi 2-3 kali pemberian.`;
  const feedingAdviceEn = isPoultry
    ? `Recommendation: feed ${formatNumberLocale(asFedKgPerHead * 1000, 1)} g fresh feed/bird/day (${formatNumberLocale(dmiKgPerHead * 1000, 1)} g DM) split morning & afternoon with ad libitum water.`
    : `Recommendation: feed ${formatNumberLocale(asFedKgPerHead, 2)} kg fresh As-Fed/head/day to supply ${formatNumberLocale(dmiKgPerHead, 2)} kg DM/day (ration DM ${formatNumberLocale(safeDmPct, 1)}%), split into 2-3 meals.`;

  return {
    dmiKgPerHead,
    asFedKgPerHead,
    rationDmPct: safeDmPct,
    bodyWeightKg,
    dmiPctBw,
    asFedPctBw,
    sourceNoteId,
    sourceNoteEn,
    feedingAdviceId,
    feedingAdviceEn,
  };
}

export interface BatchMixerCalculatorProps {
  readonly batchSizeKg: number;
  readonly onSetBatchSize: (kg: number) => void;
  readonly composition: readonly CompositionItem[];
  readonly ingredients: readonly Ingredient[];
  readonly activeBasis: Basis;
  readonly requirement?: Requirement | undefined;
  readonly costPerKg?: number | null | undefined;
  readonly precisionMode?: BatchPrecisionMode | undefined;
  readonly onChangePrecisionMode?: ((mode: BatchPrecisionMode) => void) | undefined;
  readonly decimalPlaces?: 0 | 1 | 2;
  readonly language?: AppLanguage;
}

const PRESET_BATCH_KG = [50, 100, 500, 1000] as const;

const BAR_COLORS = [
  "bg-[var(--chart-series-1)]",
  "bg-[var(--chart-series-2)]",
  "bg-[var(--chart-series-3)]",
  "bg-[var(--chart-series-4)]",
  "bg-[var(--chart-series-5)]",
  "bg-[var(--chart-series-6)]",
  "bg-[var(--chart-series-7)]",
] as const;

export const BatchMixerCalculator = memo(function BatchMixerCalculator({
  batchSizeKg,
  onSetBatchSize,
  composition,
  ingredients,
  activeBasis,
  requirement,
  language = "id",
}: BatchMixerCalculatorProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";
  const [printBatchOnly, setPrintBatchOnly] = useState(false);

  const ingMap = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const rationDmPct = useMemo(
    () => computeRationDryMatterPct(composition, ingredients),
    [composition, ingredients],
  );
  const defaultIntake = useMemo(
    () => estimateDailyConsumption(requirement, rationDmPct),
    [requirement, rationDmPct],
  );

  const effectiveDmiKg = defaultIntake.dmiKgPerHead;
  const effectiveAsFedKg = effectiveDmiKg / (rationDmPct / 100);

  return (
    <div className="space-y-3">
      {/* Kontrol ukuran adukan dalam wadah ringkas (stack rapi pada HP, 1 baris di layar lebar) */}
      <div
        className={cn(
          "flex flex-col gap-2 rounded-xl p-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
          isAntiSlop ? "border border-[var(--border-subtle)] bg-[var(--bg-sunken)]" : "neu-well",
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="shrink-0 text-xs font-semibold text-[var(--text-primary)]">
            {pickLang(language, "Skala Adukan:", "Batch Size:")}
          </span>
          {PRESET_BATCH_KG.map((kg) => (
            <button
              key={kg}
              type="button"
              onClick={() => onSetBatchSize(kg)}
              className={cn(
                "min-h-11 shrink-0 cursor-pointer rounded-lg px-2.5 text-xs font-semibold tabular-nums transition-[transform,background-color,color] duration-150 md:min-h-7 motion-reduce:transform-none",
                !isAntiSlop && "active:scale-[0.96]",
                batchSizeKg === kg
                  ? isAntiSlop
                    ? "border border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--text-on-primary)]"
                    : "neu-cta-btn"
                  : isAntiSlop
                    ? "border border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] hover:border-[var(--color-primary)]"
                    : "neu-pill-btn text-[var(--text-primary)]",
              )}
            >
              {formatNumberLocale(kg, 0)} kg
            </button>
          ))}
          <div className="w-22 shrink-0">
            <NumericCellInput
              value={batchSizeKg}
              treatSingleThousandDot
              fractionDigits={0}
              fallbackOnEmpty={batchSizeKg}
              commitOnChange
              ariaLabel={pickLang(language, "Total berat adukan kg", "Total batch weight kg")}
              onCommit={(val) => {
                if (val !== null && val >= 1) onSetBatchSize(val);
              }}
            />
          </div>
        </div>

        <label className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] md:min-h-0">
          <input
            type="checkbox"
            checked={printBatchOnly}
            onChange={(e) => setPrintBatchOnly(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--color-primary)]"
          />
          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {pickLang(
              language,
              "Mode Operator (Print Batch Only)",
              "Operator Mode (Print Batch Only)",
            )}
          </span>
        </label>
      </div>

      {/* Kartu Ringkas Konsumsi Harian (BK & Segar As-Fed) */}
      {composition.length > 0 && (
        <section
          aria-label={pickLang(language, "Total Konsumsi Pakan Harian", "Daily Feed Intake")}
          className={cn(
            "space-y-2.5 rounded-xl border p-3 text-xs",
            isAntiSlop
              ? "border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]"
              : "acrylic-subcard border-[var(--status-success-border)]",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Utensils className="h-3.5 w-3.5 text-[var(--status-success)]" aria-hidden="true" />
              <h3 className="font-bold text-[var(--text-primary)]">
                {pickLang(
                  language,
                  "Total Konsumsi Harian Ternak (BK & Segar As-Fed)",
                  "Daily Livestock Feed Intake (DM & Fresh As-Fed)",
                )}
              </h3>
            </div>
            <Badge tone="emerald">
              <Scale className="h-3 w-3" aria-hidden="true" />
              <span>
                {pickLang(language, "BK Ransum:", "Ration DM:")}{" "}
                {formatNumberLocale(rationDmPct, 2)}%
              </span>
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-2">
              <span className="block text-[10px] font-semibold text-[var(--text-secondary)]">
                {pickLang(language, "Konsumsi BK / Hari", "Daily DM Intake (DMI)")}
              </span>
              <span className="mt-0.5 block text-sm font-bold tabular-nums text-[var(--status-success)]">
                {formatNumberLocale(effectiveDmiKg, 2)} kg/hr
              </span>
              <span className="block text-[10px] tabular-nums text-[var(--text-muted)]">
                {defaultIntake.dmiPctBw !== null
                  ? `${pickLang(language, "Relatif:", "Relative:")} ${formatNumberLocale(
                      (effectiveDmiKg / (defaultIntake.bodyWeightKg ?? 1)) * 100,
                      2,
                    )}% BB (${defaultIntake.bodyWeightKg} kg)`
                  : `${formatNumberLocale(effectiveDmiKg * 1000, 2)} g BK/ekor/hr`}
              </span>
            </div>

            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-2">
              <span className="block text-[10px] font-semibold text-[var(--text-secondary)]">
                {pickLang(
                  language,
                  "Konsumsi Segar (As-Fed) / Hari",
                  "Daily Fresh (As-Fed) Intake",
                )}
              </span>
              <span className="mt-0.5 block text-sm font-bold tabular-nums text-[var(--text-primary)]">
                {formatNumberLocale(effectiveAsFedKg, 2)} kg/hr
              </span>
              <span className="block text-[10px] tabular-nums text-[var(--text-muted)]">
                {defaultIntake.asFedPctBw !== null
                  ? `${pickLang(language, "Relatif:", "Relative:")} ${formatNumberLocale(
                      (effectiveAsFedKg / (defaultIntake.bodyWeightKg ?? 1)) * 100,
                      2,
                    )}% BB Segar`
                  : `${formatNumberLocale(effectiveAsFedKg * 1000, 2)} g As-Fed/ekor/hr`}
              </span>
            </div>
          </div>
        </section>
      )}

      {composition.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-6 text-center text-xs text-[var(--text-secondary)]">
          {pickLang(
            language,
            "Belum ada komposisi adukan untuk ditimbang. Pastikan bahan aktif dan target formulasi menghasilkan solusi valid.",
            "No batch composition to weigh yet. Ensure active feeds and formulation targets produce a valid ration.",
          )}
        </div>
      ) : (
        <>
          {/* Stacked composition bar */}
          <div>
            <div className="mb-1 flex justify-between text-[11px] font-medium text-[var(--text-secondary)]">
              <span>
                {pickLang(
                  language,
                  "Distribusi Komposisi (Total 100%)",
                  "Composition Breakdown (Total 100%)",
                )}
              </span>
              {activeBasis === "dry_matter" && (
                <span>
                  {pickLang(
                    language,
                    "Tercantum juga berat segar As-Fed penimbangan",
                    "Includes As-Fed fresh weighing proportions",
                  )}
                </span>
              )}
            </div>
            <div
              className={cn(
                "flex h-2 w-full overflow-hidden rounded-full p-0.5",
                isAntiSlop
                  ? "border border-[var(--border-subtle)] bg-[var(--bg-sunken)]"
                  : "neu-well",
              )}
            >
              {composition.map((item, idx) => {
                const ing = ingMap.get(item.ingredientId);
                const color = BAR_COLORS[idx % BAR_COLORS.length]!;
                const ingName = ing
                  ? language === "id"
                    ? ing.name
                    : (ing.nameEn ?? ing.name)
                  : item.ingredientId;
                return (
                  <div
                    key={item.ingredientId}
                    style={{ width: `${(item.fraction * 100).toFixed(2)}%` }}
                    title={`${ingName}: ${(item.fraction * 100).toFixed(2)}%`}
                    className={cn(
                      "h-full border-r border-[var(--bg-surface-elevated)] first:rounded-l-full last:rounded-r-full last:border-r-0",
                      color,
                    )}
                  />
                );
              })}
            </div>
          </div>

          {/* Desktop Composition Table */}
          <div className="hidden overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] md:block">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-[var(--bg-sunken)] text-[11px] font-bold tracking-wide text-[var(--text-secondary)]">
                <tr>
                  <th className="px-3 py-2 text-left">
                    {pickLang(language, "Bahan Pakan", "Feed Ingredient")}
                  </th>
                  <th className="px-2 py-2 text-right">
                    {pickLang(language, "Porsi %", "Share %")}
                  </th>
                  {activeBasis === "dry_matter" && (
                    <th className="px-2 py-2 text-right">As-Fed %</th>
                  )}
                  <th className="px-2 py-2 text-right">
                    {pickLang(
                      language,
                      `Takaran (${batchSizeKg} kg)`,
                      `Weight (${batchSizeKg} kg)`,
                    )}
                  </th>
                  <th className="px-2 py-2 text-right">
                    {pickLang(language, "Konsumsi/hr (kg)", "Daily Intake (kg)")}
                  </th>
                  {!printBatchOnly && (
                    <th className="px-3 py-2 text-right">
                      {pickLang(language, "Kontribusi Biaya (/kg)", "Cost Contribution (/kg)")}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {composition.map((item, idx) => {
                  const ing = ingMap.get(item.ingredientId);
                  const color = BAR_COLORS[idx % BAR_COLORS.length]!;
                  const pct = item.fraction * 100;
                  const afShare = item.asFedFraction ?? item.fraction;
                  const afPct = afShare * 100;
                  const weightKg = item.weightKg ?? afShare * batchSizeKg;
                  const dailyIngAsFedKg = afShare * effectiveAsFedKg;
                  const dailyIngDmKg = item.fraction * effectiveDmiKg;
                  const ingName = ing
                    ? language === "id"
                      ? ing.name
                      : (ing.nameEn ?? ing.name)
                    : item.ingredientId;
                  return (
                    <tr
                      key={item.ingredientId}
                      className="transition-colors hover:bg-[var(--bg-surface)]"
                    >
                      <td className="px-3 py-1.5 font-semibold text-[var(--text-primary)]">
                        <span className={cn("mr-2 inline-block h-2.5 w-2.5 rounded-xs", color)} />
                        {ingName}
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-[var(--status-success)]">
                        {formatNumberLocale(pct, 2)}%
                      </td>
                      {activeBasis === "dry_matter" && (
                        <td className="px-2 py-1.5 text-right tabular-nums text-[var(--text-secondary)]">
                          {formatNumberLocale(afPct, 2)}%
                        </td>
                      )}
                      <td className="px-2 py-1.5 text-right font-bold tabular-nums text-[var(--text-primary)]">
                        {formatNumberLocale(weightKg, 2)} kg
                      </td>
                      <td
                        title={`${pickLang(language, "BK:", "DM:")} ${formatNumberLocale(dailyIngDmKg, 2)} kg/hr`}
                        className="px-2 py-1.5 text-right tabular-nums text-[var(--text-secondary)]"
                      >
                        {formatNumberLocale(dailyIngAsFedKg, 2)} kg
                      </td>
                      {!printBatchOnly && (
                        <td className="px-3 py-1.5 text-right tabular-nums text-[var(--text-secondary)]">
                          {formatCurrencyIdr(item.costContribution ?? 0)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile 2-line Composition Cards */}
          <div className="space-y-2 md:hidden">
            {composition.map((item, idx) => {
              const ing = ingMap.get(item.ingredientId);
              const color = BAR_COLORS[idx % BAR_COLORS.length]!;
              const pct = item.fraction * 100;
              const afShare = item.asFedFraction ?? item.fraction;
              const afPct = afShare * 100;
              const weightKg = item.weightKg ?? afShare * batchSizeKg;
              const dailyIngAsFedKg = afShare * effectiveAsFedKg;
              const ingName = ing
                ? language === "id"
                  ? ing.name
                  : (ing.nameEn ?? ing.name)
                : item.ingredientId;
              return (
                <div
                  key={item.ingredientId}
                  className={cn(
                    "rounded-xl p-3",
                    isAntiSlop
                      ? "border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]"
                      : "glass-card",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={cn("h-3 w-3 shrink-0 rounded-xs", color)} />
                      <span className="truncate text-xs font-bold text-[var(--text-primary)]">
                        {ingName}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs font-bold tabular-nums text-[var(--status-success)]">
                      {formatNumberLocale(pct, 2)}% · {formatNumberLocale(weightKg, 2)} kg
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px] tabular-nums text-[var(--text-secondary)]">
                    <span>
                      {activeBasis === "dry_matter"
                        ? `${pickLang(language, "Segar As-Fed:", "Fresh As-Fed:")} ${formatNumberLocale(afPct, 2)}% · ${pickLang(language, "Harian:", "Daily:")} ${formatNumberLocale(dailyIngAsFedKg, 2)} kg/hr`
                        : `${pickLang(language, "Kategori:", "Category:")} ${ing ? getCategoryLabel(language, ing.category) : "-"} · ${pickLang(language, "Harian:", "Daily:")} ${formatNumberLocale(dailyIngAsFedKg, 2)} kg/hr`}
                    </span>
                    {!printBatchOnly ? (
                      <span className="font-semibold text-[var(--text-primary)]">
                        {formatCurrencyIdr(item.costContribution ?? 0)}
                      </span>
                    ) : (
                      <Badge tone="neutral">
                        {pickLang(language, "Biaya disembunyikan", "Cost hidden")}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
});
