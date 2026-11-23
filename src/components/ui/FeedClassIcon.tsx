import { memo } from "react";
import { Barrel, Bean, Bone, Flame, FlaskConical, Pill, Sprout, Wheat } from "lucide-react";
import { getFeedClassLabel } from "../../data/feed-classes";
import { useOptionalThemeContext } from "../../theme";
import type { AppLanguage, FeedClassCode } from "../../types";
import { cn } from "../../utils/cn";

export interface FeedClassIconProps {
  readonly code: FeedClassCode;
  readonly language?: AppLanguage;
  readonly className?: string;
}

const CLASS_STYLE: Record<FeedClassCode, string> = {
  1: "border-amber-600/30 bg-amber-500/12 text-amber-800 dark:text-amber-300",
  2: "border-emerald-600/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  3: "border-teal-600/30 bg-teal-500/12 text-teal-700 dark:text-teal-300",
  4: "border-orange-600/30 bg-orange-500/12 text-orange-700 dark:text-orange-300",
  5: "border-sky-600/30 bg-sky-500/12 text-sky-700 dark:text-sky-300",
  6: "border-stone-500/35 bg-stone-500/14 text-stone-700 dark:text-stone-300",
  7: "border-rose-500/30 bg-rose-500/12 text-rose-700 dark:text-rose-300",
  8: "border-cyan-600/30 bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
};

const ANTI_SLOP_CLASS_STYLE: Record<FeedClassCode, string> = {
  1: "border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] text-amber-800 dark:bg-[var(--bg-canvas)] dark:text-amber-300",
  2: "border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] text-emerald-800 dark:bg-[var(--bg-canvas)] dark:text-emerald-300",
  3: "border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] text-teal-800 dark:bg-[var(--bg-canvas)] dark:text-teal-300",
  4: "border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] text-orange-800 dark:bg-[var(--bg-canvas)] dark:text-orange-300",
  5: "border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] text-sky-800 dark:bg-[var(--bg-canvas)] dark:text-sky-300",
  6: "border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] text-stone-800 dark:bg-[var(--bg-canvas)] dark:text-stone-200",
  7: "border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] text-rose-800 dark:bg-[var(--bg-canvas)] dark:text-rose-200",
  8: "border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] text-cyan-800 dark:bg-[var(--bg-canvas)] dark:text-cyan-300",
};

/**
 * Pemetaan ikon kontekstual sesuai sifat bahan pakan ternak (IFN 8 Kelas):
 * 1 Hijauan Kering/Jerami -> Wheat (berkas jerami kering)
 * 2 Hijauan Segar/Pastura -> Sprout (tunas hijau segar)
 * 3 Silase Fermentasi     -> Barrel (drum/silo fermentasi anaerob)
 * 4 Sumber Energi         -> Flame (energi metabolis / kalori)
 * 5 Sumber Protein        -> Bean (kedelai / bungkil / legum protein)
 * 6 Sumber Mineral        -> Bone (kalsium, fosfor, tulang & mineral)
 * 7 Sumber Vitamin        -> Pill (kapsul premix vitamin)
 * 8 Aditif / Imbuhan      -> FlaskConical (asam amino sintetis, enzim & aditif)
 */
function renderClassSvg(code: FeedClassCode) {
  switch (code) {
    case 1:
      return <Wheat className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
    case 2:
      return <Sprout className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
    case 3:
      return <Barrel className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
    case 4:
      return <Flame className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
    case 5:
      return <Bean className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
    case 6:
      return <Bone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
    case 7:
      return <Pill className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
    case 8:
      return <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }
}

/**
 * Ikon mini berkode warna kontekstual untuk 8 Klasifikasi Bahan Pakan Standar Internasional (IFN / Hartadi).
 */
export const FeedClassIcon = memo(function FeedClassIcon({
  code,
  language = "id",
  className,
}: FeedClassIconProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";
  const label = getFeedClassLabel(language, code);
  return (
    <span
      title={label}
      aria-label={label}
      data-feed-class={code}
      className={cn(
        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
        isAntiSlop ? ANTI_SLOP_CLASS_STYLE[code] : CLASS_STYLE[code],
        className,
      )}
    >
      {renderClassSvg(code)}
    </span>
  );
});
