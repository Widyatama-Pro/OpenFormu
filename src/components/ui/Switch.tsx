import type { ButtonHTMLAttributes } from "react";
import { useOptionalThemeContext } from "../../theme";
import { cn } from "../../utils/cn";

export interface SwitchProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "role" | "aria-checked" | "aria-label" | "onClick" | "onChange"
> {
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  readonly label: string;
  readonly id?: string | undefined;
  readonly disabled?: boolean | undefined;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  id,
  disabled,
  className,
  ...rest
}: SwitchProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none",
        isAntiSlop ? "md:min-h-9 md:min-w-11" : "active:scale-[0.96] md:min-h-6 md:min-w-9",
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition-[background-color,border-color] duration-150",
          checked
            ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
            : isAntiSlop
              ? "border-[var(--border-strong)] bg-[var(--bg-sunken)]"
              : "border-[var(--border-subtle)] bg-[var(--bg-sunken)] shadow-[var(--shadow-neu-pressed)]",
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-3.5 w-3.5 rounded-full transition-transform duration-150 motion-reduce:transition-none",
            !isAntiSlop && "shadow-xs",
            checked
              ? "translate-x-4 bg-[var(--text-on-primary)]"
              : isAntiSlop
                ? "translate-x-0 bg-[var(--text-secondary)]"
                : "translate-x-0 bg-[var(--text-muted)]",
          )}
        />
      </span>
    </button>
  );
}
