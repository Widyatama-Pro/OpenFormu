import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { useOptionalThemeContext } from "../../theme";
import { cn } from "../../utils/cn";

export interface SheetDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly subtitle?: string | undefined;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly variant?: "bottom-sheet" | "dialog" | "responsive";
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const openDialogStack: string[] = [];

function captureActiveElement(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

function hasActiveExternalOverlay(): boolean {
  if (typeof document === "undefined") return false;
  if (document.querySelector('[data-themed-select-overlay="true"]') !== null) return true;
  return (
    document.querySelector('[role="dialog"][aria-modal="true"]:not([data-sheet-dialog="true"])') !==
    null
  );
}

function getDialogFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.closest('[hidden], [aria-hidden="true"]'),
  );
}

/** Adaptive modal/sheet dialog with Escape close, Tab focus trap, and trigger focus restoration. */
export function SheetDialog(props: SheetDialogProps) {
  if (!props.open) return null;
  return <SheetDialogImpl {...props} />;
}

function SheetDialogImpl({
  onClose,
  title,
  subtitle,
  children,
  footer,
  variant = "responsive",
}: SheetDialogProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";
  const dialogId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  // Capture trigger pre-commit so autoFocus children do not overwrite the return target.
  const [returnTarget] = useState<HTMLElement | null>(captureActiveElement);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    openDialogStack.push(dialogId);

    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      const focusables = getDialogFocusables(panel);
      const target = focusables[0] ?? panel;
      target.focus();
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (openDialogStack[openDialogStack.length - 1] !== dialogId) return;

      if (event.key === "Escape") {
        if (hasActiveExternalOverlay()) return;
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (
        document.querySelector('[data-themed-select-overlay="true"][role="dialog"]') !== null ||
        active?.closest('[data-themed-select-overlay="true"]') != null
      ) {
        return;
      }

      const focusables = getDialogFocusables(panelRef.current);
      if (focusables.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;

      if (event.shiftKey) {
        if (!active || active === first || !panelRef.current.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (!active || active === last || !panelRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      const idx = openDialogStack.lastIndexOf(dialogId);
      if (idx !== -1) openDialogStack.splice(idx, 1);
      // Skip focus return during StrictMode simulated cleanup while the panel stays mounted.
      if (!panel?.isConnected && returnTarget && returnTarget.isConnected) {
        returnTarget.focus();
      }
    };
  }, [dialogId, returnTarget]);

  const containerMode =
    variant === "bottom-sheet"
      ? "items-end justify-center p-0"
      : variant === "dialog"
        ? "items-center justify-center p-4"
        : "items-end justify-center p-0 md:items-center md:p-4";

  const panelRadius = isAntiSlop
    ? variant === "bottom-sheet"
      ? "rounded-t-xl max-h-[90dvh]"
      : variant === "dialog"
        ? "rounded-xl max-w-2xl max-h-[85dvh]"
        : "rounded-t-xl max-h-[90dvh] md:max-w-2xl md:rounded-xl md:max-h-[85dvh]"
    : variant === "bottom-sheet"
      ? "rounded-t-2xl max-h-[90dvh]"
      : variant === "dialog"
        ? "rounded-2xl max-w-2xl max-h-[85dvh]"
        : "rounded-t-2xl max-h-[90dvh] md:max-w-2xl md:rounded-2xl md:max-h-[85dvh]";

  return (
    <div
      data-sheet-dialog="true"
      className={cn("safe-area-dialog-backdrop fixed inset-0 z-50 flex bg-black/50", containerMode)}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "landscape-dialog-panel flex w-full flex-col overflow-hidden overscroll-contain border bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] focus:outline-none",
          isAntiSlop
            ? "border-[var(--border-strong)] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.28)]"
            : "border-[var(--border-subtle)] shadow-[0_24px_54px_-14px_rgba(0,0,0,0.34),0_4px_16px_-4px_rgba(0,0,0,0.14)]",
          panelRadius,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="landscape-dialog-head flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold tracking-tight text-[var(--text-primary)]">
              {title}
            </h2>
            {subtitle !== undefined && (
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel"
            className={cn(
              "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
              isAntiSlop
                ? "rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-sunken)]"
                : "neu-pill-btn rounded-full text-[var(--text-secondary)] md:min-h-8 md:min-w-8",
            )}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="custom-scrollbar mobile-drawer-scroll landscape-dialog-body flex-1 overflow-y-auto overscroll-contain bg-[var(--bg-canvas)] p-5">
          {children}
        </div>

        {footer !== undefined && (
          <div className="landscape-dialog-foot border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
