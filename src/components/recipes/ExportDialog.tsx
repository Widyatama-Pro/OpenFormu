import { useState } from "react";
import { AlertTriangle, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import { pickLang } from "../../i18n";
import {
  generateFormulationPdf,
  generateFormulationXlsx,
  sanitizeFilenameSlug,
} from "../../storage";
import { useOptionalThemeContext } from "../../theme";
import type {
  AppLanguage,
  FormulationConfig,
  FormulationResult,
  Ingredient,
  Nutrient,
  Requirement,
} from "../../types";
import { cn } from "../../utils/cn";
import { downloadBinaryFile } from "../../utils/download";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { GlossySquircleIcon } from "../ui/GlossySquircleIcon";
import { SheetDialog } from "../ui/SheetDialog";

export interface ExportDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly ingredients: readonly Ingredient[];
  readonly nutrientsCatalog?: readonly Nutrient[];
  readonly requirement: Requirement;
  readonly config: FormulationConfig;
  readonly result: FormulationResult;
  readonly recipeName?: string;
  readonly decimalPlaces?: 0 | 1 | 2;
  readonly language?: AppLanguage;
}

/**
 * Dialog Ekspor khusus PDF rapi untuk peternak (Laporan Formula Lengkap & Lembar Timbang Gudang).
 */
export function ExportDialog({
  open,
  onClose,
  ingredients,
  nutrientsCatalog = MOCK_NUTRIENTS,
  requirement,
  config,
  result,
  recipeName,
  decimalPlaces = 0,
  language = "id",
}: ExportDialogProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";
  const [notice, setNotice] = useState<{
    readonly tone: "success" | "error";
    readonly text: string;
  } | null>(null);

  const effectiveTitle = (
    recipeName?.trim() ||
    `${requirement.name} (${config.activeBasis === "dry_matter" ? "BK" : "As-Fed"})`
  ).trim();
  const slug = sanitizeFilenameSlug(effectiveTitle);

  const isInfeasibleOrEmpty =
    result.status === "infeasible" || result.status === "error" || result.composition.length === 0;
  const isNearFeasible = result.status === "near_feasible";
  const isOptimal = result.status === "optimal" && result.composition.length > 0;

  const handleDownloadPdfFull = () => {
    try {
      const bytes = generateFormulationPdf({
        recipeName: effectiveTitle,
        mode: "full",
        ingredients,
        nutrientsCatalog,
        requirement,
        result,
        decimalPlaces,
      });
      downloadBinaryFile(bytes, `${slug}-lengkap.pdf`, "application/pdf");
      setNotice({
        tone: "success",
        text: pickLang(
          language,
          `Laporan PDF ${slug}-lengkap.pdf berhasil diunduh.`,
          `PDF report ${slug}-lengkap.pdf downloaded.`,
        ),
      });
    } catch (err) {
      setNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Gagal membuat PDF Lengkap.",
      });
    }
  };

  const handleDownloadPdfBatch = () => {
    try {
      const bytes = generateFormulationPdf({
        recipeName: effectiveTitle,
        mode: "batch_only",
        ingredients,
        nutrientsCatalog,
        requirement,
        result,
        decimalPlaces,
      });
      downloadBinaryFile(bytes, `${slug}-batch.pdf`, "application/pdf");
      setNotice({
        tone: "success",
        text: pickLang(
          language,
          `Lembar Timbang Gudang ${slug}-batch.pdf berhasil diunduh.`,
          `Mill Batch Sheet ${slug}-batch.pdf downloaded.`,
        ),
      });
    } catch (err) {
      setNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Gagal membuat PDF Lembar Timbang.",
      });
    }
  };

  const handleDownloadXlsxFull = () => {
    try {
      const bytes = generateFormulationXlsx({
        recipeName: effectiveTitle,
        ingredients,
        nutrientsCatalog,
        requirement,
        result,
        decimalPlaces,
      });
      downloadBinaryFile(
        bytes,
        `${slug}-formulasi-lengkap.xlsx`,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      setNotice({
        tone: "success",
        text: pickLang(
          language,
          `Workbook Excel ${slug}-formulasi-lengkap.xlsx (4 sheet lengkap) berhasil diunduh.`,
          `Excel workbook ${slug}-formulasi-lengkap.xlsx (4 full sheets) downloaded.`,
        ),
      });
    } catch (err) {
      setNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Gagal membuat file Excel (.xlsx).",
      });
    }
  };

  return (
    <SheetDialog
      open={open}
      onClose={() => {
        setNotice(null);
        onClose();
      }}
      title={pickLang(language, "Ekspor Laporan PDF", "Export PDF Report")}
      subtitle={pickLang(
        language,
        "Unduh dokumen PDF siap cetak yang rapi untuk arsip peternak atau operator gudang pakan. Dokumen PDF & cetak selalu memakai latar terang agar mudah dibaca.",
        "Download neat print-ready PDF documents for farm archives or feed mixing operators. PDF & print pages always use a high-contrast light paper layout.",
      )}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (typeof window !== "undefined" && typeof window.print === "function") {
                window.print();
              }
            }}
          >
            <Printer className="h-3.5 w-3.5" />
            <span>{pickLang(language, "Cetak Langsung", "Print Page")}</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setNotice(null);
              onClose();
            }}
          >
            {pickLang(language, "Tutup", "Close")}
          </Button>
        </div>
      }
    >
      <div className="selectable-panel space-y-4 text-xs">
        {isNearFeasible && (
          <div
            role="status"
            className={cn(
              "flex items-start gap-2.5 border border-[var(--status-warning-border)] bg-[var(--status-warning-soft)] p-3 font-medium text-[var(--text-primary)]",
              isAntiSlop ? "rounded-lg" : "glass-card rounded-2xl",
            )}
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-warning)]" />
            <div>
              <p className="font-bold">
                {isAntiSlop
                  ? pickLang(
                      language,
                      "Mode Toleransi Target: Formula Mendekati Standar",
                      "Flexible Bounds Mode: Closest-Fit Ration",
                    )
                  : pickLang(
                      language,
                      "Mode Toleransi Target — Formula Mendekati Standar",
                      "Flexible Bounds Mode — Closest-Fit Ration",
                    )}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-[11px]",
                  isAntiSlop ? "text-[var(--text-secondary)]" : "opacity-90",
                )}
              >
                {pickLang(
                  language,
                  "Dokumen bertanda kompromi nutrisi. PDF Lengkap menyertakan penanda kompromi nutrisi, sedangkan PDF Lembar Timbang Gudang dikunci hingga formula mencapai status Optimal penuh.",
                  "Documents carry a nutrient compromise notice. Full PDF includes compromise warnings, while Batch-Only PDF is locked until status is fully Optimal.",
                )}
              </p>
            </div>
          </div>
        )}

        {isInfeasibleOrEmpty && (
          <div
            role="status"
            className={cn(
              "flex items-start gap-2.5 border border-[var(--status-danger-border)] bg-[var(--status-danger-soft)] p-3 font-medium text-[var(--text-primary)]",
              isAntiSlop ? "rounded-lg" : "glass-card glass-card-coral rounded-2xl",
            )}
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-danger)]" />
            <div>
              <p className="font-bold">
                {pickLang(
                  language,
                  "Ekspor PDF diblokir (Formula Tidak Ditemukan / Target Terlalu Ketat)",
                  "PDF export blocked (Infeasible / Empty status)",
                )}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-[11px]",
                  isAntiSlop ? "text-[var(--text-secondary)]" : "opacity-90",
                )}
              >
                {pickLang(
                  language,
                  "Sesuaikan bahan atau target nutrien hingga formula mencapai status Optimal atau Mendekati Target.",
                  "Adjust ingredients or nutrient bounds until a valid solution is reached.",
                )}
              </p>
            </div>
          </div>
        )}

        {notice && (
          <div
            role={notice.tone === "error" ? "alert" : "status"}
            className={cn(
              "border p-3 font-medium text-[var(--text-primary)]",
              isAntiSlop ? "rounded-lg" : "glass-card rounded-2xl",
              notice.tone === "success"
                ? cn(
                    "border-[var(--status-success-border)] bg-[var(--status-success-soft)]",
                    !isAntiSlop && "glass-card-emerald",
                  )
                : cn(
                    "border-[var(--status-danger-border)] bg-[var(--status-danger-soft)]",
                    !isAntiSlop && "glass-card-coral",
                  ),
            )}
          >
            {notice.text}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={isInfeasibleOrEmpty}
            onClick={handleDownloadPdfFull}
            className={cn(
              "flex min-h-20 cursor-pointer items-start gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50",
              isAntiSlop
                ? "rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-sunken)]"
                : "glass-card glass-card-interactive disabled:pointer-events-none",
            )}
          >
            <GlossySquircleIcon tone="petrol" size="sm" icon={<FileText className="h-4 w-4" />} />
            <div>
              <p className="font-bold text-[var(--text-primary)]">
                {pickLang(language, "PDF Lembar Formula Lengkap", "PDF Full Formula Sheet")}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                {pickLang(
                  language,
                  "Berisi tabel komposisi, berat timbang, biaya per kg & batch, profil nutrien, dan harga bayangan.",
                  "Includes composition table, batch weights, costs, nutrient profile & shadow prices.",
                )}
              </p>
            </div>
          </button>

          <button
            type="button"
            disabled={!isOptimal}
            onClick={handleDownloadPdfBatch}
            title={
              isOptimal
                ? pickLang(
                    language,
                    "Unduh PDF instruksi penimbangan gudang tanpa harga & rahasia nutrisi",
                    "Download warehouse weighing PDF without prices or nutrient secrets",
                  )
                : pickLang(language, "Khusus status Optimal", "Optimal status only")
            }
            className={cn(
              "flex min-h-20 cursor-pointer items-start gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50",
              isAntiSlop
                ? "rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-sunken)]"
                : "glass-card glass-card-interactive disabled:pointer-events-none",
            )}
          >
            <GlossySquircleIcon tone="amber" size="sm" icon={<Printer className="h-4 w-4" />} />
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-bold text-[var(--text-primary)]">
                  {pickLang(language, "PDF Lembar Timbang Gudang", "PDF Print Batch Only")}
                </p>
                <Badge tone="amber">{pickLang(language, "Operator", "Mill")}</Badge>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                {isOptimal
                  ? pickLang(
                      language,
                      "Khusus operator adukan: menampilkan daftar bahan, berat kg, dan kotak centang tanpa harga.",
                      "For mixer operators: lists feeds, kg weights, and checkboxes without prices.",
                    )
                  : isAntiSlop
                    ? pickLang(
                        language,
                        "Terkunci, hanya tersedia bila status formulasi Optimal penuh.",
                        "Locked, available only when formulation status is fully Optimal.",
                      )
                    : pickLang(
                        language,
                        "Terkunci — hanya tersedia bila status formulasi Optimal penuh.",
                        "Locked — available only when formulation status is fully Optimal.",
                      )}
              </p>
            </div>
          </button>

          <button
            type="button"
            disabled={isInfeasibleOrEmpty}
            onClick={handleDownloadXlsxFull}
            className={cn(
              "flex min-h-20 cursor-pointer items-start gap-3 p-4 text-left sm:col-span-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50",
              isAntiSlop
                ? "rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-sunken)]"
                : "glass-card glass-card-interactive disabled:pointer-events-none",
            )}
          >
            <GlossySquircleIcon
              tone="mint"
              size="sm"
              icon={<FileSpreadsheet className="h-4 w-4" />}
            />
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-bold text-[var(--text-primary)]">
                  {pickLang(
                    language,
                    "Excel (.xlsx) Matriks Nutrien, Konsumsi Harian & Timbang 2-Versi",
                    "Excel (.xlsx) Full Nutrient Matrix, Daily Intake & Dual Batch Weights",
                  )}
                </p>
                <Badge tone="emerald">4 Sheet</Badge>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                {pickLang(
                  language,
                  "4 worksheet lengkap: Komposisi & Timbang (xx,xxx kg & Bulat + Konsumsi Harian BK/As-Fed), Profil Nutrien 0,00x, Shadow Price, dan Matriks 25 Nutrien seluruh bahan.",
                  "4 full worksheets: Composition & Dual Weights (xx.xxx kg & Rounded + Daily Intake DM/As-Fed), 0.00x Nutrient Profile, Shadow Prices, and 25-Nutrient Ingredient Matrix.",
                )}
              </p>
            </div>
          </button>
        </div>
      </div>
    </SheetDialog>
  );
}
