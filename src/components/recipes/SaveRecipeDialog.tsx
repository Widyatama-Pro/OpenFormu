import { useId, useState } from "react";
import { pickLang } from "../../i18n";
import type { AppLanguage } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { SheetDialog } from "../ui/SheetDialog";

export interface SaveRecipeDialogProps {
  readonly open: boolean;
  readonly defaultName: string;
  readonly language?: AppLanguage;
  readonly onClose: () => void;
  readonly onSave: (name: string, notes?: string) => void;
}

export function SaveRecipeDialog({
  open,
  defaultName,
  language = "id",
  onClose,
  onSave,
}: SaveRecipeDialogProps) {
  const fieldId = useId();
  const [name, setName] = useState(defaultName);
  const [notes, setNotes] = useState("");
  const [prevSync, setPrevSync] = useState({ open, defaultName });

  if (prevSync.open !== open || prevSync.defaultName !== defaultName) {
    setPrevSync({ open, defaultName });
    if (open) {
      setName(defaultName);
    }
  }

  const handleConfirm = () => {
    const trimmed = name.trim() || defaultName;
    onSave(trimmed, notes.trim() || undefined);
    setNotes("");
    onClose();
  };

  return (
    <SheetDialog
      open={open}
      onClose={onClose}
      title={pickLang(language, "Simpan Proyek Formulasi", "Save Formulation Project")}
      subtitle={pickLang(
        language,
        "Menyimpan bahan aktif, harga custom, batasan, dan hasil saat ini.",
        "Saves active ingredients, custom prices, constraints, and current result.",
      )}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {pickLang(language, "Batal", "Cancel")}
          </Button>
          <Button variant="primary" onClick={handleConfirm}>
            {pickLang(language, "Simpan Proyek", "Save Project")}
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5 text-xs">
        <div>
          <label
            htmlFor={`${fieldId}-name`}
            className="mb-1 block font-medium text-[var(--text-primary)]"
          >
            {pickLang(language, "Nama Resep", "Recipe Name")}
          </label>
          <Input id={`${fieldId}-name`} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label
            htmlFor={`${fieldId}-notes`}
            className="mb-1 block font-medium text-[var(--text-primary)]"
          >
            {pickLang(language, "Catatan Lapangan (Opsional)", "Field Notes (Optional)")}
          </label>
          <Input
            id={`${fieldId}-notes`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={pickLang(
              language,
              "Mis. Harga jagung kiriman minggu ke-2…",
              "e.g. Week-2 corn shipment price…",
            )}
          />
        </div>
      </div>
    </SheetDialog>
  );
}
