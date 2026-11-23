import { useState } from "react";
import type { ResultSpotlightTarget, ResultSubTab } from "./components/analytics/ResultsPanel";
import { AddEditIngredientModal } from "./components/database/AddEditIngredientModal";
import { IngredientLibraryPage } from "./components/database/IngredientLibraryPage";
import { RequirementLibraryPage } from "./components/database/RequirementLibraryPage";
import {
  AdvancedModulesPreview,
  type AdvancedShortcutTarget,
} from "./components/formulation/AdvancedModulesPreview";
import {
  FormulationWorkbench,
  type MobileStep,
} from "./components/formulation/FormulationWorkbench";
import {
  PrecisionEngineDialog,
  type PrecisionFocusSection,
} from "./components/formulation/PrecisionEngineDialog";
import { AppShell } from "./components/layout/AppShell";
import { ExportDialog } from "./components/recipes/ExportDialog";
import { SaveRecipeDialog } from "./components/recipes/SaveRecipeDialog";
import { SavedRecipesPage } from "./components/recipes/SavedRecipesPage";
import { SettingsPage } from "./components/settings/SettingsPage";
import { usePrototypeStore } from "./hooks/use-prototype-store";
import { usePwaStatus } from "./hooks/use-pwa-status";
import { FEED_JSON_MIME } from "./storage";
import { ThemeProvider, useTheme } from "./theme";
import { downloadTextFile } from "./utils/download";
import { isRuminantSpecies } from "./utils/species";

function AppContent() {
  const store = usePrototypeStore();
  const pwa = usePwaStatus();
  const themeCtx = useTheme();
  const [saveOpen, setSaveOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [addIngredientOpen, setAddIngredientOpen] = useState(false);
  const [precisionOpen, setPrecisionOpen] = useState(false);
  const [precisionFocusSection, setPrecisionFocusSection] = useState<PrecisionFocusSection | null>(
    null,
  );
  const [resultSubTab, setResultSubTab] = useState<ResultSubTab>("batch");
  const [resultSpotlight, setResultSpotlight] = useState<ResultSpotlightTarget>(null);
  const [mobileStep, setMobileStep] = useState<MobileStep>("ingredients");

  const decimalPlaces = store.preferences.decimalPlaces ?? 0;
  const hasRumenEvaluation = isRuminantSpecies(store.activeRequirement.species);

  const handleExportAllBackup = () => {
    const json = store.exportAllBackupJson();
    const dateStamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(json, `openformu-backup-${dateStamp}.json`, FEED_JSON_MIME);
  };

  const handleAdvancedShortcut = (target: AdvancedShortcutTarget) => {
    if (target === "shadow_price") {
      setResultSubTab("dual");
      setResultSpotlight("dual");
      setMobileStep("results");
      store.setRoute("formulation");
    } else if (target === "what_if") {
      setResultSubTab("whatif");
      setResultSpotlight("whatif");
      setMobileStep("results");
      store.setRoute("formulation");
    } else if (target === "fractional_objective") {
      setPrecisionFocusSection("fractional");
      setPrecisionOpen(true);
      store.setRoute("formulation");
    } else if (target === "stochastic_slp") {
      setPrecisionFocusSection("stochastic");
      setPrecisionOpen(true);
      store.setRoute("formulation");
    } else if (target === "enzyme_rumen") {
      setPrecisionFocusSection("enzyme");
      setPrecisionOpen(true);
      store.setRoute("formulation");
    }
  };

  const handleJumpToRumenEvaluator = () => {
    setPrecisionOpen(false);
    setPrecisionFocusSection(null);
    setResultSubTab("batch");
    setResultSpotlight("rumen");
    setMobileStep("results");
    store.setRoute("formulation");
  };

  const handleToggleLightDark = () => {
    const nextResolved = themeCtx.resolvedMode === "light" ? "dark" : "light";
    themeCtx.toggleLightDark();
    store.updatePreferences({
      theme: nextResolved,
      themePalette: themeCtx.paletteId,
      themeModeSetting: nextResolved,
      amoledPureBlack: themeCtx.amoledPureBlack,
      uiMode: themeCtx.uiMode,
      uiEnhancer: themeCtx.uiEnhancer,
      renderingEngine: themeCtx.renderingEngine,
      motionEngine: themeCtx.motionEngine,
      glassBlurPx: themeCtx.glassBlurPx,
      glowIntensityPct: themeCtx.glowIntensityPct,
    });
  };

  return (
    <AppShell
      route={store.route}
      onNavigate={store.setRoute}
      language={store.preferences.language}
      theme={themeCtx.resolvedMode}
      onToggleTheme={handleToggleLightDark}
      onToggleLanguage={() => store.setLanguage(store.preferences.language === "id" ? "en" : "id")}
      isOnline={pwa.isOnline}
      offlineReady={pwa.offlineReady}
      needRefresh={pwa.needRefresh}
      canInstall={pwa.canInstall}
      isInstalled={pwa.isInstalled}
      onApplyUpdate={pwa.applyUpdate}
      onInstallApp={() => {
        void pwa.installApp();
      }}
    >
      {store.route === "formulation" && (
        <FormulationWorkbench
          store={store}
          resultSubTab={resultSubTab}
          onResultSubTabChange={setResultSubTab}
          mobileStep={mobileStep}
          onMobileStepChange={setMobileStep}
          spotlightTarget={resultSpotlight}
          onClearSpotlight={() => setResultSpotlight(null)}
          onOpenSaveDialog={() => setSaveOpen(true)}
          onOpenExportDialog={() => setExportOpen(true)}
          onOpenAddIngredient={() => setAddIngredientOpen(true)}
        />
      )}

      {store.route === "ingredients" && (
        <IngredientLibraryPage
          ingredients={store.ingredients}
          allNutrients={store.allNutrients}
          customNutrients={store.config.customNutrients ?? []}
          language={store.preferences.language}
          decimalPlaces={decimalPlaces}
          simpleMode={store.preferences.simpleMode ?? !store.config.enableAdvanceNutrients}
          tableViewTier={
            store.preferences.tableViewTier ??
            (store.config.enableAdvanceNutrients ? "advanced" : "basic")
          }
          onChangeTableViewTier={store.setTableViewTier}
          showNdf={store.config.showNdf === true}
          showBetn={store.config.showBetn === true}
          onToggleActive={(id, active) => store.updateIngredient(id, { isActive: active })}
          onOpenAdd={() => setAddIngredientOpen(true)}
          onImportIngredients={store.importIngredients}
        />
      )}

      {store.route === "requirements" && (
        <RequirementLibraryPage
          requirements={store.requirements}
          activeRequirementId={store.activeRequirement.id}
          language={store.preferences.language}
          decimalPlaces={decimalPlaces}
          simpleMode={store.preferences.simpleMode ?? !store.config.enableAdvanceNutrients}
          onSelectAndUse={(id) => {
            store.selectPreset(id);
            store.setRoute("formulation");
          }}
          onCreateProfile={(req) => {
            store.addRequirement(req);
            store.setRoute("formulation");
          }}
        />
      )}

      {store.route === "recipes" && (
        <SavedRecipesPage
          recipes={store.recipes}
          nutrientsCatalog={store.allNutrients}
          language={store.preferences.language}
          decimalPlaces={decimalPlaces}
          onLoadRecipe={store.loadRecipe}
          onOpenSaveCurrent={() => setSaveOpen(true)}
          onOpenExport={() => setExportOpen(true)}
          onImportFeedJson={store.importFeedJson}
          onDeleteRecipe={store.deleteRecipe}
        />
      )}

      {store.route === "advanced" && (
        <AdvancedModulesPreview
          language={store.preferences.language}
          onOpenWorkbench={() => store.setRoute("formulation")}
          onOpenShortcut={handleAdvancedShortcut}
        />
      )}

      {store.route === "settings" && (
        <SettingsPage
          preferences={store.preferences}
          onUpdate={store.updatePreferences}
          config={store.config}
          onToggleAdvance={store.toggleAdvanceNutrients}
          onToggleShowNdf={store.toggleShowNdf}
          onToggleShowBetn={store.toggleShowBetn}
          onSetDecimalPlaces={store.setDecimalPlaces}
          onSetTableViewTier={store.setTableViewTier}
          onSetGlobalZeroInclusion={store.setGlobalZeroInclusion}
          onOpenPrecisionDialog={() => {
            setPrecisionFocusSection(null);
            setPrecisionOpen(true);
          }}
          storageStats={store.storageStats}
          storageWarnings={store.storageWarnings}
          pwaStatus={pwa}
          onExportAllBackup={handleExportAllBackup}
          onResetSampleData={store.resetAllSampleData}
          onClearAllUserData={store.clearAllUserData}
        />
      )}

      <SaveRecipeDialog
        open={saveOpen}
        defaultName={
          store.preferences.language === "id"
            ? store.activeRequirement.name
            : (store.activeRequirement.nameEn ?? store.activeRequirement.name)
        }
        language={store.preferences.language}
        onClose={() => setSaveOpen(false)}
        onSave={store.saveCurrentRecipe}
      />

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        ingredients={store.ingredients}
        requirement={store.activeRequirement}
        config={store.config}
        result={store.result}
        nutrientsCatalog={store.allNutrients}
        decimalPlaces={decimalPlaces}
        language={store.preferences.language}
      />

      <AddEditIngredientModal
        open={addIngredientOpen}
        language={store.preferences.language}
        onClose={() => setAddIngredientOpen(false)}
        onSave={store.addIngredient}
      />

      <PrecisionEngineDialog
        open={precisionOpen}
        onClose={() => {
          setPrecisionOpen(false);
          setPrecisionFocusSection(null);
        }}
        config={store.config}
        allNutrients={store.allNutrients}
        stochasticIterations={store.result.stochasticIterations}
        language={store.preferences.language}
        focusSection={precisionFocusSection}
        onClearFocus={() => setPrecisionFocusSection(null)}
        hasRumenEvaluation={hasRumenEvaluation}
        onJumpToRumenEvaluator={handleJumpToRumenEvaluator}
        onUpdatePrecision={store.updatePrecisionConfig}
      />
    </AppShell>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
