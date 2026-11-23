import { memo } from "react";
import {
  Calculator,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  FolderOpen,
  Layers,
  Settings,
  Wheat,
} from "lucide-react";
import { motion } from "motion/react";
import appLogo from "../../assets/logo-squircle.png";
import type { AppRoute } from "../../hooks/use-prototype-store";
import { useOptionalThemeContext } from "../../theme";
import type { AppLanguage } from "../../types";
import { cn } from "../../utils/cn";
import { AnimatedTextSwap } from "../ui/AnimatedText";
import { TrakteerSupportButton } from "../ui/TrakteerSupportButton";
import { NAV_ITEMS, getNavLabel } from "./navigation-config";

export interface DesktopSidebarProps {
  readonly route: AppRoute;
  readonly onNavigate: (route: AppRoute) => void;
  readonly language: AppLanguage;
  readonly expanded: boolean;
  readonly onToggleExpanded: () => void;
  readonly isOnline?: boolean;
}

function renderNavIcon(id: AppRoute, emphasized = false) {
  const strokeWidth = emphasized ? 2.4 : 2;
  switch (id) {
    case "formulation":
      return (
        <Calculator className="h-6 w-6 shrink-0" strokeWidth={strokeWidth} aria-hidden="true" />
      );
    case "ingredients":
      return (
        <Wheat
          className="h-[18px] w-[18px] shrink-0"
          strokeWidth={strokeWidth}
          aria-hidden="true"
        />
      );
    case "requirements":
      return (
        <ClipboardList
          className="h-[18px] w-[18px] shrink-0"
          strokeWidth={strokeWidth}
          aria-hidden="true"
        />
      );
    case "recipes":
      return (
        <FolderOpen
          className="h-[18px] w-[18px] shrink-0"
          strokeWidth={strokeWidth}
          aria-hidden="true"
        />
      );
    case "advanced":
      return (
        <Layers
          className="h-[18px] w-[18px] shrink-0"
          strokeWidth={strokeWidth}
          aria-hidden="true"
        />
      );
    case "settings":
      return (
        <Settings
          className="h-[18px] w-[18px] shrink-0"
          strokeWidth={strokeWidth}
          aria-hidden="true"
        />
      );
  }
}

/**
 * Desktop sidebar supporting Enhanced (acrylic + glow), Biasa (liquid cutout), and Anti-Slop (flat ledger).
 */
export const DesktopSidebar = memo(function DesktopSidebar({
  route,
  onNavigate,
  language,
  expanded,
  onToggleExpanded,
}: DesktopSidebarProps) {
  const themeCtx = useOptionalThemeContext();
  const uiMode = themeCtx?.uiMode ?? (themeCtx?.uiEnhancer === false ? "biasa" : "enhanced");
  const isEnhanced = uiMode === "enhanced";
  const isAntiSlop = uiMode === "anti-slop";
  const isBiasa = !isEnhanced && !isAntiSlop;
  const useGpuFlip = !isAntiSlop && (themeCtx?.motionEngine ?? "gpu_flip") === "gpu_flip";

  return (
    <aside
      aria-label="Navigasi utama desktop"
      className={cn(
        "relative z-30 hidden shrink-0 flex-col justify-between pb-3 transition-[width] duration-220 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex",
        isEnhanced
          ? "sidebar-acrylic-shell border-r border-white/10 text-[var(--shell-chrome-fg)]"
          : isAntiSlop
            ? "border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
            : "bg-[var(--shell-chrome-bg)] text-[var(--shell-chrome-fg)]",
        expanded ? "w-[228px] min-w-[228px] max-w-[228px]" : "w-[72px] min-w-[72px] max-w-[72px]",
      )}
    >
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-[64px] w-full shrink-0 items-center border-b",
            isAntiSlop ? "border-[var(--border-subtle)]" : "border-white/10",
            expanded ? "justify-between px-4" : "justify-center",
          )}
        >
          <button
            type="button"
            onClick={() => onNavigate("formulation")}
            aria-label={
              language === "id" ? "OpenFormu: Beranda Formulasi" : "OpenFormu: Formulation Home"
            }
            title="OpenFormu"
            className={cn(
              "inline-flex cursor-pointer items-center gap-2.5 rounded-xl transition-transform duration-150 hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none",
              !isAntiSlop && "active:scale-95",
              isAntiSlop && "min-h-11 px-1",
            )}
          >
            <span
              className={cn(
                "relative inline-flex shrink-0 rounded-[11px]",
                isEnhanced && "shadow-[0_0_16px_var(--sidebar-orb-glow,rgba(16,185,129,0.28))]",
              )}
            >
              <img
                src={appLogo}
                alt="Logo OpenFormu"
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-[11px] object-cover"
              />
            </span>
            {expanded && (
              <span className="inline-flex items-baseline gap-0 text-[19px] font-extrabold tracking-tight leading-none">
                <span className={isAntiSlop ? "text-[var(--text-primary)]" : "text-white"}>
                  Open
                </span>
                <span
                  className={
                    isAntiSlop ? "text-[var(--color-primary)]" : "text-[var(--shell-chrome-accent)]"
                  }
                >
                  Formu
                </span>
              </span>
            )}
          </button>
        </div>

        <nav
          className={cn(
            "mt-3 flex w-full flex-col gap-1",
            isEnhanced ? "px-2" : isAntiSlop ? "px-2.5" : "px-0",
          )}
          aria-label="Menu modul"
        >
          {NAV_ITEMS.map((item) => {
            const active = item.id === route;
            const isPrimaryHub = item.id === "formulation";
            const fullLabel = getNavLabel(item, language);

            return (
              <div key={item.id} className="w-full">
                {isAntiSlop &&
                  item.id === "advanced" &&
                  (expanded ? (
                    <p className="px-2.5 pt-2.5 pb-1 text-[11px] font-semibold text-[var(--text-muted)]">
                      {language === "id" ? "Sistem" : "System"}
                    </p>
                  ) : (
                    <div
                      aria-hidden="true"
                      className="mx-2 my-1.5 border-b border-[var(--border-subtle)]"
                    />
                  ))}
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-label={fullLabel}
                  aria-current={active ? "page" : undefined}
                  title={expanded ? undefined : fullLabel}
                  data-primary-hub={isPrimaryHub ? "true" : undefined}
                  className={cn(
                    "group relative flex w-full cursor-pointer items-center transition-[transform,color,background-color,box-shadow,border-color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none",
                    !isAntiSlop && (isEnhanced || !active) && "active:scale-[0.98]",
                    isEnhanced
                      ? isPrimaryHub
                        ? "h-[60px] rounded-2xl border border-white/15 bg-white/6 shadow-[0_6px_20px_-6px_rgba(16,185,129,0.28)]"
                        : "h-10 rounded-xl"
                      : isAntiSlop
                        ? isPrimaryHub
                          ? "h-[60px] rounded-lg"
                          : "min-h-11 rounded-lg"
                        : isPrimaryHub
                          ? "h-[60px] rounded-none"
                          : "h-10 rounded-none",
                    expanded
                      ? isEnhanced || isAntiSlop
                        ? isPrimaryHub
                          ? "justify-start gap-3 px-3.5 text-left"
                          : "justify-start gap-2.5 px-3 text-left"
                        : isPrimaryHub
                          ? "justify-start gap-3 pl-5 pr-3 text-left"
                          : "justify-start gap-2.5 pl-5 pr-3 text-left"
                      : isEnhanced || isAntiSlop
                        ? "justify-center px-0"
                        : "justify-center pl-1.5 pr-0",
                    active
                      ? isEnhanced
                        ? "text-white"
                        : isAntiSlop
                          ? "border border-[var(--color-primary)] bg-[var(--primary-soft)] font-bold text-[var(--text-primary)]"
                          : "text-[var(--shell-active-fg)]"
                      : isEnhanced
                        ? "text-white/75 hover:bg-white/10 hover:text-white"
                        : isAntiSlop
                          ? "border border-transparent font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
                          : "text-white/75 hover:text-white",
                  )}
                >
                  {isBiasa && isPrimaryHub && !active && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-2 inset-y-1 rounded-2xl border border-white/15 bg-white/6 transition-colors group-hover:bg-white/12"
                    />
                  )}
                  {isBiasa && !isPrimaryHub && !active && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-2 inset-y-0.5 rounded-xl bg-transparent transition-colors group-hover:bg-white/10"
                    />
                  )}

                  {active &&
                    (isEnhanced ? (
                      <motion.span
                        {...(useGpuFlip ? { layoutId: "active-nav-glowing-pill" } : {})}
                        transition={{ type: "spring", stiffness: 440, damping: 34, mass: 0.8 }}
                        className={cn(
                          "glowing-nav-pill pointer-events-none absolute inset-0",
                          isPrimaryHub ? "rounded-2xl" : "rounded-xl",
                        )}
                        aria-hidden="true"
                      />
                    ) : isAntiSlop ? (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1.5 bottom-1.5 left-0 w-1 rounded-r-sm bg-[var(--color-primary)]"
                      />
                    ) : (
                      <motion.span
                        {...(useGpuFlip ? { layoutId: "active-nav-cutout" } : {})}
                        transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
                        className="nav-liquid-cutout"
                        aria-hidden="true"
                      />
                    ))}

                  <span
                    className={cn(
                      "relative z-10 flex items-center justify-center",
                      !isAntiSlop &&
                        "transition-transform duration-150 group-hover:scale-105 motion-reduce:transform-none",
                      isPrimaryHub &&
                        (isAntiSlop
                          ? "h-9 w-9 shrink-0 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] text-[var(--color-primary)]"
                          : active && isBiasa
                            ? "h-9 w-9 shrink-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--primary-soft)] text-[var(--shell-active-fg)] shadow-xs"
                            : "h-9 w-9 shrink-0 rounded-xl border border-white/20 bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"),
                      active && isEnhanced && "drop-shadow-[0_0_8px_rgba(255,255,255,0.45)]",
                      active && isAntiSlop && !isPrimaryHub && "text-[var(--color-primary)]",
                    )}
                  >
                    {renderNavIcon(item.id, isAntiSlop && active)}
                  </span>

                  {expanded && (
                    <span
                      className={cn(
                        "relative z-10 min-w-0 flex-1 truncate",
                        isPrimaryHub
                          ? "text-[15px] font-extrabold tracking-tight"
                          : isAntiSlop && active
                            ? "text-xs font-bold"
                            : "text-xs font-semibold",
                      )}
                    >
                      <AnimatedTextSwap text={fullLabel} />
                    </span>
                  )}

                  {!expanded && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute left-full z-50 ml-3 translate-x-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap opacity-0 transition-[opacity,transform] duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100",
                        isAntiSlop
                          ? "border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] shadow-md"
                          : "border-white/15 bg-[var(--sidebar-deep-end,var(--bg-surface-elevated))] text-white shadow-xl",
                      )}
                    >
                      {fullLabel}
                    </span>
                  )}
                </button>
                {isPrimaryHub && (
                  <>
                    <div
                      aria-hidden="true"
                      className={cn(
                        "border-b",
                        isAntiSlop
                          ? "mx-2 my-2 border-[var(--border-subtle)]"
                          : isEnhanced
                            ? "mx-2 my-2 border-white/12 opacity-80"
                            : "my-3 mr-5 ml-3 border-white/12 opacity-80",
                      )}
                    />
                    {isAntiSlop && expanded && (
                      <p className="px-2.5 pt-1 pb-1 text-[11px] font-semibold text-[var(--text-muted)]">
                        {language === "id" ? "Pustaka & Resep" : "Library & Recipes"}
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className={cn("flex w-full flex-col gap-2 px-2.5", !expanded && "items-center px-2")}>
        <TrakteerSupportButton variant="sidebar" compact={!expanded} language={language} />

        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-label={
            expanded
              ? language === "id"
                ? "Perkecil sidebar navigasi"
                : "Collapse navigation sidebar"
              : language === "id"
                ? "Perbesar sidebar navigasi"
                : "Expand navigation sidebar"
          }
          title={
            expanded
              ? language === "id"
                ? "Perkecil sidebar"
                : "Collapse sidebar"
              : language === "id"
                ? "Perbesar sidebar"
                : "Expand sidebar"
          }
          className={cn(
            "elastic-size-box inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition-[transform,background-color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none",
            isAntiSlop
              ? cn(
                  "min-h-11 border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-sunken)]",
                  expanded ? "w-full px-3" : "w-11",
                )
              : cn(
                  "h-8 border-white/15 bg-white/10 text-white/90 hover:bg-white/18 active:scale-95",
                  expanded ? "w-full px-3" : "w-9",
                ),
          )}
        >
          {expanded ? (
            <>
              <ChevronsLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">
                <AnimatedTextSwap text={language === "id" ? "Perkecil Menu" : "Collapse"} />
              </span>
            </>
          ) : (
            <ChevronsRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
        </button>
      </div>
    </aside>
  );
});
