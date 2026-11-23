import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import { pickLang } from "../../i18n";
import { useOptionalThemeContext } from "../../theme";
import type { AppLanguage, Ingredient, Nutrient, NutrientTier } from "../../types";
import { cn } from "../../utils/cn";
import { isDerivedNutrient, resolveNutrientValue } from "../../utils/equations";
import {
  formatCurrencyIdr,
  formatNumberLocale,
  resolveDisplayDigits,
} from "../../utils/locale-number";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { SegmentedTabs } from "../ui/SegmentedTabs";
import { SheetDialog } from "../ui/SheetDialog";
import { Switch } from "../ui/Switch";
import { NumericCellInput } from "./NumericCellInput";

export interface IngredientDetailSheetProps {
  readonly ingredient: Ingredient | null;
  readonly allNutrients?: readonly Nutrient[];
  readonly open: boolean;
  readonly stochasticEnabled?: boolean;
  readonly decimalPlaces?: 0 | 1 | 2;
  readonly onClose: () => void;
  readonly onUpdate: (id: string, patch: Partial<Ingredient>) => void;
  readonly onResetPrice: (id: string) => void;
  readonly language: AppLanguage;
}

type DetailTab = "basic" | "amino" | "fiber_anf" | "rules";

export function IngredientDetailSheet({
  ingredient,
  allNutrients = MOCK_NUTRIENTS,
  open,
  stochasticEnabled = false,
  decimalPlaces = 0,
  onClose,
  onUpdate,
  onResetPrice,
  language,
}: IngredientDetailSheetProps) {
  const [tab, setTab] = useState<DetailTab>("basic");
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";

  if (!ingredient) return null;

  const ingName = language === "id" ? ingredient.name : (ingredient.nameEn ?? ingredient.name);
  const min = ingredient.inclusion?.min ?? 0;
  const max = ingredient.inclusion?.max ?? 100;
  const invalidBounds = min > max;

  const filterNutrients = (tiers: readonly NutrientTier[]) =>
    allNutrients.filter((n) => tiers.includes(n.tier ?? "basic"));

  const updateStdDev = (nutrientId: string, nextSigma: number | null) => {
    const current = { ...(ingredient.stdDev ?? {}) };
    if (nextSigma === null || nextSigma <= 0) {
      delete current[nutrientId];
    } else {
      current[nutrientId] = nextSigma;
    }
    onUpdate(ingredient.id, { stdDev: current });
  };

  const renderNutrientInputs = (tiers: readonly NutrientTier[]) => {
    const list = filterNutrients(tiers);
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {list.map((nut) => {
          const nutName = language === "id" ? nut.name : (nut.nameEn ?? nut.name);
          const derived = isDerivedNutrient(nut.id);
          const val = ingredient.nutrients[nut.id];
          const digits = resolveDisplayDigits(nut.unit, nut.id, decimalPlaces, val);

          if (derived) {
            const derivedVal = resolveNutrientValue(ingredient, nut.id);
            return (
              <div key={nut.id} className="modal-section-card rounded-2xl p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {nutName} <span className="text-[var(--text-muted)]">({nut.unit})</span>
                  </span>
                  <Badge tone="sky">{pickLang(language, "Turunan", "Derived")}</Badge>
                </div>
                <p className="text-sm font-bold tabular-nums text-[var(--text-primary)]">
                  {derivedVal !== null ? `${formatNumberLocale(derivedVal, 1)} ${nut.unit}` : "N/A"}
                </p>
                <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                  {pickLang(
                    language,
                    "Dihitung otomatis dari Na, K, Cl, S (mg/kg).",
                    "Auto-computed from Na, K, Cl, S (mg/kg).",
                  )}
                </p>
              </div>
            );
          }

          const isNull = val === null || val === undefined;
          const sigmaVal = ingredient.stdDev?.[nut.id] ?? null;
          return (
            <div key={nut.id} className="modal-section-card rounded-2xl p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  {nutName}{" "}
                  <span className="text-[var(--text-muted)]">
                    ({nut.unit}
                    {nut.isCustom
                      ? ` · ${pickLang(language, "Kustom", "Custom")} ${nut.defaultBasis === "dry_matter" ? pickLang(language, "BK", "DM") : "AF"}`
                      : ""}
                    )
                  </span>
                </label>
                {isNull ? (
                  <Badge tone="amber">N/A</Badge>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate(ingredient.id, {
                        nutrients: { ...ingredient.nutrients, [nut.id]: null },
                      })
                    }
                    className="inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center px-1.5 text-[11px] font-semibold text-[var(--status-info)] underline hover:opacity-80 md:min-h-0 md:min-w-0 md:px-0"
                  >
                    Set N/A
                  </button>
                )}
              </div>
              <NumericCellInput
                value={val ?? null}
                allowNull
                fractionDigits={digits}
                placeholder={pickLang(language, "N/A (kosong)", "N/A (empty)")}
                ariaLabel={`${nutName} ${ingName}`}
                onCommit={(next) =>
                  onUpdate(ingredient.id, {
                    nutrients: { ...ingredient.nutrients, [nut.id]: next },
                  })
                }
              />
              {stochasticEnabled && (
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-1.5">
                  <span className="text-[10px] font-medium text-[var(--text-secondary)]">
                    σ ({pickLang(language, "Simpangan Baku", "Std Dev")})
                  </span>
                  <div className="w-24">
                    <NumericCellInput
                      value={sigmaVal}
                      allowNull
                      fractionDigits={digits === 0 ? 1 : 3}
                      placeholder="0"
                      ariaLabel={`Sigma ${nutName} ${ingName}`}
                      onCommit={(next) => updateStdDev(nut.id, next)}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <SheetDialog
      open={open}
      onClose={onClose}
      title={ingName}
      subtitle={`${pickLang(language, "Basis data", "Data basis")}: ${ingredient.basis === "as_fed" ? "As-Fed" : pickLang(language, "Bahan Kering (BK)", "Dry Matter (DM)")} · ${ingredient.source}`}
      footer={
        <div className="flex justify-end">
          <Button variant="primary" size="md" onClick={onClose}>
            {pickLang(language, "Selesai", "Done")}
          </Button>
        </div>
      }
    >
      <div className="selectable-panel space-y-4">
        <SegmentedTabs
          ariaLabel={pickLang(
            language,
            "Kategori detail bahan pakan",
            "Ingredient detail sections",
          )}
          value={tab}
          onChange={setTab}
          options={[
            { value: "basic", label: pickLang(language, "Dasar", "Basic") },
            {
              value: "amino",
              label: pickLang(language, "Asam Amino & Mineral", "Amino & Electrolytes"),
            },
            { value: "fiber_anf", label: pickLang(language, "Serat & ANF", "Fiber & ANF") },
            { value: "rules", label: pickLang(language, "Harga & Batas", "Price & Limits") },
          ]}
        />

        {tab === "basic" && renderNutrientInputs(["basic"])}
        {tab === "amino" && renderNutrientInputs(["amino_acid", "mineral_electrolyte"])}
        {tab === "fiber_anf" && renderNutrientInputs(["fiber_carb", "anf_physical"])}

        {tab === "rules" && (
          <div className="selectable-panel space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div
                className={cn(
                  "p-3.5",
                  isAntiSlop ? "modal-section-card rounded-xl" : "glass-card rounded-2xl",
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {pickLang(language, "Harga Custom (Rp/kg)", "Custom Price (IDR/kg)")}
                  </span>
                  {ingredient.priceOverride !== undefined && (
                    <button
                      type="button"
                      onClick={() => onResetPrice(ingredient.id)}
                      className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-[var(--status-success)] hover:underline"
                    >
                      <RotateCcw className="h-3 w-3" />
                      {pickLang(language, "Reset pasar", "Reset market")}
                    </button>
                  )}
                </div>
                <NumericCellInput
                  value={ingredient.priceOverride ?? ingredient.pricePerKg}
                  treatSingleThousandDot
                  fractionDigits={0}
                  ariaLabel={`${pickLang(language, "Harga per kg", "Price per kg")} ${ingName}`}
                  onCommit={(next) => {
                    if (next === null) return;
                    if (Math.abs(next - ingredient.pricePerKg) < 0.01) {
                      onResetPrice(ingredient.id);
                    } else {
                      onUpdate(ingredient.id, { priceOverride: next });
                    }
                  }}
                />
                <p className="mt-1.5 text-[11px] text-[var(--text-secondary)]">
                  {pickLang(language, "Acuan pasar", "Market reference")}:{" "}
                  {formatCurrencyIdr(ingredient.pricePerKg)}
                </p>
              </div>

              <div
                className={cn(
                  "p-3.5",
                  isAntiSlop ? "modal-section-card rounded-xl" : "glass-card rounded-2xl",
                )}
              >
                <span className="mb-1 block text-xs font-semibold text-[var(--text-primary)]">
                  {pickLang(language, "Bahan Kering / Dry Matter (%)", "Dry Matter (%)")}
                </span>
                <NumericCellInput
                  value={ingredient.dryMatter}
                  fractionDigits={1}
                  invalid={ingredient.dryMatter <= 0 || ingredient.dryMatter > 100}
                  errorTooltip={pickLang(
                    language,
                    "BK harus > 0 dan <= 100%",
                    "DM must be > 0 and <= 100%",
                  )}
                  ariaLabel={`BK % ${ingName}`}
                  onCommit={(next) => {
                    if (next !== null && next > 0 && next <= 100) {
                      onUpdate(ingredient.id, { dryMatter: next });
                    }
                  }}
                />
                <p className="mt-1.5 text-[11px] text-[var(--text-secondary)]">
                  {pickLang(language, "Kadar air estimasi", "Estimated moisture")}:{" "}
                  {(100 - ingredient.dryMatter).toFixed(1)}%
                </p>
              </div>
            </div>

            <div
              className={cn(
                "grid grid-cols-2 gap-3 p-3.5",
                isAntiSlop
                  ? cn(
                      "modal-section-card rounded-xl",
                      invalidBounds && "border-[var(--status-danger-border)]",
                    )
                  : cn("glass-card rounded-2xl", invalidBounds && "glass-card-coral"),
              )}
            >
              <div>
                <span className="mb-1 block text-xs font-semibold text-[var(--text-primary)]">
                  {pickLang(language, "Batas Min (%)", "Min Limit (%)")}
                </span>
                <NumericCellInput
                  value={min}
                  fractionDigits={resolveDisplayDigits("%", "min", decimalPlaces, min)}
                  invalid={invalidBounds}
                  errorTooltip={pickLang(
                    language,
                    "Min tidak boleh lebih besar dari Max",
                    "Min cannot exceed Max",
                  )}
                  ariaLabel={`Inklusi minimal ${ingName}`}
                  onCommit={(next) =>
                    onUpdate(ingredient.id, {
                      inclusion: { ...ingredient.inclusion, min: next ?? 0 },
                    })
                  }
                />
              </div>
              <div>
                <span className="mb-1 block text-xs font-semibold text-[var(--text-primary)]">
                  {pickLang(language, "Batas Max (%)", "Max Limit (%)")}
                </span>
                <NumericCellInput
                  value={max}
                  fractionDigits={resolveDisplayDigits("%", "max", decimalPlaces, max)}
                  invalid={invalidBounds}
                  errorTooltip={pickLang(language, "Max harus >= Min", "Max must be >= Min")}
                  ariaLabel={`Inklusi maksimal ${ingName}`}
                  onCommit={(next) =>
                    onUpdate(ingredient.id, {
                      inclusion: { ...ingredient.inclusion, max: next ?? 100 },
                    })
                  }
                />
              </div>
            </div>

            <div
              className={cn(
                "flex items-center justify-between gap-3 p-3.5",
                isAntiSlop ? "modal-section-card rounded-xl" : "glass-card rounded-2xl",
              )}
            >
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  {pickLang(language, "Fosfor Fitat / Phytate-P (%)", "Phytate-P Substrate (%)")}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {pickLang(
                    language,
                    "Plafon pelepasan fosfor oleh enzim fitase (PR-05).",
                    "Substrate pool ceiling for phytase phosphorus release (PR-05).",
                  )}
                </p>
              </div>
              <div className="w-28">
                <NumericCellInput
                  value={ingredient.phytateP ?? null}
                  allowNull
                  fractionDigits={3}
                  placeholder="N/A"
                  ariaLabel={`Phytate-P ${ingName}`}
                  onCommit={(next) => {
                    if (next === null) {
                      const { phytateP: _removed, ...rest } = ingredient;
                      void _removed;
                      onUpdate(ingredient.id, rest);
                    } else {
                      onUpdate(ingredient.id, { phytateP: Math.max(0, next) });
                    }
                  }}
                />
              </div>
            </div>

            <div
              className={cn(
                "flex items-center justify-between gap-3 p-3.5",
                isAntiSlop ? "modal-section-card rounded-xl" : "glass-card rounded-2xl",
              )}
            >
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  {pickLang(
                    language,
                    "Aturan Anti-Nol Khusus Bahan Ini",
                    "Per-Ingredient Anti-Zero Rule",
                  )}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {pickLang(
                    language,
                    "Kunci pemakaian minimal bila bahan tetap diaktifkan",
                    "Enforces minimum usage when ingredient stays active",
                  )}
                </p>
              </div>
              <Switch
                checked={ingredient.zeroInclusionRule?.enforceNonZero ?? false}
                label={`Anti-nol ${ingName}`}
                onCheckedChange={(checked) =>
                  onUpdate(ingredient.id, {
                    zeroInclusionRule: {
                      enforceNonZero: checked,
                      minIfSelected: ingredient.zeroInclusionRule?.minIfSelected ?? 1,
                    },
                  })
                }
              />
            </div>
          </div>
        )}
      </div>
    </SheetDialog>
  );
}
