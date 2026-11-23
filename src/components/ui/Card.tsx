import type { HTMLAttributes } from "react";
import { useOptionalThemeContext } from "../../theme";
import { cn } from "../../utils/cn";

export type CardHighlight = "none" | "coral" | "emerald" | "amber";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  readonly interactive?: boolean | undefined;
  readonly highlight?: CardHighlight | undefined;
}

const HIGHLIGHT_CLASS: Record<CardHighlight, string> = {
  none: "",
  coral: "glass-card-coral",
  emerald: "glass-card-emerald",
  amber: "glass-card-amber",
};

const ANTI_SLOP_HIGHLIGHT_CLASS: Record<CardHighlight, string> = {
  none: "",
  coral: "border-[var(--status-danger)]",
  emerald: "border-[var(--status-success)]",
  amber: "border-[var(--status-warning)]",
};

export function Card({ interactive = true, highlight = "none", className, ...rest }: CardProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";

  return (
    <div
      className={cn(
        isAntiSlop
          ? "rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] transition-colors duration-150"
          : "glass-card rounded-2xl",
        isAntiSlop && interactive && "hover:border-[var(--border-strong)]",
        !isAntiSlop && interactive && "glass-card-interactive",
        isAntiSlop ? ANTI_SLOP_HIGHLIGHT_CLASS[highlight] : HIGHLIGHT_CLASS[highlight],
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-4 py-2.5",
        className,
      )}
      {...rest}
    />
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...rest} />;
}
