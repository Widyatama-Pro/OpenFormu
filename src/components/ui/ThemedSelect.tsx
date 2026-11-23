import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { pickLang } from "../../i18n";
import { useOptionalThemeContext } from "../../theme";
import type { AppLanguage } from "../../types";
import { cn } from "../../utils/cn";

export interface ThemedSelectOption {
  readonly value: string;
  readonly label: string;
  readonly subtitle?: string | undefined;
  readonly group?: string | undefined;
}

export interface ThemedSelectProps {
  readonly id?: string | undefined;
  readonly ariaLabel: string;
  readonly value: string;
  readonly options: readonly ThemedSelectOption[];
  readonly onChange: (nextValue: string) => void;
  readonly placeholder?: string | undefined;
  readonly searchPlaceholder?: string | undefined;
  readonly modalTitle?: string | undefined;
  readonly searchable?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  readonly className?: string | undefined;
  readonly popoverMinWidthPx?: number | undefined;
  readonly language?: AppLanguage | undefined;
}

interface GroupedEntry {
  readonly group: string | null;
  readonly items: readonly ThemedSelectOption[];
}

function groupOptions(options: readonly ThemedSelectOption[]): readonly GroupedEntry[] {
  const buckets: { group: string | null; items: ThemedSelectOption[] }[] = [];
  const map = new Map<string | null, ThemedSelectOption[]>();

  for (const opt of options) {
    const key = opt.group ?? null;
    let list = map.get(key);
    if (!list) {
      list = [];
      map.set(key, list);
      buckets.push({ group: key, items: list });
    }
    list.push(opt);
  }
  return buckets;
}

function isViewportMobile(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia === "function" && window.matchMedia("(max-width: 767px)").matches) {
    return true;
  }
  return window.innerWidth < 768;
}

function getOverlayFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.closest('[hidden], [aria-hidden="true"]'));
}

/**
 * Pemilih dropdown & modal modern yang 100% mengikuti token tema aktif OpenFormu:
 * - Trigger selalu mendukung `w-full min-w-0 truncate` + ikon chevron di kanan
 * - Desktop (>= 768px): popover elegan terikat ke trigger
 * - Mobile (< 768px): modal bottom-sheet nyaman sentuh dengan bilah pencarian & section divider non-interaktif
 */
export function ThemedSelect({
  id,
  ariaLabel,
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  modalTitle,
  searchable = false,
  disabled = false,
  className,
  popoverMinWidthPx = 260,
  language = "id",
}: ThemedSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(isViewportMobile);
  const [popoverStyle, setPopoverStyle] = useState<{
    readonly top: number;
    readonly left: number;
    readonly width: number;
    readonly maxHeight: number;
  } | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.subtitle?.toLowerCase().includes(q) ?? false) ||
        (opt.group?.toLowerCase().includes(q) ?? false),
    );
  }, [options, query]);

  const grouped = useMemo(() => groupOptions(filteredOptions), [filteredOptions]);

  const openMenu = useCallback(() => {
    setIsMobileViewport(isViewportMobile());
    const selectedIdx = options.findIndex((opt) => opt.value === value);
    setHighlightIdx(selectedIdx >= 0 ? selectedIdx : 0);
    setOpen(true);
  }, [options, value]);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHighlightIdx(-1);
    triggerRef.current?.focus();
  }, []);

  const selectValue = useCallback(
    (next: string) => {
      onChange(next);
      setOpen(false);
      setQuery("");
      setHighlightIdx(-1);
      triggerRef.current?.focus();
    },
    [onChange],
  );

  const scrollOptionIntoView = useCallback((index: number) => {
    if (index < 0) return;
    const container = listboxRef.current;
    if (!container) return;
    const target = container.querySelector<HTMLElement>(`[data-option-index="${index}"]`);
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ block: "nearest" });
    }
  }, []);

  // Reposition desktop popover and close on outside click
  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const mobile = isViewportMobile();
      setIsMobileViewport(mobile);

      if (mobile || !triggerRef.current) {
        setPopoverStyle(null);
        return;
      }

      const rect = triggerRef.current.getBoundingClientRect();
      const desiredWidth = Math.min(vw - 24, Math.max(rect.width, popoverMinWidthPx));
      const clampedLeft = Math.max(12, Math.min(rect.left, vw - desiredWidth - 12));
      const spaceBelow = vh - rect.bottom - 14;
      const spaceAbove = rect.top - 14;
      const openAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(180, Math.min(360, openAbove ? spaceAbove : spaceBelow));
      const top = openAbove ? Math.max(12, rect.top - maxHeight - 6) : rect.bottom + 6;

      setPopoverStyle({
        top,
        left: clampedLeft,
        width: desiredWidth,
        maxHeight,
      });
    };

    const handleScrollCapture = (e: Event) => {
      const target = e.target;
      if (target instanceof Node && popoverRef.current?.contains(target)) {
        return;
      }
      updatePosition();
    };

    const handlePointerOutside = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
      setHighlightIdx(-1);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", handleScrollCapture, true);
    document.addEventListener("mousedown", handlePointerOutside);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", handleScrollCapture, true);
      document.removeEventListener("mousedown", handlePointerOutside);
    };
  }, [open, popoverMinWidthPx]);

  // Focus initial control inside dialog/popover and scroll active option into view on open
  useEffect(() => {
    if (!open) return;
    const selectedIdx = options.findIndex((opt) => opt.value === value);

    const focusInitialTarget = () => {
      const mobile = isViewportMobile();
      const focusAlreadyInside = popoverRef.current?.contains(document.activeElement) ?? false;
      if (!focusAlreadyInside) {
        if (mobile) {
          popoverRef.current?.focus();
        } else if (searchable) {
          searchInputRef.current?.focus();
        }
      }
      if (selectedIdx >= 0) {
        scrollOptionIntoView(selectedIdx);
      }
    };

    focusInitialTarget();
    const frame = requestAnimationFrame(focusInitialTarget);

    return () => cancelAnimationFrame(frame);
    // Run only when menu transitions open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Capture-phase listener runs before outer SheetDialog bubble handlers.
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeMenu();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopImmediatePropagation();
        setHighlightIdx((prev) => {
          const next = filteredOptions.length === 0 ? -1 : (prev + 1) % filteredOptions.length;
          scrollOptionIntoView(next);
          return next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopImmediatePropagation();
        setHighlightIdx((prev) => {
          const next =
            filteredOptions.length === 0 ? -1 : prev <= 0 ? filteredOptions.length - 1 : prev - 1;
          scrollOptionIntoView(next);
          return next;
        });
      } else if (e.key === "Enter") {
        const activeEl = document.activeElement;
        const isControlButton =
          activeEl instanceof HTMLButtonElement &&
          activeEl.getAttribute("role") !== "option" &&
          (popoverRef.current?.contains(activeEl) ?? false);
        if (!isControlButton && highlightIdx >= 0 && highlightIdx < filteredOptions.length) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const chosen = filteredOptions[highlightIdx];
          if (chosen) selectValue(chosen.value);
        }
      } else if (e.key === "Tab" && popoverRef.current) {
        const focusables = getOverlayFocusables(popoverRef.current);
        const activeEl =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;

        if (isMobileViewport) {
          e.stopImmediatePropagation();
          if (focusables.length === 0) {
            e.preventDefault();
            popoverRef.current.focus();
            return;
          }
          const first = focusables[0]!;
          const last = focusables[focusables.length - 1]!;
          if (e.shiftKey) {
            if (
              !activeEl ||
              activeEl === popoverRef.current ||
              activeEl === first ||
              !popoverRef.current.contains(activeEl)
            ) {
              e.preventDefault();
              last.focus();
            }
          } else if (
            !activeEl ||
            activeEl === popoverRef.current ||
            activeEl === last ||
            !popoverRef.current.contains(activeEl)
          ) {
            e.preventDefault();
            first.focus();
          }
        } else if (activeEl && popoverRef.current.contains(activeEl)) {
          e.stopImmediatePropagation();
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (!first || !last || (e.shiftKey ? activeEl === first : activeEl === last)) {
            e.preventDefault();
            closeMenu();
          }
        } else {
          setOpen(false);
          setQuery("");
          setHighlightIdx(-1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [
    open,
    filteredOptions,
    highlightIdx,
    isMobileViewport,
    closeMenu,
    selectValue,
    scrollOptionIntoView,
  ]);

  const renderOptionsBody = () => (
    <>
      {searchable && (
        <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlightIdx(0);
              }}
              placeholder={
                searchPlaceholder ??
                pickLang(language, "Cari standar ternak…", "Search livestock standard…")
              }
              aria-label={
                searchPlaceholder ??
                pickLang(language, "Cari standar ternak", "Search livestock standard")
              }
              className={cn(
                "min-h-11 w-full border pr-11 pl-8 text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:border-[var(--color-primary)] focus-visible:bg-[var(--bg-surface-elevated)] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--focus-ring)] md:min-h-9 md:pr-8",
                isAntiSlop
                  ? "rounded-md border-[var(--border-strong)] bg-[var(--bg-surface-elevated)]"
                  : "rounded-lg border-[var(--border-subtle)] bg-[var(--bg-sunken)]",
              )}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={pickLang(language, "Hapus pencarian", "Clear search")}
                className="absolute top-1/2 right-1 inline-flex min-h-11 min-w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] md:right-2 md:min-h-7 md:min-w-7"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}

      <div
        ref={listboxRef}
        id={listboxId}
        role="listbox"
        aria-label={ariaLabel}
        className="custom-scrollbar flex-1 overflow-y-auto overscroll-contain p-1.5"
      >
        {filteredOptions.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-[var(--text-muted)]">
            {pickLang(
              language,
              `Tidak ada pilihan yang cocok dengan “${query}”.`,
              `No option matches “${query}”.`,
            )}
          </p>
        ) : (
          grouped.map((section, sIdx) => (
            <div key={section.group ?? `ungrouped-${sIdx}`} className={cn(sIdx > 0 && "mt-2")}>
              {/* Header pemisah grup non-interaktif (tanpa radio button) */}
              {section.group && (
                <div
                  role="presentation"
                  aria-hidden="true"
                  className="mb-1 flex items-center gap-2 px-2.5 pt-1.5 pb-1 text-[10px] font-bold tracking-wider uppercase text-[var(--text-muted)] select-none"
                >
                  <span className="truncate">{section.group}</span>
                  <span className="h-px flex-1 bg-[var(--border-subtle)]" />
                </div>
              )}

              <div className="space-y-0.5">
                {section.items.map((opt) => {
                  const isSelected = opt.value === value;
                  const flatIndex = filteredOptions.indexOf(opt);
                  const isHighlighted = flatIndex === highlightIdx;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      data-option-index={flatIndex}
                      aria-selected={isSelected}
                      onClick={() => selectValue(opt.value)}
                      onMouseEnter={() => setHighlightIdx(flatIndex)}
                      className={cn(
                        "flex min-h-11 w-full cursor-pointer items-center justify-between gap-2.5 px-2.5 py-2 text-left text-xs transition-colors md:min-h-8 md:py-1.5",
                        isAntiSlop ? "rounded-md" : "rounded-lg",
                        isSelected
                          ? isAntiSlop
                            ? "border border-[var(--color-primary)] bg-[var(--primary-soft)] font-bold text-[var(--text-primary)]"
                            : "bg-[var(--primary-soft)] font-bold text-[var(--color-primary)] ring-1 ring-[var(--border-subtle)]"
                          : isHighlighted
                            ? "bg-[var(--bg-sunken)] text-[var(--text-primary)]"
                            : "text-[var(--text-primary)] hover:bg-[var(--bg-sunken)]",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block leading-snug">{opt.label}</span>
                        {opt.subtitle && (
                          <span className="mt-0.5 block text-[10px] font-normal text-[var(--text-secondary)]">
                            {opt.subtitle}
                          </span>
                        )}
                      </div>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                          isSelected
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--text-on-primary)]"
                            : "border-[var(--border-strong)] bg-transparent text-transparent",
                        )}
                      >
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  const overlay =
    open && typeof document !== "undefined"
      ? createPortal(
          isMobileViewport ? (
            <div
              data-themed-select-overlay="true"
              className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55"
              role="dialog"
              aria-modal="true"
              aria-label={modalTitle ?? ariaLabel}
              onClick={(e) => {
                e.stopPropagation();
                closeMenu();
              }}
            >
              <div
                ref={popoverRef}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "flex max-h-[82dvh] w-full flex-col overflow-hidden border bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] focus:outline-none",
                  isAntiSlop
                    ? "rounded-t-xl border-[var(--border-strong)] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.28)]"
                    : "rounded-t-2xl border-[var(--border-subtle)] shadow-[0_-18px_48px_-12px_rgba(0,0,0,0.45)]",
                )}
              >
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-4 py-3">
                  <h2 className="min-w-0 truncate text-sm font-bold text-[var(--text-primary)]">
                    {modalTitle ?? ariaLabel}
                  </h2>
                  <button
                    type="button"
                    onClick={closeMenu}
                    aria-label={pickLang(language, "Tutup pilihan", "Close selector")}
                    className={cn(
                      "inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                      isAntiSlop
                        ? "rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-sunken)]"
                        : "neu-pill-btn rounded-full text-[var(--text-secondary)]",
                    )}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                {renderOptionsBody()}
              </div>
            </div>
          ) : (
            <div
              ref={popoverRef}
              data-themed-select-overlay="true"
              style={
                popoverStyle
                  ? {
                      top: `${popoverStyle.top}px`,
                      left: `${popoverStyle.left}px`,
                      width: `${popoverStyle.width}px`,
                      maxHeight: `${popoverStyle.maxHeight}px`,
                    }
                  : {
                      top: "48px",
                      left: "16px",
                      width: `${popoverMinWidthPx}px`,
                      maxHeight: "340px",
                    }
              }
              className={cn(
                "fixed z-[70] flex flex-col overflow-hidden rounded-xl border bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]",
                isAntiSlop
                  ? "border-[var(--border-strong)] shadow-[0_12px_28px_-6px_rgba(0,0,0,0.28)]"
                  : "border-[var(--border-subtle)] shadow-[0_20px_44px_-12px_rgba(0,0,0,0.34),0_4px_14px_-4px_rgba(0,0,0,0.16)]",
              )}
            >
              {renderOptionsBody()}
            </div>
          ),
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        onClick={() => {
          if (disabled) return;
          if (open) closeMenu();
          else openMenu();
        }}
        title={selectedOption?.label ?? placeholder ?? ariaLabel}
        className={cn(
          "inline-flex min-h-11 w-full min-w-0 max-w-full cursor-pointer items-center justify-between gap-1.5 border px-2.5 py-1.5 text-left text-xs font-semibold text-[var(--text-primary)] transition-[transform,border-color,background-color] duration-150 focus-visible:border-[var(--color-primary)] focus-visible:bg-[var(--bg-surface-elevated)] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50 md:py-1 motion-reduce:transform-none",
          isAntiSlop
            ? "rounded-md border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] hover:border-[var(--color-primary)] md:min-h-8"
            : "rounded-lg border-[var(--border-subtle)] bg-[var(--bg-sunken)] shadow-[var(--shadow-neu-pressed)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-elevated)] active:scale-[0.985] md:min-h-7",
          open && "border-[var(--color-primary)] bg-[var(--bg-surface-elevated)]",
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          {selectedOption?.label ?? placeholder ?? (isAntiSlop ? "-" : "—")}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)] transition-transform duration-150",
            open && "rotate-180 text-[var(--color-primary)]",
          )}
        />
      </button>
      {overlay}
    </>
  );
}
