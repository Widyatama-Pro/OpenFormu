import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type WheelEvent,
} from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  FileSpreadsheet,
  FileText,
  Plus,
  Search,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { FEED_CLASSES, getFeedClassLabel, resolveFeedClass } from "../../data/feed-classes";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import { getNutrientDisplayName, getNutrientFullName, pickLang } from "../../i18n";
import { generateIngredientDatabasePdf, generateIngredientDatabaseXlsx } from "../../storage";
import { useOptionalThemeContext } from "../../theme";
import type {
  AppLanguage,
  FeedClassCode,
  Ingredient,
  Nutrient,
  NutrientTier,
  TableViewTier,
} from "../../types";
import { cn } from "../../utils/cn";
import { downloadBinaryFile } from "../../utils/download";
import { isDerivedNutrient, resolveNutrientValue } from "../../utils/equations";
import {
  formatCurrencyIdr,
  formatNumberLocale,
  resolveDisplayDigits,
} from "../../utils/locale-number";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { FeedClassIcon } from "../ui/FeedClassIcon";
import { Input } from "../ui/Input";

export interface IngredientLibraryPageProps {
  readonly ingredients: readonly Ingredient[];
  readonly allNutrients?: readonly Nutrient[] | undefined;
  readonly customNutrients?: readonly Nutrient[] | undefined;
  readonly language: AppLanguage;
  readonly decimalPlaces?: 0 | 1 | 2 | undefined;
  readonly simpleMode?: boolean | undefined;
  readonly tableViewTier?: TableViewTier | undefined;
  readonly onChangeTableViewTier?: ((tier: TableViewTier) => void) | undefined;
  readonly showNdf?: boolean | undefined;
  readonly showBetn?: boolean | undefined;
  readonly onToggleActive: (id: string, active: boolean) => void;
  readonly onOpenAdd: () => void;
  readonly onImportIngredients?: (nextIngredients: readonly Ingredient[]) => void;
}

const BASIC_NUTRIENT_IDS = new Set(["cp", "me_poultry", "tdn", "ee", "cf", "ca", "p"]);
const STANDARD_EXTRA_IDS = new Set(["ndf", "adf", "betn"]);

const TIER_GROUP_LABEL: Record<
  NutrientTier | "custom",
  { readonly id: string; readonly en: string }
> = {
  basic: { id: "Makro & Energi", en: "Macro & Energy" },
  mineral_electrolyte: { id: "Mineral & Elektrolit", en: "Minerals & Electrolytes" },
  amino_acid: { id: "Asam Amino", en: "Amino Acids" },
  fiber_carb: { id: "Serat & BETN", en: "Fiber & NFE" },
  anf_physical: { id: "ANF & Fisik", en: "ANF & Physical" },
  custom: { id: "Nutrien Kustom", en: "Custom Nutrients" },
};

/**
 * Database Bahan Pakan dikelompokkan berdasarkan 8 klasifikasi bahan pakan standar
 * (IFN / NRC / Hartadi 1980) dengan kontrol Tampilan Kolom (Dasar | Standar | Lanjutan),
 * Popover Kolom, tab horizontal scrollable, dan ekspor khusus PDF rapi untuk peternak.
 */
export const IngredientLibraryPage = memo(function IngredientLibraryPage({
  ingredients,
  allNutrients,
  customNutrients,
  language,
  decimalPlaces = 0,
  simpleMode = true,
  tableViewTier,
  onChangeTableViewTier,
  showNdf = false,
  showBetn = false,
  onToggleActive,
  onOpenAdd,
}: IngredientLibraryPageProps) {
  const themeCtx = useOptionalThemeContext();
  const isAntiSlop = themeCtx?.uiMode === "anti-slop";
  const useGpuFlip = !isAntiSlop && (themeCtx?.motionEngine ?? "gpu_flip") === "gpu_flip";
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState<"all" | FeedClassCode>("all");
  const [collapsedClasses, setCollapsedClasses] = useState<ReadonlySet<FeedClassCode>>(
    () => new Set(),
  );
  const [exportNotice, setExportNotice] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [localTier, setLocalTier] = useState<TableViewTier>(tableViewTier ?? "basic");
  const activeTier: TableViewTier = tableViewTier ?? localTier;
  const [colOverrides, setColOverrides] = useState<Readonly<Record<string, boolean>>>({});
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [expandNameCol, setExpandNameCol] = useState(false);
  const [nameColWidth, setNameColWidth] = useState<number>(210);
  const dragNameRef = useRef<{ startX: number; startW: number } | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(max-width: 767px)").matches
      : false,
  );

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const tabListRef = useRef<HTMLDivElement | null>(null);

  const closePopover = useCallback((options?: { restoreFocus?: boolean }) => {
    setPopoverOpen(false);
    if (options?.restoreFocus) {
      queueMicrotask(() => {
        triggerRef.current?.focus();
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => setIsMobileViewport(mq.matches);
    syncViewport();
    mq.addEventListener?.("change", syncViewport);
    return () => mq.removeEventListener?.("change", syncViewport);
  }, []);

  useEffect(() => {
    if (!popoverOpen) return;

    const getFocusable = (): HTMLElement[] => {
      if (!dialogRef.current) return [];
      const raw = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      return Array.from(raw);
    };

    const first = getFocusable()[0];
    if (first) {
      first.focus();
    } else {
      dialogRef.current?.focus();
    }

    const handleOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(targetNode) &&
        !(dialogRef.current && dialogRef.current.contains(targetNode))
      ) {
        closePopover();
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closePopover({ restoreFocus: true });
        return;
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusables = getFocusable();
        if (focusables.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (event.shiftKey) {
          if (!active || active === first || !dialogRef.current.contains(active)) {
            event.preventDefault();
            last?.focus();
          }
        } else if (!active || active === last || !dialogRef.current.contains(active)) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    window.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [popoverOpen, closePopover]);

  const nutrientsCatalog = useMemo<readonly Nutrient[]>(() => {
    if (allNutrients && allNutrients.length > 0) return allNutrients;
    return [...MOCK_NUTRIENTS, ...(customNutrients ?? [])];
  }, [allNutrients, customNutrients]);

  const handleSelectTier = useCallback(
    (nextTier: TableViewTier) => {
      setLocalTier(nextTier);
      setColOverrides({});
      onChangeTableViewTier?.(nextTier);
    },
    [onChangeTableViewTier],
  );

  const isColVisibleByDefault = useCallback(
    (colId: string): boolean => {
      if (colId === "price" || colId === "basis") return true;
      if (colId === "dm") return activeTier !== "basic";
      if (colId === "bounds") return activeTier !== "basic";
      return true;
    },
    [activeTier],
  );

  const isColVisible = useCallback(
    (colId: string): boolean => {
      const override = colOverrides[colId];
      return override !== undefined ? override : isColVisibleByDefault(colId);
    },
    [colOverrides, isColVisibleByDefault],
  );

  const toggleColumn = useCallback(
    (colId: string) => {
      setColOverrides((prev) => {
        const current = prev[colId] ?? isColVisibleByDefault(colId);
        return { ...prev, [colId]: !current };
      });
    },
    [isColVisibleByDefault],
  );

  const candidateNutrients = useMemo(() => {
    return nutrientsCatalog.filter((n) => {
      if (BASIC_NUTRIENT_IDS.has(n.id) || n.isCustom === true) return true;
      if (activeTier === "standard" && STANDARD_EXTRA_IDS.has(n.id)) return true;
      if (showBetn && n.id === "betn") return true;
      if (showNdf && (n.id === "ndf" || n.id === "adf")) return true;
      return activeTier === "advanced";
    });
  }, [nutrientsCatalog, activeTier, showBetn, showNdf]);

  const visibleNutrients = useMemo(
    () => candidateNutrients.filter((n) => isColVisible(n.id)),
    [candidateNutrients, isColVisible],
  );

  const coreCols = useMemo(
    () => ({
      basis: isColVisible("basis"),
      price: isColVisible("price"),
      dm: isColVisible("dm"),
      bounds: isColVisible("bounds"),
    }),
    [isColVisible],
  );

  const coreToggleItems: ReadonlyArray<{ readonly id: string; readonly label: string }> = [
    { id: "basis", label: "Basis" },
    { id: "price", label: pickLang(language, "Harga", "Price") },
    { id: "dm", label: pickLang(language, "BK", "DM") },
    { id: "bounds", label: "Min/Max" },
  ];

  const groupedNutrients = useMemo(() => {
    const groups = new Map<string, Nutrient[]>();
    for (const nut of candidateNutrients) {
      const key = nut.isCustom ? "custom" : (nut.tier ?? "basic");
      const list = groups.get(key) ?? [];
      list.push(nut);
      groups.set(key, list);
    }
    return Array.from(groups.entries());
  }, [candidateNutrients]);

  const totalColCount = coreToggleItems.length + candidateNutrients.length;
  const visibleColCount =
    coreToggleItems.filter((c) => isColVisible(c.id)).length + visibleNutrients.length;
  const hasCustomOverrides = Object.keys(colOverrides).length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ingredients.filter((ing) => {
      const code = resolveFeedClass(ing);
      const matchesClass = classFilter === "all" || code === classFilter;
      if (!matchesClass) return false;
      if (!q) return true;
      return (
        ing.name.toLowerCase().includes(q) ||
        ing.source.toLowerCase().includes(q) ||
        (ing.nameEn?.toLowerCase().includes(q) ?? false) ||
        getFeedClassLabel(language, code).toLowerCase().includes(q)
      );
    });
  }, [ingredients, query, classFilter, language]);

  // Hitung total bahan per kelas dari seluruh katalog untuk pill filter
  const classCounts = useMemo(() => {
    const counts = new Map<FeedClassCode, number>();
    for (const fc of FEED_CLASSES) counts.set(fc.code, 0);
    for (const ing of ingredients) {
      const code = resolveFeedClass(ing);
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    return counts;
  }, [ingredients]);

  // Kelompokkan hasil filter ke dalam 8 kelas standar:
  // Saat filter "Semua 8 Kelas" aktif, sembunyikan otomatis kelas yang jumlah bahannya 0.
  const groupedByClass = useMemo(() => {
    const groups = new Map<FeedClassCode, Ingredient[]>();
    for (const fc of FEED_CLASSES) groups.set(fc.code, []);
    for (const ing of filtered) {
      const code = resolveFeedClass(ing);
      groups.get(code)?.push(ing);
    }
    return FEED_CLASSES.map((fc) => ({
      meta: fc,
      items: groups.get(fc.code) ?? [],
    })).filter((g) => (classFilter === "all" ? g.items.length > 0 : g.meta.code === classFilter));
  }, [filtered, classFilter]);

  const toggleGroupCollapse = (code: FeedClassCode) => {
    setCollapsedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleTabWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    const el = tabListRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      el.scrollLeft += event.deltaY;
    }
  }, []);

  const scrollTabsBy = useCallback((deltaPx: number) => {
    const el = tabListRef.current;
    if (!el) return;
    if (typeof el.scrollBy === "function") {
      el.scrollBy({ left: deltaPx, behavior: "smooth" });
    } else {
      el.scrollLeft += deltaPx;
    }
  }, []);

  const allTabKeys: ReadonlyArray<"all" | FeedClassCode> = useMemo(
    () => ["all", ...FEED_CLASSES.map((fc) => fc.code)],
    [],
  );

  const handleTabKeyDown = useCallback(
    (idx: number, event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const delta = event.key === "ArrowRight" ? 1 : -1;
        const nextIdx = (idx + delta + allTabKeys.length) % allTabKeys.length;
        const nextKey = allTabKeys[nextIdx];
        if (nextKey !== undefined) {
          setClassFilter(nextKey);
          const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
          const nextBtn = buttons?.[nextIdx];
          nextBtn?.focus();
          if (typeof nextBtn?.scrollIntoView === "function") {
            nextBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
          }
        }
      }
    },
    [allTabKeys],
  );

  const handleExportPdf = () => {
    try {
      const bytes = generateIngredientDatabasePdf({
        ingredients: filtered,
        title:
          classFilter === "all"
            ? "DATABASE BAHAN PAKAN (8 KLASIFIKASI STANDAR)"
            : `DATABASE BAHAN PAKAN - ${getFeedClassLabel("id", classFilter).toUpperCase()}`,
        decimalPlaces,
      });
      const filename =
        classFilter === "all"
          ? "openformu-database-pakan.pdf"
          : `openformu-kelas-${classFilter}.pdf`;
      downloadBinaryFile(bytes, filename, "application/pdf");
      setExportNotice({
        tone: "success",
        text: pickLang(
          language,
          `Dokumen PDF "${filename}" (${filtered.length} bahan) berhasil diunduh.`,
          `PDF "${filename}" (${filtered.length} feeds) downloaded.`,
        ),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setExportNotice({
        tone: "error",
        text: pickLang(language, `Gagal mengekspor PDF: ${msg}`, `Failed to export PDF: ${msg}`),
      });
    }
  };

  const handleExportXlsx = () => {
    try {
      const bytes = generateIngredientDatabaseXlsx({
        ingredients: filtered,
        nutrientsCatalog,
        title:
          classFilter === "all"
            ? "OpenFormu — Database Bahan Pakan Lengkap (8 Kelas IFN, 25 Nutrien)"
            : `OpenFormu — Database Bahan Pakan ${getFeedClassLabel("id", classFilter)}`,
      });
      const filename =
        classFilter === "all"
          ? "openformu-database-pakan-lengkap.xlsx"
          : `openformu-kelas-${classFilter}-lengkap.xlsx`;
      downloadBinaryFile(
        bytes,
        filename,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      setExportNotice({
        tone: "success",
        text: pickLang(
          language,
          `Workbook Excel "${filename}" (${filtered.length} bahan, 25 kolom nutrien) berhasil diunduh.`,
          `Excel workbook "${filename}" (${filtered.length} feeds, 25 nutrient columns) downloaded.`,
        ),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setExportNotice({
        tone: "error",
        text: pickLang(
          language,
          `Gagal mengekspor Excel: ${msg}`,
          `Failed to export Excel: ${msg}`,
        ),
      });
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">
            {pickLang(language, "Database Kandungan Bahan Pakan", "Feed Ingredient Database")}
          </h1>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            {pickLang(
              language,
              "Dikelompokkan berdasarkan 8 klasifikasi bahan pakan standar internasional. Nilai kosong ditampilkan N/A.",
              "Grouped into the 8 standard international feed classes. Missing lab data is marked N/A.",
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportXlsx}>
            <FileSpreadsheet className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>{pickLang(language, "Ekspor Excel (.xlsx)", "Export Excel (.xlsx)")}</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportPdf}>
            <FileText className="h-3.5 w-3.5 text-[var(--status-success)]" />
            <span>{pickLang(language, "Ekspor PDF", "Export PDF")}</span>
          </Button>
          <Button variant="primary" size="sm" onClick={onOpenAdd}>
            <Plus className="h-3.5 w-3.5" />
            <span>{pickLang(language, "Tambah Bahan", "Add Feed")}</span>
          </Button>
        </div>
      </div>

      {exportNotice && (
        <div
          role={exportNotice.tone === "error" ? "alert" : "status"}
          className={cn(
            "flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium",
            exportNotice.tone === "error"
              ? "border-[var(--status-danger-border)] bg-[var(--status-danger-soft)] text-[var(--status-danger)]"
              : "border-[var(--status-success-border)] bg-[var(--status-success-soft)] text-[var(--status-success)]",
          )}
        >
          <span>{exportNotice.text}</span>
          <button
            type="button"
            onClick={() => setExportNotice(null)}
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center px-2 text-[11px] font-bold underline md:min-h-0 md:min-w-0"
          >
            {pickLang(language, "Tutup", "Close")}
          </button>
        </div>
      )}

      {/* Pencarian, Baris Tab 8 Kelas yang Bisa Digulir, & Kontrol Tampilan Kolom (Dasar/Standar/Lanjutan) */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={pickLang(
              language,
              "Cari nama bahan, kelas pakan, atau sumber (Hartadi, NRC, Feedipedia)…",
              "Search feed name, feed class, or source (Hartadi, NRC, Feedipedia)…",
            )}
            className="pl-10"
          />
        </div>

        {/* Baris Tab 8 Kelas Bahan Pakan dengan Horizontal Wheel Scroll & Tombol Geser */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scrollTabsBy(-200)}
            aria-label={pickLang(language, "Geser tab kelas ke kiri", "Scroll class tabs left")}
            title={pickLang(language, "Geser tab ke kiri", "Scroll tabs left")}
            className={cn(
              "inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] md:h-8 md:w-8",
              isAntiSlop
                ? "border border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] hover:border-[var(--color-primary)]"
                : "neu-pill-btn",
            )}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <div
            ref={tabListRef}
            role="tablist"
            onWheel={handleTabWheel}
            aria-label={pickLang(
              language,
              "Filter 8 klasifikasi bahan pakan",
              "Filter 8 standard feed classes",
            )}
            className="custom-scrollbar flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-x-auto py-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={classFilter === "all"}
              onKeyDown={(e) => handleTabKeyDown(0, e)}
              onClick={(e) => {
                setClassFilter("all");
                if (typeof e.currentTarget.scrollIntoView === "function") {
                  e.currentTarget.scrollIntoView({
                    behavior: "smooth",
                    inline: "center",
                    block: "nearest",
                  });
                }
              }}
              className={cn(
                "inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-[background-color,color] duration-150 md:min-h-0",
                !isAntiSlop &&
                  "transition-[transform,background-color,color] active:scale-[0.97] motion-reduce:transform-none",
                classFilter === "all"
                  ? cn(
                      "border-transparent bg-[var(--color-primary)] text-[var(--text-on-primary)]",
                      !isAntiSlop && "shadow-[var(--shadow-neu-flat)]",
                    )
                  : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]",
              )}
            >
              <span>{pickLang(language, "Semua 8 Kelas", "All 8 Classes")}</span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.2 text-[10px] tabular-nums",
                  classFilter === "all"
                    ? "bg-black/15 text-[var(--text-on-primary)]"
                    : "bg-[var(--bg-sunken)] text-[var(--text-secondary)]",
                )}
              >
                {ingredients.length}
              </span>
            </button>

            {FEED_CLASSES.map((fc, idx) => {
              const active = classFilter === fc.code;
              const count = classCounts.get(fc.code) ?? 0;
              return (
                <button
                  key={fc.code}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onKeyDown={(e) => handleTabKeyDown(idx + 1, e)}
                  onClick={(e) => {
                    setClassFilter(fc.code);
                    if (typeof e.currentTarget.scrollIntoView === "function") {
                      e.currentTarget.scrollIntoView({
                        behavior: "smooth",
                        inline: "center",
                        block: "nearest",
                      });
                    }
                  }}
                  className={cn(
                    "inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-[background-color,color] duration-150 md:min-h-0",
                    !isAntiSlop &&
                      "transition-[transform,background-color,color] active:scale-[0.97] motion-reduce:transform-none",
                    active
                      ? cn(
                          "border-transparent bg-[var(--color-primary)] text-[var(--text-on-primary)]",
                          !isAntiSlop && "shadow-[var(--shadow-neu-flat)]",
                        )
                      : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]",
                  )}
                >
                  <span>
                    {fc.code}. {language === "id" ? fc.shortId : fc.shortEn}
                  </span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.2 text-[10px] tabular-nums",
                      active
                        ? "bg-black/15 text-[var(--text-on-primary)]"
                        : "bg-[var(--bg-sunken)] text-[var(--text-secondary)]",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollTabsBy(200)}
            aria-label={pickLang(language, "Geser tab kelas ke kanan", "Scroll class tabs right")}
            title={pickLang(language, "Geser tab ke kanan", "Scroll tabs right")}
            className={cn(
              "inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] md:h-8 md:w-8",
              isAntiSlop
                ? "border border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] hover:border-[var(--color-primary)]"
                : "neu-pill-btn",
            )}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Kontrol 1 Baris Ringkas: Segmented Tier (Dasar / Standar / Lanjutan) + Popover Kolom */}
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-[11px]",
            isAntiSlop
              ? "border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
              : "acrylic-subcard",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[var(--text-secondary)]">
              {pickLang(language, "Tampilan Kolom:", "Column View:")}
            </span>
            <div
              role="group"
              aria-label={pickLang(language, "Tingkat tampilan kolom tabel", "Table column tier")}
              className={cn(
                "inline-flex rounded-xl border border-[var(--border-subtle)] p-0.5",
                isAntiSlop
                  ? "bg-[var(--bg-sunken)]"
                  : "border-[var(--glass-border-tint,var(--border-subtle))] bg-[var(--bg-sunken)]/70",
              )}
            >
              {(
                [
                  {
                    id: "basic",
                    label: pickLang(language, "Dasar", "Basic"),
                    hint: pickLang(
                      language,
                      "Tampilkan nutrien dasar utama (PK, EM, TDN, LK, SK, Ca, P)",
                      "Show primary basic nutrients (CP, ME, TDN, EE, CF, Ca, P)",
                    ),
                  },
                  {
                    id: "standard",
                    label: pickLang(language, "Standar", "Standard"),
                    hint: pickLang(
                      language,
                      "Tampilkan BK %, Min/Max %, NDF, ADF, dan BETN",
                      "Show DM %, Min/Max %, NDF, ADF, and NFE",
                    ),
                  },
                  {
                    id: "advanced",
                    label: pickLang(language, "Lanjutan", "Advanced"),
                    hint: pickLang(
                      language,
                      "Tampilkan seluruh nutrien lanjutan (Asam Amino, Elektrolit, Serat, ANF)",
                      "Show all advanced nutrients (Amino Acids, Electrolytes, Fiber, ANF)",
                    ),
                  },
                ] as const
              ).map((t) => {
                const active = activeTier === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={active}
                    title={t.hint}
                    onClick={() => handleSelectTier(t.id)}
                    className={cn(
                      "elastic-size-box relative min-h-11 cursor-pointer rounded-lg px-2.5 py-0.5 text-[11px] font-semibold transition-colors duration-150 md:min-h-0",
                      !isAntiSlop &&
                        "transition-[transform,color] active:scale-[0.97] motion-reduce:transform-none",
                      active
                        ? t.id === "advanced"
                          ? "text-[var(--text-on-primary)]"
                          : isAntiSlop
                            ? "text-[var(--text-primary)]"
                            : "text-[var(--status-success)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    {active &&
                      (useGpuFlip ? (
                        <motion.span
                          layoutId="db-table-tier-pill"
                          transition={{ type: "spring", stiffness: 460, damping: 34, mass: 0.75 }}
                          aria-hidden="true"
                          className={cn(
                            "pointer-events-none absolute inset-0 rounded-lg",
                            t.id === "advanced"
                              ? "bg-[var(--color-primary)] shadow-[0_2px_10px_-2px_var(--glow-primary-soft,rgba(0,0,0,0.18))]"
                              : "glow-pill-emerald border border-[var(--status-success-border)]",
                          )}
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className={cn(
                            "pointer-events-none absolute inset-0 rounded-lg",
                            t.id === "advanced"
                              ? cn(
                                  "bg-[var(--color-primary)]",
                                  !isAntiSlop && "shadow-[var(--shadow-neu-flat)]",
                                )
                              : cn(
                                  "bg-[var(--bg-surface-elevated)]",
                                  isAntiSlop
                                    ? "border border-[var(--border-strong)]"
                                    : "shadow-[var(--shadow-neu-flat)]",
                                ),
                          )}
                        />
                      ))}
                    <span className="relative z-10">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tombol Popover Kolom Terkelompok */}
          <div className="relative" ref={popoverRef}>
            <button
              ref={triggerRef}
              type="button"
              aria-expanded={popoverOpen}
              aria-haspopup="dialog"
              onClick={() => {
                if (popoverOpen) {
                  closePopover({ restoreFocus: true });
                } else {
                  setIsMobileViewport(
                    typeof window !== "undefined" &&
                      (window.innerWidth <= 767 ||
                        Boolean(window.matchMedia?.("(max-width: 767px)").matches)),
                  );
                  setPopoverOpen(true);
                }
              }}
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-[var(--text-primary)] md:min-h-0",
                isAntiSlop
                  ? "border border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] hover:border-[var(--color-primary)]"
                  : "neu-pill-btn",
                popoverOpen && "border-[var(--color-primary)] bg-[var(--bg-surface-elevated)]",
              )}
            >
              <Columns3 className="h-3.5 w-3.5 text-[var(--color-primary)]" aria-hidden="true" />
              <span>
                {pickLang(language, "Kolom", "Columns")} ({visibleColCount}/{totalColCount})
              </span>
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "h-3 w-3 text-[var(--text-muted)] transition-transform duration-150",
                  popoverOpen && "rotate-180",
                )}
              />
            </button>

            {popoverOpen &&
              (() => {
                const panel = (
                  <div
                    ref={dialogRef}
                    role="dialog"
                    tabIndex={-1}
                    aria-modal={isMobileViewport ? "true" : undefined}
                    aria-label={pickLang(
                      language,
                      "Pilih kolom database yang ditampilkan",
                      "Toggle database columns",
                    )}
                    className={cn(
                      "border bg-[var(--bg-surface-elevated)] p-3 text-xs outline-none",
                      isAntiSlop
                        ? "border-[var(--border-strong)] shadow-[var(--shadow-neu-elevated)]"
                        : "border-[var(--border-subtle)] shadow-[0_14px_34px_-10px_rgba(0,0,0,0.28)]",
                      isMobileViewport
                        ? "w-full max-w-md rounded-t-2xl pb-[calc(1rem+env(safe-area-inset-bottom))]"
                        : "absolute right-0 z-40 mt-1.5 w-72 rounded-xl sm:w-80",
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-1.5">
                      <span className="font-bold text-[var(--text-primary)]">
                        {pickLang(language, "Atur Kolom Database", "Customize Database Columns")}
                      </span>
                      <div className="flex items-center gap-1">
                        {hasCustomOverrides && (
                          <button
                            type="button"
                            onClick={() => setColOverrides({})}
                            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded px-2 text-[10px] font-semibold text-[var(--status-success)] hover:bg-[var(--status-success-soft)] md:min-h-7 md:min-w-0 md:px-1.5"
                          >
                            {pickLang(language, "Reset", "Reset")}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => closePopover({ restoreFocus: true })}
                          aria-label={pickLang(
                            language,
                            "Tutup pengatur kolom",
                            "Close column picker",
                          )}
                          className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)] md:min-h-7 md:min-w-7"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="custom-scrollbar max-h-64 space-y-2.5 overflow-y-auto pr-1">
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                          {pickLang(language, "Inti & Batasan", "Core & Bounds")}
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {coreToggleItems.map((col) => {
                            const checked = isColVisible(col.id);
                            return (
                              <label
                                key={col.id}
                                className="inline-flex min-h-11 cursor-pointer items-center gap-2 py-1 text-[11px] font-medium text-[var(--text-primary)] select-none md:min-h-0 md:gap-1.5 md:py-0"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleColumn(col.id)}
                                  className="h-4 w-4 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--color-primary)] md:h-3.5 md:w-3.5"
                                />
                                <span>{col.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {groupedNutrients.map(([groupKey, nuts]) => {
                        const groupMeta =
                          TIER_GROUP_LABEL[groupKey as NutrientTier | "custom"] ??
                          TIER_GROUP_LABEL.basic;
                        return (
                          <div
                            key={groupKey}
                            className="border-t border-[var(--border-subtle)] pt-2"
                          >
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                              {language === "id" ? groupMeta.id : groupMeta.en}
                            </p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {nuts.map((nut) => {
                                const checked = isColVisible(nut.id);
                                const shortLabel = getNutrientDisplayName(
                                  nut,
                                  language,
                                  simpleMode,
                                );
                                const fullName = getNutrientFullName(nut, language);
                                return (
                                  <label
                                    key={nut.id}
                                    title={fullName}
                                    className="inline-flex min-h-11 cursor-pointer items-center gap-2 py-1 text-[11px] font-medium text-[var(--text-primary)] select-none md:min-h-0 md:gap-1.5 md:py-0"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleColumn(nut.id)}
                                      className="h-4 w-4 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--color-primary)] md:h-3.5 md:w-3.5"
                                    />
                                    <span className="truncate">{shortLabel}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );

                return isMobileViewport ? (
                  <div
                    className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55"
                    onMouseDown={(event) => {
                      if (event.target === event.currentTarget) {
                        closePopover({ restoreFocus: true });
                      }
                    }}
                  >
                    {panel}
                  </div>
                ) : (
                  panel
                );
              })()}
          </div>
        </div>
      </div>

      {/* Daftar Kelompok 8 Klasifikasi Bahan Pakan */}
      <div className="selectable-panel space-y-3">
        {groupedByClass.length === 0 && (
          <Card interactive={false} className="p-6 text-center">
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              {ingredients.length === 0
                ? pickLang(
                    language,
                    "Database bahan pakan masih kosong. Tambahkan bahan pakan pertama untuk mulai memformulasi ransum.",
                    "The feed ingredient database is empty. Add your first ingredient to start formulating.",
                  )
                : query.trim() !== ""
                  ? pickLang(
                      language,
                      `Tidak ada bahan pakan yang cocok dengan pencarian “${query}”.`,
                      `No feed ingredients match “${query}”.`,
                    )
                  : pickLang(
                      language,
                      "Tidak ada bahan pakan pada kelas yang dipilih.",
                      "No feed ingredients found in the selected class.",
                    )}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {ingredients.length === 0 && (
                <Button variant="primary" size="sm" onClick={onOpenAdd}>
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{pickLang(language, "Tambah Bahan", "Add Feed")}</span>
                </Button>
              )}
              {query.trim() !== "" && (
                <Button variant="secondary" size="sm" onClick={() => setQuery("")}>
                  {pickLang(language, "Reset Pencarian", "Reset Search")}
                </Button>
              )}
              {classFilter !== "all" && (
                <Button variant="secondary" size="sm" onClick={() => setClassFilter("all")}>
                  {pickLang(language, "Tampilkan Semua 8 Kelas", "Show All 8 Classes")}
                </Button>
              )}
            </div>
          </Card>
        )}
        {groupedByClass.map(({ meta, items }) => {
          const isCollapsed = collapsedClasses.has(meta.code);
          return (
            <Card key={meta.code} interactive={false} className="overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroupCollapse(meta.code)}
                aria-expanded={!isCollapsed}
                className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-2.5 text-left transition-colors hover:bg-[var(--bg-surface)]"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {isCollapsed ? (
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-[var(--text-secondary)]"
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-[var(--status-success)]"
                      aria-hidden="true"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-bold text-[var(--text-primary)]">
                        {getFeedClassLabel(language, meta.code)}
                      </h2>
                      <Badge tone={items.length > 0 ? "emerald" : "neutral"}>
                        {items.length} {pickLang(language, "bahan", "feeds")}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-[var(--text-secondary)]">
                      {language === "id" ? meta.descriptionId : meta.descriptionEn}
                    </p>
                  </div>
                </div>
              </button>

              {!isCollapsed &&
                (items.length === 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-4">
                    <p className="text-xs text-[var(--text-muted)]">
                      {pickLang(
                        language,
                        "Belum ada bahan pada kelas ini untuk filter pencarian saat ini.",
                        "No ingredients in this class match the current filter.",
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {query.trim() !== "" && (
                        <Button variant="secondary" size="sm" onClick={() => setQuery("")}>
                          {pickLang(language, "Reset Pencarian", "Reset Search")}
                        </Button>
                      )}
                      {classFilter !== "all" && (
                        <Button variant="secondary" size="sm" onClick={() => setClassFilter("all")}>
                          {pickLang(language, "Semua 8 Kelas", "All 8 Classes")}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{ touchAction: "pan-x pan-y" }}
                    className="custom-scrollbar max-h-[360px] overflow-auto"
                  >
                    <table className="w-max min-w-full border-collapse text-left text-xs">
                      <thead className="sticky top-0 z-10 bg-[var(--bg-sunken)] text-[11px] font-bold text-[var(--text-secondary)]">
                        <tr>
                          <th className="w-11 border-r border-b border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-2 py-2 text-center md:sticky md:left-0 md:z-20 md:w-14 md:px-3">
                            {pickLang(language, "Pakai", "Use")}
                          </th>
                          <th
                            style={
                              expandNameCol
                                ? { minWidth: "280px", maxWidth: "420px" }
                                : {
                                    width: `${nameColWidth}px`,
                                    minWidth: `${nameColWidth}px`,
                                    maxWidth: `${nameColWidth}px`,
                                  }
                            }
                            className="relative border-r border-b border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-2 py-2 pr-4 md:sticky md:left-14 md:z-20 md:px-3"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span>{pickLang(language, "Nama Bahan", "Ingredient")}</span>
                              <button
                                type="button"
                                onClick={() => setExpandNameCol((prev) => !prev)}
                                aria-pressed={expandNameCol}
                                title={pickLang(
                                  language,
                                  "Perlebar untuk melihat nama bahan dan sumber secara penuh",
                                  "Expand to view full ingredient name and source",
                                )}
                                aria-label={pickLang(
                                  language,
                                  "Lihat nama bahan secara penuh",
                                  "View full ingredient name",
                                )}
                                className="inline-flex h-5 shrink-0 cursor-pointer items-center justify-center rounded border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-1.5 text-[10px] font-bold text-[var(--text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--text-primary)]"
                              >
                                {expandNameCol
                                  ? pickLang(language, "Ringkas", "Compact")
                                  : pickLang(language, "↔ Full", "↔ Full")}
                              </button>
                            </div>
                            <div
                              role="separator"
                              aria-orientation="vertical"
                              aria-label={pickLang(
                                language,
                                "Geser lebar kolom nama bahan",
                                "Resize ingredient name column",
                              )}
                              style={{ touchAction: "none" }}
                              onPointerDown={(e) => {
                                e.preventDefault();
                                setExpandNameCol(false);
                                dragNameRef.current = {
                                  startX: e.clientX,
                                  startW: nameColWidth,
                                };
                                const onMove = (ev: PointerEvent) => {
                                  if (!dragNameRef.current) return;
                                  const next = Math.max(
                                    148,
                                    Math.min(
                                      440,
                                      Math.round(
                                        dragNameRef.current.startW +
                                          (ev.clientX - dragNameRef.current.startX),
                                      ),
                                    ),
                                  );
                                  setNameColWidth(next);
                                };
                                const onUp = () => {
                                  dragNameRef.current = null;
                                  window.removeEventListener("pointermove", onMove);
                                  window.removeEventListener("pointerup", onUp);
                                };
                                window.addEventListener("pointermove", onMove);
                                window.addEventListener("pointerup", onUp);
                              }}
                              className="absolute top-0 right-0 bottom-0 flex w-3.5 cursor-col-resize items-center justify-center select-none hover:bg-[var(--primary-soft)]"
                            >
                              <span
                                aria-hidden="true"
                                className="h-3.5 w-0.5 rounded-full bg-[var(--border-strong)]"
                              />
                            </div>
                          </th>
                          {coreCols.basis && (
                            <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-center">
                              Basis
                            </th>
                          )}
                          {coreCols.price && (
                            <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-right whitespace-nowrap">
                              {pickLang(language, "Harga/kg", "Price/kg")}
                            </th>
                          )}
                          {coreCols.dm && (
                            <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-right whitespace-nowrap">
                              {pickLang(language, "BK %", "DM %")}
                            </th>
                          )}
                          {coreCols.bounds && (
                            <>
                              <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-right whitespace-nowrap">
                                Min %
                              </th>
                              <th className="border-b border-[var(--border-subtle)] px-2 py-2 text-right whitespace-nowrap">
                                Max %
                              </th>
                            </>
                          )}
                          {visibleNutrients.map((nut) => {
                            const headerLabel = getNutrientDisplayName(nut, language, simpleMode);
                            const fullLabel = getNutrientFullName(nut, language);
                            return (
                              <th
                                key={nut.id}
                                title={`${fullLabel} (${nut.unit})`}
                                className="border-b border-[var(--border-subtle)] px-2.5 py-2 text-right whitespace-nowrap"
                              >
                                <div className="text-[var(--text-primary)]">{headerLabel}</div>
                                <div className="text-[10px] font-medium lowercase text-[var(--text-muted)]">
                                  {nut.unit}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {items.map((ing) => {
                          const isActive = ing.isActive !== false;
                          const displayName =
                            language === "id" ? ing.name : (ing.nameEn ?? ing.name);
                          const minInc = ing.inclusion?.min ?? 0;
                          const maxInc = ing.inclusion?.max ?? 100;

                          return (
                            <tr
                              key={ing.id}
                              className={cn(
                                "transition-colors hover:bg-[var(--bg-sunken)]",
                                isActive && "bg-[var(--status-success-soft)]",
                              )}
                            >
                              <td className="w-11 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 text-center md:sticky md:left-0 md:z-10 md:w-14 md:px-3">
                                <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center md:min-h-0 md:min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isActive}
                                    aria-label={`${pickLang(language, "Pakai", "Use")} ${displayName}`}
                                    onChange={(e) => onToggleActive(ing.id, e.target.checked)}
                                    className="h-4 w-4 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--color-primary)]"
                                  />
                                </label>
                              </td>
                              <td
                                title={`${displayName} — ${ing.source}`}
                                onClick={() => setExpandNameCol((prev) => !prev)}
                                style={
                                  expandNameCol
                                    ? { minWidth: "280px", maxWidth: "420px" }
                                    : {
                                        width: `${nameColWidth}px`,
                                        minWidth: `${nameColWidth}px`,
                                        maxWidth: `${nameColWidth}px`,
                                      }
                                }
                                className="cursor-pointer border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 md:sticky md:left-14 md:z-10 md:px-3"
                              >
                                <div className="flex items-start gap-2">
                                  <FeedClassIcon
                                    code={meta.code}
                                    language={language}
                                    className="mt-0.5 shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div
                                      className={cn(
                                        "font-semibold text-[var(--text-primary)]",
                                        expandNameCol || nameColWidth >= 260
                                          ? "leading-snug break-words whitespace-normal"
                                          : "truncate",
                                      )}
                                    >
                                      {displayName}
                                    </div>
                                    <div
                                      className={cn(
                                        "text-[10px] text-[var(--text-muted)]",
                                        expandNameCol || nameColWidth >= 260
                                          ? "leading-snug break-words whitespace-normal"
                                          : "truncate",
                                      )}
                                    >
                                      {ing.source}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              {coreCols.basis && (
                                <td className="px-2 py-1.5 text-center">
                                  <Badge tone={ing.basis === "as_fed" ? "sky" : "emerald"}>
                                    {ing.basis === "as_fed" ? "AF" : "BK"}
                                  </Badge>
                                </td>
                              )}
                              {coreCols.price && (
                                <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums text-[var(--text-primary)]">
                                  {formatCurrencyIdr(ing.priceOverride ?? ing.pricePerKg)}
                                </td>
                              )}
                              {coreCols.dm && (
                                <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums text-[var(--text-secondary)]">
                                  {formatNumberLocale(
                                    ing.dryMatter,
                                    resolveDisplayDigits("%", "dm", decimalPlaces, ing.dryMatter),
                                  )}
                                </td>
                              )}
                              {coreCols.bounds && (
                                <>
                                  <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums text-[var(--text-secondary)]">
                                    {formatNumberLocale(
                                      minInc,
                                      resolveDisplayDigits("%", "min", decimalPlaces, minInc),
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums text-[var(--text-secondary)]">
                                    {formatNumberLocale(
                                      maxInc,
                                      resolveDisplayDigits("%", "max", decimalPlaces, maxInc),
                                    )}
                                  </td>
                                </>
                              )}
                              {visibleNutrients.map((nut) => {
                                const rawVal = isDerivedNutrient(nut.id)
                                  ? resolveNutrientValue(ing, nut.id)
                                  : ing.nutrients[nut.id];
                                const hasVal = rawVal !== null && rawVal !== undefined;
                                const digits = resolveDisplayDigits(
                                  nut.unit,
                                  nut.id,
                                  decimalPlaces,
                                  rawVal,
                                );
                                return (
                                  <td
                                    key={nut.id}
                                    className={cn(
                                      "px-2.5 py-1.5 text-right whitespace-nowrap tabular-nums",
                                      hasVal
                                        ? "text-[var(--text-primary)]"
                                        : "text-[var(--text-muted)]",
                                    )}
                                  >
                                    {hasVal ? formatNumberLocale(rawVal, digits) : "N/A"}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
            </Card>
          );
        })}
      </div>
    </div>
  );
});
