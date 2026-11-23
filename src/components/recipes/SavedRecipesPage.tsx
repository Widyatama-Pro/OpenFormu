import { memo, useState } from "react";
import { FileText, FolderOpen, Plus, Trash2 } from "lucide-react";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import { pickLang } from "../../i18n";
import { generateRecipePdf, sanitizeFilenameSlug } from "../../storage";
import { useOptionalThemeContext } from "../../theme";
import type { AppLanguage, Nutrient, Recipe } from "../../types";
import { cn } from "../../utils/cn";
import { downloadBinaryFile } from "../../utils/download";
import type { ValidationResult } from "../../utils/validators";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

export interface SavedRecipesPageProps {
  readonly recipes: readonly Recipe[];
  readonly nutrientsCatalog?: readonly Nutrient[];
  readonly language: AppLanguage;
  readonly decimalPlaces?: 0 | 1 | 2 | undefined;
  readonly onLoadRecipe: (id: string) => void;
  readonly onOpenSaveCurrent: () => void;
  readonly onOpenExport: () => void;
  readonly onImportFeedJson?: (
    rawText: string,
  ) => ValidationResult<{ readonly recipe: Recipe; readonly wasIdRenamed: boolean }>;
  readonly onDeleteRecipe?: (id: string) => void;
}

/**
 * Halaman Project Resep yang sederhana & praktis untuk peternak,
 * dengan ekspor khusus ke format PDF yang rapi.
 */
export const SavedRecipesPage = memo(function SavedRecipesPage({
  recipes,
  nutrientsCatalog = MOCK_NUTRIENTS,
  language,
  decimalPlaces = 0,
  onLoadRecipe,
  onOpenSaveCurrent,
  onOpenExport,
  onDeleteRecipe,
}: SavedRecipesPageProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";
  const [notice, setNotice] = useState<{
    readonly tone: "success" | "error";
    readonly text: string;
  } | null>(null);

  const handleExportRecipePdf = (recipe: Recipe) => {
    try {
      const bytes = generateRecipePdf({ recipe, nutrientsCatalog, decimalPlaces });
      const filename = `${sanitizeFilenameSlug(recipe.name)}.pdf`;
      downloadBinaryFile(bytes, filename, "application/pdf");
      setNotice({
        tone: "success",
        text: pickLang(
          language,
          `Resep "${recipe.name}" berhasil diekspor ke ${filename}.`,
          `Recipe "${recipe.name}" exported to ${filename}.`,
        ),
      });
    } catch (err) {
      setNotice({
        tone: "error",
        text:
          err instanceof Error
            ? err.message
            : pickLang(
                language,
                `Gagal mengekspor PDF untuk resep "${recipe.name}".`,
                `Failed to export PDF for recipe "${recipe.name}".`,
              ),
      });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">
            {pickLang(language, "Project Resep Tersimpan", "Saved Recipe Projects")}
          </h1>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            {pickLang(
              language,
              "Simpan racikan favorit, muat kembali kapan saja, atau cetak langsung ke dokumen PDF.",
              "Save your favorite formulations, reload anytime, or export neatly to PDF.",
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={onOpenExport}>
            <FileText className="h-3.5 w-3.5 text-[var(--status-success)]" aria-hidden="true" />
            <span>{pickLang(language, "Ekspor PDF Aktif", "Export Current PDF")}</span>
          </Button>
          <Button variant="primary" size="sm" onClick={onOpenSaveCurrent}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{pickLang(language, "Simpan Sesi Saat Ini", "Save Current Session")}</span>
          </Button>
        </div>
      </div>

      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={cn(
            "flex items-center justify-between gap-2 border px-3.5 py-2 text-xs font-medium",
            isAntiSlop ? "rounded-lg" : "rounded-xl",
            notice.tone === "error"
              ? "border-[var(--status-danger-border)] bg-[var(--status-danger-soft)] text-[var(--status-danger)]"
              : "border-[var(--status-success-border)] bg-[var(--status-success-soft)] text-[var(--status-success)]",
          )}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded px-2.5 text-[11px] font-bold underline md:min-h-0 md:min-w-0 md:px-1"
          >
            {pickLang(language, "Tutup", "Close")}
          </button>
        </div>
      )}

      {recipes.length === 0 ? (
        <Card interactive={false} className="p-8 text-center text-xs text-[var(--text-secondary)]">
          <p>
            {pickLang(
              language,
              'Belum ada resep tersimpan. Klik "Simpan Sesi Saat Ini" untuk menyimpan racikan aktif.',
              'No saved recipes yet. Click "Save Current Session" to save your active ration.',
            )}
          </p>
          <Button variant="primary" size="sm" onClick={onOpenSaveCurrent} className="mt-3">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{pickLang(language, "Simpan Sesi Saat Ini", "Save Current Session")}</span>
          </Button>
        </Card>
      ) : (
        <Card interactive={false} className="selectable-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-[var(--bg-sunken)] text-[11px] font-bold text-[var(--text-secondary)]">
                <tr>
                  <th className="border-b border-[var(--border-subtle)] px-3.5 py-2.5">
                    {pickLang(language, "Nama Project Resep", "Recipe Project Name")}
                  </th>
                  <th className="border-b border-[var(--border-subtle)] px-3 py-2.5">
                    {pickLang(language, "Standar Ternak", "Livestock Standard")}
                  </th>
                  <th className="border-b border-[var(--border-subtle)] px-2.5 py-2.5 text-center">
                    {pickLang(language, "Bahan", "Feeds")}
                  </th>
                  <th className="border-b border-[var(--border-subtle)] px-2.5 py-2.5 text-center">
                    Basis
                  </th>
                  <th className="border-b border-[var(--border-subtle)] px-3.5 py-2.5 text-right">
                    {pickLang(language, "Aksi", "Actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {recipes.map((r) => {
                  const activeFeedCount = r.ingredients.filter((i) => i.isActive !== false).length;
                  return (
                    <tr key={r.id} className="transition-colors hover:bg-[var(--bg-sunken)]">
                      <td className="px-3.5 py-2.5">
                        <div className="font-bold text-[var(--text-primary)]">{r.name}</div>
                        {r.notes && (
                          <div className="mt-0.5 max-w-md truncate text-[11px] text-[var(--text-muted)]">
                            {r.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-[var(--text-secondary)]">
                        {language === "id"
                          ? r.requirement.name
                          : (r.requirement.nameEn ?? r.requirement.name)}
                      </td>
                      <td className="px-2.5 py-2.5 text-center tabular-nums text-[var(--text-secondary)]">
                        {activeFeedCount}
                      </td>
                      <td className="px-2.5 py-2.5 text-center">
                        <Badge tone={r.config?.activeBasis === "dry_matter" ? "emerald" : "sky"}>
                          {r.config?.activeBasis === "dry_matter"
                            ? pickLang(language, "BK", "DM")
                            : "As-Fed"}
                        </Badge>
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleExportRecipePdf(r)}
                            className="min-h-11 shrink-0 px-3 text-[11px] whitespace-nowrap md:min-h-7 md:px-2.5"
                          >
                            <FileText
                              className="h-3.5 w-3.5 shrink-0 text-[var(--status-success)]"
                              aria-hidden="true"
                            />
                            <span>{pickLang(language, "Ekspor PDF", "Export PDF")}</span>
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onLoadRecipe(r.id)}
                            className="min-h-11 shrink-0 px-3 text-[11px] whitespace-nowrap md:min-h-7 md:px-2.5"
                          >
                            <FolderOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>{pickLang(language, "Buka", "Open")}</span>
                          </Button>
                          {onDeleteRecipe && (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`${pickLang(language, "Hapus resep", "Delete recipe")} ${r.name}`}
                              onClick={() => onDeleteRecipe(r.id)}
                              className="min-h-11 min-w-11 px-2.5 text-[var(--status-danger)] hover:bg-[var(--status-danger-soft)] md:min-h-7 md:min-w-0 md:px-2"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
});
