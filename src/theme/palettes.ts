import type { AppLanguage, ThemePaletteId } from "../types";

export interface PaletteDescriptor {
  readonly id: ThemePaletteId;
  readonly labelId: string;
  readonly labelEn: string;
  readonly subtitleId: string;
  readonly subtitleEn: string;
  /** Warna aksen pendaran utama untuk mode UI Enhancer */
  readonly enhancerAccentHex: string;
  readonly enhancerGlowLabelId: string;
  readonly enhancerGlowLabelEn: string;
  /** 4 preview dots: [canvas, primary, secondary, accent] */
  readonly swatches: readonly [string, string, string, string];
  /** Dark-mode swatches override when previewing in dark mode */
  readonly darkSwatches: readonly [string, string, string, string];
}

export const OPENFORMU_PALETTE_CATALOG: readonly PaletteDescriptor[] = [
  {
    id: "template-04",
    labelId: "Indigo Glasial",
    labelEn: "Glacial Indigo",
    subtitleId: "Biru glasial sejuk & kapur elektrik untuk analitik modern",
    subtitleEn: "Cool glacial cyan-navy with electric indigo & acid lime analytics",
    enhancerAccentHex: "#6E67FB",
    enhancerGlowLabelId: "Kaca Glasial & Bias Indigo",
    enhancerGlowLabelEn: "Glacial Prism & Indigo Aura",
    swatches: ["#EEFEFE", "#202D41", "#6E67FB", "#C8FF3C"],
    darkSwatches: ["#141B26", "#C8FF3C", "#6E67FB", "#C8FF3C"],
  },
  {
    id: "original-default",
    labelId: "Botani Emas",
    labelEn: "Botanical Gold",
    subtitleId: "Palet zamrud & emas hangat untuk racikan harian",
    subtitleEn: "Warm emerald & gold palette for daily ration balancing",
    enhancerAccentHex: "#10B981",
    enhancerGlowLabelId: "Kaca Zamrud & Pendar Emas Hangat",
    enhancerGlowLabelEn: "Emerald Glass & Warm Gold Aura",
    swatches: ["#F5F4EF", "#142B27", "#24483D", "#D5A45C"],
    darkSwatches: ["#0F1A18", "#3A6E5E", "#24483D", "#D5A45C"],
  },
  {
    id: "template-01",
    labelId: "Karbon Sitrus",
    labelEn: "Carbon Citrus",
    subtitleId: "Kontras tinggi karbon & koral untuk audit harga dan deviasi",
    subtitleEn: "High-contrast carbon editorial for sharp cost & deviation audits",
    enhancerAccentHex: "#EC704B",
    enhancerGlowLabelId: "Kaca Koral & Bias Sitrus",
    enhancerGlowLabelEn: "Coral Acrylic & Citrus Refraction",
    swatches: ["#F7F7F5", "#111111", "#EC704B", "#F5F378"],
    darkSwatches: ["#111111", "#F5F378", "#DCC1FF", "#EC704B"],
  },
  {
    id: "template-03",
    labelId: "Sajia Jeruk",
    labelEn: "Tangerine Sage",
    subtitleId: "Zaitun organik hangat & aksen jeruk untuk kerja lapangan",
    subtitleEn: "Warm organic olive sage & tangerine for field and barn work",
    enhancerAccentHex: "#FE813C",
    enhancerGlowLabelId: "Kaca Zaitun & Cahaya Senja",
    enhancerGlowLabelEn: "Sage Glass & Tangerine Sunlight",
    swatches: ["#F8F7F4", "#0E0F0B", "#727E6E", "#FE813C"],
    darkSwatches: ["#0E0F0B", "#FE813C", "#727E6E", "#BC656A"],
  },
  {
    id: "template-05",
    labelId: "Zamrud Pistachio",
    labelEn: "Emerald Pistachio",
    subtitleId: "Hijau hutan agraria & krim pistachio selaras pakan hijauan",
    subtitleEn: "Deep agrarian forest emerald & pistachio cream for forage nutrition",
    enhancerAccentHex: "#10B981",
    enhancerGlowLabelId: "Kaca Hutan & Pendar Pistachio",
    enhancerGlowLabelEn: "Forest Frost & Pistachio Glow",
    swatches: ["#F3F6EC", "#144425", "#657D6E", "#D3FA53"],
    darkSwatches: ["#0B1F12", "#D3FA53", "#657D6E", "#D3FA53"],
  },
];

/** Alias kompatibilitas; gunakan `OPENFORMU_PALETTE_CATALOG`. */
export const OPENFORMUL_PALETTE_CATALOG = OPENFORMU_PALETTE_CATALOG;

const PALETTE_ID_SET = new Set<string>(OPENFORMU_PALETTE_CATALOG.map((p) => p.id));

export function isThemePaletteId(value: unknown): value is ThemePaletteId {
  return typeof value === "string" && PALETTE_ID_SET.has(value);
}

export function getPaletteLabel(palette: PaletteDescriptor, language: AppLanguage): string {
  return language === "id" ? palette.labelId : palette.labelEn;
}

export function getPaletteSubtitle(palette: PaletteDescriptor, language: AppLanguage): string {
  return language === "id" ? palette.subtitleId : palette.subtitleEn;
}
