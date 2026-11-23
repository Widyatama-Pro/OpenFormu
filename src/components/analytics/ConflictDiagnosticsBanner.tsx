import { AlertCircle, AlertTriangle } from "lucide-react";
import { formatIisBound, pickLang, translateConflict } from "../../i18n";
import { useOptionalThemeContext } from "../../theme";
import type { AppLanguage, ConflictDiagnostic, FormulationStatus, IisItem } from "../../types";
import { cn } from "../../utils/cn";
import { formatNumberLocale } from "../../utils/locale-number";

export interface ConflictDiagnosticsBannerProps {
  readonly status: FormulationStatus;
  readonly conflicts: readonly ConflictDiagnostic[];
  readonly messages: readonly string[];
  /** PR-01: subset kendala minimal pemicu infeasibility. */
  readonly iis?: readonly IisItem[] | undefined;
  readonly relaxationPenalty?: number | undefined;
  readonly language?: AppLanguage;
}

export function ConflictDiagnosticsBanner({
  status,
  conflicts,
  messages,
  iis,
  relaxationPenalty,
  language = "id",
}: ConflictDiagnosticsBannerProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";
  const errors = conflicts.filter((c) => c.severity === "error");
  const warnings = conflicts.filter(
    (c) => c.severity === "warning" && c.code !== "ADVANCE_NULL_DATA",
  );

  if (status !== "infeasible" && status !== "near_feasible" && warnings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2.5">
      {(status === "infeasible" || errors.length > 0) && (
        <div
          role="alert"
          className={cn(
            "border border-[var(--status-danger-border)] bg-[var(--status-danger-soft)] p-3.5 text-xs text-[var(--text-primary)]",
            isAntiSlop ? "rounded-lg" : "glass-card glass-card-coral rounded-2xl",
          )}
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-danger)]"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="font-bold text-[var(--status-danger)]">
                {pickLang(
                  language,
                  isAntiSlop
                    ? "Formula Tidak Ditemukan (Target Terlalu Ketat): Kendala Konflik Terdeteksi"
                    : "Formula Tidak Ditemukan (Target Terlalu Ketat) — Kendala Konflik Terdeteksi",
                  isAntiSlop
                    ? "Infeasible Formulation: Conflicting Constraints Detected"
                    : "Infeasible Formulation — Conflicting Constraints Detected",
                )}
              </p>
              <ul className="list-disc space-y-1 pl-4">
                {errors.map((err, i) => {
                  const localized = translateConflict(language, err);
                  return (
                    <li key={`${err.code}-${i}`}>
                      <span>{localized.message}</span>
                      {localized.suggestion && (
                        <span className="block text-[11px] text-[var(--text-secondary)]">
                          {pickLang(language, "Saran", "Tip")}: {localized.suggestion}
                        </span>
                      )}
                    </li>
                  );
                })}
                {errors.length === 0 && messages.map((msg, i) => <li key={`msg-${i}`}>{msg}</li>)}
                {iis && iis.length > 0 && (
                  <li key="iis-list">
                    <span className="mt-1 block text-[10px] font-semibold text-[var(--status-danger)]">
                      {pickLang(language, "IIS minimal (Chinneck)", "Minimal IIS (Chinneck)")}:{" "}
                      {iis
                        .map(
                          (it) =>
                            `${it.kind}:${it.targetId} ${formatIisBound(language, it.bound)}${it.tier ? ` [${it.tier}]` : ""}`,
                        )
                        .join(" · ")}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {(status === "near_feasible" || warnings.length > 0) && status !== "infeasible" && (
        <div
          role="status"
          className={cn(
            "border border-[var(--status-warning-border)] bg-[var(--status-warning-soft)] p-3.5 text-xs text-[var(--text-primary)]",
            isAntiSlop ? "rounded-lg" : "glass-card glass-card-amber rounded-2xl",
          )}
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-warning)]" />
            <div className="space-y-1">
              <p className="font-bold text-[var(--status-warning)]">
                {status === "near_feasible"
                  ? pickLang(
                      language,
                      "Mendekati Target (Toleransi Batas Aktif)",
                      "Closest Fit (Flexible Bounds Active)",
                    )
                  : pickLang(language, "Peringatan Batasan Formulasi", "Formulation Warnings")}
                {status === "near_feasible" &&
                  relaxationPenalty !== undefined &&
                  relaxationPenalty > 0 && (
                    <span className="ml-2 text-[10px] font-medium text-[var(--text-secondary)]">
                      ({pickLang(language, "Penalti", "Penalty")}:{" "}
                      {formatNumberLocale(relaxationPenalty, 1)})
                    </span>
                  )}
              </p>
              <ul className="list-disc space-y-1 pl-4">
                {warnings.map((w, i) => {
                  const localized = translateConflict(language, w);
                  return (
                    <li key={`${w.code}-${i}`}>
                      <span>{localized.message}</span>
                      {localized.suggestion && (
                        <span className="block text-[11px] text-[var(--text-secondary)]">
                          {pickLang(language, "Saran", "Tip")}: {localized.suggestion}
                        </span>
                      )}
                    </li>
                  );
                })}
                {warnings.length === 0 && messages.map((m, i) => <li key={`warn-m-${i}`}>{m}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
