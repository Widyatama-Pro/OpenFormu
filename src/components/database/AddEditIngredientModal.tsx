import { useId, useState } from "react";
import { FEED_CLASSES, feedClassToCategory, getFeedClassLabel } from "../../data/feed-classes";
import { pickLang } from "../../i18n";
import { useOptionalThemeContext } from "../../theme";
import type { AppLanguage, Basis, FeedClassCode, Ingredient } from "../../types";
import { cn } from "../../utils/cn";
import { parseLocaleDecimal } from "../../utils/locale-number";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { SheetDialog } from "../ui/SheetDialog";
import { ThemedSelect } from "../ui/ThemedSelect";

export interface AddEditIngredientModalProps {
  readonly open: boolean;
  readonly language?: AppLanguage;
  readonly onClose: () => void;
  readonly onSave: (ingredient: Ingredient) => void;
}

export function AddEditIngredientModal({
  open,
  language = "id",
  onClose,
  onSave,
}: AddEditIngredientModalProps) {
  const isAntiSlop = useOptionalThemeContext()?.uiMode === "anti-slop";
  const fieldId = useId();
  const [name, setName] = useState("");
  const [feedClass, setFeedClass] = useState<FeedClassCode>(4);
  const [basis, setBasis] = useState<Basis>("as_fed");
  const [price, setPrice] = useState("4500");
  const [dryMatter, setDryMatter] = useState("88");
  const [cp, setCp] = useState("10");
  const [me, setMe] = useState("2800");
  const [ca, setCa] = useState("0.1");
  const [p, setP] = useState("0.3");
  const [source, setSource] = useState("Input Lokal Pengguna / Lab");
  const [error, setError] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setError(null);
    }
  }

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const parsedPrice = parseLocaleDecimal(price, { treatSingleThousandDot: true });
    const parsedDm = parseLocaleDecimal(dryMatter);
    const parsedCp = cp.trim() === "" ? null : parseLocaleDecimal(cp);
    const parsedMe = me.trim() === "" ? null : parseLocaleDecimal(me);
    const parsedCa = ca.trim() === "" ? null : parseLocaleDecimal(ca);
    const parsedP = p.trim() === "" ? null : parseLocaleDecimal(p);

    if (!trimmedName) {
      setError(pickLang(language, "Nama bahan wajib diisi.", "Ingredient name is required."));
      return;
    }
    if (parsedPrice === null || parsedPrice < 0) {
      setError(pickLang(language, "Harga/kg harus angka >= 0.", "Price/kg must be a number >= 0."));
      return;
    }
    if (parsedDm === null || parsedDm <= 0 || parsedDm > 100) {
      setError(
        pickLang(
          language,
          "Bahan kering (BK%) harus antara > 0 dan 100.",
          "Dry matter (DM%) must be between > 0 and 100.",
        ),
      );
      return;
    }
    if (!source.trim()) {
      setError(
        pickLang(
          language,
          "Sumber/sitasi data bahan wajib dicantumkan.",
          "Data source/citation is required.",
        ),
      );
      return;
    }

    const newIng: Ingredient = {
      id: `custom-${Date.now()}`,
      name: trimmedName,
      category: feedClassToCategory(feedClass),
      feedClass,
      pricePerKg: parsedPrice,
      dryMatter: parsedDm,
      basis,
      isActive: true,
      inclusion: { min: 0, max: 100 },
      nutrients: {
        cp: parsedCp,
        me_poultry: parsedMe,
        ca: parsedCa,
        p: parsedP,
        cf: null,
        ee: null,
        lys: null,
        met: null,
      },
      source: source.trim(),
    };

    onSave(newIng);
    setName("");
    setError(null);
    onClose();
  };

  return (
    <SheetDialog
      open={open}
      onClose={handleClose}
      title={pickLang(language, "Tambah Bahan Pakan Baru", "Add New Feed Ingredient")}
      subtitle={pickLang(
        language,
        "Kosongkan kolom nutrien bila belum memiliki hasil uji lab (disimpan sebagai N/A, bukan 0).",
        "Leave nutrient fields blank if lab data is unavailable (saved as N/A, not 0).",
      )}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>
            {pickLang(language, "Batal", "Cancel")}
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {pickLang(language, "Simpan Bahan", "Save Feed")}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-xs">
        {error && (
          <p
            role="alert"
            className={cn(
              "border border-[var(--status-danger-border)] bg-[var(--status-danger-soft)] p-3 font-medium text-[var(--status-danger)]",
              isAntiSlop ? "rounded-lg" : "glass-card glass-card-coral rounded-2xl",
            )}
          >
            {error}
          </p>
        )}

        <div>
          <label
            htmlFor={`${fieldId}-name`}
            className="mb-1 block font-medium text-[var(--text-primary)]"
          >
            {pickLang(language, "Nama Bahan", "Ingredient Name")}
          </label>
          <Input
            id={`${fieldId}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={pickLang(language, "Mis. Bungkil Kopra Lokal", "e.g. Local Copra Meal")}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`${fieldId}-class`}
              className="mb-1 block font-medium text-[var(--text-primary)]"
            >
              {pickLang(
                language,
                "Klasifikasi (8 Kelas Standar)",
                "Feed Class (8 Standard Classes)",
              )}
            </label>
            <ThemedSelect
              id={`${fieldId}-class`}
              ariaLabel={pickLang(
                language,
                "Klasifikasi (8 Kelas Standar)",
                "Feed Class (8 Standard Classes)",
              )}
              modalTitle={pickLang(language, "Pilih Klasifikasi Bahan Pakan", "Select Feed Class")}
              value={String(feedClass)}
              language={language}
              popoverMinWidthPx={260}
              onChange={(val) => setFeedClass(Number(val) as FeedClassCode)}
              options={FEED_CLASSES.map((fc) => ({
                value: String(fc.code),
                label: getFeedClassLabel(language, fc.code),
              }))}
            />
          </div>
          <div>
            <label
              htmlFor={`${fieldId}-basis`}
              className="mb-1 block font-medium text-[var(--text-primary)]"
            >
              {pickLang(language, "Basis Data Lab", "Lab Data Basis")}
            </label>
            <ThemedSelect
              id={`${fieldId}-basis`}
              ariaLabel={pickLang(language, "Basis Data Lab", "Lab Data Basis")}
              modalTitle={pickLang(language, "Pilih Basis Data Lab", "Select Lab Data Basis")}
              value={basis}
              language={language}
              popoverMinWidthPx={190}
              onChange={(val) => setBasis(val as Basis)}
              options={[
                { value: "as_fed", label: "As-Fed" },
                {
                  value: "dry_matter",
                  label: pickLang(language, "Bahan Kering (BK)", "Dry Matter (DM)"),
                },
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={`${fieldId}-price`}
              className="mb-1 block font-medium text-[var(--text-primary)]"
            >
              {pickLang(language, "Harga / kg As-Fed (Rp)", "Price / kg As-Fed (IDR)")}
            </label>
            <Input
              id={`${fieldId}-price`}
              numeric
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor={`${fieldId}-dm`}
              className="mb-1 block font-medium text-[var(--text-primary)]"
            >
              {pickLang(language, "Bahan Kering / BK (%)", "Dry Matter / DM (%)")}
            </label>
            <Input
              id={`${fieldId}-dm`}
              numeric
              value={dryMatter}
              onChange={(e) => setDryMatter(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label
              htmlFor={`${fieldId}-cp`}
              className="mb-1 block font-medium text-[var(--text-primary)]"
            >
              {pickLang(language, "PK (%)", "CP (%)")}
            </label>
            <Input
              id={`${fieldId}-cp`}
              numeric
              value={cp}
              onChange={(e) => setCp(e.target.value)}
              placeholder="N/A"
            />
          </div>
          <div>
            <label
              htmlFor={`${fieldId}-me`}
              className="mb-1 block font-medium text-[var(--text-primary)]"
            >
              {pickLang(language, "EM (kcal/kg)", "ME (kcal/kg)")}
            </label>
            <Input
              id={`${fieldId}-me`}
              numeric
              value={me}
              onChange={(e) => setMe(e.target.value)}
              placeholder="N/A"
            />
          </div>
          <div>
            <label
              htmlFor={`${fieldId}-ca`}
              className="mb-1 block font-medium text-[var(--text-primary)]"
            >
              Ca (%)
            </label>
            <Input
              id={`${fieldId}-ca`}
              numeric
              value={ca}
              onChange={(e) => setCa(e.target.value)}
              placeholder="N/A"
            />
          </div>
          <div>
            <label
              htmlFor={`${fieldId}-p`}
              className="mb-1 block font-medium text-[var(--text-primary)]"
            >
              P (%)
            </label>
            <Input
              id={`${fieldId}-p`}
              numeric
              value={p}
              onChange={(e) => setP(e.target.value)}
              placeholder="N/A"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={`${fieldId}-source`}
            className="mb-1 block font-medium text-[var(--text-primary)]"
          >
            {pickLang(language, "Sumber Data / Referensi", "Data Source / Reference")}
          </label>
          <Input
            id={`${fieldId}-source`}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </div>
      </div>
    </SheetDialog>
  );
}
