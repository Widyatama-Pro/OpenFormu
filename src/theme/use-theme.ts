import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type {
  MotionEngineMode,
  RenderingEngineMode,
  ResolvedThemeMode,
  ThemeModeSetting,
  ThemePaletteId,
  UiMode,
} from "../types";
import { syncAndroidSystemBars } from "./android-theme-bridge";
import { isThemePaletteId } from "./palettes";
import { syncPwaThemeMeta } from "./pwa-theme-sync";

export const THEME_STORAGE_KEYS = {
  id: "openformu-theme-id",
  mode: "openformu-theme-mode",
  amoled: "openformu-theme-amoled",
  uiMode: "openformu-ui-mode",
  uiEnhancer: "openformu-theme-enhancer",
  renderingEngine: "openformu-engine-mode",
  motionEngine: "openformu-motion-engine",
  glassBlurPx: "openformu-glass-blur-px",
  glowIntensityPct: "openformu-glow-intensity-pct",
} as const;

const LEGACY_STORAGE_KEYS: Readonly<Record<keyof typeof THEME_STORAGE_KEYS, readonly string[]>> = {
  id: ["openformul-theme-id", "app-theme-id"],
  mode: ["openformul-theme-mode", "app-theme-mode"],
  amoled: ["openformul-theme-amoled", "app-theme-amoled"],
  uiMode: ["openformul-ui-mode"],
  uiEnhancer: ["openformul-theme-enhancer"],
  renderingEngine: ["openformul-engine-mode"],
  motionEngine: ["openformul-motion-engine"],
  glassBlurPx: ["openformul-glass-blur-px"],
  glowIntensityPct: ["openformul-glow-intensity-pct"],
};

export function isUiMode(value: string | null): value is UiMode {
  return value === "biasa" || value === "enhanced" || value === "anti-slop";
}

export interface UsePortableThemeOptions {
  readonly storageKeyId?: string;
  readonly storageKeyMode?: string;
  readonly storageKeyAmoled?: string;
  readonly defaultPalette?: ThemePaletteId;
  readonly defaultMode?: ThemeModeSetting;
  readonly defaultAmoled?: boolean;
  readonly defaultUiMode?: UiMode;
  readonly defaultUiEnhancer?: boolean;
  readonly defaultRenderingEngine?: RenderingEngineMode;
  readonly defaultMotionEngine?: MotionEngineMode;
  readonly defaultGlassBlurPx?: number;
  readonly defaultGlowIntensityPct?: number;
  readonly syncPwa?: boolean;
  readonly syncAndroid?: boolean;
}

export interface PortableThemeState {
  readonly paletteId: ThemePaletteId;
  readonly modeSetting: ThemeModeSetting;
  readonly resolvedMode: ResolvedThemeMode;
  readonly amoledPureBlack: boolean;
  readonly uiMode: UiMode;
  readonly uiEnhancer: boolean;
  readonly renderingEngine: RenderingEngineMode;
  readonly motionEngine: MotionEngineMode;
  readonly glassBlurPx: number;
  readonly glowIntensityPct: number;
  readonly setPaletteId: (id: ThemePaletteId) => void;
  readonly setModeSetting: (mode: ThemeModeSetting) => void;
  readonly setAmoledPureBlack: (enabled: boolean) => void;
  readonly setUiMode: (mode: UiMode) => void;
  readonly setUiEnhancer: (enabled: boolean) => void;
  readonly setRenderingEngine: (mode: RenderingEngineMode) => void;
  readonly setMotionEngine: (mode: MotionEngineMode) => void;
  readonly setGlassBlurPx: (px: number) => void;
  readonly setGlowIntensityPct: (pct: number) => void;
  readonly toggleLightDark: () => void;
}

export type ThemeContextValue = PortableThemeState;

function readStoredValue(primaryKey: string, legacyKeys?: readonly string[]): string | null {
  if (typeof window === "undefined") return null;
  try {
    const val = window.localStorage.getItem(primaryKey);
    if (val !== null) return val;
    if (legacyKeys) {
      for (const lk of legacyKeys) {
        const legacyVal = window.localStorage.getItem(lk);
        if (legacyVal !== null) return legacyVal;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function writeStoredValue(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota or private-mode access errors
  }
}

function getSystemDarkPreference(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

function applyThemeToDocument(
  paletteId: ThemePaletteId,
  resolvedMode: ResolvedThemeMode,
  amoledPureBlack: boolean,
  uiMode: UiMode,
  renderingEngine: RenderingEngineMode,
  motionEngine: MotionEngineMode,
  glassBlurPx: number,
  glowIntensityPct: number,
): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const isEnhanced = uiMode === "enhanced";
  root.setAttribute("data-theme", paletteId);
  root.setAttribute("data-mode", resolvedMode);
  root.setAttribute("data-ui-mode", uiMode);
  root.setAttribute("data-ui-enhancer", isEnhanced ? "true" : "false");
  root.setAttribute("data-engine-mode", renderingEngine);
  root.setAttribute("data-motion-engine", motionEngine);
  root.classList.toggle("dark", resolvedMode === "dark");
  if (resolvedMode === "dark" && amoledPureBlack) {
    root.setAttribute("data-amoled", "true");
  } else {
    root.removeAttribute("data-amoled");
  }

  const effectiveBlur =
    !isEnhanced || renderingEngine === "crisp"
      ? 0
      : renderingEngine === "balanced"
        ? Math.min(glassBlurPx, 12)
        : glassBlurPx;
  const effectiveGlowScale = !isEnhanced
    ? 0
    : renderingEngine === "crisp"
      ? Math.min(glowIntensityPct, 35) / 100
      : renderingEngine === "balanced"
        ? (glowIntensityPct * 0.72) / 100
        : glowIntensityPct / 100;

  root.style.setProperty("--ui-blur-px", `${effectiveBlur}px`);
  root.style.setProperty("--ui-glow-scale", effectiveGlowScale.toFixed(2));
}

export function usePortableTheme(options: UsePortableThemeOptions = {}): PortableThemeState {
  const {
    storageKeyId = THEME_STORAGE_KEYS.id,
    storageKeyMode = THEME_STORAGE_KEYS.mode,
    storageKeyAmoled = THEME_STORAGE_KEYS.amoled,
    defaultPalette = "original-default",
    defaultMode = "light",
    defaultAmoled = false,
    defaultUiMode,
    defaultUiEnhancer = true,
    defaultRenderingEngine = "ultra",
    defaultMotionEngine = "gpu_flip",
    defaultGlassBlurPx = 20,
    defaultGlowIntensityPct = 100,
    syncPwa = true,
    syncAndroid = true,
  } = options;

  const [paletteId, setPaletteIdState] = useState<ThemePaletteId>(() => {
    const saved = readStoredValue(storageKeyId, LEGACY_STORAGE_KEYS.id);
    return isThemePaletteId(saved) ? saved : defaultPalette;
  });

  const [modeSetting, setModeSettingState] = useState<ThemeModeSetting>(() => {
    const saved = readStoredValue(storageKeyMode, LEGACY_STORAGE_KEYS.mode);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
    return defaultMode;
  });

  const [amoledPureBlack, setAmoledState] = useState<boolean>(() => {
    const saved = readStoredValue(storageKeyAmoled, LEGACY_STORAGE_KEYS.amoled);
    if (saved === "true") return true;
    if (saved === "false") return false;
    return defaultAmoled;
  });

  const resolvedDefaultUiMode: UiMode =
    defaultUiMode ?? (defaultUiEnhancer === false ? "biasa" : "enhanced");

  const [uiMode, setUiModeState] = useState<UiMode>(() => {
    const savedUiMode = readStoredValue(THEME_STORAGE_KEYS.uiMode, LEGACY_STORAGE_KEYS.uiMode);
    if (isUiMode(savedUiMode)) return savedUiMode;
    const legacyEnhancer = readStoredValue(
      THEME_STORAGE_KEYS.uiEnhancer,
      LEGACY_STORAGE_KEYS.uiEnhancer,
    );
    if (legacyEnhancer === "false") return "biasa";
    if (legacyEnhancer === "true") return "enhanced";
    return resolvedDefaultUiMode;
  });

  const uiEnhancer = uiMode === "enhanced";

  const [renderingEngine, setRenderingEngineState] = useState<RenderingEngineMode>(() => {
    const saved = readStoredValue(
      THEME_STORAGE_KEYS.renderingEngine,
      LEGACY_STORAGE_KEYS.renderingEngine,
    );
    if (saved === "ultra" || saved === "balanced" || saved === "crisp") return saved;
    return defaultRenderingEngine;
  });

  const [motionEngine, setMotionEngineState] = useState<MotionEngineMode>(() => {
    const saved = readStoredValue(
      THEME_STORAGE_KEYS.motionEngine,
      LEGACY_STORAGE_KEYS.motionEngine,
    );
    if (saved === "gpu_flip" || saved === "css_native") return saved;
    return defaultMotionEngine;
  });

  const [glassBlurPx, setGlassBlurPxState] = useState<number>(() => {
    const saved = readStoredValue(THEME_STORAGE_KEYS.glassBlurPx, LEGACY_STORAGE_KEYS.glassBlurPx);
    const parsed = saved !== null ? Number(saved) : Number.NaN;
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 32
      ? Math.round(parsed)
      : defaultGlassBlurPx;
  });

  const [glowIntensityPct, setGlowIntensityPctState] = useState<number>(() => {
    const saved = readStoredValue(
      THEME_STORAGE_KEYS.glowIntensityPct,
      LEGACY_STORAGE_KEYS.glowIntensityPct,
    );
    const parsed = saved !== null ? Number(saved) : Number.NaN;
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 150
      ? Math.round(parsed)
      : defaultGlowIntensityPct;
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(getSystemDarkPreference);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    return undefined;
  }, []);

  const resolvedMode: ResolvedThemeMode = useMemo(() => {
    if (modeSetting === "system") return systemPrefersDark ? "dark" : "light";
    return modeSetting;
  }, [modeSetting, systemPrefersDark]);

  useEffect(() => {
    applyThemeToDocument(
      paletteId,
      resolvedMode,
      amoledPureBlack,
      uiMode,
      renderingEngine,
      motionEngine,
      glassBlurPx,
      glowIntensityPct,
    );

    const raf =
      typeof window !== "undefined" && typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame(() => {
            document.documentElement.classList.add("theme-transition-ready");
          })
        : null;

    const synced = syncPwa
      ? syncPwaThemeMeta({ paletteId, mode: resolvedMode, amoledPureBlack })
      : null;
    if (syncAndroid) {
      void syncAndroidSystemBars({
        paletteId,
        mode: resolvedMode,
        amoledPureBlack,
        uiMode,
        uiEnhancer,
        ...(synced ? { resolvedCanvasHex: synced.canvasHex } : {}),
      });
    }

    return () => {
      if (
        raf !== null &&
        typeof window !== "undefined" &&
        typeof window.cancelAnimationFrame === "function"
      ) {
        window.cancelAnimationFrame(raf);
      }
    };
  }, [
    paletteId,
    resolvedMode,
    amoledPureBlack,
    uiMode,
    uiEnhancer,
    renderingEngine,
    motionEngine,
    glassBlurPx,
    glowIntensityPct,
    syncPwa,
    syncAndroid,
  ]);

  const setPaletteId = useCallback(
    (id: ThemePaletteId) => {
      setPaletteIdState(id);
      writeStoredValue(storageKeyId, id);
    },
    [storageKeyId],
  );

  const setModeSetting = useCallback(
    (mode: ThemeModeSetting) => {
      setModeSettingState(mode);
      writeStoredValue(storageKeyMode, mode);
    },
    [storageKeyMode],
  );

  const setAmoledPureBlack = useCallback(
    (enabled: boolean) => {
      setAmoledState(enabled);
      writeStoredValue(storageKeyAmoled, String(enabled));
    },
    [storageKeyAmoled],
  );

  const setUiMode = useCallback((mode: UiMode) => {
    setUiModeState(mode);
    writeStoredValue(THEME_STORAGE_KEYS.uiMode, mode);
    writeStoredValue(THEME_STORAGE_KEYS.uiEnhancer, mode === "enhanced" ? "true" : "false");
  }, []);

  const setUiEnhancer = useCallback(
    (enabled: boolean) => {
      setUiMode(enabled ? "enhanced" : "biasa");
    },
    [setUiMode],
  );

  const setRenderingEngine = useCallback((mode: RenderingEngineMode) => {
    setRenderingEngineState(mode);
    writeStoredValue(THEME_STORAGE_KEYS.renderingEngine, mode);
    if (mode === "ultra") {
      setGlassBlurPxState(20);
      writeStoredValue(THEME_STORAGE_KEYS.glassBlurPx, "20");
    } else if (mode === "balanced") {
      setGlassBlurPxState(12);
      writeStoredValue(THEME_STORAGE_KEYS.glassBlurPx, "12");
    }
  }, []);

  const setMotionEngine = useCallback((mode: MotionEngineMode) => {
    setMotionEngineState(mode);
    writeStoredValue(THEME_STORAGE_KEYS.motionEngine, mode);
  }, []);

  const setGlassBlurPx = useCallback((px: number) => {
    const clamped = Math.max(0, Math.min(32, Math.round(px)));
    setGlassBlurPxState(clamped);
    writeStoredValue(THEME_STORAGE_KEYS.glassBlurPx, String(clamped));
  }, []);

  const setGlowIntensityPct = useCallback((pct: number) => {
    const clamped = Math.max(0, Math.min(150, Math.round(pct)));
    setGlowIntensityPctState(clamped);
    writeStoredValue(THEME_STORAGE_KEYS.glowIntensityPct, String(clamped));
  }, []);

  const toggleLightDark = useCallback(() => {
    const next: ResolvedThemeMode = resolvedMode === "light" ? "dark" : "light";
    setModeSetting(next);
  }, [resolvedMode, setModeSetting]);

  return {
    paletteId,
    modeSetting,
    resolvedMode,
    amoledPureBlack,
    uiMode,
    uiEnhancer,
    renderingEngine,
    motionEngine,
    glassBlurPx,
    glowIntensityPct,
    setPaletteId,
    setModeSetting,
    setAmoledPureBlack,
    setUiMode,
    setUiEnhancer,
    setRenderingEngine,
    setMotionEngine,
    setGlassBlurPx,
    setGlowIntensityPct,
    toggleLightDark,
  };
}

export const ThemeContext = createContext<PortableThemeState | null>(null);

const FALLBACK_THEME_STATE: PortableThemeState = {
  paletteId: "original-default",
  modeSetting: "light",
  resolvedMode: "light",
  amoledPureBlack: false,
  uiMode: "enhanced",
  uiEnhancer: true,
  renderingEngine: "ultra",
  motionEngine: "gpu_flip",
  glassBlurPx: 20,
  glowIntensityPct: 100,
  setPaletteId: () => {},
  setModeSetting: () => {},
  setAmoledPureBlack: () => {},
  setUiMode: () => {},
  setUiEnhancer: () => {},
  setRenderingEngine: () => {},
  setMotionEngine: () => {},
  setGlassBlurPx: () => {},
  setGlowIntensityPct: () => {},
  toggleLightDark: () => {},
};

/**
 * Mengakses state tema aktif di mana pun dalam komponen.
 * Mengembalikan fallback aman apabila dipanggil di luar <ThemeProvider> (mis. pada unit test terisolasi).
 */
export function useTheme(): PortableThemeState {
  return useContext(ThemeContext) ?? FALLBACK_THEME_STATE;
}

export function useOptionalThemeContext(): PortableThemeState | null {
  return useContext(ThemeContext);
}
