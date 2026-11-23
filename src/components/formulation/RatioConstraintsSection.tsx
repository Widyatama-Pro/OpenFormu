import { Lock } from "lucide-react";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import { pickLang } from "../../i18n";
import { useOptionalThemeContext } from "../../theme";
import type { AppLanguage, Nutrient, RatioConstraint } from "../../types";
import { cn } from "../../utils/cn";
import { formatNumberLocale } from "../../utils/locale-number";
import { Badge } from "../ui/Badge";

export interface RatioConstraintsSectionProps {
  readonly ratios: readonly RatioConstraint[];
  readonly achievedMap: ReadonlyMap<string, number>;
  readonly nutrientsCatalog?: readonly Nutrient[];
  readonly language?: AppLanguage;
}

/** Menampilkan pengunci rasio antar-nutrien (seperti Ca:P dan ME:CP) beserta nilai aktual. */
export function RatioConstraintsSection({
  ratios,
  achievedMap,
  nutrientsCatalog = MOCK_NUTRIENTS,
  language = "id",
}: RatioConstraintsSectionProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";
  if (ratios.length === 0) return null;
  const emptyVal = isAntiSlop ? "-" : "—";

  return (
    <div className="mt-4 space-y-2 border-t border-[var(--glass-border-tint,var(--border-subtle))] pt-3.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-tight text-[var(--text-primary)]">
          {pickLang(language, "Pengunci Rasio Nutrien", "Nutrient Ratio Locks")}
        </h3>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)]">
          <span>Linearized LP</span>
          <Lock className="h-3 w-3" aria-hidden="true" />
        </span>
      </div>

      <div className="space-y-2">
        {ratios.map((ratio, idx) => {
          const num = achievedMap.get(ratio.numerator) ?? 0;
          const den = achievedMap.get(ratio.denominator) ?? 0;
          const actualRatio = den > 1e-6 ? num / den : null;
          const numMeta = nutrientsCatalog.find((n) => n.id === ratio.numerator);
          const denMeta = nutrientsCatalog.find((n) => n.id === ratio.denominator);
          const numLabel = numMeta
            ? language === "id"
              ? numMeta.name
              : (numMeta.nameEn ?? numMeta.name)
            : ratio.numerator;
          const denLabel = denMeta
            ? language === "id"
              ? denMeta.name
              : (denMeta.nameEn ?? denMeta.name)
            : ratio.denominator;
          const isMet =
            actualRatio !== null &&
            (ratio.min === undefined || actualRatio >= ratio.min - 1e-4) &&
            (ratio.max === undefined || actualRatio <= ratio.max + 1e-4);

          return (
            <div
              key={ratio.id ?? `${ratio.numerator}-${ratio.denominator}-${idx}`}
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-xs",
                isAntiSlop
                  ? "rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                  : "acrylic-subcard rounded-2xl",
              )}
            >
              <div>
                <p className="font-semibold text-[var(--text-primary)]">
                  {ratio.label ?? `${numLabel} : ${denLabel}`}
                </p>
                <p className="text-[11px] tabular-nums text-[var(--text-secondary)]">
                  Target: {ratio.min ?? emptyVal} {pickLang(language, "s/d", "to")}{" "}
                  {ratio.max ?? emptyVal}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold tabular-nums text-[var(--text-primary)]">
                  {actualRatio !== null ? `${formatNumberLocale(actualRatio, 2)} : 1` : emptyVal}
                </span>
                <Badge tone={actualRatio === null ? "neutral" : isMet ? "emerald" : "rose"}>
                  {actualRatio === null
                    ? "N/A"
                    : isMet
                      ? pickLang(language, "Sesuai", "Met")
                      : pickLang(language, "Meleset", "Off")}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
