import type { ReactNode } from "react";
import { useState } from "react";
import { Languages, Menu, Moon, Palette, RefreshCw, Sun } from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import appLogo from "../../assets/logo-squircle.png";
import type { AppRoute } from "../../hooks/use-prototype-store";
import { pickLang } from "../../i18n";
import { useOptionalThemeContext } from "../../theme";
import type { AppLanguage, ThemeMode } from "../../types";
import { cn } from "../../utils/cn";
import { AnimatedTextSwap } from "../ui/AnimatedText";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileNavDrawer } from "./MobileNavDrawer";

export interface AppShellProps {
  readonly route: AppRoute;
  readonly onNavigate: (route: AppRoute) => void;
  readonly language: AppLanguage;
  readonly theme: ThemeMode;
  readonly onToggleTheme: () => void;
  readonly onToggleLanguage: () => void;
  readonly isOnline?: boolean;
  readonly offlineReady?: boolean;
  readonly needRefresh?: boolean;
  readonly canInstall?: boolean;
  readonly isInstalled?: boolean;
  readonly onApplyUpdate?: () => void;
  readonly onInstallApp?: () => void;
  readonly children: ReactNode;
}

const SHELL_STAGGER_VARIANTS = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.08,
      staggerChildren: 0.03,
    },
  },
} as const;

const HEADER_ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
  },
} as const;

const MAIN_ITEM_VARIANTS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
  },
} as const;

function resolveDefaultSidebarExpanded(): boolean {
  if (typeof import.meta !== "undefined" && import.meta.env?.MODE === "test") {
    return false;
  }
  return true;
}

/** Application shell coordinating desktop sidebar, header utility bar, skip link, and mobile navigation. */
export function AppShell({
  route,
  onNavigate,
  language,
  theme,
  onToggleTheme,
  onToggleLanguage,
  isOnline = true,
  needRefresh = false,
  onApplyUpdate,
  children,
}: AppShellProps) {
  const [drawerMode, setDrawerMode] = useState<"closed" | "mobile-secondary" | "tablet-all">(
    "closed",
  );
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(resolveDefaultSidebarExpanded);
  const themeCtx = useOptionalThemeContext();
  const uiMode = themeCtx?.uiMode ?? (themeCtx?.uiEnhancer === false ? "biasa" : "enhanced");
  const isEnhanced = uiMode === "enhanced";
  const isAntiSlop = uiMode === "anti-slop";
  const reducedMotionMode =
    isAntiSlop || themeCtx?.motionEngine === "css_native" ? "always" : ("user" as const);

  return (
    <MotionConfig reducedMotion={reducedMotionMode}>
      <div className="relative flex h-dvh w-full overflow-hidden overscroll-none bg-[var(--bg-canvas)] text-[var(--text-primary)]">
        <a href="#main-content" className="skip-link">
          {pickLang(language, "Lompati ke konten utama", "Skip to main content")}
        </a>
        <motion.div
          initial={isAntiSlop ? false : { clipPath: "circle(0% at 32px 32px)" }}
          animate={{ clipPath: "circle(150% at 32px 32px)" }}
          transition={isAntiSlop ? { duration: 0 } : { duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="shell-frame flex h-full w-full min-w-0 overflow-hidden overscroll-none"
        >
          <DesktopSidebar
            route={route}
            onNavigate={onNavigate}
            language={language}
            expanded={sidebarExpanded}
            onToggleExpanded={() => setSidebarExpanded((prev) => !prev)}
            isOnline={isOnline}
          />

          <motion.div
            {...(isAntiSlop ? {} : { variants: SHELL_STAGGER_VARIANTS })}
            initial={isAntiSlop ? false : "hidden"}
            animate="visible"
            className="workspace-canvas relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden overscroll-none"
          >
            <motion.header
              {...(isAntiSlop ? {} : { variants: HEADER_ITEM_VARIANTS })}
              className={cn(
                "safe-area-header landscape-compact-header relative z-20 flex min-h-[50px] shrink-0 items-center justify-between gap-3 lg:min-h-[54px]",
                isEnhanced
                  ? "border-b border-[var(--glass-border-tint,var(--border-subtle))] bg-[var(--glass-table-bg,var(--bg-surface))] text-[var(--text-primary)] backdrop-blur-md"
                  : isAntiSlop
                    ? "border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]"
                    : "border-b border-[var(--shell-chrome-border)] bg-[var(--shell-chrome-bg)] text-[var(--shell-chrome-fg)]",
              )}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setDrawerMode("tablet-all")}
                  aria-label={
                    isAntiSlop
                      ? language === "id"
                        ? "Menu navigasi"
                        : "Navigation menu"
                      : language === "id"
                        ? "Buka menu navigasi"
                        : "Open navigation menu"
                  }
                  className={cn(
                    "hidden cursor-pointer items-center justify-center rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] md:inline-flex lg:hidden",
                    isEnhanced
                      ? "acrylic-control-capsule min-h-9 min-w-9 text-[var(--text-primary)] active:scale-95"
                      : isAntiSlop
                        ? "min-h-11 min-w-11 gap-1.5 border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-sunken)]"
                        : "min-h-9 min-w-9 border-[var(--shell-chrome-border)] bg-[var(--shell-chrome-btn-bg)] text-[var(--shell-chrome-fg)] hover:bg-[var(--shell-chrome-btn-hover)] active:scale-95",
                  )}
                >
                  <Menu className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {isAntiSlop && <span>Menu</span>}
                </button>

                {/* Keep brand node in header DOM across breakpoints; visually hidden on expanded desktop so sidebar holds the brand anchor */}
                <button
                  type="button"
                  onClick={() => onNavigate("formulation")}
                  className={cn(
                    "flex min-w-0 cursor-pointer items-center gap-2 text-left transition-opacity hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] lg:gap-2.5",
                    isAntiSlop
                      ? "min-h-11 rounded-md px-1"
                      : "active:scale-[0.99] motion-reduce:transform-none",
                    sidebarExpanded && "lg:hidden",
                  )}
                >
                  <img
                    src={appLogo}
                    alt="Logo OpenFormu"
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 rounded-[10px] object-cover lg:hidden"
                  />
                  <p className="inline-flex items-baseline gap-0 truncate text-[18px] font-extrabold tracking-tight lg:text-[20px]">
                    <span
                      className={
                        isEnhanced || isAntiSlop
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--shell-chrome-fg)]"
                      }
                    >
                      Open
                    </span>
                    <span
                      className={
                        isEnhanced
                          ? "text-[var(--status-success)]"
                          : isAntiSlop
                            ? "text-[var(--color-primary)]"
                            : "text-[var(--shell-chrome-accent)]"
                      }
                    >
                      Formu
                    </span>
                  </p>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {needRefresh && onApplyUpdate && (
                  <button
                    type="button"
                    onClick={onApplyUpdate}
                    className={cn(
                      "hidden cursor-pointer items-center gap-1 border border-[var(--status-warning-border)] bg-[var(--status-warning-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--status-warning)] transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] sm:inline-flex",
                      isAntiSlop ? "min-h-11 rounded-md" : "rounded-full active:scale-95",
                    )}
                  >
                    <RefreshCw className="h-3 w-3" aria-hidden="true" />
                    <span>{language === "id" ? "Update Tersedia" : "Update Ready"}</span>
                  </button>
                )}

                <div
                  data-header-utility-capsule={
                    isEnhanced ? "acrylic" : isAntiSlop ? "anti-slop" : "chrome"
                  }
                  className={cn(
                    "relative flex items-center gap-1.5 p-1",
                    isEnhanced
                      ? "acrylic-control-capsule rounded-full"
                      : isAntiSlop
                        ? "rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                        : "rounded-full border border-[var(--shell-chrome-border)] bg-[var(--shell-chrome-btn-bg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
                  )}
                >
                  <button
                    type="button"
                    onClick={onToggleLanguage}
                    aria-label={
                      language === "id"
                        ? "Ganti bahasa ke English"
                        : "Switch language to Indonesian"
                    }
                    title={language === "id" ? "Bahasa: Indonesia" : "Language: English"}
                    className={cn(
                      "elastic-size-box inline-flex cursor-pointer items-center justify-center gap-1 text-[11px] font-bold uppercase transition-[transform,background-color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none",
                      isEnhanced
                        ? "h-7 min-w-8 rounded-full px-2 text-[var(--text-primary)] hover:bg-black/5 active:scale-95 dark:hover:bg-white/10"
                        : isAntiSlop
                          ? "min-h-11 min-w-11 rounded-md px-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-sunken)]"
                          : "h-7 min-w-8 rounded-full px-2 text-[var(--shell-chrome-fg)] hover:bg-[var(--shell-chrome-btn-hover)] active:scale-95",
                    )}
                  >
                    <Languages
                      aria-hidden="true"
                      className={cn(
                        "h-3.5 w-3.5",
                        isEnhanced
                          ? "text-[var(--status-success)]"
                          : isAntiSlop
                            ? "text-[var(--color-primary)]"
                            : "text-[var(--shell-chrome-accent)]",
                      )}
                    />
                    <span className="hidden sm:inline">
                      <AnimatedTextSwap text={language.toUpperCase()} />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleTheme}
                    aria-label={
                      theme === "light"
                        ? language === "id"
                          ? "Mode gelap"
                          : "Dark mode"
                        : language === "id"
                          ? "Mode terang"
                          : "Light mode"
                    }
                    title={
                      theme === "light"
                        ? language === "id"
                          ? "Aktifkan mode gelap"
                          : "Enable dark mode"
                        : language === "id"
                          ? "Aktifkan mode terang"
                          : "Enable light mode"
                    }
                    className={cn(
                      "inline-flex cursor-pointer items-center justify-center transition-[transform,background-color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none",
                      isEnhanced
                        ? "h-7 w-7 rounded-full text-[var(--text-primary)] hover:bg-black/5 active:scale-95 dark:hover:bg-white/10"
                        : isAntiSlop
                          ? "min-h-11 min-w-11 rounded-md text-[var(--text-primary)] hover:bg-[var(--bg-sunken)]"
                          : "h-7 w-7 rounded-full text-[var(--shell-chrome-fg)] hover:bg-[var(--shell-chrome-btn-hover)] active:scale-95",
                    )}
                  >
                    {theme === "light" ? (
                      <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Sun
                        className="h-3.5 w-3.5 text-[var(--status-warning)]"
                        aria-hidden="true"
                      />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate("settings")}
                    aria-label={pickLang(language, "Tema & UI Enhancer", "Theme & UI Enhancer")}
                    title={pickLang(
                      language,
                      "Buka Pengaturan Tema & Engine",
                      "Open Theme & Engine Settings",
                    )}
                    className={cn(
                      "hidden cursor-pointer items-center justify-center transition-[transform,background-color,color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] sm:inline-flex",
                      isEnhanced
                        ? "h-7 w-7 rounded-full text-[var(--text-secondary)] hover:bg-black/5 hover:text-[var(--text-primary)] active:scale-95 dark:hover:bg-white/10"
                        : isAntiSlop
                          ? "min-h-11 min-w-11 rounded-md text-[var(--text-primary)] hover:bg-[var(--bg-sunken)]"
                          : "h-7 w-7 rounded-full text-[var(--shell-chrome-fg)]/85 hover:bg-[var(--shell-chrome-btn-hover)] hover:text-[var(--shell-chrome-fg)] active:scale-95",
                    )}
                  >
                    <Palette className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </motion.header>

            <motion.main
              id="main-content"
              tabIndex={-1}
              {...(isAntiSlop ? {} : { variants: MAIN_ITEM_VARIANTS })}
              className={cn(
                "safe-area-main-x min-h-0 min-w-0 flex-1 overflow-x-hidden overscroll-contain focus:outline-none",
                route === "formulation"
                  ? "overflow-hidden"
                  : "workspace-main-scrollbar overflow-y-auto pb-24 md:pb-4 lg:pb-0",
              )}
            >
              {children}
            </motion.main>
          </motion.div>
        </motion.div>

        <MobileBottomNav
          route={route}
          onNavigate={onNavigate}
          onOpenDrawer={() => setDrawerMode("mobile-secondary")}
          language={language}
        />

        <MobileNavDrawer
          open={drawerMode !== "closed"}
          secondaryOnly={drawerMode === "mobile-secondary"}
          onClose={() => setDrawerMode("closed")}
          route={route}
          onNavigate={onNavigate}
          language={language}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onToggleLanguage={onToggleLanguage}
        />
      </div>
    </MotionConfig>
  );
}
