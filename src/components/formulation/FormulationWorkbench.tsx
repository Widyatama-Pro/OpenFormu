import { useCallback, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Layers,
  Plus,
  Search,
  SlidersHorizontal,
  Table,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { FEED_CLASSES, getFeedClassLabel, resolveFeedClass } from "../../data/feed-classes";
import type { PrototypeStore } from "../../hooks/use-prototype-store";
import { getFormulationStatusLabel, pickLang } from "../../i18n";
import { useOptionalThemeContext } from "../../theme";
import type { FeedClassCode, Ingredient, TableViewTier } from "../../types";
import { cn } from "../../utils/cn";
import { formatCurrencyIdr } from "../../utils/locale-number";
import {
  ResultsPanel,
  type ResultSpotlightTarget,
  type ResultSubTab,
} from "../analytics/ResultsPanel";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { SegmentedTabs } from "../ui/SegmentedTabs";
import { ThemedSelect, type ThemedSelectOption } from "../ui/ThemedSelect";
import { AllIngredientsCatalogTable } from "./AllIngredientsCatalogTable";
import { IngredientDesktopTable } from "./IngredientDesktopTable";
import { IngredientDetailSheet } from "./IngredientDetailSheet";
import { IngredientMobileCards } from "./IngredientMobileCards";
import { MobileStickyActionBar } from "./MobileStickyActionBar";
import { NutrientTargetsPanel } from "./NutrientTargetsPanel";
import { WorkbenchToolbar } from "./WorkbenchToolbar";

export type MobileStep = "ingredients" | "targets" | "results";

export interface FormulationWorkbenchProps {
  readonly store: PrototypeStore;
  readonly resultSubTab?: ResultSubTab | undefined;
  readonly onResultSubTabChange?: ((tab: ResultSubTab) => void) | undefined;
  readonly mobileStep?: MobileStep | undefined;
  readonly onMobileStepChange?: ((step: MobileStep) => void) | undefined;
  readonly spotlightTarget?: ResultSpotlightTarget;
  readonly onClearSpotlight?: (() => void) | undefined;
  readonly onOpenSaveDialog: () => void;
  readonly onOpenExportDialog: () => void;
  readonly onOpenAddIngredient: () => void;
}

const WORKBENCH_STAGGER = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.06,
      staggerChildren: 0.03,
    },
  },
} as const;

const WORKBENCH_PANEL_ITEM = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
  },
} as const;

export function FormulationWorkbench({
  store,
  resultSubTab,
  onResultSubTabChange,
  mobileStep: controlledMobileStep,
  onMobileStepChange,
  spotlightTarget = null,
  onClearSpotlight,
  onOpenSaveDialog,
  onOpenExportDialog,
  onOpenAddIngredient,
}: FormulationWorkbenchProps) {
  const [localMobileStep, setLocalMobileStep] = useState<MobileStep>("ingredients");
  const activeMobileStep = controlledMobileStep ?? localMobileStep;
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogClassFilter, setCatalogClassFilter] = useState<"all" | FeedClassCode>("all");
  const [catalogExpanded, setCatalogExpanded] = useState(true);
  const [mobileTableMode, setMobileTableMode] = useState(false);
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [mobileControlsCollapsed, setMobileControlsCollapsed] = useState(false);
  const [mobileScrolledCompact, setMobileScrolledCompact] = useState(false);

  const mobileScrollRef = useRef<HTMLDivElement | null>(null);
  const toolbarWrapRef = useRef<HTMLDivElement | null>(null);

  const handleMobileScroll = useCallback(() => {
    const el = mobileScrollRef.current;
    if (!el) return;
    const top = el.scrollTop;
    const toolbarHeight = toolbarWrapRef.current?.offsetHeight ?? 150;
    const enterThreshold = Math.max(84, toolbarHeight - 12);
    const exitThreshold = Math.max(36, toolbarHeight - 56);
    setMobileScrolledCompact((prev) => {
      if (!prev && top > enterThreshold) return true;
      if (prev && top < exitThreshold) return false;
      return prev;
    });
  }, []);

  const handleMobileStepChange = useCallback(
    (nextStep: MobileStep) => {
      if (onMobileStepChange) {
        onMobileStepChange(nextStep);
      } else {
        setLocalMobileStep(nextStep);
      }
      const scroller = mobileScrollRef.current;
      if (scroller) {
        const toolbarHeight = toolbarWrapRef.current?.offsetHeight ?? 0;
        if (scroller.scrollTop > toolbarHeight) {
          scroller.scrollTop = toolbarHeight;
        }
        requestAnimationFrame(() => handleMobileScroll());
      }
    },
    [onMobileStepChange, handleMobileScroll],
  );

  const handleOpenMobileControls = useCallback(() => {
    setMobileControlsCollapsed(false);
    mobileScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleOpenDetail = useCallback((ing: Ingredient) => {
    setEditingIngredientId(ing.id);
  }, []);

  const handleToggleInspector = useCallback(() => {
    setInspectorOpen((prev) => !prev);
  }, []);

  const handleCollapseInspector = useCallback(() => {
    setInspectorOpen(false);
  }, []);

  const { updateIngredient } = store;

  const handleToggleCatalogActive = useCallback(
    (id: string, active: boolean) => {
      updateIngredient(id, { isActive: active });
    },
    [updateIngredient],
  );

  const handleActivateSuggestedIngredient = useCallback(
    (id: string) => {
      updateIngredient(id, { isActive: true });
    },
    [updateIngredient],
  );

  const handleResetCatalogFilter = useCallback(() => {
    setCatalogSearch("");
    setCatalogClassFilter("all");
  }, []);

  const language = store.preferences.language;
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";
  const simpleMode = store.preferences.simpleMode ?? !store.config.enableAdvanceNutrients;
  const showNdf = store.config.showNdf === true;
  const showBetn = store.config.showBetn === true;
  const decimalPlaces: 0 | 1 | 2 = store.preferences.decimalPlaces ?? 0;
  const tableViewTier: TableViewTier =
    store.preferences.tableViewTier ?? (store.config.enableAdvanceNutrients ? "advanced" : "basic");
  const activeSpecies = store.activeRequirement.species;

  const catalogClassOptions = useMemo<readonly ThemedSelectOption[]>(
    () => [
      {
        value: "all",
        label: pickLang(language, "Semua 8 Kelas Pakan", "All 8 Feed Classes"),
      },
      ...FEED_CLASSES.map((fc) => ({
        value: String(fc.code),
        label: getFeedClassLabel(language, fc.code),
        group: pickLang(language, "Klasifikasi Standar (IFN / NRC)", "Standard Feed Classes"),
      })),
    ],
    [language],
  );

  // Tabel 1: Khusus pakan yang digunakan (aktif)
  const usedIngredients = useMemo(
    () => store.ingredients.filter((i) => i.isActive !== false),
    [store.ingredients],
  );

  // Tabel 2: Daftar semua bahan (dapat dicari & difilter berdasarkan 8 kelas bahan pakan)
  const allCatalogFiltered = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return store.ingredients.filter((ing) => {
      const feedClass = resolveFeedClass(ing);
      const matchesClass = catalogClassFilter === "all" || feedClass === catalogClassFilter;
      if (!matchesClass) return false;
      if (!q) return true;
      return (
        ing.name.toLowerCase().includes(q) ||
        (ing.nameEn?.toLowerCase().includes(q) ?? false) ||
        ing.source.toLowerCase().includes(q) ||
        getFeedClassLabel(language, feedClass).toLowerCase().includes(q)
      );
    });
  }, [store.ingredients, catalogSearch, catalogClassFilter, language]);

  const editingIngredient: Ingredient | null = useMemo(
    () => store.ingredients.find((i) => i.id === editingIngredientId) ?? null,
    [store.ingredients, editingIngredientId],
  );

  const targetPanel = (
    <NutrientTargetsPanel
      requirement={store.activeRequirement}
      allNutrients={store.allNutrients}
      allIngredients={store.ingredients}
      config={store.config}
      result={store.result}
      activeBasis={store.config.activeBasis}
      targetInputMode={store.config.targetInputMode ?? "range"}
      onChangeTargetInputMode={store.setTargetInputMode}
      onActivateSuggestedIngredient={handleActivateSuggestedIngredient}
      enableAdvance={store.config.enableAdvanceNutrients}
      showNdf={showNdf}
      showBetn={showBetn}
      decimalPlaces={decimalPlaces}
      simpleMode={simpleMode}
      enableDigestible={store.config.enableDigestibleBasis}
      enableStochastic={store.config.enableStochasticSlp === true}
      onToggleDigestible={store.toggleDigestibleBasis}
      nutrientResults={store.result.nutrients}
      conflicts={store.result.conflicts ?? []}
      language={language}
      onUpdateConstraint={store.updateConstraint}
      onAddCustomNutrient={store.addCustomNutrient}
      onRemoveCustomNutrient={store.removeCustomNutrient}
      onUpdateCustomNutrientBasis={store.updateCustomNutrientBasis}
      onCollapse={handleCollapseInspector}
    />
  );

  const resultsPanel = (
    <ResultsPanel
      result={store.result}
      ingredients={store.ingredients}
      allNutrients={store.allNutrients}
      requirement={store.activeRequirement}
      config={store.config}
      decimalPlaces={decimalPlaces}
      simpleMode={simpleMode}
      language={language}
      hideKpiStrip
      {...(resultSubTab !== undefined ? { activeSubTab: resultSubTab } : {})}
      {...(spotlightTarget !== undefined ? { spotlightTarget } : {})}
      {...(onClearSpotlight !== undefined ? { onClearSpotlight } : {})}
      {...(onResultSubTabChange !== undefined ? { onSubTabChange: onResultSubTabChange } : {})}
      onSetBatchSize={store.setBatchSizeKg}
      onToggleElastic={store.toggleElasticFallback}
      onSetManualLock={store.setManualLock}
      onClearManualLocks={store.clearManualLocks}
    />
  );

  return (
    <div
      ref={mobileScrollRef}
      onScroll={handleMobileScroll}
      className="custom-scrollbar flex h-full flex-col overflow-y-auto overscroll-contain lg:overflow-hidden"
    >
      <div ref={toolbarWrapRef} className="shrink-0">
        <WorkbenchToolbar
          requirements={store.requirements}
          activeRequirement={store.activeRequirement}
          config={store.config}
          result={store.result}
          language={language}
          inspectorOpen={inspectorOpen}
          mobileCollapsed={mobileControlsCollapsed}
          onToggleMobileCollapsed={() => setMobileControlsCollapsed((prev) => !prev)}
          onToggleInspector={handleToggleInspector}
          onSelectPreset={store.selectPreset}
          onApplyDynamicRequirement={store.applyDynamicRequirement}
          onSetBasis={store.setActiveBasis}
          onSetMode={store.setOptimizationMode}
          onToggleElastic={store.toggleElasticFallback}
          onOpenSaveDialog={onOpenSaveDialog}
          onOpenExportDialog={onOpenExportDialog}
          onResetMock={store.resetAllMock}
        />
      </div>

      <AnimatePresence>
        {store.isSolving &&
          (isAntiSlop ? (
            <div
              role="status"
              aria-live="polite"
              data-solving-toast="top-right"
              className="pointer-events-none fixed top-14 right-4 z-50 flex items-center gap-2 rounded-lg border border-[var(--status-success-border)] bg-[var(--bg-surface-elevated)] px-3.5 py-2 shadow-[var(--shadow-neu-elevated)]"
            >
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 shrink-0 rounded-full bg-[var(--status-success)]"
              />
              <span className="text-[11px] font-bold whitespace-nowrap text-[var(--status-success)]">
                {pickLang(language, "Menghitung formula optimal…", "Computing optimal ration…")}
              </span>
            </div>
          ) : (
            <motion.div
              key="solving-toast"
              role="status"
              aria-live="polite"
              data-solving-toast="top-right"
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="acrylic-panel pointer-events-none fixed top-14 right-4 z-50 flex items-center gap-2.5 rounded-2xl border border-[var(--status-success-border)] px-3.5 py-2 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.28)] backdrop-blur-xl"
            >
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 shrink-0 rounded-full bg-[var(--status-success)] shadow-[0_0_8px_var(--status-success)]"
              />
              <span className="text-[11px] font-bold whitespace-nowrap text-[var(--status-success)]">
                {pickLang(language, "Menghitung formula optimal…", "Computing optimal ration…")}
              </span>
              <div className="skeleton-shimmer h-1.5 w-14 shrink-0 rounded-full" />
            </motion.div>
          ))}
      </AnimatePresence>

      {/* Mobile & Tablet Sticky Stepper (< lg): tetap menempel saat kontrol atas tergulir keluar */}
      <div
        className={cn(
          "sticky top-0 z-20 shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 lg:hidden",
          !isAntiSlop && "shadow-[0_2px_10px_rgba(0,0,0,0.06)]",
        )}
      >
        {mobileScrolledCompact && (
          <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
            <div className="flex min-w-0 items-center gap-1.5 truncate">
              <span className="font-bold tabular-nums text-[var(--status-warning)]">
                {store.result.costPerKg !== null
                  ? `${formatCurrencyIdr(store.result.costPerKg)}/kg`
                  : isAntiSlop
                    ? "-"
                    : "—"}
              </span>
              <Badge
                tone={
                  store.result.status === "optimal"
                    ? "emerald"
                    : store.result.status === "near_feasible"
                      ? "amber"
                      : "rose"
                }
              >
                {getFormulationStatusLabel(language, store.result.status)}
              </Badge>
            </div>
            <button
              type="button"
              onClick={handleOpenMobileControls}
              className={cn(
                "inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold text-[var(--text-primary)] md:min-h-7",
                isAntiSlop
                  ? "border border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] hover:border-[var(--color-primary)]"
                  : "neu-pill-btn",
              )}
            >
              <SlidersHorizontal
                className="h-3 w-3 text-[var(--color-primary)]"
                aria-hidden="true"
              />
              <span>{pickLang(language, "Kontrol", "Controls")}</span>
            </button>
          </div>
        )}
        <SegmentedTabs
          ariaLabel={pickLang(language, "Tahapan formulasi mobile", "Mobile formulation steps")}
          value={activeMobileStep}
          onChange={handleMobileStepChange}
          options={[
            {
              value: "ingredients",
              label: pickLang(language, "1. Bahan", "1. Feeds"),
              badge: usedIngredients.length,
            },
            { value: "targets", label: pickLang(language, "2. Target", "2. Targets") },
            { value: "results", label: pickLang(language, "3. Hasil", "3. Results") },
          ]}
        />
      </div>

      {/* Desktop Workspace: Kiri (Tabel Pakan Digunakan + Tabel Semua Bahan + Hasil) & Kanan (Target Nutrien) */}
      <motion.div
        {...(isAntiSlop
          ? {}
          : {
              variants: WORKBENCH_STAGGER,
              initial: "hidden",
              animate: "visible",
            })}
        className={cn(
          "hidden min-h-0 flex-1 gap-3.5 p-3 lg:grid lg:px-4",
          inspectorOpen ? "lg:grid-cols-[minmax(0,2.7fr)_352px]" : "lg:grid-cols-[minmax(0,1fr)]",
        )}
      >
        {/* Area Kerja Utama dengan scrollbar lebar khusus (.workspace-main-scrollbar) agar jelas dibedakan dari tabel */}
        <div className="workspace-main-scrollbar flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto overscroll-contain pr-2">
          <motion.div
            {...(isAntiSlop ? {} : { variants: WORKBENCH_PANEL_ITEM })}
            className="shrink-0"
          >
            <Card
              interactive={false}
              aria-label={pickLang(language, "Panel Bahan Pakan", "Feed Ingredients Panel")}
              className={cn(
                "selectable-panel flex flex-col overflow-hidden p-3.5",
                !isAntiSlop && "acrylic-panel",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-flex h-7 w-7 shrink-0 items-center justify-center border border-[var(--status-success-border)] bg-[var(--status-success-soft)] text-[var(--status-success)]",
                      isAntiSlop
                        ? "rounded-lg"
                        : "rounded-xl shadow-[0_0_12px_var(--glow-success-pill,transparent)]",
                    )}
                  >
                    <Layers className="h-4 w-4" />
                  </span>
                  <h2 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
                    {pickLang(language, "Pakan yang Digunakan", "Used Feed Ingredients")}
                  </h2>
                  <Badge tone="emerald">
                    {usedIngredients.length} {pickLang(language, "bahan", "feeds")}
                  </Badge>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onOpenAddIngredient}
                  className={cn(!isAntiSlop && "acrylic-control-capsule rounded-xl")}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{pickLang(language, "Tambah Bahan Baru", "Add New Feed")}</span>
                </Button>
              </div>

              {usedIngredients.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2.5 rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-8 text-center text-xs text-[var(--text-secondary)]">
                  <p>
                    {pickLang(
                      language,
                      'Belum ada bahan aktif. Centang bahan pada tabel "Daftar Semua Bahan" di bawah atau tambahkan bahan baru.',
                      'No active ingredients yet. Check feeds in the "All Ingredients" table below or add a new feed.',
                    )}
                  </p>
                  <Button variant="primary" size="sm" onClick={onOpenAddIngredient}>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{pickLang(language, "Tambah Bahan Baru", "Add New Feed")}</span>
                  </Button>
                </div>
              ) : (
                <IngredientDesktopTable
                  ingredients={usedIngredients}
                  allIngredients={store.ingredients}
                  allNutrients={store.allNutrients}
                  composition={store.result.composition}
                  activeSpecies={activeSpecies}
                  showAdvanceColumns={store.config.enableAdvanceNutrients}
                  showNdf={showNdf}
                  showBetn={showBetn}
                  tableViewTier={tableViewTier}
                  onChangeTableViewTier={store.setTableViewTier}
                  decimalPlaces={decimalPlaces}
                  simpleMode={simpleMode}
                  scrollMaxHeightClass="max-h-[296px]"
                  language={language}
                  onUpdateIngredient={store.updateIngredient}
                  onResetPriceOverride={store.resetPriceOverride}
                  onOpenDetail={handleOpenDetail}
                  onBatchIngredientsUpdate={store.importIngredients}
                />
              )}
            </Card>
          </motion.div>

          <motion.div
            {...(isAntiSlop ? {} : { variants: WORKBENCH_PANEL_ITEM })}
            className="shrink-0"
          >
            <Card
              interactive={false}
              aria-label={pickLang(
                language,
                "Tabel Semua Bahan Pakan",
                "All Feed Ingredients Table",
              )}
              className={cn(
                "selectable-panel flex flex-col overflow-hidden p-3.5",
                !isAntiSlop && "acrylic-panel",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
                    {pickLang(language, "Daftar Semua Bahan", "All Ingredients Catalog")}
                  </h2>
                  <Badge tone="neutral">
                    {allCatalogFiltered.length} {pickLang(language, "bahan", "feeds")}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-48">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]"
                      aria-hidden="true"
                    />
                    <Input
                      type="search"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder={pickLang(language, "Cari semua bahan…", "Search all feeds…")}
                      aria-label={pickLang(
                        language,
                        "Cari semua bahan pakan",
                        "Search all feed ingredients",
                      )}
                      className="min-h-11 pl-8 text-xs md:h-8 md:min-h-8"
                    />
                  </div>
                  <div className="w-52">
                    <ThemedSelect
                      ariaLabel={pickLang(
                        language,
                        "Filter kelas bahan pakan",
                        "Filter feed classification",
                      )}
                      modalTitle={pickLang(
                        language,
                        "Filter Kelas Bahan Pakan",
                        "Filter Feed Class",
                      )}
                      value={String(catalogClassFilter)}
                      options={catalogClassOptions}
                      language={language}
                      popoverMinWidthPx={250}
                      onChange={(val) => {
                        setCatalogClassFilter(
                          val === "all" ? "all" : (Number(val) as FeedClassCode),
                        );
                      }}
                      className="min-h-11 py-0 text-[11px] md:h-8 md:min-h-8"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCatalogExpanded((prev) => !prev)}
                    aria-expanded={catalogExpanded}
                    className="min-h-11 px-2.5 text-xs md:min-h-8 md:px-2"
                  >
                    {catalogExpanded ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{pickLang(language, "Tutup", "Hide")}</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{pickLang(language, "Buka", "Show")}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {catalogExpanded && (
                <AllIngredientsCatalogTable
                  items={allCatalogFiltered}
                  allNutrients={store.allNutrients}
                  language={language}
                  activeSpecies={activeSpecies}
                  tableViewTier={tableViewTier}
                  showNdf={showNdf}
                  showBetn={showBetn}
                  decimalPlaces={decimalPlaces}
                  simpleMode={simpleMode}
                  searchQuery={catalogSearch}
                  onToggleActive={handleToggleCatalogActive}
                  onOpenDetail={handleOpenDetail}
                  onResetFilter={handleResetCatalogFilter}
                />
              )}
            </Card>
          </motion.div>

          <motion.section
            {...(isAntiSlop ? {} : { variants: WORKBENCH_PANEL_ITEM })}
            aria-label={pickLang(language, "Panel Hasil Formulasi", "Formulation Results Panel")}
            className="min-h-[260px] shrink-0"
          >
            {resultsPanel}
          </motion.section>
        </div>

        {inspectorOpen && (
          <motion.section
            {...(isAntiSlop ? {} : { variants: WORKBENCH_PANEL_ITEM })}
            aria-label={pickLang(language, "Panel Target Nutrien", "Nutrient Targets Panel")}
            className="min-h-0 w-[352px]"
          >
            {targetPanel}
          </motion.section>
        )}
      </motion.div>

      {/* Mobile & Tablet Stepper Content (< 1024px): menyatu dengan scroll utama halaman + padding bawah lega */}
      <div className="landscape-workbench-scroll p-3 pb-36 md:p-4 md:pb-8 lg:hidden">
        {activeMobileStep === "ingredients" && (
          <div className="selectable-panel space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  {pickLang(language, "Pakan yang Digunakan", "Used Feed Ingredients")}
                </h2>
                <Badge tone="emerald">{usedIngredients.length}</Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-pressed={mobileTableMode}
                  onClick={() => setMobileTableMode((v) => !v)}
                  className={cn(
                    "min-h-11 min-w-11 px-0 md:min-h-8 md:min-w-8",
                    !isAntiSlop && "neu-pill-btn rounded-lg",
                  )}
                  aria-label={pickLang(
                    language,
                    "Ganti tampilan Kartu atau Tabel Kompak",
                    "Toggle Card or Compact Table View",
                  )}
                >
                  <Table className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button variant="secondary" size="sm" onClick={onOpenAddIngredient}>
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{pickLang(language, "Tambah", "Add")}</span>
                </Button>
              </div>
            </div>

            {usedIngredients.length === 0 ? (
              <Card
                interactive={false}
                className="p-6 text-center text-xs text-[var(--text-secondary)]"
              >
                <p>
                  {pickLang(
                    language,
                    "Belum ada bahan aktif dalam formulasi. Tambahkan bahan baru atau aktifkan dari Database Bahan.",
                    "No active feeds in this formulation yet. Add a new feed or enable feeds from the Ingredient Database.",
                  )}
                </p>
                <Button variant="primary" size="sm" onClick={onOpenAddIngredient} className="mt-3">
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{pickLang(language, "Tambah Bahan Baru", "Add New Feed")}</span>
                </Button>
              </Card>
            ) : mobileTableMode ? (
              <div className="landscape-table-box h-[55dvh]">
                <IngredientDesktopTable
                  ingredients={usedIngredients}
                  allIngredients={store.ingredients}
                  allNutrients={store.allNutrients}
                  composition={store.result.composition}
                  activeSpecies={activeSpecies}
                  showAdvanceColumns={store.config.enableAdvanceNutrients}
                  showNdf={showNdf}
                  showBetn={showBetn}
                  tableViewTier={tableViewTier}
                  onChangeTableViewTier={store.setTableViewTier}
                  decimalPlaces={decimalPlaces}
                  simpleMode={simpleMode}
                  language={language}
                  onUpdateIngredient={store.updateIngredient}
                  onResetPriceOverride={store.resetPriceOverride}
                  onOpenDetail={handleOpenDetail}
                  onBatchIngredientsUpdate={store.importIngredients}
                />
              </div>
            ) : (
              <IngredientMobileCards
                ingredients={usedIngredients}
                activeSpecies={activeSpecies}
                decimalPlaces={decimalPlaces}
                simpleMode={simpleMode}
                language={language}
                onUpdateIngredient={store.updateIngredient}
                onResetPriceOverride={store.resetPriceOverride}
                onOpenDetail={handleOpenDetail}
              />
            )}
          </div>
        )}

        {activeMobileStep === "targets" && targetPanel}
        {activeMobileStep === "results" && resultsPanel}
      </div>

      <MobileStickyActionBar
        status={store.result.status}
        costPerKg={store.result.costPerKg}
        activeStep={activeMobileStep}
        language={language}
        onShowResults={() => handleMobileStepChange("results")}
      />

      <IngredientDetailSheet
        ingredient={editingIngredient}
        allNutrients={store.allNutrients}
        open={editingIngredient !== null}
        stochasticEnabled={store.config.enableStochasticSlp === true}
        decimalPlaces={decimalPlaces}
        onClose={() => setEditingIngredientId(null)}
        onUpdate={store.updateIngredient}
        onResetPrice={store.resetPriceOverride}
        language={language}
      />
    </div>
  );
}
