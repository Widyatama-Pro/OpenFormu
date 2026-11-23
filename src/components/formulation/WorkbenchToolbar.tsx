import { memo, useMemo, useState } from "react";
import {
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  Download,
  RotateCcw,
} from "lucide-react";
import { motion } from "motion/react";
import { getFormulationStatusLabel, pickLang } from "../../i18n";
import { useOptionalThemeContext } from "../../theme";
import type {
  AppLanguage,
  Basis,
  FormulationConfig,
  FormulationResult,
  OptimizationMode,
  Requirement,
} from "../../types";
import {
  computeDynamicBeefRequirement,
  computeDynamicDairyRequirement,
  type BeefPhysiologicalState,
  type DairyStandard,
} from "../../utils/cattle-requirements";
import { cn } from "../../utils/cn";
import { formatCurrencyIdr, formatNumberLocale } from "../../utils/locale-number";
import type { CommodityGroup } from "../../utils/species";
import { AnimatedTextSwap } from "../ui/AnimatedText";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Switch } from "../ui/Switch";
import { ThemedSelect, type ThemedSelectOption } from "../ui/ThemedSelect";
import { NumericCellInput } from "./NumericCellInput";
import { OptimizationModeSelector } from "./OptimizationModeSelector";

export interface WorkbenchToolbarProps {
  readonly requirements: readonly Requirement[];
  readonly activeRequirement: Requirement;
  readonly config: FormulationConfig;
  readonly result: FormulationResult;
  readonly language: AppLanguage;
  readonly inspectorOpen: boolean;
  readonly mobileCollapsed?: boolean;
  readonly onToggleMobileCollapsed?: () => void;
  readonly onToggleInspector: () => void;
  readonly onSelectPreset: (id: string) => void;
  readonly onApplyDynamicRequirement: (req: Requirement) => void;
  readonly onSetBasis: (basis: Basis) => void;
  readonly onSetMode: (mode: OptimizationMode) => void;
  readonly onToggleElastic: (enabled: boolean) => void;
  readonly onOpenSaveDialog: () => void;
  readonly onOpenExportDialog: () => void;
  readonly onResetMock: () => void;
}

interface OtherRequirementGroups {
  readonly poultryOther: readonly Requirement[];
  readonly goatSheep: readonly Requirement[];
  readonly concentrateSni: readonly Requirement[];
  readonly staticCattle: readonly Requirement[];
  readonly custom: readonly Requirement[];
}

function resolveInitialCommodity(req: Requirement): CommodityGroup {
  if (req.id === "dynamic-beef") return "cattle_beef";
  if (req.id === "dynamic-dairy") return "cattle_dairy";
  if (req.species === "broiler") return "broiler";
  if (req.species === "layer") return "layer";
  return "other";
}

function groupOtherRequirements(requirements: readonly Requirement[]): OtherRequirementGroups {
  const poultryOther: Requirement[] = [];
  const goatSheep: Requirement[] = [];
  const concentrateSni: Requirement[] = [];
  const staticCattle: Requirement[] = [];
  const custom: Requirement[] = [];

  for (const req of requirements) {
    if (req.species === "broiler" || req.species === "layer") continue;
    if (req.species === "buras" || req.species === "duck") {
      poultryOther.push(req);
    } else if (req.species === "sheep" || req.species === "goat" || req.species === "goat_sheep") {
      goatSheep.push(req);
    } else if (req.id.startsWith("sni-3148")) {
      concentrateSni.push(req);
    } else if (
      req.id === "beef-fattening" ||
      req.id.startsWith("kearl") ||
      req.id.startsWith("nrc88-")
    ) {
      staticCattle.push(req);
    } else {
      custom.push(req);
    }
  }

  return { poultryOther, goatSheep, concentrateSni, staticCattle, custom };
}

/**
 * Pendaran gelombang kaca (Ambient Glassmorphism Refraction) di pojok kanan atas header
 * memudar halus ke latar belakang dengan masking gradien dan tint warna palet aktif.
 */
function HeroAmbientGlassBackdrop() {
  return (
    <div
      aria-hidden="true"
      data-hero-glass="true"
      className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-[440px] overflow-hidden select-none lg:block"
      style={{
        maskImage:
          "linear-gradient(to left, rgba(0,0,0,0.92) 10%, rgba(0,0,0,0.48) 56%, transparent 96%)",
        WebkitMaskImage:
          "linear-gradient(to left, rgba(0,0,0,0.92) 10%, rgba(0,0,0,0.48) 56%, transparent 96%)",
      }}
    >
      <svg
        viewBox="0 0 440 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full object-cover"
      >
        <defs>
          <radialGradient id="heroAura" cx="76%" cy="24%" r="72%">
            <stop offset="0%" stopColor="var(--hero-tint-secondary, #10b981)" stopOpacity="0.34" />
            <stop offset="60%" stopColor="var(--hero-tint-primary, #14533e)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--hero-tint-primary, #14533e)" stopOpacity="0" />
          </radialGradient>
          <linearGradient
            id="heroWave1"
            x1="0"
            y1="52"
            x2="440"
            y2="140"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="var(--hero-tint-secondary, #10b981)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--hero-tint-primary, #14533e)" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient
            id="heroGlassSpecular"
            x1="120"
            y1="14"
            x2="420"
            y2="118"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="55%" stopColor="var(--hero-tint-secondary, #10b981)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <rect width="440" height="140" fill="url(#heroAura)" />
        {/* Lapisan gelombang kaca organik 1 */}
        <path
          d="M0 96C82 68 164 114 252 82C326 56 382 36 440 52V140H0V96Z"
          fill="url(#heroWave1)"
        />
        {/* Lapisan gelombang kaca organik 2 */}
        <path
          d="M36 116C128 84 222 126 322 88C376 68 412 72 440 82V140H36V116Z"
          fill="var(--hero-tint-primary, #14533e)"
          fillOpacity="0.1"
        />
        {/* Kapsul & prisma bias kaca akrilik murni (tanpa siluet hewan) */}
        <circle
          cx="346"
          cy="34"
          r="54"
          fill="url(#heroGlassSpecular)"
          stroke="white"
          strokeOpacity="0.18"
          strokeWidth="1"
        />
        <circle
          cx="268"
          cy="76"
          r="38"
          fill="url(#heroGlassSpecular)"
          stroke="white"
          strokeOpacity="0.14"
          strokeWidth="1"
        />
        <path
          d="M140 84C212 52 288 94 374 48C402 33 424 34 440 40"
          stroke="url(#heroGlassSpecular)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/**
 * Toolbar & KPI strip ringkas untuk Workbench Formulasi (Desktop & Mobile Collapsible):
 * - Header bertingkat dengan garis aksen vertikal bercahaya & efek kaca ambient kanan atas
 * - Kapsul kontrol acrylic glass untuk Standar Ternak, As-Fed/BK, Mode, dan KPI Biaya
 */
export const WorkbenchToolbar = memo(function WorkbenchToolbar({
  requirements,
  activeRequirement,
  config,
  result,
  language,
  inspectorOpen,
  mobileCollapsed = false,
  onToggleMobileCollapsed,
  onToggleInspector,
  onSelectPreset,
  onApplyDynamicRequirement,
  onSetBasis,
  onSetMode,
  onToggleElastic,
  onOpenSaveDialog,
  onOpenExportDialog,
  onResetMock,
}: WorkbenchToolbarProps) {
  const themeCtx = useOptionalThemeContext();
  const isAntiSlop = themeCtx?.uiMode === "anti-slop";
  const uiEnhancer = themeCtx?.uiEnhancer ?? true;
  const useGpuFlip = !isAntiSlop && (themeCtx?.motionEngine ?? "gpu_flip") === "gpu_flip";
  const [prevActiveReq, setPrevActiveReq] = useState<Requirement>(activeRequirement);
  const [commodity, setCommodity] = useState<CommodityGroup>(() =>
    resolveInitialCommodity(activeRequirement),
  );
  if (activeRequirement !== prevActiveReq) {
    setPrevActiveReq(activeRequirement);
    setCommodity(resolveInitialCommodity(activeRequirement));
  }

  // Sapi Potong dynamic state
  const [beefState, setBeefState] = useState<BeefPhysiologicalState>("growth");
  const [beefBw, setBeefBw] = useState<number>(300);
  const [beefAdg, setBeefAdg] = useState<number>(0.8);

  // Sapi Perah dynamic state
  const [dairyBw, setDairyBw] = useState<number>(450);
  const [dairyMilk, setDairyMilk] = useState<number>(15);
  const [dairyFat, setDairyFat] = useState<number>(3.8);
  const [dairyStandard, setDairyStandard] = useState<DairyStandard>("kearl_1982");
  const [dairyDry, setDairyDry] = useState<boolean>(false);

  const broilerReqs = useMemo(
    () => requirements.filter((r) => r.species === "broiler"),
    [requirements],
  );
  const layerReqs = useMemo(
    () => requirements.filter((r) => r.species === "layer"),
    [requirements],
  );
  const otherGroups = useMemo(() => groupOtherRequirements(requirements), [requirements]);

  const commodityOptions = useMemo<readonly ThemedSelectOption[]>(
    () => [
      { value: "broiler", label: pickLang(language, "Ayam Pedaging", "Broiler") },
      { value: "layer", label: pickLang(language, "Ayam Petelur", "Layer") },
      { value: "cattle_beef", label: pickLang(language, "Sapi Potong", "Beef Cattle") },
      { value: "cattle_dairy", label: pickLang(language, "Sapi Perah", "Dairy Cattle") },
      { value: "other", label: pickLang(language, "Lainnya…", "Others…") },
    ],
    [language],
  );

  const broilerOptions = useMemo<readonly ThemedSelectOption[]>(
    () =>
      broilerReqs.map((req) => ({
        value: req.id,
        label: language === "id" ? req.name : (req.nameEn ?? req.name),
        group: pickLang(language, "Standar Ayam Pedaging (SNI / NRC)", "Broiler Standards"),
      })),
    [broilerReqs, language],
  );

  const layerOptions = useMemo<readonly ThemedSelectOption[]>(
    () =>
      layerReqs.map((req) => ({
        value: req.id,
        label: language === "id" ? req.name : (req.nameEn ?? req.name),
        group: pickLang(language, "Standar Ayam Petelur (SNI / NRC)", "Layer Standards"),
      })),
    [layerReqs, language],
  );

  const otherPresetOptions = useMemo<readonly ThemedSelectOption[]>(() => {
    const list: ThemedSelectOption[] = [];
    const pushGroup = (groupLabel: string, items: readonly Requirement[]) => {
      for (const req of items) {
        list.push({
          value: req.id,
          label: language === "id" ? req.name : (req.nameEn ?? req.name),
          group: groupLabel,
        });
      }
    };
    if (otherGroups.custom.length > 0) {
      pushGroup(
        pickLang(language, "Profil Kustom Anda", "Your Custom Profiles"),
        otherGroups.custom,
      );
    }
    if (otherGroups.poultryOther.length > 0) {
      pushGroup(
        pickLang(language, "Unggas Lain (Buras & Itik SNI)", "Native & Duck (SNI)"),
        otherGroups.poultryOther,
      );
    }
    if (otherGroups.goatSheep.length > 0) {
      pushGroup(
        pickLang(language, "Kambing & Domba (SNI / Kearl)", "Goat & Sheep"),
        otherGroups.goatSheep,
      );
    }
    if (otherGroups.concentrateSni.length > 0) {
      pushGroup(
        pickLang(language, "Konsentrat Sapi (SNI 3148)", "Concentrate SNI"),
        otherGroups.concentrateSni,
      );
    }
    if (otherGroups.staticCattle.length > 0) {
      pushGroup(
        pickLang(
          language,
          "Tabel Statis Lengkap (Kearl 1982 / NRC 1988)",
          "Full Static Tables (Kearl / NRC)",
        ),
        otherGroups.staticCattle,
      );
    }
    return list;
  }, [otherGroups, language]);

  const beefStateOptions = useMemo<readonly ThemedSelectOption[]>(
    () => [
      { value: "growth", label: pickLang(language, "Tumbuh / Gemuk", "Grow / Finish") },
      {
        value: "gestation_heifer",
        label: pickLang(language, "Dara Bunting 3 Bln", "Pregnant Heifer"),
      },
      {
        value: "gestation_cow",
        label: pickLang(language, "Induk Bunting 3 Bln", "Pregnant Cow"),
      },
      {
        value: "work_moderate",
        label: pickLang(language, "Kerja Sedang (4j)", "Moderate Work"),
      },
      { value: "work_heavy", label: pickLang(language, "Kerja Berat (8j)", "Heavy Work") },
    ],
    [language],
  );

  const beefPreview = useMemo(
    () =>
      computeDynamicBeefRequirement({
        bodyWeightKg: beefBw,
        adgKgPerDay: beefAdg,
        physiologicalState: beefState,
      }),
    [beefBw, beefAdg, beefState],
  );

  const dairyPreview = useMemo(
    () =>
      computeDynamicDairyRequirement({
        bodyWeightKg: dairyBw,
        milkKgPerDay: dairyMilk,
        fatPct: dairyFat,
        standard: dairyStandard,
        isDryPregnant: dairyDry,
      }),
    [dairyBw, dairyMilk, dairyFat, dairyStandard, dairyDry],
  );

  const handleCommodityChange = (next: CommodityGroup) => {
    setCommodity(next);
    if (next === "broiler") {
      const target = broilerReqs.find((r) => r.id === activeRequirement.id) ?? broilerReqs[0];
      if (target) onSelectPreset(target.id);
    } else if (next === "layer") {
      const target = layerReqs.find((r) => r.id === activeRequirement.id) ?? layerReqs[0];
      if (target) onSelectPreset(target.id);
    } else if (next === "cattle_beef") {
      onApplyDynamicRequirement(beefPreview.requirement);
    } else if (next === "cattle_dairy") {
      onApplyDynamicRequirement(dairyPreview.requirement);
    } else {
      const fallback =
        otherGroups.poultryOther[0] ??
        otherGroups.concentrateSni[0] ??
        otherGroups.goatSheep[0] ??
        otherGroups.staticCattle[0] ??
        otherGroups.custom[0];
      if (fallback) onSelectPreset(fallback.id);
    }
  };

  const applyBeefUpdate = (nextBw: number, nextAdg: number, nextState: BeefPhysiologicalState) => {
    setBeefBw(nextBw);
    setBeefAdg(nextAdg);
    setBeefState(nextState);
    const computed = computeDynamicBeefRequirement({
      bodyWeightKg: nextBw,
      adgKgPerDay: nextAdg,
      physiologicalState: nextState,
    });
    onApplyDynamicRequirement(computed.requirement);
  };

  const applyDairyUpdate = (
    nextBw: number,
    nextMilk: number,
    nextFat: number,
    nextStd: DairyStandard,
    nextDry: boolean,
  ) => {
    setDairyBw(nextBw);
    setDairyMilk(nextMilk);
    setDairyFat(nextFat);
    setDairyStandard(nextStd);
    setDairyDry(nextDry);
    const computed = computeDynamicDairyRequirement({
      bodyWeightKg: nextBw,
      milkKgPerDay: nextMilk,
      fatPct: nextFat,
      standard: nextStd,
      isDryPregnant: nextDry,
    });
    onApplyDynamicRequirement(computed.requirement);
  };

  const statusBadge =
    result.status === "optimal" ? (
      <Badge tone="emerald">{getFormulationStatusLabel(language, "optimal")}</Badge>
    ) : result.status === "near_feasible" ? (
      <Badge tone="amber">{getFormulationStatusLabel(language, "near_feasible")}</Badge>
    ) : (
      <Badge tone="rose">{getFormulationStatusLabel(language, result.status)}</Badge>
    );

  return (
    <section
      aria-label={pickLang(language, "Kontrol utama formulasi", "Main formulation controls")}
      className={cn(
        "landscape-compact-toolbar relative flex shrink-0 flex-col justify-center gap-2 overflow-hidden px-3 py-2.5 lg:gap-2.5 lg:px-5 lg:py-3",
        uiEnhancer
          ? "border-b border-[var(--glass-border-tint,var(--border-subtle))] bg-[var(--glass-table-bg,var(--bg-surface))] backdrop-blur-md"
          : "border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]",
      )}
    >
      {uiEnhancer && <HeroAmbientGlassBackdrop />}

      <div className="relative z-10 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 lg:contents">
          <div className="flex shrink-0 items-center gap-2 lg:order-1">
            {!isAntiSlop && (
              <span
                aria-hidden="true"
                className="h-6 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-[var(--status-success)] via-[var(--color-accent)] to-[var(--color-primary)] shadow-[0_0_12px_var(--glow-primary-soft,rgba(16,185,129,0.4))] lg:h-7"
              />
            )}
            <h1 className="whitespace-nowrap text-[14px] font-extrabold tracking-tight text-[var(--text-primary)] sm:text-base lg:text-[20px] lg:leading-tight">
              <span aria-hidden="true" className="sm:hidden">
                <AnimatedTextSwap text={pickLang(language, "Formulasi", "Ration")} />
              </span>
              <span className="sr-only sm:not-sr-only">
                <AnimatedTextSwap
                  text={pickLang(language, "Formulasi Ransum", "Ration Formulation")}
                />
              </span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 lg:order-3 lg:ml-auto lg:flex-nowrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenExportDialog}
              className={cn(
                "min-h-11 gap-1 px-2 text-[11px] sm:gap-1.5 sm:px-2.5 lg:min-h-8 lg:px-3",
                !isAntiSlop && "acrylic-control-capsule rounded-xl",
              )}
            >
              <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">
                <AnimatedTextSwap text={pickLang(language, "Ekspor PDF", "Export PDF")} />
              </span>
              <span className="sm:hidden">PDF</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenSaveDialog}
              className={cn(
                "min-h-11 gap-1 px-2 text-[11px] sm:gap-1.5 sm:px-2.5 lg:min-h-8 lg:px-3",
                !isAntiSlop && "acrylic-control-capsule rounded-xl",
              )}
            >
              <BookmarkPlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                <AnimatedTextSwap text={pickLang(language, "Simpan", "Save")} />
              </span>
            </Button>
            <Button
              variant={isAntiSlop ? "secondary" : "ghost"}
              size="sm"
              onClick={onResetMock}
              aria-label={pickLang(language, "Reset data prototipe", "Reset sample data")}
              title={pickLang(language, "Reset ke data awal", "Reset to initial data")}
              className={cn(
                "min-h-11 w-11 px-0 lg:min-h-8 lg:w-8",
                !isAntiSlop && "acrylic-control-capsule rounded-xl",
              )}
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </Button>

            {onToggleMobileCollapsed && (
              <span className="inline-flex lg:hidden">
                <Button
                  variant={isAntiSlop ? "secondary" : "ghost"}
                  size="sm"
                  onClick={onToggleMobileCollapsed}
                  aria-expanded={!mobileCollapsed}
                  aria-label={
                    mobileCollapsed
                      ? pickLang(
                          language,
                          "Buka pengaturan standar ternak",
                          "Expand livestock controls",
                        )
                      : pickLang(
                          language,
                          "Lipat pengaturan standar ternak",
                          "Collapse livestock controls",
                        )
                  }
                  className={cn(
                    "min-h-11 w-11 px-0 text-[10px]",
                    !isAntiSlop && "acrylic-control-capsule rounded-xl",
                  )}
                >
                  {mobileCollapsed ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  )}
                </Button>
              </span>
            )}

            <span className="hidden lg:inline-flex">
              <Button
                variant="primary"
                size="sm"
                onClick={onToggleInspector}
                aria-expanded={inspectorOpen}
                aria-label={
                  inspectorOpen
                    ? pickLang(
                        language,
                        "Sembunyikan panel target nutrien",
                        "Hide nutrient targets panel",
                      )
                    : pickLang(
                        language,
                        "Tampilkan panel target nutrien",
                        "Show nutrient targets panel",
                      )
                }
                title={
                  inspectorOpen
                    ? pickLang(
                        language,
                        "Sembunyikan panel target nutrien",
                        "Hide nutrient targets panel",
                      )
                    : pickLang(
                        language,
                        "Tampilkan panel target nutrien",
                        "Show nutrient targets panel",
                      )
                }
                className={cn(
                  "lg:min-h-8 px-3 text-[11px]",
                  !isAntiSlop &&
                    "rounded-xl shadow-[0_6px_20px_-4px_var(--glow-primary-soft,rgba(16,185,129,0.38))]",
                )}
              >
                {inspectorOpen ? (
                  <>
                    <span>
                      <AnimatedTextSwap text={pickLang(language, "Tutup Target", "Hide Targets")} />
                    </span>
                    <ChevronsRight className="h-3.5 w-3.5 shrink-0" />
                  </>
                ) : (
                  <>
                    <ChevronsLeft className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      <AnimatedTextSwap
                        text={pickLang(language, "Target Nutrien", "Nutrient Targets")}
                      />
                    </span>
                  </>
                )}
              </Button>
            </span>
          </div>
        </div>
      </div>

      {/* Baris 2: Kapsul Kontrol Kaca (Standar Ternak + Basis + Mode + KPI Biaya & Toleransi Target) */}
      <div
        className={cn(
          "relative z-10 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between",
          mobileCollapsed && "hidden lg:flex",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 flex-col gap-1.5 p-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:px-2.5",
            isAntiSlop
              ? "rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
              : "acrylic-control-capsule rounded-2xl",
          )}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <label
              htmlFor="commodity-select"
              className="shrink-0 pl-1 text-[11px] font-semibold whitespace-nowrap text-[var(--text-secondary)]"
            >
              {pickLang(language, "Standar Ternak", "Livestock")}
            </label>
            <div className="min-w-0 flex-1 sm:w-36 sm:flex-none">
              <ThemedSelect
                id="commodity-select"
                ariaLabel={pickLang(
                  language,
                  "Pilih komoditas ternak",
                  "Select livestock commodity",
                )}
                modalTitle={pickLang(
                  language,
                  "Pilih Komoditas Ternak",
                  "Select Livestock Commodity",
                )}
                value={commodity}
                options={commodityOptions}
                language={language}
                popoverMinWidthPx={210}
                onChange={(v) => handleCommodityChange(v as CommodityGroup)}
                className={cn(
                  "min-h-11 py-0 text-[11px] font-semibold md:h-7 md:min-h-7",
                  !isAntiSlop && "rounded-xl",
                )}
              />
            </div>
          </div>

          {commodity === "broiler" && (
            <div className="min-w-0 w-full sm:w-64">
              <ThemedSelect
                id="preset-select"
                ariaLabel={pickLang(language, "Fase Ayam Pedaging", "Broiler Phase")}
                modalTitle={pickLang(
                  language,
                  "Pilih Standar Ayam Pedaging",
                  "Select Broiler Standard",
                )}
                searchPlaceholder={pickLang(
                  language,
                  "Cari standar broiler…",
                  "Search broiler standard…",
                )}
                searchable
                value={
                  broilerReqs.some((r) => r.id === activeRequirement.id)
                    ? activeRequirement.id
                    : (broilerReqs[0]?.id ?? "")
                }
                options={broilerOptions}
                language={language}
                popoverMinWidthPx={310}
                onChange={onSelectPreset}
                className="min-h-11 py-0 text-[11px] md:h-7 md:min-h-7"
              />
            </div>
          )}

          {commodity === "layer" && (
            <div className="min-w-0 w-full sm:w-68">
              <ThemedSelect
                id="preset-select"
                ariaLabel={pickLang(language, "Fase Ayam Petelur", "Layer Phase")}
                modalTitle={pickLang(
                  language,
                  "Pilih Standar Ayam Petelur",
                  "Select Layer Standard",
                )}
                searchPlaceholder={pickLang(
                  language,
                  "Cari standar layer…",
                  "Search layer standard…",
                )}
                searchable
                value={
                  layerReqs.some((r) => r.id === activeRequirement.id)
                    ? activeRequirement.id
                    : (layerReqs[0]?.id ?? "")
                }
                options={layerOptions}
                language={language}
                popoverMinWidthPx={320}
                onChange={onSelectPreset}
                className="min-h-11 py-0 text-[11px] md:h-7 md:min-h-7"
              />
            </div>
          )}

          {commodity === "cattle_beef" && (
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">
                <ThemedSelect
                  ariaLabel={pickLang(language, "Status fisiologis sapi potong", "Beef status")}
                  modalTitle={pickLang(
                    language,
                    "Status Fisiologis Sapi Potong",
                    "Beef Physiological Status",
                  )}
                  value={beefState}
                  options={beefStateOptions}
                  language={language}
                  popoverMinWidthPx={220}
                  onChange={(v) => applyBeefUpdate(beefBw, beefAdg, v as BeefPhysiologicalState)}
                  className="min-h-11 py-0 text-[11px] md:h-7 md:min-h-7"
                />
              </div>

              <label className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-[var(--text-secondary)]">
                <span>{pickLang(language, "BB", "BW")}</span>
                <NumericCellInput
                  value={beefBw}
                  min={80}
                  max={900}
                  fractionDigits={0}
                  fallbackOnEmpty={beefBw}
                  commitOnChange
                  ariaLabel={pickLang(
                    language,
                    "Bobot badan sapi potong kg",
                    "Beef body weight kg",
                  )}
                  onCommit={(v) => {
                    if (v !== null && Number.isFinite(v) && v > 0) {
                      applyBeefUpdate(v, beefAdg, beefState);
                    }
                  }}
                  className="min-h-11 w-20 shrink-0 px-2 py-0 text-[11px] md:h-7 md:min-h-7"
                />
                <span>kg</span>
              </label>

              {beefState === "growth" && (
                <label className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-[var(--text-secondary)]">
                  <span>{pickLang(language, "PBBH", "ADG")}</span>
                  <NumericCellInput
                    value={beefAdg}
                    min={0}
                    max={1.5}
                    fractionDigits={2}
                    fallbackOnEmpty={beefAdg}
                    commitOnChange
                    ariaLabel={pickLang(language, "Target PBBH kg per hari", "Target ADG kg/day")}
                    onCommit={(v) => {
                      if (v !== null && Number.isFinite(v) && v >= 0) {
                        applyBeefUpdate(beefBw, v, beefState);
                      }
                    }}
                    className="min-h-11 w-[4.75rem] shrink-0 px-2 py-0 text-[11px] md:h-7 md:min-h-7"
                  />
                  <span>kg/hr</span>
                </label>
              )}

              <Badge
                tone={beefPreview.isExtrapolated ? "amber" : "emerald"}
                title={beefPreview.sourceLabel}
              >
                DMI {formatNumberLocale(beefPreview.dmiKg, 1)} kg ·{" "}
                {beefPreview.isExtrapolated
                  ? pickLang(language, "Ekstrapolasi", "Extrapolated")
                  : pickLang(language, "Interpolasi", "Interpolated")}
              </Badge>
            </div>
          )}

          {commodity === "cattle_dairy" && (
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <label className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-[var(--text-secondary)]">
                <span>{pickLang(language, "BB", "BW")}</span>
                <NumericCellInput
                  value={dairyBw}
                  min={200}
                  max={900}
                  fractionDigits={0}
                  fallbackOnEmpty={dairyBw}
                  commitOnChange
                  ariaLabel={pickLang(
                    language,
                    "Bobot badan sapi perah kg",
                    "Dairy body weight kg",
                  )}
                  onCommit={(v) => {
                    if (v !== null && Number.isFinite(v) && v > 0) {
                      applyDairyUpdate(v, dairyMilk, dairyFat, dairyStandard, dairyDry);
                    }
                  }}
                  className="min-h-11 w-20 shrink-0 px-2 py-0 text-[11px] md:h-7 md:min-h-7"
                />
                <span>kg</span>
              </label>

              {!dairyDry && (
                <>
                  <label className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-[var(--text-secondary)]">
                    <span>{pickLang(language, "Susu", "Milk")}</span>
                    <NumericCellInput
                      value={dairyMilk}
                      min={0}
                      max={65}
                      fractionDigits={1}
                      fallbackOnEmpty={dairyMilk}
                      commitOnChange
                      ariaLabel={pickLang(
                        language,
                        "Target produksi susu liter per hari",
                        "Milk yield L/day",
                      )}
                      onCommit={(v) => {
                        if (v !== null && Number.isFinite(v) && v >= 0) {
                          applyDairyUpdate(dairyBw, v, dairyFat, dairyStandard, dairyDry);
                        }
                      }}
                      className="min-h-11 w-[4.75rem] shrink-0 px-2 py-0 text-[11px] md:h-7 md:min-h-7"
                    />
                    <span>L</span>
                  </label>

                  <label className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-[var(--text-secondary)]">
                    <span>{pickLang(language, "Lemak", "Fat")}</span>
                    <NumericCellInput
                      value={dairyFat}
                      min={2.5}
                      max={6.0}
                      fractionDigits={1}
                      fallbackOnEmpty={dairyFat}
                      commitOnChange
                      ariaLabel={pickLang(language, "Kadar lemak susu persen", "Milk fat %")}
                      onCommit={(v) => {
                        if (v !== null && Number.isFinite(v) && v > 0) {
                          applyDairyUpdate(dairyBw, dairyMilk, v, dairyStandard, dairyDry);
                        }
                      }}
                      className="min-h-11 w-[4.75rem] shrink-0 px-2 py-0 text-[11px] md:h-7 md:min-h-7"
                    />
                    <span>%</span>
                  </label>
                </>
              )}

              <div
                role="group"
                aria-label={pickLang(language, "Standar referensi sapi perah", "Dairy standard")}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-lg p-0.5 md:min-h-7",
                  isAntiSlop
                    ? "border border-[var(--border-subtle)] bg-[var(--bg-sunken)]"
                    : "neu-pressed",
                )}
              >
                {(
                  [
                    { id: "kearl_1982", label: "Kearl 82" },
                    { id: "nrc_1988", label: "NRC 88" },
                  ] as const
                ).map((std) => (
                  <button
                    key={std.id}
                    type="button"
                    aria-pressed={dairyStandard === std.id}
                    onClick={() => applyDairyUpdate(dairyBw, dairyMilk, dairyFat, std.id, dairyDry)}
                    className={cn(
                      "min-h-11 cursor-pointer rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors md:min-h-6 md:px-2 md:py-0.5",
                      dairyStandard === std.id
                        ? isAntiSlop
                          ? "border border-[var(--color-primary)] bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]"
                          : "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-neu-flat)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    {std.label}
                  </button>
                ))}
              </div>

              <label className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 px-1 text-[11px] font-medium text-[var(--text-secondary)] md:min-h-0">
                <input
                  type="checkbox"
                  checked={dairyDry}
                  onChange={(e) =>
                    applyDairyUpdate(dairyBw, dairyMilk, dairyFat, dairyStandard, e.target.checked)
                  }
                  className="h-3.5 w-3.5 cursor-pointer rounded accent-[var(--color-primary)]"
                />
                <span>{pickLang(language, "Kering", "Dry")}</span>
              </label>

              <Badge
                tone={dairyPreview.isExtrapolated ? "amber" : "emerald"}
                title={dairyPreview.sourceLabel}
              >
                {!dairyDry && `FCM ${formatNumberLocale(dairyPreview.fcm4PctKg ?? 0, 1)} kg · `}
                DMI {formatNumberLocale(dairyPreview.dmiKg, 1)} kg ·{" "}
                {dairyPreview.isExtrapolated
                  ? pickLang(language, "Ekstrapolasi", "Extrapolated")
                  : pickLang(language, "Interpolasi", "Interpolated")}
              </Badge>
            </div>
          )}

          {commodity === "other" && (
            <div className="min-w-0 w-full sm:w-72">
              <ThemedSelect
                id="preset-select"
                ariaLabel={pickLang(language, "Standar Ternak Lainnya", "Other Livestock Presets")}
                modalTitle={pickLang(language, "Pilih Standar Ternak", "Select Livestock Standard")}
                searchPlaceholder={pickLang(
                  language,
                  "Cari Standar (SNI, Kearl, Kambing, Itik)…",
                  "Search Standard (SNI, Kearl, Goat, Duck)…",
                )}
                searchable
                value={activeRequirement.id}
                options={otherPresetOptions}
                language={language}
                popoverMinWidthPx={340}
                onChange={onSelectPreset}
                className="min-h-11 py-0 text-[11px] md:h-7 md:min-h-7"
              />
            </div>
          )}
          <div
            role="group"
            aria-label={pickLang(
              language,
              "Pilih basis As-Fed atau Bahan Kering",
              "Select As-Fed or Dry Matter basis",
            )}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center p-0.5 md:min-h-7",
              isAntiSlop
                ? "rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-sunken)]"
                : "rounded-xl border border-[var(--glass-border-tint,var(--border-subtle))] bg-[var(--bg-sunken)]/70",
            )}
          >
            {(["as_fed", "dry_matter"] as const).map((basis) => {
              const active = config.activeBasis === basis;
              return (
                <button
                  key={basis}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSetBasis(basis)}
                  className={cn(
                    "relative inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition-[transform,color] duration-150 sm:min-w-0 md:min-h-6 md:py-0.5 motion-reduce:transform-none",
                    !isAntiSlop && "elastic-size-box rounded-lg active:scale-[0.97]",
                    active
                      ? isAntiSlop
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--status-success)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                  )}
                >
                  {active &&
                    (useGpuFlip ? (
                      <motion.span
                        layoutId="toolbar-basis-pill"
                        transition={{ type: "spring", stiffness: 460, damping: 34, mass: 0.75 }}
                        aria-hidden="true"
                        className="glow-pill-emerald pointer-events-none absolute inset-0 rounded-lg border border-[var(--status-success-border)]"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none absolute inset-0",
                          isAntiSlop
                            ? "rounded-md border border-[var(--color-primary)] bg-[var(--bg-surface-elevated)]"
                            : "rounded-lg bg-[var(--bg-surface-elevated)] shadow-[var(--shadow-neu-flat)]",
                        )}
                      />
                    ))}
                  <span className="relative z-10">
                    {basis === "as_fed" ? (
                      "As-Fed"
                    ) : (
                      <>
                        <span aria-hidden="true" className="sm:hidden">
                          {pickLang(language, "BK", "DM")}
                        </span>
                        <span className="sr-only sm:not-sr-only">
                          {pickLang(language, "BK (DM)", "DM")}
                        </span>
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          className={cn(
            "flex flex-wrap items-center gap-2 p-1.5 sm:px-3",
            isAntiSlop
              ? "rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
              : "acrylic-control-capsule rounded-2xl",
          )}
        >
          <div className="flex min-w-[122px] flex-1 items-center gap-1.5 sm:flex-none">
            <span className="hidden shrink-0 text-[11px] font-semibold whitespace-nowrap text-[var(--text-secondary)] sm:inline">
              Mode
            </span>
            <div className="min-w-0 flex-1 sm:w-40 sm:flex-none">
              <OptimizationModeSelector
                value={config.optimizationMode}
                onChange={onSetMode}
                language={language}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 sm:border-l sm:border-[var(--border-subtle)] sm:pl-2.5">
            <div className="flex shrink-0 items-baseline gap-1 whitespace-nowrap">
              <span className="text-[10px] font-medium text-[var(--text-muted)] lg:text-[11px]">
                <span aria-hidden="true" className="sm:hidden">
                  {pickLang(language, "Biaya/kg", "Cost/kg")}
                </span>
                <span className="sr-only sm:not-sr-only">
                  {pickLang(language, "Biaya / kg", "Cost / kg")} (
                  {result.basis === "as_fed" ? "As-Fed" : pickLang(language, "BK", "DM")})
                </span>
              </span>
              <span className="text-[11px] font-bold tabular-nums text-[var(--status-warning)] sm:text-xs lg:text-sm">
                {result.costPerKg !== null
                  ? formatCurrencyIdr(result.costPerKg)
                  : isAntiSlop
                    ? "-"
                    : "—"}
              </span>
            </div>

            <div className="flex shrink-0 items-baseline gap-1 whitespace-nowrap sm:border-l sm:border-[var(--border-subtle)] sm:pl-2.5">
              <span className="text-[10px] font-medium text-[var(--text-muted)] lg:text-[11px]">
                <span aria-hidden="true" className="sm:hidden">
                  /{config.batchSizeKg}kg
                </span>
                <span className="sr-only sm:not-sr-only">
                  {pickLang(language, "Biaya", "Cost")} / {config.batchSizeKg} kg
                </span>
              </span>
              <span className="text-[11px] font-bold tabular-nums text-[var(--status-success)] sm:text-xs lg:text-sm">
                {result.batchTotalCost !== null && result.batchTotalCost !== undefined
                  ? formatCurrencyIdr(result.batchTotalCost)
                  : isAntiSlop
                    ? "-"
                    : "—"}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:border-l sm:border-[var(--border-subtle)] sm:pl-2.5">
              {statusBadge}
              <label
                title={pickLang(
                  language,
                  "Izinkan sedikit toleransi batas jika target nutrisi terlalu ketat agar aplikasi tetap mengeluarkan racikan terdekat.",
                  "Allow slight bound tolerance when targets are too tight so the solver still outputs the closest feasible ration.",
                )}
                className="hidden cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)] sm:inline-flex"
              >
                <Switch
                  checked={config.enableElasticFallback}
                  onCheckedChange={onToggleElastic}
                  label={pickLang(
                    language,
                    "Aktifkan toleransi batas saat target terlalu ketat",
                    "Enable flexible bounds when targets are too tight",
                  )}
                />
                <span>
                  <AnimatedTextSwap
                    text={pickLang(language, "Toleransi Target", "Flexible Bounds")}
                  />
                </span>
              </label>
            </div>
          </div>

          {/* Toggle Toleransi khusus mobile (< sm) */}
          <label
            title={pickLang(
              language,
              "Izinkan sedikit toleransi batas jika target nutrisi terlalu ketat agar tetap keluar racikan terdekat.",
              "Allow slight bound tolerance when targets are too tight.",
            )}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)] sm:hidden"
          >
            <Switch
              checked={config.enableElasticFallback}
              onCheckedChange={onToggleElastic}
              label={pickLang(
                language,
                "Aktifkan toleransi batas mobile",
                "Enable flexible bounds mobile",
              )}
            />
            <span>{pickLang(language, "Toleransi", "Flexible")}</span>
          </label>
        </div>
      </div>
    </section>
  );
});
