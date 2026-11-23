import { memo } from "react";
import { Info, Lock, Unlock } from "lucide-react";
import { pickLang } from "../../i18n";
import { useOptionalThemeContext } from "../../theme";
import type { AppLanguage, CompositionItem, Ingredient } from "../../types";
import { cn } from "../../utils/cn";
import { formatNumberLocale, resolveDisplayDigits } from "../../utils/locale-number";
import { NumericCellInput } from "../formulation/NumericCellInput";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

export interface WhatIfManualLockProps {
  readonly ingredients: readonly Ingredient[];
  readonly composition: readonly CompositionItem[];
  readonly manualLocks: Readonly<Record<string, number>>;
  readonly decimalPlaces?: 0 | 1 | 2;
  readonly language?: AppLanguage;
  readonly onSetManualLock: (id: string, pct: number | null) => void;
  readonly onClearLocks: () => void;
}

/** Simulasi "What-If" Manual Lock dengan penjelasan singkat ramah peternak. */
export const WhatIfManualLock = memo(function WhatIfManualLock({
  ingredients,
  composition,
  manualLocks,
  decimalPlaces = 0,
  language = "id",
  onSetManualLock,
  onClearLocks,
}: WhatIfManualLockProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";
  const active = ingredients.filter((i) => i.isActive !== false);
  const compMap = new Map(composition.map((c) => [c.ingredientId, c.fraction * 100]));
  const totalLocked = Object.values(manualLocks).reduce((acc, v) => acc + v, 0);

  return (
    <div className="space-y-2.5 text-xs">
      <div className="flex items-start gap-2.5 rounded-xl border border-[var(--status-info-border)] bg-[var(--status-info-soft)] p-2.5 text-[11px] text-[var(--text-primary)]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-info)]" aria-hidden="true" />
        <p className="leading-relaxed text-[var(--text-secondary)]">
          {pickLang(
            language,
            'Simulasi "What-If" berguna untuk menguji skenario tukar/habiskan stok bahan: kunci persentase bahan tertentu dengan slider atau angka (mis. jagung 45%), lalu sistem otomatis menghitung ulang bahan lainnya tanpa mengubah batas Min/Max asli di tabel.',
            '"What-If" lets you lock one or more ingredient percentages manually (e.g., fix corn at 45%) so the solver recalculates the rest of the ration without modifying permanent table bounds.',
          )}
        </p>
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 rounded-xl p-2.5",
          isAntiSlop ? "border border-[var(--border-subtle)] bg-[var(--bg-sunken)]" : "neu-well",
        )}
      >
        <div>
          <p className="font-bold text-[var(--text-primary)]">
            {pickLang(
              language,
              'Simulasi Tukar Bahan Cepat ("What-If" Lock)',
              'Quick Feed Substitution Simulator ("What-If" Lock)',
            )}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)]">
            {pickLang(
              language,
              "Total persentase bahan yang sedang dikunci:",
              "Total currently locked ingredient share:",
            )}{" "}
            <strong className="tabular-nums text-[var(--text-primary)]">
              {formatNumberLocale(
                totalLocked,
                resolveDisplayDigits("%", "inclusion", decimalPlaces, totalLocked),
              )}
              %
            </strong>{" "}
            / 100%
          </p>
        </div>
        {Object.keys(manualLocks).length > 0 && (
          <Button variant="secondary" size="sm" onClick={onClearLocks}>
            {pickLang(language, "Reset Semua Kunci", "Reset All Locks")}
          </Button>
        )}
      </div>

      {active.length === 0 ? (
        <Card interactive={false} className="p-5 text-center text-xs text-[var(--text-secondary)]">
          {pickLang(
            language,
            "Belum ada bahan aktif untuk dikunci. Centang bahan pakan terlebih dahulu agar dapat disimulasikan.",
            "No active ingredients available to lock. Activate feed ingredients first to simulate swaps.",
          )}
        </Card>
      ) : (
        <div className="space-y-1.5">
          {active.map((ing) => {
            const lockedVal = manualLocks[ing.id];
            const isLocked = lockedVal !== undefined;
            const currentPct = lockedVal ?? compMap.get(ing.id) ?? 0;
            const ingName = language === "id" ? ing.name : (ing.nameEn ?? ing.name);

            return (
              <Card
                key={ing.id}
                highlight={isLocked ? "amber" : "none"}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-2.5 py-2"
              >
                <button
                  type="button"
                  onClick={() =>
                    onSetManualLock(ing.id, isLocked ? null : Number(currentPct.toFixed(3)))
                  }
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-left font-semibold text-[var(--text-primary)] md:min-h-7"
                >
                  {isLocked ? (
                    <Lock className="h-3.5 w-3.5 text-[var(--status-warning)]" aria-hidden="true" />
                  ) : (
                    <Unlock className="h-3.5 w-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                  )}
                  <span>{ingName}</span>
                </button>

                <div className="flex w-full items-center gap-2.5 sm:w-auto">
                  <input
                    type="range"
                    min={0}
                    max={ing.inclusion?.max ?? 100}
                    step={0.05}
                    value={currentPct}
                    aria-label={`Slider What-If ${ingName}`}
                    onChange={(e) => onSetManualLock(ing.id, Number(e.target.value))}
                    className="min-h-11 min-w-0 flex-1 cursor-pointer py-2 accent-[var(--color-primary)] sm:w-32 sm:flex-none md:min-h-0 md:py-0"
                  />
                  <div className="w-20">
                    <NumericCellInput
                      value={currentPct}
                      fractionDigits={resolveDisplayDigits("%", "min", decimalPlaces, currentPct)}
                      ariaLabel={`${pickLang(language, "Persentase What-If", "What-If %")} ${ingName}`}
                      onCommit={(val) => onSetManualLock(ing.id, val)}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
});
