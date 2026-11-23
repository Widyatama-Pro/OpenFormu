import { memo } from "react";
import { Calculator } from "lucide-react";
import { getFormulationStatusLabel, pickLang } from "../../i18n";
import { useOptionalThemeContext } from "../../theme";
import type { AppLanguage, FormulationStatus } from "../../types";
import { cn } from "../../utils/cn";
import { formatCurrencyIdr } from "../../utils/locale-number";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

export interface MobileStickyActionBarProps {
  readonly status: FormulationStatus;
  readonly costPerKg: number | null;
  readonly activeStep: "ingredients" | "targets" | "results";
  readonly language?: AppLanguage;
  readonly onShowResults: () => void;
}

/** Bar aksi lengket di mobile tepat di atas Bottom Navigation Bar (safe-area aware). */
export const MobileStickyActionBar = memo(function MobileStickyActionBar({
  status,
  costPerKg,
  activeStep,
  language = "id",
  onShowResults,
}: MobileStickyActionBarProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";
  const statusBadge =
    status === "optimal" ? (
      <Badge tone="emerald">Optimal</Badge>
    ) : status === "near_feasible" ? (
      <Badge tone="amber">{pickLang(language, "Terdekat", "Closest")}</Badge>
    ) : (
      <Badge tone="rose">{getFormulationStatusLabel(language, status)}</Badge>
    );

  return (
    <div
      className={cn(
        "safe-area-sticky-bar fixed inset-x-0 z-30 flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] py-2 md:hidden",
        !isAntiSlop && "shadow-[0_-4px_12px_rgba(0,0,0,0.08)]",
      )}
    >
      <div className="landscape-sticky-meta min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
            {pickLang(language, "Estimasi/kg", "Est./kg")}
          </span>
          {statusBadge}
        </div>
        <p className="truncate text-sm font-bold tabular-nums text-[var(--text-primary)]">
          {costPerKg !== null
            ? formatCurrencyIdr(costPerKg)
            : pickLang(language, "Belum layak", "Not feasible")}
        </p>
      </div>

      <Button
        variant="primary"
        size="md"
        onClick={onShowResults}
        className="landscape-sticky-cta min-h-11 shrink-0 md:min-h-9"
      >
        <Calculator className="h-4 w-4" />
        <span>
          {activeStep === "results"
            ? pickLang(language, "Hitung Ulang", "Recalculate")
            : pickLang(language, "Lihat Hasil", "View Results")}
        </span>
      </Button>
    </div>
  );
});
