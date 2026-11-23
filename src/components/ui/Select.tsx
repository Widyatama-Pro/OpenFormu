import type { SelectHTMLAttributes } from "react";
import { useOptionalThemeContext } from "../../theme";
import { cn } from "../../utils/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly invalid?: boolean | undefined;
}

export function Select({ invalid, className, children, ...rest }: SelectProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";
  const hasCustomWidth = typeof className === "string" && /(?:^|\s)w-\S+/.test(className);
  return (
    <select
      aria-invalid={invalid === true ? true : undefined}
      className={cn(
        "min-h-11 min-w-0 max-w-full cursor-pointer truncate border px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-[border-color,background-color] duration-150 focus-visible:border-[var(--color-primary)] focus-visible:bg-[var(--bg-surface-elevated)] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60 md:min-h-8 md:py-1",
        isAntiSlop
          ? "rounded-md border-[var(--border-strong)] bg-[var(--bg-surface-elevated)]"
          : "rounded-lg border-[var(--border-subtle)] bg-[var(--bg-sunken)] shadow-[var(--shadow-neu-pressed)]",
        !hasCustomWidth && "w-full",
        invalid === true && "border-[var(--status-danger)]",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}
