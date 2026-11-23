import { useMemo } from "react";
import { OPTIMIZATION_MODE_META } from "../../data/mock-state";
import type { AppLanguage, OptimizationMode } from "../../types";
import { ThemedSelect, type ThemedSelectOption } from "../ui/ThemedSelect";

export interface OptimizationModeSelectorProps {
  readonly value: OptimizationMode;
  readonly onChange: (mode: OptimizationMode) => void;
  readonly language: AppLanguage;
  readonly className?: string | undefined;
}

const MODES: readonly OptimizationMode[] = [1, 2, 3, 4, 5];

export function OptimizationModeSelector({
  value,
  onChange,
  language,
  className,
}: OptimizationModeSelectorProps) {
  const options = useMemo<readonly ThemedSelectOption[]>(
    () =>
      MODES.map((m) => {
        const meta = OPTIMIZATION_MODE_META[m];
        return {
          value: String(m),
          label: `${m}. ${language === "id" ? meta.name : meta.nameEn}`,
          subtitle: meta.hint,
        };
      }),
    [language],
  );

  return (
    <ThemedSelect
      ariaLabel={language === "id" ? "Mode Optimasi" : "Optimization Mode"}
      modalTitle={language === "id" ? "Pilih Mode Optimasi" : "Select Optimization Mode"}
      value={String(value)}
      options={options}
      language={language}
      popoverMinWidthPx={260}
      onChange={(nextVal) => {
        const parsed = Number(nextVal);
        if (parsed >= 1 && parsed <= 5) {
          onChange(parsed as OptimizationMode);
        }
      }}
      className={
        className ?? "min-h-11 w-full py-0 text-[11px] md:h-7 md:min-h-7 md:w-auto md:min-w-40"
      }
    />
  );
}
