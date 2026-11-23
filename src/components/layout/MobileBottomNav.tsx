import { memo } from "react";
import { Calculator, FolderOpen, Menu, Wheat } from "lucide-react";
import type { AppRoute } from "../../hooks/use-prototype-store";
import { useOptionalThemeContext } from "../../theme";
import type { AppLanguage } from "../../types";
import { cn } from "../../utils/cn";
import { NAV_ITEMS, getNavLabel } from "./navigation-config";

export interface MobileBottomNavProps {
  readonly route: AppRoute;
  readonly onNavigate: (route: AppRoute) => void;
  readonly onOpenDrawer: () => void;
  readonly language: AppLanguage;
}

const PRIMARY_MOBILE_ROUTES: readonly AppRoute[] = ["formulation", "ingredients", "recipes"];

function renderMobileIcon(id: AppRoute) {
  switch (id) {
    case "formulation":
      return <Calculator className="h-[18px] w-[18px]" aria-hidden="true" />;
    case "ingredients":
      return <Wheat className="h-[18px] w-[18px]" aria-hidden="true" />;
    case "recipes":
      return <FolderOpen className="h-[18px] w-[18px]" aria-hidden="true" />;
    default:
      return <Menu className="h-[18px] w-[18px]" aria-hidden="true" />;
  }
}

/** Bottom navigation for mobile viewports (< 768px) with >= 44px tap targets and safe-area insets. */
export const MobileBottomNav = memo(function MobileBottomNav({
  route,
  onNavigate,
  onOpenDrawer,
  language,
}: MobileBottomNavProps) {
  const isOverflowRoute = !PRIMARY_MOBILE_ROUTES.includes(route);
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";

  return (
    <nav
      aria-label="Navigasi bawah mobile"
      className={cn(
        "safe-area-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 gap-1 px-1.5 pt-1 md:hidden",
        isAntiSlop
          ? "border-t border-[var(--border-strong)] bg-[var(--bg-surface-elevated)]"
          : "border-t border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] shadow-[0_-4px_12px_rgba(0,0,0,0.08)]",
      )}
    >
      {PRIMARY_MOBILE_ROUTES.map((id) => {
        const item = NAV_ITEMS.find((n) => n.id === id)!;
        const active = route === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "landscape-bottom-nav-btn flex min-h-12 cursor-pointer flex-col items-center justify-center gap-0.5 px-1 text-[11px] transition-[transform,background-color,color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none",
              isAntiSlop ? "rounded-lg" : "rounded-xl active:scale-95",
              active
                ? isAntiSlop
                  ? "bg-[var(--color-primary)] font-bold text-[var(--text-on-primary)]"
                  : "bg-[var(--color-primary)] font-semibold text-[var(--text-on-primary)] shadow-[var(--shadow-neu-flat)]"
                : isAntiSlop
                  ? "font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
                  : "font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            {renderMobileIcon(id)}
            <span className="truncate">{getNavLabel(item, language, true)}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label={language === "id" ? "Menu lainnya" : "Menu options"}
        className={cn(
          "landscape-bottom-nav-btn flex min-h-12 cursor-pointer flex-col items-center justify-center gap-0.5 px-1 text-[11px] transition-[transform,background-color,color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none",
          isAntiSlop ? "rounded-lg" : "rounded-xl active:scale-95",
          isOverflowRoute
            ? isAntiSlop
              ? "bg-[var(--color-primary)] font-bold text-[var(--text-on-primary)]"
              : "bg-[var(--color-primary)] font-semibold text-[var(--text-on-primary)] shadow-[var(--shadow-neu-flat)]"
            : isAntiSlop
              ? "font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
              : "font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        )}
      >
        <Menu className="h-[18px] w-[18px]" aria-hidden="true" />
        <span>Menu</span>
      </button>
    </nav>
  );
});
