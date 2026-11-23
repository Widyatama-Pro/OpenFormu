import { memo } from "react";
import { ChevronRight, RotateCcw } from "lucide-react";
import { resolveFeedClass } from "../../data/feed-classes";
import { getCategoryLabel, pickLang } from "../../i18n";
import { useOptionalThemeContext } from "../../theme";
import type { AppLanguage, Ingredient } from "../../types";
import { cn } from "../../utils/cn";
import {
  formatCurrencyIdr,
  formatNumberLocale,
  resolveDisplayDigits,
} from "../../utils/locale-number";
import { isPoultrySpecies, isRuminantSpecies } from "../../utils/species";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { FeedClassIcon } from "../ui/FeedClassIcon";
import { NumericCellInput } from "./NumericCellInput";

export interface IngredientMobileCardsProps {
  readonly ingredients: readonly Ingredient[];
  readonly activeSpecies?: string | undefined;
  readonly decimalPlaces?: 0 | 1 | 2;
  readonly simpleMode?: boolean;
  readonly language: AppLanguage;
  readonly onUpdateIngredient: (id: string, patch: Partial<Ingredient>) => void;
  readonly onResetPriceOverride: (id: string) => void;
  readonly onOpenDetail: (ingredient: Ingredient) => void;
}

/**
 * Transformasi tabel matriks bahan untuk layar sempit (<768px):
 * - Nama bahan pakan tampil penuh hingga 2 baris (line-clamp-2) tanpa terjepit tombol Nutrien >
 * - Input Harga/kg, Min %, dan Max % selalu aktif permanen dalam grid 3 kolom yang simetris
 * - Menampilkan seluruh nutrien dasar (PK, EM/TDN adaptif spesies, LK, SK, Ca, P, BK & Pasar) dalam kisi 4×2 yang lapang
 */
export const IngredientMobileCards = memo(function IngredientMobileCards({
  ingredients,
  activeSpecies,
  decimalPlaces = 0,
  simpleMode = true,
  language,
  onUpdateIngredient,
  onResetPriceOverride,
  onOpenDetail,
}: IngredientMobileCardsProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";
  const isRuminant = isRuminantSpecies(activeSpecies);
  const isPoultry = isPoultrySpecies(activeSpecies);

  const cpLabel = simpleMode
    ? pickLang(language, "PK", "CP")
    : pickLang(language, "Protein Kasar", "Crude Protein");
  const meLabelShort = simpleMode
    ? pickLang(language, "EM", "ME")
    : pickLang(language, "Energi Met.", "ME");
  const eeLabel = simpleMode ? pickLang(language, "LK", "EE") : pickLang(language, "Lemak", "Fat");
  const cfLabel = simpleMode
    ? pickLang(language, "SK", "CF")
    : pickLang(language, "Serat", "Fiber");

  const formatPctOrNa = (val: number | null | undefined, nutrientId: string): string => {
    if (val === null || val === undefined || !Number.isFinite(val)) return "N/A";
    return `${formatNumberLocale(val, resolveDisplayDigits("%", nutrientId, decimalPlaces, val))}%`;
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {ingredients.map((ing) => {
        const isActive = ing.isActive !== false;
        const min = ing.inclusion?.min ?? 0;
        const max = ing.inclusion?.max ?? 100;
        const invalidBounds = min > max;
        const hasOverride = ing.priceOverride !== undefined;
        const feedClass = resolveFeedClass(ing);
        const ingName = language === "id" ? ing.name : (ing.nameEn ?? ing.name);

        let energyTitle = meLabelShort;
        let energyText = "N/A";
        if (isRuminant) {
          energyTitle = "TDN";
          energyText = formatPctOrNa(ing.nutrients.tdn, "tdn");
        } else if (isPoultry) {
          energyTitle = meLabelShort;
          const meVal = ing.nutrients.me_poultry;
          energyText =
            meVal !== null && meVal !== undefined && Number.isFinite(meVal)
              ? formatNumberLocale(meVal, 0)
              : "N/A";
        } else if (ing.nutrients.me_poultry !== null && ing.nutrients.me_poultry !== undefined) {
          energyTitle = meLabelShort;
          energyText = formatNumberLocale(ing.nutrients.me_poultry, 0);
        } else if (ing.nutrients.tdn !== null && ing.nutrients.tdn !== undefined) {
          energyTitle = "TDN";
          energyText = formatPctOrNa(ing.nutrients.tdn, "tdn");
        }

        const nutrientCells = [
          { id: "cp", label: cpLabel, value: formatPctOrNa(ing.nutrients.cp, "cp") },
          { id: "energy", label: energyTitle, value: energyText },
          { id: "ee", label: eeLabel, value: formatPctOrNa(ing.nutrients.ee, "ee") },
          { id: "cf", label: cfLabel, value: formatPctOrNa(ing.nutrients.cf, "cf") },
          { id: "ca", label: "Ca", value: formatPctOrNa(ing.nutrients.ca, "ca") },
          { id: "p", label: "P", value: formatPctOrNa(ing.nutrients.p, "p") },
          {
            id: "dm",
            label: pickLang(language, "BK", "DM"),
            value: formatPctOrNa(ing.dryMatter, "dm"),
          },
          {
            id: "market",
            label: pickLang(language, "Pasar", "Market"),
            value: formatCurrencyIdr(ing.pricePerKg),
          },
        ] as const;

        return (
          <Card
            key={ing.id}
            highlight={invalidBounds ? "coral" : hasOverride ? "amber" : "none"}
            className={cn("p-3.5", !isActive && "opacity-60")}
          >
            {/* Baris 1A: Checkbox + Ikon Kelas Kontekstual + Judul Nama Bahan Penuh (max 2 baris) */}
            <label className="flex min-h-11 min-w-0 cursor-pointer items-start gap-2.5 md:min-h-9">
              <input
                type="checkbox"
                checked={isActive}
                aria-label={`Aktifkan ${ing.name}`}
                onChange={(e) => onUpdateIngredient(ing.id, { isActive: e.target.checked })}
                className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--color-primary)]"
              />
              <FeedClassIcon
                code={feedClass}
                language={language}
                className="mt-0.5 h-6 w-6 rounded-lg"
              />
              <p className="line-clamp-2 min-w-0 flex-1 text-sm leading-snug font-bold text-[var(--text-primary)]">
                {ingName}
              </p>
            </label>

            {/* Baris 1B: Badge Kategori / Basis sejajar dengan tombol Nutrien > di kanan */}
            <div className="mt-2 flex items-center justify-between gap-2 pl-7">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <Badge tone="neutral">{getCategoryLabel(language, ing.category)}</Badge>
                <Badge tone={ing.basis === "as_fed" ? "sky" : "emerald"}>
                  {ing.basis === "as_fed" ? "As-Fed" : pickLang(language, "BK", "DM")}
                </Badge>
                {hasOverride && (
                  <Badge tone="amber">{pickLang(language, "Harga Custom", "Custom Price")}</Badge>
                )}
              </div>

              <Button
                variant={isAntiSlop ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onOpenDetail(ing)}
                aria-label={`Edit nutrien ${ing.name}`}
                className={cn(
                  "min-h-11 shrink-0 rounded-lg px-2.5 text-xs md:min-h-8",
                  !isAntiSlop && "neu-pill-btn",
                )}
              >
                <span>{pickLang(language, "Nutrien", "Nutrients")}</span>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>

            {/* Baris 2: Input Harga/kg, Min %, dan Max % selalu aktif & simetris */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div>
                <div className="mb-1 flex min-h-6 items-center justify-between gap-1">
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                    {pickLang(language, "Harga/kg", "Price/kg")}
                  </span>
                  {hasOverride && (
                    <button
                      type="button"
                      onClick={() => onResetPriceOverride(ing.id)}
                      aria-label={`Reset harga pasar ${ing.name}`}
                      className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md text-[var(--status-warning)] hover:bg-[var(--status-warning-soft)] md:min-h-6 md:min-w-6"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <NumericCellInput
                  value={ing.priceOverride ?? ing.pricePerKg}
                  treatSingleThousandDot
                  fractionDigits={0}
                  ariaLabel={`Harga ${ing.name}`}
                  onCommit={(next) => {
                    if (next === null) return;
                    if (Math.abs(next - ing.pricePerKg) < 0.01) {
                      onResetPriceOverride(ing.id);
                    } else {
                      onUpdateIngredient(ing.id, { priceOverride: next });
                    }
                  }}
                />
              </div>

              <div>
                <span className="mb-1 block text-[11px] font-semibold text-[var(--text-secondary)]">
                  Min %
                </span>
                <NumericCellInput
                  value={min}
                  fractionDigits={resolveDisplayDigits("%", "min", decimalPlaces, min)}
                  invalid={invalidBounds}
                  ariaLabel={`Min % ${ing.name}`}
                  onCommit={(next) =>
                    onUpdateIngredient(ing.id, {
                      inclusion: { ...ing.inclusion, min: next ?? 0 },
                    })
                  }
                />
              </div>

              <div>
                <span className="mb-1 block text-[11px] font-semibold text-[var(--text-secondary)]">
                  Max %
                </span>
                <NumericCellInput
                  value={max}
                  fractionDigits={resolveDisplayDigits("%", "max", decimalPlaces, max)}
                  invalid={invalidBounds}
                  ariaLabel={`Max % ${ing.name}`}
                  onCommit={(next) =>
                    onUpdateIngredient(ing.id, {
                      inclusion: { ...ing.inclusion, max: next ?? 100 },
                    })
                  }
                />
              </div>
            </div>

            {invalidBounds && (
              <p className="mt-2 text-xs font-semibold text-[var(--status-danger)]">
                {pickLang(
                  language,
                  `Nilai Min (${min}%) tidak boleh melebihi Max (${max}%).`,
                  `Min (${min}%) cannot exceed Max (${max}%).`,
                )}
              </p>
            )}

            {/* Baris 3: Kisi ringkas seluruh nutrien dasar (PK, EM/TDN, LK, SK, Ca, P, BK & Pasar) */}
            <div
              aria-label={pickLang(
                language,
                `Nutrien dasar ${ingName}`,
                `Basic nutrients ${ingName}`,
              )}
              className={cn(
                "mt-3 grid grid-cols-4 gap-1.5 rounded-xl border border-[var(--border-subtle)] p-2 tabular-nums",
                isAntiSlop ? "bg-[var(--bg-sunken)]" : "bg-[var(--bg-sunken)]/50",
              )}
            >
              {nutrientCells.map((cell) => (
                <div key={cell.id} className="min-w-0 rounded-lg px-1 py-0.5">
                  <span className="block truncate text-[10px] font-medium text-[var(--text-muted)]">
                    {cell.label}
                  </span>
                  <span className="block truncate text-[11px] font-bold text-[var(--text-primary)]">
                    {cell.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
});
