import type { ButtonHTMLAttributes } from "react";
import { useOptionalThemeContext } from "../../theme";
import { cn } from "../../utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "neu-cta-btn border border-transparent",
  secondary: "neu-pill-btn text-[var(--text-primary)]",
  ghost:
    "text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)] active:scale-[0.97]",
  danger:
    "border border-transparent bg-[var(--status-danger)] text-[var(--text-on-danger)] shadow-[var(--shadow-neu-flat)] hover:brightness-95 active:scale-[0.97]",
};

const ANTI_SLOP_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "border border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--text-on-primary)] hover:bg-[var(--color-primary-hover)] hover:border-[var(--color-primary-hover)]",
  secondary:
    "border border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-sunken)] hover:border-[var(--color-primary)]",
  ghost:
    "border border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]",
  danger:
    "border border-[var(--status-danger)] bg-[var(--status-danger)] text-[var(--text-on-danger)] hover:brightness-95",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 text-xs md:min-h-8 md:px-2.5",
  md: "min-h-11 px-4 text-sm md:min-h-9",
};

const ANTI_SLOP_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 text-xs md:min-h-9 md:px-3",
  md: "min-h-11 px-4 text-sm md:min-h-10",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";

  return (
    <button
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-1.5 font-semibold transition-[transform,background-color,border-color,box-shadow,opacity] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none",
        isAntiSlop ? "rounded-md" : "rounded-lg",
        isAntiSlop ? ANTI_SLOP_VARIANT_CLASSES[variant] : VARIANT_CLASSES[variant],
        isAntiSlop ? ANTI_SLOP_SIZE_CLASSES[size] : SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    />
  );
}
