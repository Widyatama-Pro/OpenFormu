import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronDown, Columns3, GripVertical, RotateCcw, Sliders, X } from "lucide-react";
import { motion } from "motion/react";
import { resolveFeedClass } from "../../data/feed-classes";
import { MOCK_NUTRIENTS } from "../../data/mock-state";
import { getNutrientDisplayName, getNutrientFullName, pickLang } from "../../i18n";
import { useOptionalThemeContext } from "../../theme";
import type {
  AppLanguage,
  CompositionItem,
  Ingredient,
  Nutrient,
  NutrientTier,
  TableViewTier,
} from "../../types";
import { cn } from "../../utils/cn";
import { isDerivedNutrient, resolveNutrientValue } from "../../utils/equations";
import {
  formatCurrencyIdr,
  formatNumberLocale,
  resolveDisplayDigits,
} from "../../utils/locale-number";
import { isPoultrySpecies, isRuminantSpecies } from "../../utils/species";
import { applyTsvGridPaste, type PasteColumnKey } from "../../utils/tsvPaste";
import { Badge } from "../ui/Badge";
import { FeedClassIcon } from "../ui/FeedClassIcon";
import { NumericCellInput } from "./NumericCellInput";

export interface IngredientDesktopTableProps {
  readonly ingredients: readonly Ingredient[];
  readonly allIngredients?: readonly Ingredient[];
  readonly allNutrients?: readonly Nutrient[];
  readonly composition?: readonly CompositionItem[];
  readonly activeSpecies?: string;
  readonly showAdvanceColumns: boolean;
  readonly showNdf?: boolean;
  readonly showBetn?: boolean;
  readonly tableViewTier?: TableViewTier;
  readonly onChangeTableViewTier?: (tier: TableViewTier) => void;
  readonly decimalPlaces?: 0 | 1 | 2;
  readonly simpleMode?: boolean;
  readonly scrollMaxHeightClass?: string;
  readonly globalAntiNol?: boolean;
  readonly language: AppLanguage;
  readonly onUpdateIngredient: (id: string, patch: Partial<Ingredient>) => void;
  readonly onResetPriceOverride: (id: string) => void;
  readonly onOpenDetail: (ingredient: Ingredient) => void;
  readonly onBatchIngredientsUpdate?: (nextAllIngredients: readonly Ingredient[]) => void;
}

const BASIC_NUTRIENT_IDS = new Set(["cp", "me_poultry", "tdn", "ee", "cf", "ca", "p"]);
const NDF_NUTRIENT_IDS = new Set(["ndf", "adf"]);
const BETN_NUTRIENT_IDS = new Set(["betn"]);

const MIN_NAME_COL_WIDTH = 96;
const MAX_NAME_COL_WIDTH = 420;
const DEFAULT_NAME_COL_WIDTH = 180;

function isViewportMobile(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia === "function" && window.matchMedia("(max-width: 767px)").matches) {
    return true;
  }
  return window.innerWidth < 768;
}

function getDialogFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.closest('[hidden], [aria-hidden="true"]'));
}

interface CoreColumnVisibility {
  readonly price: boolean;
  readonly dm: boolean;
  readonly bounds: boolean;
  readonly inclusion: boolean;
}

interface IngredientTableRowProps {
  readonly ing: Ingredient;
  readonly rowIdx: number;
  readonly inclusionPct: number;
  readonly nameColWidth: number;
  readonly coreCols: CoreColumnVisibility;
  readonly visibleNutrients: readonly Nutrient[];
  readonly decimalPlaces: 0 | 1 | 2;
  readonly simpleMode: boolean;
  readonly isAntiSlop: boolean;
  readonly language: AppLanguage;
  readonly onUpdateIngredient: (id: string, patch: Partial<Ingredient>) => void;
  readonly onResetPriceOverride: (id: string) => void;
  readonly onOpenDetail: (ingredient: Ingredient) => void;
  readonly onCellPaste: (
    rowIdx: number,
    colKey: PasteColumnKey,
    event: ClipboardEvent<HTMLInputElement>,
  ) => void;
}

const IngredientTableRow = memo(function IngredientTableRow({
  ing,
  rowIdx,
  inclusionPct,
  nameColWidth,
  coreCols,
  visibleNutrients,
  decimalPlaces,
  simpleMode,
  isAntiSlop,
  language,
  onUpdateIngredient,
  onResetPriceOverride,
  onOpenDetail,
  onCellPaste,
}: IngredientTableRowProps) {
  const isActive = ing.isActive !== false;
  const min = ing.inclusion?.min ?? 0;
  const max = ing.inclusion?.max ?? 100;
  const invalidBounds = min > max;
  const hasOverride = ing.priceOverride !== undefined;
  const hasInclusion = inclusionPct > 0.005;
  const displayName = language === "id" ? ing.name : (ing.nameEn ?? ing.name);
  const compactName = nameColWidth < 145;
  const feedClass = resolveFeedClass(ing);
  const dmDigits = resolveDisplayDigits("%", "dm", decimalPlaces, ing.dryMatter);
  const minDigits = resolveDisplayDigits("%", "min", decimalPlaces, min);
  const maxDigits = resolveDisplayDigits("%", "max", decimalPlaces, max);
  const incDigits = resolveDisplayDigits("%", "inclusion", decimalPlaces, inclusionPct);

  return (
    <tr
      className={cn(
        "group bg-[var(--glass-row-bg,transparent)] transition-colors duration-120 hover:bg-[var(--glass-row-hover,var(--bg-surface))]",
        !isActive && "opacity-55",
      )}
    >
      <td
        className={cn(
          "w-11 border-r border-[var(--glass-border-tint,var(--border-subtle))] bg-[var(--glass-sticky-bg,var(--bg-surface-elevated))] px-1 py-1 text-center transition-colors group-hover:bg-[var(--glass-row-hover,var(--bg-surface))] md:sticky md:left-0 md:z-10 md:w-10 md:px-1.5 md:py-1.5",
          !isAntiSlop && "backdrop-blur-md",
        )}
      >
        <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center md:min-h-0 md:min-w-0">
          <input
            type="checkbox"
            checked={isActive}
            aria-label={`Aktifkan ${ing.name}`}
            onChange={(e) => onUpdateIngredient(ing.id, { isActive: e.target.checked })}
            className="h-4 w-4 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--color-primary)]"
          />
        </label>
      </td>

      <td
        style={{
          width: `${nameColWidth}px`,
          minWidth: `${nameColWidth}px`,
          maxWidth: `${nameColWidth}px`,
        }}
        title={displayName}
        className={cn(
          "border-r border-[var(--glass-border-tint,var(--border-subtle))] bg-[var(--glass-sticky-bg,var(--bg-surface-elevated))] px-2 py-1.5 transition-colors group-hover:bg-[var(--glass-row-hover,var(--bg-surface))] md:sticky md:left-10 md:z-10",
          !isAntiSlop && "shadow-[4px_0_12px_-4px_rgba(0,0,0,0.08)] backdrop-blur-md",
        )}
      >
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <FeedClassIcon code={feedClass} language={language} />
            <span
              className={cn(
                "font-semibold text-[var(--text-primary)]",
                nameColWidth >= 240 ? " leading-snug break-words whitespace-normal" : "truncate",
              )}
            >
              {displayName}
            </span>
          </div>
          {!compactName && (
            <Badge tone={ing.basis === "as_fed" ? "neutral" : "emerald"}>
              {ing.basis === "as_fed" ? "AF" : "BK"}
            </Badge>
          )}
        </div>
      </td>

      {coreCols.price && (
        <td className="w-[84px] min-w-[84px] px-1.5 py-1">
          <div className="flex items-center gap-1">
            <NumericCellInput
              value={ing.priceOverride ?? ing.pricePerKg}
              treatSingleThousandDot
              fractionDigits={0}
              gridRow={rowIdx}
              gridCol="price"
              onPaste={(e) => onCellPaste(rowIdx, "price", e)}
              ariaLabel={`Harga/kg ${ing.name}`}
              className={cn(
                hasOverride &&
                "border-[var(--status-warning)] bg-[var(--status-warning-soft)] text-[var(--status-warning)]",
              )}
              onCommit={(next) => {
                if (next === null) return;
                if (Math.abs(next - ing.pricePerKg) < 0.01) {
                  onResetPriceOverride(ing.id);
                } else {
                  onUpdateIngredient(ing.id, { priceOverride: next });
                }
              }}
            />
            {hasOverride && (
              <button
                type="button"
                onClick={() => onResetPriceOverride(ing.id)}
                title={`Reset ke harga pasar (${formatCurrencyIdr(ing.pricePerKg)})`}
                aria-label={`Reset harga pasar ${ing.name}`}
                className={cn(
                  "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md p-1 text-[var(--status-warning)] md:min-h-7 md:min-w-7",
                  isAntiSlop
                    ? "border border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] hover:border-[var(--color-primary)]"
                    : "neu-pill-btn",
                )}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </td>
      )}

      {coreCols.dm && (
        <td className="w-[68px] min-w-[68px] px-2 py-1">
          <NumericCellInput
            value={ing.dryMatter}
            fractionDigits={dmDigits}
            gridRow={rowIdx}
            gridCol="dm"
            onPaste={(e) => onCellPaste(rowIdx, "dm", e)}
            invalid={ing.dryMatter <= 0 || ing.dryMatter > 100}
            errorTooltip="BK harus antara > 0 dan 100%"
            ariaLabel={`BK % ${ing.name}`}
            onCommit={(next) => {
              if (next !== null && next > 0 && next <= 100) {
                onUpdateIngredient(ing.id, { dryMatter: next });
              }
            }}
          />
        </td>
      )}

      {coreCols.bounds && (
        <>
          <td className="w-[68px] min-w-[68px] px-2 py-1">
            <NumericCellInput
              value={min}
              fractionDigits={minDigits}
              gridRow={rowIdx}
              gridCol="min"
              onPaste={(e) => onCellPaste(rowIdx, "min", e)}
              invalid={invalidBounds}
              errorTooltip={`Min (${min}%) > Max (${max}%)`}
              ariaLabel={`Min % ${ing.name}`}
              onCommit={(next) =>
                onUpdateIngredient(ing.id, {
                  inclusion: { ...ing.inclusion, min: next ?? 0 },
                })
              }
            />
          </td>

          <td className="w-[68px] min-w-[68px] px-2 py-1">
            <NumericCellInput
              value={max}
              fractionDigits={maxDigits}
              gridRow={rowIdx}
              gridCol="max"
              onPaste={(e) => onCellPaste(rowIdx, "max", e)}
              invalid={invalidBounds}
              errorTooltip={`Max (${max}%) < Min (${min}%)`}
              ariaLabel={`Max % ${ing.name}`}
              onCommit={(next) =>
                onUpdateIngredient(ing.id, {
                  inclusion: { ...ing.inclusion, max: next ?? 100 },
                })
              }
            />
          </td>
        </>
      )}

      {coreCols.inclusion && (
        <td
          className={cn(
            "w-[72px] min-w-[72px] px-1.5 py-1 text-right tabular-nums",
            hasInclusion
              ? "bg-[var(--inclusion-col-glass,var(--status-success-soft))] font-bold text-[var(--status-success)]"
              : "text-[var(--text-muted)]",
          )}
        >
          {formatNumberLocale(inclusionPct, incDigits)}%
        </td>
      )}

      {visibleNutrients.map((nut) => {
        const isEnergySlot = nut.id === "me_poultry" || nut.id === "tdn";
        const cellWidthClass = !simpleMode
          ? "min-w-[88px]"
          : isEnergySlot
            ? "w-[74px] min-w-[74px] max-w-[74px]"
            : "w-[58px] min-w-[58px] max-w-[58px]";

        if (isDerivedNutrient(nut.id)) {
          const derivedVal = resolveNutrientValue(ing, nut.id);
          return (
            <td
              key={nut.id}
              className={cn(
                cellWidthClass,
                "px-2 py-1 text-right tabular-nums text-[var(--text-secondary)]",
              )}
            >
              {derivedVal !== null ? formatNumberLocale(derivedVal, 0) : "N/A"}
            </td>
          );
        }
        const val = ing.nutrients[nut.id];
        const isNull = val === null || val === undefined;
        const digits = resolveDisplayDigits(nut.unit, nut.id, decimalPlaces, val);
        return (
          <td key={nut.id} className={cn(cellWidthClass, "px-1 py-1")}>
            <NumericCellInput
              value={val ?? null}
              allowNull
              fractionDigits={digits}
              gridRow={rowIdx}
              gridCol={nut.id}
              onPaste={(e) => onCellPaste(rowIdx, nut.id, e)}
              placeholder="N/A"
              ariaLabel={`${nut.name} ${ing.name}`}
              className={cn(
                isNull &&
                "border-dashed border-[var(--status-warning-border)] bg-[var(--status-warning-soft)]",
              )}
              onCommit={(next) =>
                onUpdateIngredient(ing.id, {
                  nutrients: { ...ing.nutrients, [nut.id]: next },
                })
              }
            />
          </td>
        );
      })}

      <td className="w-12 min-w-12 px-2 py-1 text-center">
        <button
          type="button"
          onClick={() => onOpenDetail(ing)}
          aria-label={`Edit detail ${ing.name}`}
          className={cn(
            "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md text-[var(--text-secondary)] md:h-7 md:w-7 md:min-h-0 md:min-w-0",
            isAntiSlop
              ? "border border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] hover:border-[var(--color-primary)] hover:text-[var(--text-primary)]"
              : "neu-pill-btn",
          )}
        >
          <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
});

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

export const IngredientDesktopTable = memo(function IngredientDesktopTable({
  ingredients,
  allIngredients,
  allNutrients = MOCK_NUTRIENTS,
  composition,
  activeSpecies,
  showAdvanceColumns,
  showNdf = false,
  showBetn = false,
  tableViewTier,
  onChangeTableViewTier,
  decimalPlaces = 0,
  simpleMode = true,
  scrollMaxHeightClass,
  language,
  onUpdateIngredient,
  onResetPriceOverride,
  onOpenDetail,
  onBatchIngredientsUpdate,
}: IngredientDesktopTableProps) {
  const themeCtx = useOptionalThemeContext();
  const isAntiSlop = themeCtx?.uiMode === "anti-slop";
  const useGpuFlip = !isAntiSlop && (themeCtx?.motionEngine ?? "gpu_flip") === "gpu_flip";
  const [pasteNotice, setPasteNotice] = useState<{
    readonly text: string;
    readonly warnings: readonly string[];
  } | null>(null);
  const [nameColWidth, setNameColWidth] = useState<number>(DEFAULT_NAME_COL_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [localTier, setLocalTier] = useState<TableViewTier>(
    showAdvanceColumns ? "advanced" : "basic",
  );
  const activeTier: TableViewTier = tableViewTier ?? (showAdvanceColumns ? "advanced" : localTier);

  const [colOverrides, setColOverrides] = useState<Readonly<Record<string, boolean>>>({});
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(isViewportMobile);

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const closePopover = useCallback((options: { readonly restoreFocus: boolean }) => {
    setPopoverOpen(false);
    if (options.restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (!popoverOpen) return;
    setIsMobileViewport(isViewportMobile());

    const focusInitial = () => {
      const dialogEl = dialogRef.current;
      if (!dialogEl) return;
      if (!dialogEl.contains(document.activeElement)) {
        const focusables = getDialogFocusables(dialogEl);
        (focusables[0] ?? dialogEl).focus();
      }
    };
    focusInitial();
    const rafId = requestAnimationFrame(focusInitial);

    const handleResize = () => setIsMobileViewport(isViewportMobile());
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (dialogRef.current?.contains(target)) return;
      closePopover({ restoreFocus: false });
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closePopover({ restoreFocus: true });
        return;
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusables = getDialogFocusables(dialogRef.current);
        if (focusables.length === 0) {
          event.preventDefault();
          dialogRef.current.focus();
          return;
        }
        const activeEl =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (event.shiftKey) {
          if (!activeEl || activeEl === first || !dialogRef.current.contains(activeEl)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            last.focus();
          }
        } else if (!activeEl || activeEl === last || !dialogRef.current.contains(activeEl)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          first.focus();
        }
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [popoverOpen, closePopover]);

  const handleSelectTier = useCallback(
    (nextTier: TableViewTier) => {
      setLocalTier(nextTier);
      setColOverrides({});
      onChangeTableViewTier?.(nextTier);
    },
    [onChangeTableViewTier],
  );

  const handleResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragStateRef.current = { startX: event.clientX, startWidth: nameColWidth };
      setIsResizing(true);
    },
    [nameColWidth],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMove = (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state) return;
      const next = Math.max(
        MIN_NAME_COL_WIDTH,
        Math.min(MAX_NAME_COL_WIDTH, Math.round(state.startWidth + (event.clientX - state.startX))),
      );
      setNameColWidth(next);
    };

    const handleUp = () => {
      dragStateRef.current = null;
      setIsResizing(false);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [isResizing]);

  const handleResizeKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setNameColWidth((w) => Math.max(MIN_NAME_COL_WIDTH, w - 16));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setNameColWidth((w) => Math.min(MAX_NAME_COL_WIDTH, w + 16));
    }
  }, []);

  const isPoultry = isPoultrySpecies(activeSpecies);
  const isRuminant = isRuminantSpecies(activeSpecies);

  const isColVisibleByDefault = useCallback(
    (colId: string): boolean => {
      if (colId === "price" || colId === "inclusion") return true;
      if (colId === "dm" || colId === "bounds") {
        return activeTier !== "basic";
      }
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

  const compositionMap = useMemo(
    () => new Map((composition ?? []).map((c) => [c.ingredientId, c.fraction * 100])),
    [composition],
  );

  const candidateNutrients: readonly Nutrient[] = useMemo(() => {
    const isAdvanceTier = activeTier === "advanced" || showAdvanceColumns;
    return allNutrients.filter((n) => {
      if (isPoultry && n.id === "tdn") return false;
      if (isRuminant && n.id === "me_poultry") return false;
      if (BASIC_NUTRIENT_IDS.has(n.id) || n.isCustom === true) return true;
      if (showBetn && BETN_NUTRIENT_IDS.has(n.id)) return true;
      if ((showNdf || activeTier !== "basic") && NDF_NUTRIENT_IDS.has(n.id) && showNdf) {
        return true;
      }
      return isAdvanceTier;
    });
  }, [allNutrients, activeTier, showAdvanceColumns, isPoultry, isRuminant, showBetn, showNdf]);

  const visibleNutrients: readonly Nutrient[] = useMemo(
    () => candidateNutrients.filter((n) => isColVisible(n.id)),
    [candidateNutrients, isColVisible],
  );

  const coreCols: CoreColumnVisibility = useMemo(
    () => ({
      price: isColVisible("price"),
      dm: isColVisible("dm"),
      bounds: isColVisible("bounds"),
      inclusion: isColVisible("inclusion"),
    }),
    [isColVisible],
  );

  const orderedCols: PasteColumnKey[] = useMemo(() => {
    const cols: PasteColumnKey[] = [];
    if (coreCols.price) cols.push("price");
    if (coreCols.dm) cols.push("dm");
    if (coreCols.bounds) cols.push("min", "max");
    for (const nut of visibleNutrients) {
      cols.push(nut.id);
    }
    return cols;
  }, [coreCols.price, coreCols.dm, coreCols.bounds, visibleNutrients]);

  const handleCellPaste = useCallback(
    (startRowIdx: number, startColKey: PasteColumnKey, event: ClipboardEvent<HTMLInputElement>) => {
      if (!onBatchIngredientsUpdate) return;
      const clipboardText =
        event.clipboardData.getData("text/plain") || event.clipboardData.getData("text") || "";
      if (!clipboardText) return;

      const outcome = applyTsvGridPaste({
        clipboardText,
        activeIngredients: ingredients,
        allIngredients: allIngredients ?? ingredients,
        orderedCols,
        startRowIdx,
        startColKey,
      });

      if (!outcome.isGrid) return;
      event.preventDefault();

      if (outcome.appliedCells > 0) {
        onBatchIngredientsUpdate(outcome.ingredients);
      }
      setPasteNotice({
        text: pickLang(
          language,
          `${outcome.appliedCells} sel ditempel dari spreadsheet.`,
          `${outcome.appliedCells} cells pasted from spreadsheet.`,
        ),
        warnings: outcome.warnings,
      });
    },
    [allIngredients, ingredients, language, onBatchIngredientsUpdate, orderedCols],
  );

  const coreToggleItems: ReadonlyArray<{ readonly id: string; readonly label: string }> = [
    { id: "price", label: pickLang(language, "Harga", "Price") },
    { id: "dm", label: pickLang(language, "BK", "DM") },
    { id: "bounds", label: "Min/Max" },
    { id: "inclusion", label: pickLang(language, "Inklusi", "Inclusion") },
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

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-1.5",
        scrollMaxHeightClass ? "min-h-0" : "h-full min-h-0",
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-[11px]",
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
              "inline-flex rounded-xl p-0.5",
              isAntiSlop
                ? "border border-[var(--border-subtle)] bg-[var(--bg-sunken)]"
                : "border border-[var(--glass-border-tint,var(--border-subtle))] bg-[var(--bg-sunken)]/70",
            )}
          >
            {(
              [
                {
                  id: "basic",
                  label: pickLang(language, "Dasar", "Basic"),
                  hint: pickLang(
                    language,
                    "Tampilan ringkas tanpa BK & Min/Max",
                    "Clean view without DM & Min/Max",
                  ),
                },
                {
                  id: "standard",
                  label: pickLang(language, "Standar", "Standard"),
                  hint: pickLang(
                    language,
                    "Tampilkan BK % serta batas Min & Max bahan",
                    "Show DM % and ingredient Min/Max limits",
                  ),
                },
                {
                  id: "advanced",
                  label: pickLang(language, "Lanjutan", "Advanced"),
                  hint: pickLang(
                    language,
                    "Aktifkan seluruh nutrien lanjutan (Asam Amino, Elektrolit, NDF, ANF) di tabel & solver",
                    "Enable all advanced nutrients in table & solver",
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
                    "relative min-h-11 cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-[transform,color] duration-150 md:min-h-7 md:py-0.5 motion-reduce:transform-none",
                    !isAntiSlop && "elastic-size-box active:scale-[0.97]",
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
                        layoutId="table-tier-pill"
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
                            ? "bg-[var(--color-primary)]"
                            : isAntiSlop
                              ? "border border-[var(--color-primary)] bg-[var(--bg-surface-elevated)]"
                              : "bg-[var(--bg-surface-elevated)] shadow-[var(--shadow-neu-flat)]",
                        )}
                      />
                    ))}
                  <span className="relative z-10">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative" ref={popoverRef}>
          <button
            ref={triggerRef}
            type="button"
            aria-expanded={popoverOpen}
            aria-haspopup="dialog"
            onClick={() => {
              if (popoverOpen) {
                closePopover({ restoreFocus: false });
              } else {
                setIsMobileViewport(isViewportMobile());
                setPopoverOpen(true);
              }
            }}
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-[var(--text-primary)] md:min-h-7",
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
              const dialogBody = (
                <div
                  ref={dialogRef}
                  tabIndex={-1}
                  role="dialog"
                  aria-modal={isMobileViewport ? "true" : undefined}
                  aria-label={pickLang(
                    language,
                    "Pilih kolom tabel yang ditampilkan",
                    "Toggle table columns",
                  )}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "bg-[var(--bg-surface-elevated)] p-3 text-xs focus:outline-none",
                    isMobileViewport
                      ? cn(
                        "w-full border-t p-4",
                        isAntiSlop
                          ? "rounded-t-xl border-[var(--border-strong)] shadow-[var(--shadow-neu-elevated)]"
                          : "rounded-t-2xl border-[var(--border-subtle)] shadow-[0_-18px_48px_-12px_rgba(0,0,0,0.45)]",
                      )
                      : cn(
                        "absolute right-0 z-40 mt-1.5 w-72 max-w-[calc(100vw-2rem)] rounded-xl border sm:w-80",
                        isAntiSlop
                          ? "border-[var(--border-strong)] shadow-[var(--shadow-neu-elevated)]"
                          : "border-[var(--border-subtle)] shadow-[0_14px_34px_-10px_rgba(0,0,0,0.28)]",
                      ),
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-1.5">
                    <span className="font-bold text-[var(--text-primary)]">
                      {pickLang(language, "Atur Kolom Tabel", "Customize Table Columns")}
                    </span>
                    <div className="flex items-center gap-1">
                      {hasCustomOverrides && (
                        <button
                          type="button"
                          onClick={() => setColOverrides({})}
                          className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded px-2.5 text-[10px] font-semibold text-[var(--status-success)] hover:bg-[var(--status-success-soft)] md:min-h-7 md:min-w-0 md:px-1.5"
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
                        className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-sunken)] md:min-h-7 md:min-w-7"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="custom-scrollbar max-h-64 space-y-2.5 overflow-y-auto overscroll-contain pr-1">
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
                              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[var(--text-primary)] select-none md:min-h-0"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleColumn(col.id)}
                                className="h-3.5 w-3.5 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--color-primary)]"
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
                        <div key={groupKey} className="border-t border-[var(--border-subtle)] pt-2">
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                            {language === "id" ? groupMeta.id : groupMeta.en}
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {nuts.map((nut) => {
                              const checked = isColVisible(nut.id);
                              const shortLabel = getNutrientDisplayName(nut, language, simpleMode);
                              const fullName = getNutrientFullName(nut, language);
                              return (
                                <label
                                  key={nut.id}
                                  title={fullName}
                                  className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[var(--text-primary)] select-none md:min-h-0"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleColumn(nut.id)}
                                    className="h-3.5 w-3.5 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--color-primary)]"
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

              if (isMobileViewport) {
                return (
                  <div
                    className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55"
                    onClick={() => closePopover({ restoreFocus: true })}
                  >
                    {dialogBody}
                  </div>
                );
              }

              return dialogBody;
            })()}
        </div>
      </div>

      {pasteNotice && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--status-success-border)] bg-[var(--status-success-soft)] px-3 py-1.5 text-[11px] font-medium text-[var(--status-success)]"
        >
          <span>
            {pasteNotice.text}
            {pasteNotice.warnings.length > 0 ? ` (${pasteNotice.warnings.join(" ")})` : ""}
          </span>
          <button
            type="button"
            onClick={() => setPasteNotice(null)}
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded px-2 font-semibold underline hover:opacity-80 md:min-h-0 md:min-w-0 md:px-1.5 md:py-0.5"
          >
            {pickLang(language, "Tutup", "Close")}
          </button>
        </div>
      )}

      <div
        style={{ touchAction: "pan-x pan-y" }}
        className={cn(
          "custom-scrollbar relative min-h-0 overflow-auto rounded-xl border border-[var(--glass-border-tint,var(--border-subtle))] bg-[var(--glass-table-bg,var(--bg-surface-elevated))]",
          scrollMaxHeightClass ?? "flex-1",
        )}
      >
        <table className="w-max min-w-full border-collapse text-left text-xs">
          <thead
            className={cn(
              "sticky top-0 z-20 bg-[var(--glass-sticky-bg,var(--bg-sunken))] text-[11px] font-bold tracking-wide text-[var(--text-secondary)]",
              !isAntiSlop && "backdrop-blur-md",
            )}
          >
            <tr>
              <th
                className={cn(
                  "w-11 border-r border-b border-[var(--glass-border-tint,var(--border-subtle))] bg-[var(--glass-sticky-bg,var(--bg-sunken))] px-1.5 py-2 text-center md:sticky md:left-0 md:z-30 md:w-10",
                  !isAntiSlop && "backdrop-blur-md",
                )}
              >
                {pickLang(language, "Aktif", "Active")}
              </th>
              <th
                style={{
                  width: `${nameColWidth}px`,
                  minWidth: `${nameColWidth}px`,
                  maxWidth: `${nameColWidth}px`,
                }}
                className={cn(
                  "relative border-r border-b border-[var(--glass-border-tint,var(--border-subtle))] bg-[var(--glass-sticky-bg,var(--bg-sunken))] py-2 pr-5 pl-2.5 md:sticky md:left-10 md:z-30",
                  !isAntiSlop && "shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)] backdrop-blur-md",
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate">{pickLang(language, "Nama Bahan", "Ingredient")}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setNameColWidth((w) => (w < 260 ? 300 : DEFAULT_NAME_COL_WIDTH))
                    }
                    title={pickLang(
                      language,
                      "Perlebar atau ringkas kolom Nama Bahan",
                      "Expand or compact Ingredient Name column",
                    )}
                    aria-label={pickLang(
                      language,
                      "Perlebar tampilan nama bahan",
                      "Expand ingredient name width",
                    )}
                    className="inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[10px] font-bold text-[var(--text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--text-primary)]"
                  >
                    ↔
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
                  aria-valuemin={MIN_NAME_COL_WIDTH}
                  aria-valuemax={MAX_NAME_COL_WIDTH}
                  aria-valuenow={nameColWidth}
                  tabIndex={0}
                  style={{ touchAction: "none" }}
                  title={pickLang(
                    language,
                    "Geser kiri/kanan untuk atur lebar (klik 2× untuk perkecil/perbesar)",
                    "Drag left/right to resize (double-click to toggle compact)",
                  )}
                  onPointerDown={handleResizePointerDown}
                  onDoubleClick={() =>
                    setNameColWidth((w) => (w < 260 ? 300 : DEFAULT_NAME_COL_WIDTH))
                  }
                  onKeyDown={handleResizeKeyDown}
                  className={cn(
                    "group/resize absolute top-0 right-0 bottom-0 flex w-4 cursor-col-resize items-center justify-center transition-colors select-none hover:bg-[var(--primary-soft)] focus-visible:bg-[var(--primary-soft)] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--focus-ring)]",
                    isResizing && "bg-[var(--primary-soft)]",
                  )}
                >
                  <GripVertical
                    className={cn(
                      "h-3.5 w-3 text-[var(--text-muted)] transition-colors group-hover/resize:text-[var(--color-primary)]",
                      isResizing && "text-[var(--color-primary)]",
                    )}
                    aria-hidden="true"
                  />
                </div>
              </th>
              {coreCols.price && (
                <th className="w-[84px] min-w-[84px] border-b border-[var(--border-subtle)] px-1.5 py-2 text-right">
                  {pickLang(language, "Harga/kg", "Price/kg")}
                </th>
              )}
              {coreCols.dm && (
                <th className="w-[62px] min-w-[62px] border-b border-[var(--border-subtle)] px-1 py-2 text-right">
                  {pickLang(language, "BK %", "DM %")}
                </th>
              )}
              {coreCols.bounds && (
                <>
                  <th className="w-[62px] min-w-[62px] border-b border-[var(--border-subtle)] px-1 py-2 text-right">
                    Min %
                  </th>
                  <th className="w-[62px] min-w-[62px] border-b border-[var(--border-subtle)] px-1 py-2 text-right">
                    Max %
                  </th>
                </>
              )}
              {coreCols.inclusion && (
                <th className="w-[72px] min-w-[72px] border-b border-[var(--border-subtle)] bg-[var(--status-success-soft)] px-1.5 py-2 text-right text-[var(--status-success)]">
                  {pickLang(language, "Inklusi %", "Inclusion %")}
                </th>
              )}
              {visibleNutrients.map((nut) => {
                const headerLabel = getNutrientDisplayName(nut, language, simpleMode);
                const fullLabel = getNutrientFullName(nut, language);
                const isEnergySlot = nut.id === "me_poultry" || nut.id === "tdn";
                return (
                  <th
                    key={nut.id}
                    title={`${fullLabel} (${nut.unit})`}
                    className={cn(
                      "border-b border-[var(--border-subtle)] px-1.5 py-2 text-right whitespace-nowrap",
                      !simpleMode
                        ? "min-w-[88px]"
                        : isEnergySlot
                          ? "w-[74px] min-w-[74px] max-w-[74px]"
                          : "w-[58px] min-w-[58px] max-w-[58px]",
                    )}
                  >
                    <div className="text-[var(--text-primary)]">{headerLabel}</div>
                    <div className="text-[10px] font-medium lowercase text-[var(--text-muted)]">
                      {nut.unit}
                    </div>
                  </th>
                );
              })}
              <th className="w-12 min-w-12 border-b border-[var(--border-subtle)] px-2 py-2 text-center">
                Detail
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border-subtle)]">
            {ingredients.map((ing, rowIdx) => (
              <IngredientTableRow
                key={ing.id}
                ing={ing}
                rowIdx={rowIdx}
                inclusionPct={compositionMap.get(ing.id) ?? 0}
                nameColWidth={nameColWidth}
                coreCols={coreCols}
                visibleNutrients={visibleNutrients}
                decimalPlaces={decimalPlaces}
                simpleMode={simpleMode}
                isAntiSlop={isAntiSlop}
                language={language}
                onUpdateIngredient={onUpdateIngredient}
                onResetPriceOverride={onResetPriceOverride}
                onOpenDetail={onOpenDetail}
                onCellPaste={handleCellPaste}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
