import { useOptionalThemeContext } from "../../theme";
import { cn } from "../../utils/cn";

export interface ProgressNode {
  readonly label: string | number;
  readonly tone?: "emerald" | "amber" | "coral" | "neutral";
}

export interface NeumorphicProgressTrackProps {
  /** Persentase kemajuan / posisi indikator (0–100). */
  readonly percent: number;
  /** Rentang aman opsional (left% dan width%) untuk visualisasi batas Min–Max nutrien. */
  readonly rangeStartPct?: number | undefined;
  readonly rangeWidthPct?: number | undefined;
  readonly tone?: "emerald" | "amber" | "coral" | "petrol";
  readonly nodes?: readonly ProgressNode[] | undefined;
  readonly showThumb?: boolean | undefined;
  readonly className?: string | undefined;
}

const FILL_CLASSES: Record<NonNullable<NeumorphicProgressTrackProps["tone"]>, string> = {
  emerald: "bg-[var(--status-success)]",
  amber: "bg-[var(--status-warning)]",
  coral: "bg-[var(--status-danger)]",
  petrol: "bg-[var(--color-primary)]",
};

const NODE_RING_CLASSES: Record<NonNullable<ProgressNode["tone"]>, string> = {
  emerald: "border-[var(--status-success)] text-[var(--status-success)]",
  amber: "border-[var(--status-warning)] text-[var(--status-warning)]",
  coral: "border-[var(--status-danger)] text-[var(--status-danger)]",
  neutral: "border-[var(--border-subtle)] text-[var(--text-secondary)]",
};

/**
 * Jalur progres dengan animasi GPU-composited (`transform: scaleX`).
 */
export function NeumorphicProgressTrack({
  percent,
  rangeStartPct,
  rangeWidthPct,
  tone = "emerald",
  nodes,
  showThumb = false,
  className,
}: NeumorphicProgressTrackProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className={cn("relative flex items-center", className)}>
      <div
        className={cn(
          "relative h-2.5 w-full overflow-hidden rounded-full",
          isAntiSlop ? "border border-[var(--border-strong)] bg-[var(--bg-sunken)]" : "neu-well",
        )}
      >
        {rangeStartPct !== undefined && rangeWidthPct !== undefined ? (
          <div
            className="absolute top-0 bottom-0 rounded-full"
            style={{
              backgroundColor: "color-mix(in srgb, var(--status-success) 25%, transparent)",
              left: `${Math.max(0, Math.min(100, rangeStartPct))}%`,
              width: `${Math.max(4, Math.min(100, rangeWidthPct))}%`,
            }}
          />
        ) : (
          <div
            className={cn(
              "h-full w-full origin-left rounded-full transition-transform duration-200 motion-reduce:transition-none",
              FILL_CLASSES[tone],
            )}
            style={{ transform: `scaleX(${clamped / 100})` }}
          />
        )}
      </div>

      {showThumb && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--bg-surface-elevated)]",
            !isAntiSlop && "shadow-sm",
            FILL_CLASSES[tone],
          )}
          style={{ left: `${clamped}%` }}
        />
      )}

      {nodes !== undefined && nodes.length > 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2">
          {nodes.map((node, idx) => (
            <span
              key={`${node.label}-${idx}`}
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 bg-[var(--bg-surface-elevated)] px-1 text-[10px] font-bold tabular-nums",
                !isAntiSlop && "shadow-xs",
                isAntiSlop && (node.tone ?? "neutral") === "neutral"
                  ? "border-[var(--border-strong)] text-[var(--text-secondary)]"
                  : NODE_RING_CLASSES[node.tone ?? "neutral"],
              )}
            >
              {node.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
