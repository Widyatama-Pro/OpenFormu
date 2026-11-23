import { useEffect, useRef } from "react";
import { ArrowRight, FlaskConical, Gauge, RotateCcw, Sliders } from "lucide-react";
import { pickLang } from "../../i18n";
import { useOptionalThemeContext } from "../../theme";
import type {
  AppLanguage,
  EnzymeConfig,
  FormulationConfig,
  Nutrient,
  NutrientId,
} from "../../types";
import { cn } from "../../utils/cn";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { SheetDialog } from "../ui/SheetDialog";
import { Switch } from "../ui/Switch";
import { ThemedSelect } from "../ui/ThemedSelect";
import { NumericCellInput } from "./NumericCellInput";

export type PrecisionFocusSection = "fractional" | "stochastic" | "enzyme";

export interface PrecisionEngineDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly config: FormulationConfig;
  readonly allNutrients: readonly Nutrient[];
  readonly stochasticIterations?: number | undefined;
  readonly language: AppLanguage;
  readonly focusSection?: PrecisionFocusSection | null | undefined;
  readonly onClearFocus?: (() => void) | undefined;
  readonly hasRumenEvaluation?: boolean | undefined;
  readonly onJumpToRumenEvaluator?: (() => void) | undefined;
  readonly onUpdatePrecision: (patch: {
    readonly fractionalObjective?: FormulationConfig["fractionalObjective"] | null;
    readonly enableStochasticSlp?: boolean;
    readonly stochasticMaxIter?: number;
    readonly stochasticDamping?: number;
    readonly stochasticTolerance?: number;
    readonly enzymes?: FormulationConfig["enzymes"] | null;
    readonly enzymeSubAdditiveCap?: number | null;
  }) => void;
}

const ENZYME_PRESETS: ReadonlyArray<{
  readonly id: string;
  readonly type: EnzymeConfig["type"];
  readonly labelId: string;
  readonly labelEn: string;
  readonly matrix: Readonly<Record<NutrientId, number>>;
  readonly substrateNutrientId?: NutrientId;
}> = [
  {
    id: "preset-phytase",
    type: "phytase",
    labelId: "Fitase (AvP +0,12% · Ca +0,10%)",
    labelEn: "Phytase (AvP +0.12% · Ca +0.10%)",
    matrix: { avp: 0.12, p: 0.1, ca: 0.1 },
    substrateNutrientId: "phytate_p",
  },
  {
    id: "preset-xylanase",
    type: "xylanase",
    labelId: "Xilanase (ME Unggas +80 kcal/kg)",
    labelEn: "Xylanase (Poultry ME +80 kcal/kg)",
    matrix: { me_poultry: 80, tdn: 1.5 },
  },
  {
    id: "preset-protease",
    type: "protease",
    labelId: "Protease (PK +0,80% · SID Lys +0,04%)",
    labelEn: "Protease (CP +0.80% · SID Lys +0.04%)",
    matrix: { cp: 0.8, sid_lys: 0.04, lys: 0.04 },
  },
];

export function PrecisionEngineDialog({
  open,
  onClose,
  config,
  allNutrients,
  stochasticIterations,
  language,
  focusSection = null,
  onClearFocus,
  hasRumenEvaluation = false,
  onJumpToRumenEvaluator,
  onUpdatePrecision,
}: PrecisionEngineDialogProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";
  const activeEnzymes = config.enzymes ?? [];
  const capPsi = config.enzymeSubAdditiveCap ?? 1;
  const fractionalRef = useRef<HTMLDivElement | null>(null);
  const stochasticRef = useRef<HTMLDivElement | null>(null);
  const enzymeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !focusSection) return;
    const targetRef =
      focusSection === "fractional"
        ? fractionalRef
        : focusSection === "stochastic"
          ? stochasticRef
          : enzymeRef;
    const node = targetRef.current;
    if (!node) return;
    const timer = window.setTimeout(() => {
      node.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [open, focusSection]);

  const dismissSpotlightIfMatched = (section: PrecisionFocusSection) => {
    if (focusSection === section) {
      onClearFocus?.();
    }
  };

  const toggleEnzymePreset = (preset: (typeof ENZYME_PRESETS)[number]) => {
    const exists = activeEnzymes.some((e) => e.id === preset.id);
    const next = exists
      ? activeEnzymes.filter((e) => e.id !== preset.id)
      : [
          ...activeEnzymes,
          {
            id: preset.id,
            type: preset.type,
            matrix: preset.matrix,
            thermalRetention: 0.85,
            inclusionFraction: 1,
            ...(preset.substrateNutrientId
              ? { substrateNutrientId: preset.substrateNutrientId }
              : {}),
          },
        ];
    onUpdatePrecision({ enzymes: next });
  };

  const updateEnzymeRetention = (id: string, thermalRetention: number) => {
    const clamped = Math.min(1, Math.max(0, thermalRetention));
    onUpdatePrecision({
      enzymes: activeEnzymes.map((e) => (e.id === id ? { ...e, thermalRetention: clamped } : e)),
    });
  };

  return (
    <SheetDialog
      open={open}
      onClose={onClose}
      title={pickLang(
        language,
        "Pengaturan Presisi LP (Lanjutan)",
        "Precision LP Settings (Advanced)",
      )}
      subtitle={pickLang(
        language,
        "Opsi lanjutan untuk optimasi biaya per nutrien, margin keamanan variasi bahan, dan matriks multi-enzim.",
        "Advanced options for cost-per-nutrient optimization, stochastic safety margins, and multi-enzyme matrices.",
      )}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onUpdatePrecision({
                fractionalObjective: null,
                enableStochasticSlp: false,
                enzymes: null,
                enzymeSubAdditiveCap: null,
              })
            }
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{pickLang(language, "Reset Modul Presisi", "Reset Precision Modules")}</span>
          </Button>
          <Button variant="primary" size="md" onClick={onClose}>
            {pickLang(language, "Selesai", "Done")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* PR-03: Fractional LP Objective */}
        <div
          ref={fractionalRef}
          data-precision-section="fractional"
          onPointerDown={() => dismissSpotlightIfMatched("fractional")}
          onKeyDown={() => dismissSpotlightIfMatched("fractional")}
          className={cn(
            "modal-section-card p-3.5 transition-shadow duration-200",
            isAntiSlop ? "rounded-xl" : "rounded-2xl",
            focusSection === "fractional" &&
              (isAntiSlop
                ? "ring-2 ring-[var(--color-primary)]"
                : "feature-spotlight-glow ring-2 ring-[var(--color-accent)]"),
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-[var(--status-info)]" />
              <h3 className="font-bold text-[var(--text-primary)]">
                {pickLang(
                  language,
                  "Sasaran Objektif Fraksional (Biaya / Nutrien)",
                  "Fractional Objective (Cost / Nutrient)",
                )}
              </h3>
            </div>
            <Badge tone={config.fractionalObjective ? "emerald" : "neutral"}>
              {config.fractionalObjective
                ? pickLang(language, "Aktif", "Active")
                : pickLang(language, "Standar Rp/kg", "Standard Cost/kg")}
            </Badge>
          </div>
          <p className="mb-2.5 text-[11px] text-[var(--text-secondary)]">
            {pickLang(
              language,
              "Minimalkan biaya per unit energi atau asam amino (Rp/Mcal atau Rp/% nutrien) melalui iterasi Dinkelbach dengan pelindung penyebut 0/0.",
              "Minimize cost per unit of energy or amino acid using Dinkelbach iterations with 0/0 denominator protection.",
            )}
          </p>
          <ThemedSelect
            ariaLabel={pickLang(
              language,
              "Sasaran objektif formulasi",
              "Formulation objective target",
            )}
            modalTitle={pickLang(
              language,
              "Pilih Sasaran Objektif Formulasi",
              "Select Formulation Objective",
            )}
            searchPlaceholder={pickLang(
              language,
              "Cari nutrien sasaran…",
              "Search target nutrient…",
            )}
            searchable
            value={config.fractionalObjective?.nutrientId ?? ""}
            language={language}
            popoverMinWidthPx={300}
            onChange={(val) => {
              onUpdatePrecision({
                fractionalObjective: val ? { mode: "cost_per_nutrient", nutrientId: val } : null,
              });
            }}
            options={[
              {
                value: "",
                label: pickLang(
                  language,
                  "Least-Cost Standar (Biaya / kg pakan)",
                  "Standard Least-Cost (Cost / kg feed)",
                ),
              },
              ...allNutrients.map((nut) => ({
                value: nut.id,
                label: `${pickLang(language, "Biaya /", "Cost /")} ${language === "id" ? nut.name : (nut.nameEn ?? nut.name)} (${nut.unit})`,
                group: pickLang(language, "Biaya per Unit Nutrien", "Cost per Nutrient Unit"),
              })),
            ]}
          />
        </div>

        {/* PR-04: Stochastic SLP */}
        <div
          ref={stochasticRef}
          data-precision-section="stochastic"
          onPointerDown={() => dismissSpotlightIfMatched("stochastic")}
          onKeyDown={() => dismissSpotlightIfMatched("stochastic")}
          className={cn(
            "modal-section-card p-3.5 transition-shadow duration-200",
            isAntiSlop ? "rounded-xl" : "rounded-2xl",
            focusSection === "stochastic" &&
              (isAntiSlop
                ? "ring-2 ring-[var(--color-primary)]"
                : "feature-spotlight-glow ring-2 ring-[var(--color-accent)]"),
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-[var(--status-warning)]" />
              <h3 className="font-bold text-[var(--text-primary)]">
                {pickLang(
                  language,
                  "Formulasi Stokastik & Margin Keamanan",
                  "Stochastic Formulation & Safety Margins",
                )}
              </h3>
            </div>
            <Switch
              checked={config.enableStochasticSlp === true}
              onCheckedChange={(checked) => onUpdatePrecision({ enableStochasticSlp: checked })}
              label={pickLang(
                language,
                "Aktifkan formulasi stokastik SLP",
                "Enable stochastic SLP formulation",
              )}
            />
          </div>
          <p className="mb-2.5 text-[11px] text-[var(--text-secondary)]">
            {pickLang(
              language,
              "Memperhitungkan simpangan baku nutrien bahan (σ di Detail Bahan) dan varians kebutuhan ternak (di panel Target Nutrien).",
              "Accounts for ingredient nutrient std-dev (σ in Ingredient Detail) and requirement variance (in Nutrient Targets).",
            )}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label
                htmlFor="stochastic-max-iter"
                className="mb-1 block text-[11px] font-semibold text-[var(--text-primary)]"
              >
                {pickLang(language, "Maks Iterasi SLP", "Max SLP Iterations")}
              </label>
              <NumericCellInput
                id="stochastic-max-iter"
                ariaLabel={pickLang(language, "Maks Iterasi SLP", "Max SLP Iterations")}
                min={1}
                max={40}
                fractionDigits={0}
                fallbackOnEmpty={config.stochasticMaxIter ?? 12}
                commitOnChange
                value={config.stochasticMaxIter ?? 12}
                disabled={config.enableStochasticSlp !== true}
                onCommit={(val) =>
                  onUpdatePrecision({
                    stochasticMaxIter: Math.max(1, Math.min(40, Math.round(val ?? 12))),
                  })
                }
              />
            </div>
            <div>
              <label
                htmlFor="stochastic-damping"
                className="mb-1 block text-[11px] font-semibold text-[var(--text-primary)]"
              >
                {pickLang(language, "Redaman α (0,1–1,0)", "Damping α (0.1–1.0)")}
              </label>
              <NumericCellInput
                id="stochastic-damping"
                ariaLabel={pickLang(language, "Redaman α (0,1–1,0)", "Damping α (0.1–1.0)")}
                min={0.1}
                max={1}
                fractionDigits={2}
                fallbackOnEmpty={config.stochasticDamping ?? 0.5}
                commitOnChange
                value={config.stochasticDamping ?? 0.5}
                disabled={config.enableStochasticSlp !== true}
                onCommit={(val) =>
                  onUpdatePrecision({
                    stochasticDamping: Math.min(1, Math.max(0.1, val ?? 0.5)),
                  })
                }
              />
            </div>
          </div>
          {config.enableStochasticSlp === true && stochasticIterations !== undefined && (
            <p className="mt-2 text-[11px] font-medium text-[var(--status-success)]">
              {pickLang(
                language,
                `Terakhir konvergen dalam ${stochasticIterations} iterasi SLP.`,
                `Last solved in ${stochasticIterations} SLP iterations.`,
              )}
            </p>
          )}
        </div>

        {/* PR-05: Multi-Enzyme Matrix */}
        <div
          ref={enzymeRef}
          data-precision-section="enzyme"
          onPointerDown={() => dismissSpotlightIfMatched("enzyme")}
          onKeyDown={() => dismissSpotlightIfMatched("enzyme")}
          className={cn(
            "modal-section-card p-3.5 transition-shadow duration-200",
            isAntiSlop ? "rounded-xl" : "rounded-2xl",
            focusSection === "enzyme" &&
              (isAntiSlop
                ? "ring-2 ring-[var(--color-primary)]"
                : "feature-spotlight-glow ring-2 ring-[var(--color-accent)]"),
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-[var(--status-success)]" />
              <h3 className="font-bold text-[var(--text-primary)]">
                {pickLang(
                  language,
                  "Matriks Multi-Enzim Sub-Aditif",
                  "Sub-Additive Multi-Enzyme Matrix",
                )}
              </h3>
            </div>
            <Badge tone={activeEnzymes.length > 0 ? "emerald" : "neutral"}>
              {activeEnzymes.length} {pickLang(language, "enzim aktif", "active")}
            </Badge>
          </div>
          <p className="mb-2.5 text-[11px] text-[var(--text-secondary)]">
            {pickLang(
              language,
              "Menambahkan uplift nutrien sesuai retensi termal peleting dan plafon anti hitung ganda ψ.",
              "Applies nutrient uplift scaled by pelleting thermal retention and anti-double-counting cap ψ.",
            )}
          </p>

          <div className="space-y-2">
            {ENZYME_PRESETS.map((preset) => {
              const active = activeEnzymes.find((e) => e.id === preset.id);
              return (
                <div
                  key={preset.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-2 rounded-xl p-2.5",
                    isAntiSlop
                      ? "border border-[var(--border-subtle)] bg-[var(--bg-sunken)]"
                      : "neu-well",
                  )}
                >
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold text-[var(--text-primary)] md:min-h-0">
                    <input
                      type="checkbox"
                      checked={Boolean(active)}
                      onChange={() => toggleEnzymePreset(preset)}
                      className="h-4 w-4 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--color-primary)]"
                    />
                    <span>{language === "id" ? preset.labelId : preset.labelEn}</span>
                  </label>

                  {active && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-[var(--text-secondary)]">
                        {pickLang(language, "Retensi Termal:", "Thermal Ret.:")}
                      </span>
                      <div className="w-36">
                        <ThemedSelect
                          ariaLabel={`${preset.type} thermal retention`}
                          modalTitle={pickLang(
                            language,
                            "Pilih Retensi Termal Enzim",
                            "Select Enzyme Thermal Retention",
                          )}
                          value={String(active.thermalRetention ?? 0.85)}
                          language={language}
                          popoverMinWidthPx={190}
                          onChange={(val) => updateEnzymeRetention(preset.id, Number(val))}
                          options={[
                            { value: "1", label: "100% (Mash)" },
                            { value: "0.85", label: "85% (Pellet 80°C)" },
                            { value: "0.7", label: "70% (Pellet 90°C)" },
                            { value: "0.5", label: "50% (Extruder)" },
                          ]}
                          className="min-h-11 py-0 text-[11px] md:h-7 md:min-h-7"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2.5">
            <span className="text-[11px] font-semibold text-[var(--text-primary)]">
              {pickLang(
                language,
                "Plafon Sub-Aditif Gabungan (ψ)",
                "Combined Sub-Additive Cap (ψ)",
              )}
            </span>
            <div className="w-40">
              <ThemedSelect
                ariaLabel={pickLang(language, "Plafon sub-aditif enzim", "Enzyme sub-additive cap")}
                modalTitle={pickLang(
                  language,
                  "Pilih Plafon Sub-Aditif (ψ)",
                  "Select Sub-Additive Cap (ψ)",
                )}
                value={String(capPsi)}
                language={language}
                popoverMinWidthPx={190}
                onChange={(val) => onUpdatePrecision({ enzymeSubAdditiveCap: Number(val) })}
                options={[
                  { value: "1", label: "1.00 (100% Aditif)" },
                  { value: "0.85", label: "0.85 (85% Cap)" },
                  { value: "0.7", label: "0.70 (70% Cap)" },
                  { value: "0.5", label: "0.50 (50% Cap)" },
                ]}
                className="min-h-11 py-0 text-[11px] md:h-7 md:min-h-7"
              />
            </div>
          </div>
          {hasRumenEvaluation && onJumpToRumenEvaluator && (
            <div className="mt-3 flex justify-end border-t border-[var(--border-subtle)] pt-2.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onJumpToRumenEvaluator();
                }}
              >
                <span>{pickLang(language, "Lihat Evaluator Rumen", "View Rumen Evaluator")}</span>
                {!isAntiSlop && <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
              </Button>
            </div>
          )}
        </div>
      </div>
    </SheetDialog>
  );
}
