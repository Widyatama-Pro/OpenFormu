import { memo } from "react";
import {
  Calculator,
  ClipboardList,
  FolderOpen,
  Layers,
  Moon,
  Settings,
  Sun,
  Wheat,
} from "lucide-react";
import type { AppRoute } from "../../hooks/use-prototype-store";
import { useOptionalThemeContext } from "../../theme";
import type { AppLanguage, ThemeMode } from "../../types";
import { cn } from "../../utils/cn";
import { SheetDialog } from "../ui/SheetDialog";
import { TrakteerSupportButton } from "../ui/TrakteerSupportButton";
import { NAV_ITEMS, getNavLabel } from "./navigation-config";

export interface MobileNavDrawerProps {
  readonly open: boolean;
  /**
   * When opened from the Mobile Bottom Navigation "Menu" button, show only secondary routes
   * (Livestock Profiles, Advanced Modules, Settings) to avoid duplicating primary bar routes.
   */
  readonly secondaryOnly?: boolean;
  readonly onClose: () => void;
  readonly route: AppRoute;
  readonly onNavigate: (route: AppRoute) => void;
  readonly language: AppLanguage;
  readonly theme: ThemeMode;
  readonly onToggleTheme: () => void;
  readonly onToggleLanguage: () => void;
}

const PRIMARY_BOTTOM_NAV_ROUTES = new Set<AppRoute>(["formulation", "ingredients", "recipes"]);

function renderIcon(id: AppRoute) {
  switch (id) {
    case "formulation":
      return <Calculator className="h-4 w-4 shrink-0" aria-hidden="true" />;
    case "ingredients":
      return <Wheat className="h-4 w-4 shrink-0" aria-hidden="true" />;
    case "requirements":
      return <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />;
    case "recipes":
      return <FolderOpen className="h-4 w-4 shrink-0" aria-hidden="true" />;
    case "advanced":
      return <Layers className="h-4 w-4 shrink-0" aria-hidden="true" />;
    case "settings":
      return <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />;
  }
}

export const MobileNavDrawer = memo(function MobileNavDrawer({
  open,
  secondaryOnly = true,
  onClose,
  route,
  onNavigate,
  language,
  theme,
  onToggleTheme,
  onToggleLanguage,
}: MobileNavDrawerProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";
  const visibleItems = secondaryOnly
    ? NAV_ITEMS.filter((item) => !PRIMARY_BOTTOM_NAV_ROUTES.has(item.id))
    : NAV_ITEMS;

  return (
    <SheetDialog
      open={open}
      onClose={onClose}
      title={language === "id" ? "Menu & Pengaturan" : "Menu & Settings"}
      subtitle={
        language === "id"
          ? "Profil ternak, modul lanjutan, dan preferensi tampilan"
          : "Livestock profiles, advanced modules, and display preferences"
      }
      variant="responsive"
    >
      <div className="space-y-4">
        <div
          className={cn(
            "space-y-1.5 rounded-xl border",
            isAntiSlop
              ? "border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2"
              : "border-[var(--shell-chrome-border)] bg-[var(--shell-chrome-bg)] p-2.5",
          )}
        >
          {visibleItems.map((item) => {
            const active = item.id === route;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={cn(
                  "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3.5 text-left text-sm transition-[transform,background-color,color,border-color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none",
                  !isAntiSlop && "active:scale-[0.98]",
                  active
                    ? isAntiSlop
                      ? "border border-[var(--color-primary)] bg-[var(--primary-soft)] font-bold text-[var(--text-primary)]"
                      : "bg-[var(--bg-canvas)] font-semibold text-[var(--shell-active-fg)] shadow-[var(--shadow-neu-flat)]"
                    : isAntiSlop
                      ? "border border-transparent font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
                      : "font-semibold text-[var(--shell-chrome-muted)] hover:bg-[var(--shell-chrome-btn-hover)] hover:text-[var(--shell-chrome-fg)]",
                )}
              >
                {renderIcon(item.id)}
                <span>{getNavLabel(item, language)}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onToggleTheme}
            className={cn(
              "flex min-h-11 cursor-pointer items-center justify-center gap-2 text-sm font-semibold text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
              isAntiSlop
                ? "rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-sunken)]"
                : "neu-pill-btn rounded-xl",
            )}
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Sun className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {theme === "light"
                ? language === "id"
                  ? "Mode Gelap"
                  : "Dark Mode"
                : language === "id"
                  ? "Mode Terang"
                  : "Light Mode"}
            </span>
          </button>
          <button
            type="button"
            onClick={onToggleLanguage}
            className={cn(
              "flex min-h-11 cursor-pointer items-center justify-center text-sm font-bold uppercase text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
              isAntiSlop
                ? "rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-sunken)]"
                : "neu-pill-btn rounded-xl",
            )}
          >
            {language === "id" ? "Bahasa: ID" : "Language: EN"}
          </button>
        </div>

        <TrakteerSupportButton
          variant="sidebar"
          surface="adaptive"
          compact={false}
          language={language}
        />
      </div>
    </SheetDialog>
  );
});
