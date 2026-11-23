import type { InputHTMLAttributes } from "react";
import { useOptionalThemeContext } from "../../theme";
import { cn } from "../../utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly invalid?: boolean | undefined;
  readonly numeric?: boolean | undefined;
}

export function Input({ invalid, numeric, className, ...rest }: InputProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";
  const hasCustomWidth = typeof className === "string" && /(?:^|\s)w-\S+/.test(className);
  return (
    <input
      aria-invalid={invalid === true ? true : undefined}
      className={cn(
        "min-h-11 border px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-[border-color,background-color] duration-150 focus-visible:border-[var(--color-primary)] focus-visible:bg-[var(--bg-surface-elevated)] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60 md:min-h-8 md:py-1",
        isAntiSlop
          ? "rounded-md border-[var(--border-strong)] bg-[var(--bg-surface-elevated)]"
          : "rounded-lg border-[var(--border-subtle)] bg-[var(--bg-sunken)] shadow-[var(--shadow-neu-pressed)]",
        !hasCustomWidth && "w-full",
        invalid === true &&
          "border-[var(--status-danger)] bg-[var(--status-danger-soft)] text-[var(--text-primary)] focus-visible:outline-[var(--status-danger)]",
        numeric === true && "text-right tabular-nums",
        className,
      )}
      {...rest}
    />
  );
}
