import type { ClipboardEvent, KeyboardEvent } from "react";
import { useState } from "react";
import { useOptionalThemeContext } from "../../theme";
import { cn } from "../../utils/cn";
import { formatNumberLocale, parseLocaleDecimal } from "../../utils/locale-number";

export interface NumericCellInputProps {
  readonly value: number | null | undefined;
  readonly onCommit: (next: number | null) => void;
  readonly ariaLabel: string;
  readonly id?: string | undefined;
  readonly allowNull?: boolean | undefined;
  readonly allowNegative?: boolean | undefined;
  readonly treatSingleThousandDot?: boolean | undefined;
  readonly fractionDigits?: number | undefined;
  readonly min?: number | undefined;
  readonly max?: number | undefined;
  readonly fallbackOnEmpty?: number | null | undefined;
  readonly commitOnChange?: boolean | undefined;
  readonly invalid?: boolean | undefined;
  readonly errorTooltip?: string | undefined;
  readonly placeholder?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly gridRow?: number | undefined;
  readonly gridCol?: string | undefined;
  readonly onPaste?: ((event: ClipboardEvent<HTMLInputElement>) => void) | undefined;
  readonly className?: string | undefined;
}

/**
 * Input sel numerik presisi yang menerima koma (,) maupun titik (.),
 * mengizinkan pengosongan penuh ("") saat mengetik tanpa memaksa angka 0,
 * rata kanan tabular-nums, dan mendukung navigasi keyboard antar-baris.
 */
export function NumericCellInput({
  value,
  onCommit,
  ariaLabel,
  id,
  allowNull = false,
  allowNegative = false,
  treatSingleThousandDot = false,
  fractionDigits = 2,
  min,
  max,
  fallbackOnEmpty,
  commitOnChange = false,
  invalid = false,
  errorTooltip,
  placeholder,
  disabled = false,
  gridRow,
  gridCol,
  onPaste,
  className,
}: NumericCellInputProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";
  const resolvedPlaceholder = placeholder ?? (isAntiSlop ? "-" : "—");
  const formatDisplay = (val: number | null | undefined) =>
    val === null || val === undefined ? "" : formatNumberLocale(val, fractionDigits);

  const [draft, setDraft] = useState<string>(() => formatDisplay(value));
  const [focused, setFocused] = useState(false);
  const [parseError, setParseError] = useState(false);

  const displayedValue = focused || parseError ? draft : formatDisplay(value);

  const clampValue = (num: number): number => {
    let res = num;
    if (min !== undefined && res < min) res = min;
    if (max !== undefined && res > max) res = max;
    return res;
  };

  const commitDraft = () => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      setParseError(false);
      if (allowNull) {
        onCommit(null);
      } else if (fallbackOnEmpty !== undefined) {
        onCommit(fallbackOnEmpty);
      } else {
        onCommit(min !== undefined && min > 0 ? min : 0);
      }
      return;
    }
    const parsed = parseLocaleDecimal(trimmed, { treatSingleThousandDot });
    if (parsed === null || (!allowNegative && parsed < 0)) {
      setParseError(true);
      return;
    }
    setParseError(false);
    onCommit(clampValue(parsed));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (event.key === "Enter") {
        commitDraft();
      }
      if (gridRow !== undefined && gridCol !== undefined) {
        const delta = event.key === "ArrowUp" ? -1 : 1;
        const nextSelector = `input[data-grid-row="${gridRow + delta}"][data-grid-col="${gridCol}"]`;
        const nextEl = document.querySelector<HTMLInputElement>(nextSelector);
        if (nextEl) {
          event.preventDefault();
          nextEl.focus();
          nextEl.select();
        }
      }
    }
  };

  const isError = invalid || parseError;
  const hasExplicitWidth =
    typeof className === "string" &&
    /(?:^|\s)(?:[a-z0-9-]+:)*w-(?:\[|\d|auto|fit|min|max|px|full|screen)/.test(className);

  return (
    <input
      id={id}
      type="text"
      size={1}
      inputMode="decimal"
      aria-label={ariaLabel}
      aria-invalid={isError ? true : undefined}
      title={isError ? (errorTooltip ?? "Masukkan angka valid (>= 0)") : undefined}
      data-grid-row={gridRow}
      data-grid-col={gridCol}
      disabled={disabled}
      placeholder={resolvedPlaceholder}
      value={displayedValue}
      onFocus={(e) => {
        setFocused(true);
        if (!parseError) {
          setDraft(
            value !== null && value !== undefined && Number.isFinite(value)
              ? Number(value.toFixed(4)).toString().replace(".", ",")
              : "",
          );
        }
        e.currentTarget.select();
      }}
      onChange={(e) => {
        const nextRaw = e.target.value;
        setDraft(nextRaw);
        const trimmed = nextRaw.trim();
        if (trimmed === "" || trimmed === "-" || /[.,]$/.test(trimmed)) {
          setParseError(false);
          return;
        }
        const parsed = parseLocaleDecimal(trimmed, { treatSingleThousandDot });
        const invalidNum = parsed === null || (!allowNegative && parsed < 0);
        setParseError(invalidNum);
        if (
          commitOnChange &&
          !invalidNum &&
          parsed !== null &&
          (min === undefined || parsed >= min) &&
          (max === undefined || parsed <= max)
        ) {
          onCommit(parsed);
        }
      }}
      onBlur={() => {
        setFocused(false);
        commitDraft();
      }}
      onPaste={(e) => {
        onPaste?.(e);
        if (e.defaultPrevented) {
          setFocused(false);
          setParseError(false);
          setDraft("");
        }
      }}
      onKeyDown={handleKeyDown}
      className={cn(
        "min-h-11 min-w-0 border px-1.5 py-1 text-right text-sm font-medium tabular-nums text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-[border-color,background-color,box-shadow] duration-150 focus-visible:border-[var(--color-primary)] focus-visible:bg-[var(--bg-surface-elevated)] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-55 md:min-h-7 md:py-0.5 md:text-xs",
        !hasExplicitWidth && "w-full",
        isAntiSlop
          ? "rounded-md border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] hover:border-[var(--border-strong)]"
          : "rounded-lg border-transparent bg-[var(--glass-row-bg,var(--bg-sunken))] hover:border-[var(--glass-border-tint,var(--border-subtle))] hover:bg-[var(--glass-sticky-bg,var(--bg-surface-elevated))]",
        isError &&
          "border-[var(--status-danger)] bg-[var(--status-danger-soft)] text-[var(--text-primary)] focus-visible:outline-[var(--status-danger)]",
        className,
      )}
    />
  );
}
