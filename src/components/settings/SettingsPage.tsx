import { memo, useState } from "react";
import {
  AlertTriangle,
  Cpu,
  Database,
  Download,
  ExternalLink,
  Gauge,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  Zap,
} from "lucide-react";
import type { PwaStatus } from "../../hooks/use-pwa-status";
import { pickLang } from "../../i18n";
import type { StorageStats } from "../../storage";
import { useOptionalThemeContext } from "../../theme";
import type {
  Basis,
  FormulationConfig,
  MotionEngineMode,
  RenderingEngineMode,
  TableViewTier,
  UserPreferences,
} from "../../types";
import { cn } from "../../utils/cn";
import { handleExternalLinkClick } from "../../utils/external-link";
import { resolveDisplayDigits } from "../../utils/locale-number";
import { NumericCellInput } from "../formulation/NumericCellInput";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { GlossySquircleIcon } from "../ui/GlossySquircleIcon";
import { SegmentedTabs } from "../ui/SegmentedTabs";
import { Switch } from "../ui/Switch";
import { ThemedSelect } from "../ui/ThemedSelect";
import { TrakteerSupportButton } from "../ui/TrakteerSupportButton";
import { ThemeSwitcherMenu, type ThemeChangePayload } from "./ThemeSwitcherMenu";

export const GITHUB_REPO_URL = "https://github.com/Widyatama-Pro/OpenFormu";
export const GITHUB_RELEASES_URL = "https://github.com/Widyatama-Pro/OpenFormu/releases";

export interface SettingsPageProps {
  readonly preferences: UserPreferences;
  readonly onUpdate: (patch: Partial<UserPreferences>) => void;
  readonly config?: FormulationConfig;
  readonly onToggleAdvance?: (enabled: boolean) => void;
  readonly onToggleShowNdf?: (enabled: boolean) => void;
  readonly onToggleShowBetn?: (enabled: boolean) => void;
  readonly onSetDecimalPlaces?: (decimals: 0 | 1 | 2) => void;
  readonly onSetTableViewTier?: (tier: TableViewTier) => void;
  readonly onSetGlobalZeroInclusion?: (enabled: boolean, minPct?: number) => void;
  readonly onOpenPrecisionDialog?: () => void;
  readonly storageStats?: StorageStats;
  readonly storageWarnings?: readonly string[];
  readonly pwaStatus?: PwaStatus;
  readonly onExportAllBackup?: () => void;
  readonly onResetSampleData?: () => Promise<void> | void;
  readonly onClearAllUserData?: () => Promise<void> | void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

type SettingsSectionTab = "basic" | "advanced";

export const SettingsPage = memo(function SettingsPage({
  preferences,
  onUpdate,
  config,
  onToggleAdvance,
  onToggleShowNdf,
  onToggleShowBetn,
  onSetDecimalPlaces,
  onSetTableViewTier,
  onSetGlobalZeroInclusion,
  onOpenPrecisionDialog,
  storageStats,
  storageWarnings = [],
  pwaStatus,
  onExportAllBackup,
  onResetSampleData,
  onClearAllUserData,
}: SettingsPageProps) {
  const [settingsTab, setSettingsTab] = useState<SettingsSectionTab>("basic");
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"reset" | "clear" | null>(null);
  const themeCtx = useOptionalThemeContext();
  const isAntiSlop = themeCtx?.uiMode === "anti-slop";

  const lang = preferences.language;
  const activeTier: TableViewTier =
    preferences.tableViewTier ?? (config?.enableAdvanceNutrients ? "advanced" : "basic");
  const isAdvanceMode = config ? config.enableAdvanceNutrients : activeTier === "advanced";
  const isNdfEnabled = config ? config.showNdf === true || config.enableAdvanceNutrients : false;
  const isBetnEnabled = config?.showBetn === true;
  const decimalPlaces: 0 | 1 | 2 = preferences.decimalPlaces ?? 0;
  const isNutrientAbbreviated: boolean = preferences.simpleMode ?? true;
  const amoledEnabled = themeCtx?.amoledPureBlack ?? Boolean(preferences.amoledPureBlack);
  const antiNolEnabled = config ? config.globalZeroInclusion.enforceNonZero : true;
  const antiNolMinPct =
    config?.globalZeroInclusion.minIfSelected ?? preferences.zeroInclusionDefaultPct ?? 1;

  const activePrecisionCount = config
    ? (config.fractionalObjective ? 1 : 0) +
      (config.enableStochasticSlp ? 1 : 0) +
      ((config.enzymes?.length ?? 0) > 0 ? 1 : 0)
    : 0;

  const handleSetTier = (tier: TableViewTier) => {
    if (onSetTableViewTier) {
      onSetTableViewTier(tier);
      return;
    }
    const advance = tier === "advanced";
    onUpdate({ tableViewTier: tier });
    onToggleAdvance?.(advance);
  };

  const handleSetDecimalPlaces = (next: 0 | 1 | 2) => {
    if (onSetDecimalPlaces) {
      onSetDecimalPlaces(next);
    } else {
      onUpdate({ decimalPlaces: next });
    }
  };

  const handleToggleAmoled = (checked: boolean) => {
    themeCtx?.setAmoledPureBlack(checked);
    onUpdate({ amoledPureBlack: checked });
  };

  const handleThemeChange = (next: ThemeChangePayload) => {
    onUpdate({
      theme: next.resolvedMode,
      themePalette: next.paletteId,
      themeModeSetting: next.modeSetting,
      amoledPureBlack: next.amoledPureBlack,
      ...(next.uiMode !== undefined ? { uiMode: next.uiMode } : {}),
      ...(next.uiEnhancer !== undefined ? { uiEnhancer: next.uiEnhancer } : {}),
    });
  };

  const activeEngineMode: RenderingEngineMode =
    themeCtx?.renderingEngine ?? preferences.renderingEngine ?? "ultra";
  const activeMotionEngine: MotionEngineMode =
    themeCtx?.motionEngine ?? preferences.motionEngine ?? "gpu_flip";
  const isSmoothEnginePreset = activeEngineMode !== "crisp" && activeMotionEngine === "gpu_flip";

  const handleSelectEnginePreset = (preset: "smooth" | "standard") => {
    if (preset === "smooth") {
      themeCtx?.setRenderingEngine("ultra");
      themeCtx?.setMotionEngine("gpu_flip");
      themeCtx?.setGlassBlurPx(20);
      themeCtx?.setGlowIntensityPct(100);
      onUpdate({
        renderingEngine: "ultra",
        motionEngine: "gpu_flip",
        glassBlurPx: 20,
        glowIntensityPct: 100,
      });
      return;
    }
    themeCtx?.setRenderingEngine("crisp");
    themeCtx?.setMotionEngine("css_native");
    themeCtx?.setGlassBlurPx(0);
    themeCtx?.setGlowIntensityPct(60);
    onUpdate({
      renderingEngine: "crisp",
      motionEngine: "css_native",
      glassBlurPx: 0,
      glowIntensityPct: 60,
    });
  };

  const handleResetSamples = async () => {
    if (!onResetSampleData) return;
    setBusyAction("reset");
    setActionError(null);
    setActionNotice(null);
    try {
      await onResetSampleData();
      setActionNotice(
        pickLang(
          lang,
          "Katalog bahan, standar kebutuhan, dan konfigurasi awal dipulihkan (resep tersimpan Anda tetap aman).",
          "Default feed catalog, requirement standards, and initial config restored (your saved recipes stay safe).",
        ),
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : pickLang(lang, "Gagal mereset data bawaan.", "Failed to reset sample data."),
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleConfirmClearAll = async () => {
    if (!onClearAllUserData) return;
    setBusyAction("clear");
    setActionError(null);
    setActionNotice(null);
    try {
      await onClearAllUserData();
      setConfirmClearOpen(false);
      setActionNotice(
        pickLang(
          lang,
          "Seluruh data lokal dibersihkan dan dikembalikan ke kondisi awal.",
          "All local data cleared and restored to initial defaults.",
        ),
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : pickLang(lang, "Gagal menghapus data lokal.", "Failed to clear local data."),
      );
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-5">
      <div className="flex items-start gap-3.5">
        <GlossySquircleIcon
          tone="petrol"
          size="md"
          icon={<SlidersHorizontal className="h-5 w-5" />}
        />
        <div>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">
            {pickLang(lang, "Pengaturan Aplikasi", "Application Settings")}
          </h1>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {pickLang(
              lang,
              "Terbagi menjadi Pengaturan Dasar (harian) dan Pengaturan Lanjutan (formulasi presisi & data).",
              "Organized into Basic Settings (daily use) and Advanced Settings (precision formulation & data).",
            )}
          </p>
        </div>
      </div>

      <SegmentedTabs
        value={settingsTab}
        onChange={setSettingsTab}
        ariaLabel={pickLang(lang, "Kategori Pengaturan", "Settings Categories")}
        options={[
          {
            value: "basic",
            label: pickLang(lang, "Pengaturan Dasar", "Basic Settings"),
          },
          {
            value: "advanced",
            label: pickLang(lang, "Pengaturan Lanjutan", "Advanced Settings"),
            badge: activePrecisionCount > 0 ? activePrecisionCount : undefined,
          },
        ]}
      />

      {settingsTab === "basic" ? (
        <div className="space-y-5">
          {/* Kartu 1: Preferensi Umum & Tampilan Angka */}
          <Card interactive={false} className="divide-y divide-[var(--border-subtle)]">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {pickLang(lang, "Bahasa Antarmuka", "Interface Language")}
                </p>
                <p className="text-xs text-[var(--text-muted)]">Bahasa Indonesia / English</p>
              </div>
              <div className="w-44">
                <ThemedSelect
                  ariaLabel={pickLang(lang, "Pilih bahasa", "Select language")}
                  modalTitle={pickLang(lang, "Pilih Bahasa Antarmuka", "Select Interface Language")}
                  value={preferences.language}
                  language={lang}
                  popoverMinWidthPx={190}
                  onChange={(val) => onUpdate({ language: val as "id" | "en" })}
                  options={[
                    { value: "id", label: "Bahasa Indonesia" },
                    { value: "en", label: "English" },
                  ]}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div className="max-w-md">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {pickLang(lang, "Desimal Tampilan Angka", "Display Decimal Places")}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {pickLang(
                    lang,
                    "Mengatur tampilan % makro & hasil racikan. Angka mikro (<2%) seperti Ca, P, dan Asam Amino tetap menjaga 2 desimal.",
                    "Controls macro % and formula display decimals. Micro values (<2%) such as Ca, P, and amino acids preserve 2 decimals.",
                  )}
                </p>
              </div>
              <div className="w-56">
                <ThemedSelect
                  ariaLabel={pickLang(lang, "Desimal Tampilan Angka", "Display Decimal Places")}
                  modalTitle={pickLang(lang, "Desimal Tampilan Angka", "Display Decimal Places")}
                  value={String(decimalPlaces)}
                  language={lang}
                  popoverMinWidthPx={260}
                  onChange={(val) => handleSetDecimalPlaces(Number(val) as 0 | 1 | 2)}
                  options={[
                    {
                      value: "0",
                      label: pickLang(
                        lang,
                        "0 desimal (Bulat, contoh 18%)",
                        "0 decimals (Integer, e.g. 18%)",
                      ),
                    },
                    {
                      value: "1",
                      label: pickLang(
                        lang,
                        isAntiSlop
                          ? "1 desimal (xx,0, contoh 18,5%)"
                          : "1 desimal (xx,0 — contoh 18,5%)",
                        isAntiSlop
                          ? "1 decimal (xx.0, e.g. 18.5%)"
                          : "1 decimal (xx.0 — e.g. 18.5%)",
                      ),
                    },
                    {
                      value: "2",
                      label: pickLang(
                        lang,
                        isAntiSlop
                          ? "2 desimal (xx,00, contoh 18,50%)"
                          : "2 desimal (xx,00 — contoh 18,50%)",
                        isAntiSlop
                          ? "2 decimals (xx.00, e.g. 18.50%)"
                          : "2 decimals (xx.00 — e.g. 18.50%)",
                      ),
                    },
                  ]}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div className="max-w-md">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {pickLang(
                      lang,
                      "Singkatan Nama Nutrien (PK, EM, LK, SK)",
                      "Abbreviate Nutrient Names (CP, ME, EE, CF)",
                    )}
                  </p>
                  <Badge tone={isNutrientAbbreviated ? "emerald" : "sky"}>
                    {isNutrientAbbreviated
                      ? pickLang(lang, "Disingkat (Default)", "Abbreviated (Default)")
                      : pickLang(lang, "Nama Lengkap", "Full Names")}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {pickLang(
                    lang,
                    "Aktif (Default): menampilkan singkatan ringkas (PK, EM, LK, SK). Matikan untuk menampilkan nama lengkap (Protein Kasar, Energi Metabolis, Lemak Kasar, Serat Kasar).",
                    "On (Default): displays compact abbreviations (CP, ME, EE, CF). Turn off to show full names (Crude Protein, Metabolizable Energy, Ether Extract, Crude Fiber).",
                  )}
                </p>
              </div>
              <Switch
                checked={isNutrientAbbreviated}
                onCheckedChange={(checked) => onUpdate({ simpleMode: checked })}
                label={pickLang(
                  lang,
                  "Gunakan Singkatan Nama Nutrien (PK, EM, LK, SK)",
                  "Use Abbreviated Nutrient Names (CP, ME, EE, CF)",
                )}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {pickLang(lang, "Basis Perhitungan Default", "Default Calculation Basis")}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {pickLang(
                    lang,
                    "As-Fed (unggas) atau Bahan Kering / BK (ruminansia)",
                    "As-Fed (poultry) or Dry Matter / DM (ruminants)",
                  )}
                </p>
              </div>
              <div className="w-48">
                <ThemedSelect
                  ariaLabel={pickLang(lang, "Basis default", "Default basis")}
                  modalTitle={pickLang(
                    lang,
                    "Basis Perhitungan Default",
                    "Default Calculation Basis",
                  )}
                  value={preferences.defaultBasis}
                  language={lang}
                  popoverMinWidthPx={210}
                  onChange={(val) => onUpdate({ defaultBasis: val as Basis })}
                  options={[
                    { value: "as_fed", label: "As-Fed" },
                    {
                      value: "dry_matter",
                      label: pickLang(lang, "Bahan Kering (BK)", "Dry Matter (DM)"),
                    },
                  ]}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {pickLang(lang, "Ukuran Batch Adukan Default (kg)", "Default Batch Size (kg)")}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {pickLang(
                    lang,
                    "Dipakai otomatis saat memulai formulasi baru",
                    "Applied automatically when starting a new formulation",
                  )}
                </p>
              </div>
              <div className="w-32">
                <NumericCellInput
                  value={preferences.defaultBatchKg}
                  min={1}
                  treatSingleThousandDot
                  fractionDigits={0}
                  fallbackOnEmpty={preferences.defaultBatchKg}
                  commitOnChange
                  ariaLabel={pickLang(
                    lang,
                    "Ukuran Batch Adukan Default (kg)",
                    "Default Batch Size (kg)",
                  )}
                  onCommit={(val) =>
                    onUpdate({ defaultBatchKg: Math.max(1, Math.round(val ?? 100)) })
                  }
                />
              </div>
            </div>
          </Card>

          {/* Kartu 2: Tema, Palet Warna & Mode Tampilan Antarmuka */}
          <Card interactive={false} className="overflow-hidden">
            <ThemeSwitcherMenu
              language={lang}
              showAmoledToggle={false}
              compact
              onThemeChange={handleThemeChange}
            />
          </Card>

          {/* Kartu 3: Performa & Animasi Tampilan (2 Opsi Ringkas) */}
          <Card interactive={false} className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <GlossySquircleIcon tone="mint" size="sm" icon={<Gauge className="h-4 w-4" />} />
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">
                    {pickLang(
                      lang,
                      "Performa & Animasi Tampilan",
                      "Display Animation & Performance",
                    )}
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {pickLang(
                      lang,
                      "Pilih tampilan animasi halus atau mode ringan hemat daya. Arahkan kursor ke opsi untuk detail.",
                      "Choose smooth animated visuals or battery-friendly lightweight rendering. Hover an option for details.",
                    )}
                  </p>
                </div>
              </div>
              <Badge tone="emerald">
                <Zap className="h-3 w-3" />
                <span>
                  {isSmoothEnginePreset ? "Smooth" : pickLang(lang, "Ringan", "Lightweight")}
                </span>
              </Badge>
            </div>

            <div
              role="radiogroup"
              aria-label={pickLang(
                lang,
                "Profil Performa & Animasi Tampilan",
                "Display Performance Profile",
              )}
              className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
            >
              {(
                [
                  {
                    id: "smooth",
                    titleId: "Smooth",
                    titleEn: "Smooth",
                    descId:
                      "Efek kaca akrilik mulus, transisi 120 FPS FLIP Physics anti-hardcut, dan glow penuh (Default PC).",
                    descEn:
                      "Smooth acrylic glass depth, 120 FPS anti-hardcut FLIP motion, and full volumetric glow (PC Default).",
                  },
                  {
                    id: "standard",
                    titleId: "Ringan",
                    titleEn: "Lightweight",
                    descId:
                      "Rendering ringan tanpa shader blur & transisi cepat untuk menghemat baterai atau GPU rendah (Default Android).",
                    descEn:
                      "Lightweight rendering without glass blur and fast transitions for battery saving or optimal Android performance (Android Default).",
                  },
                ] as const
              ).map((profile) => {
                const selected =
                  profile.id === "smooth" ? isSmoothEnginePreset : !isSmoothEnginePreset;
                const tooltipText = pickLang(lang, profile.descId, profile.descEn);
                return (
                  <button
                    key={profile.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-engine-preset={profile.id}
                    title={tooltipText}
                    onClick={() => handleSelectEnginePreset(profile.id)}
                    className={cn(
                      "group relative flex min-h-11 cursor-pointer items-center justify-center border px-4 py-3 text-center transition-[transform,border-color,background-color,box-shadow] duration-150 motion-reduce:transform-none",
                      isAntiSlop
                        ? cn(
                            "rounded-lg",
                            selected
                              ? "border-2 border-[var(--color-primary)] bg-[var(--status-success-soft)]"
                              : "border-[var(--border-strong)] bg-[var(--bg-surface)] hover:border-[var(--color-primary)]",
                          )
                        : cn(
                            "rounded-xl hover:-translate-y-0.5 active:scale-[0.98]",
                            selected
                              ? "border-[var(--status-success)] bg-[var(--status-success-soft)] shadow-[0_6px_18px_-6px_var(--glow-success-pill,rgba(16,185,129,0.28))]"
                              : "acrylic-subcard",
                          ),
                    )}
                  >
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {pickLang(lang, profile.titleId, profile.titleEn)}
                    </span>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] px-2.5 py-2 text-left text-[11px] font-normal leading-snug text-[var(--text-primary)] opacity-0 shadow-[var(--shadow-neu-elevated)] transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100"
                    >
                      {tooltipText}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Kartu 4: Pembaruan Aplikasi & Repositori GitHub */}
          <Card interactive={false} className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <GlossySquircleIcon tone="sky" size="sm" icon={<RefreshCw className="h-4 w-4" />} />
                <div className="max-w-md">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">
                      {pickLang(
                        lang,
                        "Cek Pembaruan Aplikasi & Repositori",
                        "Check App Updates & Repository",
                      )}
                    </h2>
                    <Badge tone="neutral">GitHub Releases</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {pickLang(
                      lang,
                      "Periksa apakah tersedia versi pembaruan (update) terbaru, catatan rilis, dan kode sumber resmi OpenFormu di repositori GitHub.",
                      "Check for the latest application updates, release notes, and official OpenFormu source code on GitHub.",
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {pwaStatus?.needRefresh && pwaStatus.applyUpdate && (
                  <Button variant="primary" size="sm" onClick={pwaStatus.applyUpdate}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>{pickLang(lang, "Pasang Update Sekarang", "Apply Update Now")}</span>
                  </Button>
                )}
                <a
                  href={GITHUB_RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => void handleExternalLinkClick(e, GITHUB_RELEASES_URL)}
                  aria-label={pickLang(
                    lang,
                    "Cek update aplikasi terbaru di repositori GitHub",
                    "Check latest app updates on GitHub repository",
                  )}
                  className={cn(
                    "inline-flex min-h-11 cursor-pointer items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-[transform,filter,background-color] duration-150 md:min-h-8 motion-reduce:transform-none",
                    isAntiSlop
                      ? "rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--text-on-primary)] hover:bg-[var(--color-primary-hover)]"
                      : "neu-cta-btn rounded-xl hover:brightness-105 active:scale-[0.97]",
                  )}
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {pickLang(lang, "Cek Update di Repo GitHub", "Check Updates on GitHub")}
                  </span>
                  <ExternalLink className="h-3 w-3 opacity-85" aria-hidden="true" />
                </a>
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => void handleExternalLinkClick(e, GITHUB_REPO_URL)}
                  className={cn(
                    "inline-flex min-h-11 cursor-pointer items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-transform duration-150 md:min-h-8 motion-reduce:transform-none",
                    isAntiSlop
                      ? "rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] hover:border-[var(--color-primary)] hover:bg-[var(--bg-sunken)]"
                      : "neu-pill-btn rounded-xl active:scale-[0.97]",
                  )}
                >
                  <span>{pickLang(lang, "Buka Repo", "Open Repo")}</span>
                  <ExternalLink className="h-3 w-3 text-[var(--text-muted)]" aria-hidden="true" />
                </a>
              </div>
            </div>
          </Card>

          {/* Kartu 5: Dukungan Kreator via Trakteer & Tentang Aplikasi */}
          <TrakteerSupportButton variant="settings" language={lang} />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Kartu 3: Mode Formulasi & Opsi Lanjutan */}
          <Card interactive={false} className="divide-y divide-[var(--border-subtle)]">
            <div className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="max-w-md">
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {pickLang(
                      lang,
                      "Tier Kolom & Mode Formulasi",
                      "Column Tier & Formulation Mode",
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {pickLang(
                      lang,
                      "Dasar menyembunyikan BK & batas Min/Max agar ringkas; Standar menampilkan BK/Min/Max/Ca/P; Mode Lanjutan membuka asam amino, NDF, dan elektrolit.",
                      "Basic hides DM & Min/Max for a clean grid; Standard shows DM/Min/Max/Ca/P; Advanced Mode opens amino acids, NDF, and electrolytes.",
                    )}
                  </p>
                </div>
                <div
                  role="group"
                  aria-label={pickLang(
                    lang,
                    "Pilih Tier Kolom Dasar, Standar, atau Mode Lanjutan",
                    "Select Basic, Standard, or Advanced Column Tier",
                  )}
                  className="neu-pressed inline-flex rounded-lg p-0.5"
                >
                  {(
                    [
                      { id: "basic", idLabel: "Dasar", enLabel: "Basic" },
                      { id: "standard", idLabel: "Standar", enLabel: "Standard" },
                      { id: "advanced", idLabel: "Mode Lanjutan", enLabel: "Advanced Mode" },
                    ] as const
                  ).map((tier) => {
                    const selected = activeTier === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => handleSetTier(tier.id)}
                        className={cn(
                          "min-h-11 cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-[transform,background-color,color] duration-150 md:min-h-8 motion-reduce:transform-none",
                          !isAntiSlop && "active:scale-[0.97]",
                          selected
                            ? tier.id === "advanced"
                              ? "bg-[var(--color-primary)] text-[var(--text-on-primary)] shadow-[var(--shadow-neu-flat)]"
                              : "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-neu-flat)]"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                        )}
                      >
                        {pickLang(lang, tier.idLabel, tier.enLabel)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div className="max-w-md">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {pickLang(lang, "Tampilkan Parameter BETN", "Show NFE (BETN) Parameter")}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {pickLang(
                    lang,
                    "Menampilkan kolom dan evaluasi Bahan Ekstrak Tanpa Nitrogen (BETN) hasil hitungan analisis proksimat.",
                    "Displays calculated Nitrogen-Free Extract (NFE/BETN) from proximate nutrient fractions.",
                  )}
                </p>
              </div>
              <Switch
                checked={isBetnEnabled}
                onCheckedChange={(checked) => onToggleShowBetn?.(checked)}
                label={pickLang(lang, "Tampilkan Parameter BETN", "Show NFE Parameter")}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div className="max-w-md">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {pickLang(lang, "Tampilkan Parameter NDF & ADF", "Show NDF & ADF Parameters")}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {pickLang(
                    lang,
                    "Aktifkan kolom & target serat detergen (NDF/ADF) untuk formulasi sapi perah, sapi potong, dan domba tanpa harus membuka seluruh kolom asam amino.",
                    "Enable NDF/ADF fiber columns and targets for ruminant diets without exposing all amino acid columns.",
                  )}
                </p>
              </div>
              <Switch
                checked={isNdfEnabled}
                onCheckedChange={(checked) => onToggleShowNdf?.(checked)}
                disabled={isAdvanceMode}
                label={pickLang(
                  lang,
                  "Tampilkan Parameter NDF dan ADF",
                  "Show NDF and ADF Parameters",
                )}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div className="max-w-md">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {pickLang(lang, "Aturan Anti-Nol Otomatis", "Automatic Anti-Zero Rule")}
                  </p>
                  <Badge tone={antiNolEnabled ? "emerald" : "neutral"}>
                    {antiNolEnabled
                      ? pickLang(lang, "Aktif Otomatis", "Auto Active")
                      : pickLang(lang, "Nonaktif", "Off")}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {pickLang(
                    lang,
                    "Menjaga agar bahan makro yang Anda masukkan ke daftar pakan digunakan tidak otomatis menjadi 0%. Bahan mikro (mineral/premix/aditif) tetap aman mengikuti kebutuhan.",
                    "Keeps active macro ingredients from dropping to 0%. Micro-ingredients (minerals/premixes/additives) stay safely unconstrained.",
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    {pickLang(lang, "Min %", "Min %")}
                  </span>
                  <div className="w-20">
                    <NumericCellInput
                      min={0.001}
                      max={25}
                      fractionDigits={resolveDisplayDigits(
                        "%",
                        "min",
                        preferences.decimalPlaces ?? 0,
                        antiNolMinPct,
                      )}
                      fallbackOnEmpty={antiNolMinPct}
                      commitOnChange
                      disabled={!antiNolEnabled}
                      ariaLabel={pickLang(
                        lang,
                        "Persentase minimum Anti-Nol",
                        "Anti-Zero minimum percentage",
                      )}
                      value={antiNolMinPct}
                      onCommit={(rawVal) => {
                        const val = Math.max(0.001, Math.min(25, rawVal ?? 1));
                        onUpdate({ zeroInclusionDefaultPct: val });
                        onSetGlobalZeroInclusion?.(antiNolEnabled, val);
                      }}
                    />
                  </div>
                </div>
                <Switch
                  checked={antiNolEnabled}
                  onCheckedChange={(checked) => onSetGlobalZeroInclusion?.(checked, antiNolMinPct)}
                  label={pickLang(
                    lang,
                    "Aktifkan Aturan Anti-Nol Otomatis",
                    "Enable Automatic Anti-Zero Rule",
                  )}
                />
              </div>
            </div>

            {onOpenPrecisionDialog && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                <div className="max-w-md">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {pickLang(
                        lang,
                        "Opsi Presisi LP (Lanjutan)",
                        "Precision LP Options (Advanced)",
                      )}
                    </p>
                    {activePrecisionCount > 0 && (
                      <Badge tone="emerald">
                        {activePrecisionCount} {pickLang(lang, "aktif", "active")}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {pickLang(
                      lang,
                      "Konfigurasi tingkat lanjut untuk optimasi biaya per energi/nutrien, margin keamanan stokastik, dan matriks multi-enzim.",
                      "Advanced settings for cost-per-nutrient optimization, stochastic safety margins, and multi-enzyme matrices.",
                    )}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={onOpenPrecisionDialog}>
                  <Cpu className="h-3.5 w-3.5 text-[var(--status-info)]" />
                  <span>{pickLang(lang, "Atur Presisi LP", "Configure Precision LP")}</span>
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div className="flex max-w-md items-start gap-2.5">
                <Smartphone
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    isAntiSlop ? "text-[var(--text-secondary)]" : "text-[var(--color-secondary)]",
                  )}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {pickLang(
                      lang,
                      "Android OLED Hitam Pekat (#000000)",
                      "Android OLED Pure Black (#000000)",
                    )}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {pickLang(
                      lang,
                      "Menghemat baterai & mencegah color banding di layar AMOLED saat Mode Gelap aktif.",
                      "Eliminates dark grey power draw & color banding on AMOLED screens when Dark mode is active.",
                    )}
                  </p>
                </div>
              </div>
              <Switch
                checked={amoledEnabled}
                onCheckedChange={handleToggleAmoled}
                data-theme-control="amoled"
                label={pickLang(
                  lang,
                  "Aktifkan Android OLED Hitam Pekat",
                  "Enable Android OLED Pure Black",
                )}
              />
            </div>
          </Card>

          {/* Kartu 4: Penyimpanan Data Lokal */}
          {storageStats && (
            <Card interactive={false} className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <GlossySquircleIcon
                    tone="sky"
                    size="sm"
                    icon={<Database className="h-4 w-4" />}
                  />
                  <div>
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">
                      {pickLang(lang, "Penyimpanan Data Lokal", "Local Data Storage")}
                    </h2>
                    <p className="text-xs text-[var(--text-muted)]">
                      {pickLang(
                        lang,
                        "Seluruh bahan, harga kustom, target nutrien, dan resep disimpan langsung di perangkat Anda tanpa internet.",
                        "All ingredients, custom prices, targets, and recipes stay saved locally on your device.",
                      )}
                    </p>
                  </div>
                </div>

                <Badge tone={storageStats.storageMode === "indexeddb" ? "emerald" : "amber"}>
                  {storageStats.storageMode === "indexeddb"
                    ? pickLang(lang, "Penyimpanan Lokal Aktif", "Local Storage Active")
                    : pickLang(lang, "Mode Memori", "Memory Mode")}
                </Badge>
              </div>

              <div className="neu-well grid grid-cols-2 gap-2.5 rounded-2xl p-3 text-xs tabular-nums sm:grid-cols-4">
                <div>
                  <span className="block text-[10px] font-medium text-[var(--text-muted)]">
                    {pickLang(lang, "Katalog Bahan", "Feed Catalog")}
                  </span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {storageStats.ingredientCount} {pickLang(lang, "bahan", "feeds")}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-medium text-[var(--text-muted)]">
                    {pickLang(lang, "Standar Kebutuhan", "Standards")}
                  </span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {storageStats.requirementCount} {pickLang(lang, "profil", "profiles")}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-medium text-[var(--text-muted)]">
                    {pickLang(lang, "Resep Tersimpan", "Saved Recipes")}
                  </span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {storageStats.recipeCount} {pickLang(lang, "resep", "recipes")}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-medium text-[var(--text-muted)]">
                    {pickLang(lang, "Estimasi Ukuran", "Est. Size")}
                  </span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {formatBytes(storageStats.estimatedBytes)}
                  </span>
                </div>
              </div>

              {storageWarnings.length > 0 && (
                <div
                  className={cn(
                    "border border-[var(--status-warning-border)] bg-[var(--status-warning-soft)] p-3 text-xs text-[var(--text-primary)]",
                    isAntiSlop ? "rounded-lg" : "rounded-2xl",
                  )}
                >
                  {storageWarnings.map((w) => (
                    <p key={w}>{w}</p>
                  ))}
                </div>
              )}

              {actionNotice && (
                <div
                  role="status"
                  className={cn(
                    "border border-[var(--status-success-border)] bg-[var(--status-success-soft)] p-3 text-xs font-medium text-[var(--text-primary)]",
                    isAntiSlop ? "rounded-lg" : "rounded-2xl",
                  )}
                >
                  {actionNotice}
                </div>
              )}

              {actionError && (
                <div
                  role="alert"
                  className={cn(
                    "border border-[var(--status-danger-border)] bg-[var(--status-danger-soft)] p-3 text-xs font-medium text-[var(--status-danger)]",
                    isAntiSlop ? "rounded-lg" : "rounded-2xl",
                  )}
                >
                  {actionError}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {onExportAllBackup && (
                  <Button variant="secondary" size="sm" onClick={onExportAllBackup}>
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{pickLang(lang, "Unduh Cadangan Data", "Download Backup")}</span>
                  </Button>
                )}

                {onResetSampleData && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busyAction !== null}
                    onClick={() => void handleResetSamples()}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {busyAction === "reset"
                        ? pickLang(lang, "Mereset...", "Resetting...")
                        : pickLang(lang, "Reset Data Bawaan", "Reset Sample Data")}
                    </span>
                  </Button>
                )}

                {onClearAllUserData && !confirmClearOpen && (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busyAction !== null}
                    onClick={() => setConfirmClearOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{pickLang(lang, "Hapus Semua Data Lokal", "Clear All Local Data")}</span>
                  </Button>
                )}
              </div>

              {confirmClearOpen && onClearAllUserData && (
                <div
                  role="alert"
                  className={cn(
                    "border border-[var(--status-danger-border)] bg-[var(--status-danger-soft)] p-3.5 text-xs text-[var(--text-primary)]",
                    isAntiSlop ? "rounded-lg" : "rounded-2xl",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-danger)]"
                      aria-hidden="true"
                    />
                    <div className="flex-1 space-y-2">
                      <p className="font-bold">
                        {pickLang(
                          lang,
                          "Hapus seluruh data lokal (termasuk resep tersimpan dan harga kustom)?",
                          "Clear all local data (including saved recipes and custom prices)?",
                        )}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        {pickLang(
                          lang,
                          "Tindakan ini mengosongkan penyimpanan lokal dan memulihkan dataset awal.",
                          "This clears local storage and restores the initial factory dataset.",
                        )}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={busyAction !== null}
                          onClick={() => void handleConfirmClearAll()}
                        >
                          {busyAction === "clear"
                            ? pickLang(lang, "Menghapus...", "Clearing...")
                            : pickLang(
                                lang,
                                "Konfirmasi Hapus Permanen",
                                "Confirm Permanent Delete",
                              )}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busyAction !== null}
                          onClick={() => setConfirmClearOpen(false)}
                        >
                          {pickLang(lang, "Batal", "Cancel")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
});
