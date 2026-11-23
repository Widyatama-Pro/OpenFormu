import { memo } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FlaskConical,
  Gauge,
  Lock,
  PackageCheck,
  Scale,
  ShieldAlert,
  Sliders,
  TrendingUp,
} from "lucide-react";
import { pickLang } from "../../i18n";
import { useOptionalThemeContext } from "../../theme";
import type { AppLanguage } from "../../types";
import { cn } from "../../utils/cn";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { GlossySquircleIcon, type SquircleTone } from "../ui/GlossySquircleIcon";

export type AdvancedShortcutTarget =
  "shadow_price" | "what_if" | "fractional_objective" | "stochastic_slp" | "enzyme_rumen";

export interface AdvancedModulesPreviewProps {
  readonly language?: AppLanguage;
  readonly onOpenWorkbench?: () => void;
  readonly onOpenShortcut?: (target: AdvancedShortcutTarget) => void;
}

interface ActiveToolItem {
  readonly id: string;
  readonly target: AdvancedShortcutTarget;
  readonly titleId: string;
  readonly titleEn: string;
  readonly summaryId: string;
  readonly summaryEn: string;
  readonly actionId: string;
  readonly actionEn: string;
  readonly tone: SquircleTone;
}

interface UpcomingToolItem {
  readonly id: string;
  readonly titleId: string;
  readonly titleEn: string;
  readonly summaryId: string;
  readonly summaryEn: string;
  readonly tone: SquircleTone;
}

const ACTIVE_TOOLS: readonly ActiveToolItem[] = [
  {
    id: "tool-shadow-price",
    target: "shadow_price",
    titleId: "Harga Bayangan & Peta Tangga Harga Beli",
    titleEn: "Shadow Price & Buy/No-Buy Price Ladder",
    summaryId:
      "Melihat nutrien mana yang paling menekan biaya pakan, serta titik harga impas agar bahan alternatif layak dibeli.",
    summaryEn:
      "See which nutrient constraints drive feed costs and the break-even entry prices for alternative ingredients.",
    actionId: "Buka Harga Bayangan",
    actionEn: "Open Shadow Price",
    tone: "sky",
  },
  {
    id: "tool-what-if",
    target: "what_if",
    titleId: 'Simulasi "What-If" (Kunci Porsi Bahan)',
    titleEn: '"What-If" Manual Ingredient Lock',
    summaryId:
      "Uji cepat skenario tukar bahan atau habiskan stok (mis. kunci jagung 45%) lalu hitung ulang bahan sisanya otomatis.",
    summaryEn:
      "Quickly test ingredient swaps or stock-clearing scenarios by locking specific percentages while re-optimizing the rest.",
    actionId: "Buka Simulasi What-If",
    actionEn: "Open What-If Simulator",
    tone: "amber",
  },
  {
    id: "tool-cost-per-nutrient",
    target: "fractional_objective",
    titleId: "Optimasi Biaya per Energi / Nutrien",
    titleEn: "Cost-per-Energy / Nutrient Optimization",
    summaryId:
      "Cari racikan termurah per satuan energi (kkal) atau protein, bukan sekadar harga per kilogram pakan.",
    summaryEn:
      "Optimize lowest cost per energy unit or amino acid rather than lowest price per kg of feed alone.",
    actionId: "Buka Sasaran Fraksional",
    actionEn: "Open Fractional Target",
    tone: "petrol",
  },
  {
    id: "tool-stochastic",
    target: "stochastic_slp",
    titleId: "Margin Keamanan Variasi Bahan (Stokastik)",
    titleEn: "Ingredient Variability Safety Margin (Stochastic)",
    summaryId:
      "Menjaga kecukupan gizi tetap aman 90–99% meski kadar protein atau energi bahan baku berubah antar kiriman.",
    summaryEn:
      "Maintain 90–99% nutrient confidence despite batch-to-batch variation in raw ingredient quality.",
    actionId: "Buka Margin Stokastik",
    actionEn: "Open Stochastic Margin",
    tone: "coral",
  },
  {
    id: "tool-enzyme-rumen",
    target: "enzyme_rumen",
    titleId: "Matriks Multi-Enzim & Evaluasi Rumen",
    titleEn: "Multi-Enzyme Matrix & Rumen Evaluation",
    summaryId:
      "Menghitung tambahan fosfor, energi, dan asam amino dari fitase/xilanase/protease serta memantau risiko asidosis rumen.",
    summaryEn:
      "Model phytase/xylanase/protease nutrient release alongside fast rumen acidosis risk evaluation.",
    actionId: "Buka Multi-Enzim & Rumen",
    actionEn: "Open Enzyme & Rumen",
    tone: "mint",
  },
];

const UPCOMING_TOOLS: readonly UpcomingToolItem[] = [
  {
    id: "plan-scale-step",
    titleId: "Pembulatan Kelipatan Karung & Timbangan",
    titleEn: "Bag & Scale Step Rounding",
    summaryId:
      "Menyesuaikan hasil takaran bahan agar langsung pas dengan kelipatan sak atau ketelitian timbangan gudang.",
    summaryEn:
      "Rounds ingredient weights to match practical warehouse scale increments and standard bag sizes.",
    tone: "petrol",
  },
  {
    id: "plan-pellet-shrink",
    titleId: "Koreksi Susut Peleting & Kepadatan Pelet",
    titleEn: "Pelleting Moisture Shrink & Durability",
    summaryId:
      "Memperhitungkan susut penguapan air saat pencetakan pelet serta menjaga kadar minyak agar pelet tetap padat.",
    summaryEn:
      "Accounts for moisture shrink during pelleting and liquid fat limits to preserve pellet durability.",
    tone: "sky",
  },
  {
    id: "plan-mycotoxin-guard",
    titleId: "Peringatan Bentrok Aditif & Batas Mikotoksin",
    titleEn: "Additive Conflict & Mycotoxin Guard",
    summaryId:
      "Mencegah pencampuran obat/aditif yang saling bertentangan dan membatasi total mikotoksin lintas bahan.",
    summaryEn:
      "Flags incompatible feed additives and caps cumulative mycotoxin levels across active ingredients.",
    tone: "coral",
  },
];

function renderIcon(id: string) {
  switch (id) {
    case "tool-shadow-price":
      return <TrendingUp className="h-4 w-4" />;
    case "tool-what-if":
      return <Lock className="h-4 w-4" />;
    case "tool-cost-per-nutrient":
      return <Gauge className="h-4 w-4" />;
    case "tool-stochastic":
      return <Sliders className="h-4 w-4" />;
    case "tool-enzyme-rumen":
      return <FlaskConical className="h-4 w-4" />;
    case "plan-scale-step":
      return <Scale className="h-4 w-4" />;
    case "plan-pellet-shrink":
      return <PackageCheck className="h-4 w-4" />;
    default:
      return <ShieldAlert className="h-4 w-4" />;
  }
}

/**
 * Halaman Modul Lanjutan yang bersih dari jargon teknis pengembang:
 * - Fitur Siap Pakai berupa kartu pintasan yang benar-benar bisa diklik langsung ke fiturnya.
 * - Fitur Dalam Pengembangan ditampilkan pasif (tidak bisa diklik) dengan label Segera Hadir.
 */
export const AdvancedModulesPreview = memo(function AdvancedModulesPreview({
  language = "id",
  onOpenWorkbench,
  onOpenShortcut,
}: AdvancedModulesPreviewProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";
  const handleSelectTool = (target: AdvancedShortcutTarget) => {
    if (onOpenShortcut) {
      onOpenShortcut(target);
      return;
    }
    onOpenWorkbench?.();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">
          {pickLang(language, "Modul Lanjutan", "Advanced Modules")}
        </h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--text-secondary)]">
          {pickLang(
            language,
            "Kumpulan alat bantu analisis dan presisi formulasi pakan. Klik salah satu fitur siap pakai di bawah untuk langsung membukanya.",
            "Precision formulation and analysis tools. Click any available feature below to launch it directly.",
          )}
        </p>
      </div>

      {/* Bagian 1: Fitur Siap Pakai (benar-benar bisa diklik) */}
      <section
        aria-label={pickLang(language, "Fitur siap pakai", "Ready-to-use features")}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            {pickLang(language, "Fitur Siap Pakai", "Ready to Use")}
          </h2>
          <Badge tone="emerald">
            <CheckCircle2 className="h-3 w-3" />
            <span>
              {ACTIVE_TOOLS.length} {pickLang(language, "Fitur Aktif", "Active")}
            </span>
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIVE_TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => handleSelectTool(tool.target)}
              className={cn(
                "group flex cursor-pointer flex-col justify-between rounded-xl p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                isAntiSlop
                  ? "border border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] hover:border-[var(--color-primary)] hover:bg-[var(--bg-surface)]"
                  : "glass-card glass-card-interactive glass-card-emerald",
              )}
            >
              <div>
                <div className="flex items-start gap-3">
                  <GlossySquircleIcon tone={tool.tone} size="md" icon={renderIcon(tool.id)} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm leading-snug font-bold text-[var(--text-primary)]">
                      {language === "id" ? tool.titleId : tool.titleEn}
                    </h3>
                  </div>
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {language === "id" ? tool.summaryId : tool.summaryEn}
                </p>
              </div>

              <div className="mt-3.5 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2.5 text-xs font-semibold text-[var(--status-success)]">
                <span>{language === "id" ? tool.actionId : tool.actionEn}</span>
                {!isAntiSlop && (
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-1 motion-reduce:transform-none"
                    aria-hidden="true"
                  />
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Bagian 2: Segera Hadir (pasif, tidak bisa diklik, tanpa jargon teknis) */}
      <section aria-label={pickLang(language, "Segera hadir", "Coming soon")} className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-[var(--text-secondary)]">
            {pickLang(language, "Dalam Pengembangan", "In Development")}
          </h2>
          <Badge tone="neutral">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span>{pickLang(language, "Segera Hadir", "Coming Soon")}</span>
          </Badge>
        </div>

        <div className="selectable-panel grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {UPCOMING_TOOLS.map((item) => (
            <Card key={item.id} interactive={false} className="flex flex-col p-4 opacity-75">
              <div className="flex items-start gap-3">
                <GlossySquircleIcon tone={item.tone} size="sm" icon={renderIcon(item.id)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs leading-snug font-bold text-[var(--text-primary)]">
                      {language === "id" ? item.titleId : item.titleEn}
                    </h3>
                  </div>
                </div>
              </div>
              <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--text-muted)]">
                {language === "id" ? item.summaryId : item.summaryEn}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
});
