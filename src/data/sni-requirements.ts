import type { Requirement } from "../types";

/**
 * Standar Kebutuhan Nutrien Ternak resmi berdasarkan Standar Nasional Indonesia (SNI)
 * lengkap dengan nomor seri & tahun terbitnya (Badan Standardisasi Nasional / BSN):
 *
 * - Ayam Ras Pedaging (Broiler): SNI 8173.1:2015, SNI 8173.2:2015, SNI 8173.3:2015
 * - Ayam Ras Petelur (Layer): SNI 8290.1:2016 s/d SNI 8290.5:2016
 * - Ayam Buras / Kampung: SNI 7783.1:2013 s/d SNI 7783.3:2013
 * - Itik Petelur: SNI 3908:2017, SNI 3909:2017, SNI 3910:2017
 * - Pakan Konsentrat Sapi Perah: SNI 3148-1:2017 (KSP1, KSP3, KSP4, KSP5, KSP6)
 * - Pakan Konsentrat Sapi Potong: SNI 3148-2:2017 (Penggemukan, Induk, Pejantan)
 * - Pakan Konsentrat Domba/Kambing Penggemukan: SNI 8819:2019
 */
export const SNI_REQUIREMENTS: readonly Requirement[] = [
  // =========================================================================
  // 1. AYAM RAS PEDAGING (BROILER) — SNI 8173:2015
  // =========================================================================
  {
    id: "sni-8173-1-2015",
    name: "Broiler Pre-Starter 1–7 hr (SNI 8173.1:2015)",
    nameEn: "Broiler Pre-Starter 1–7 d (SNI 8173.1:2015)",
    species: "broiler",
    phase: "Pre-Starter (1–7 hari)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 22.0, idealTarget: 23.0, enabled: true },
      { nutrientId: "me_poultry", min: 2900, idealTarget: 3000, enabled: true },
      { nutrientId: "ee", min: 5.0, idealTarget: 5.5, enabled: true },
      { nutrientId: "cf", max: 4.0, idealTarget: 3.5, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.1, idealTarget: 0.95, enabled: true },
      { nutrientId: "p", min: 0.6, max: 0.85, idealTarget: 0.7, enabled: true },
      { nutrientId: "lys", min: 1.3, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.5, isAdvance: true, enabled: true },
      { nutrientId: "metcys", min: 0.9, isAdvance: true, enabled: true },
    ],
    ratios: [
      {
        id: "ca-p",
        label: "Kalsium : Fosfor (Ca:P)",
        numerator: "ca",
        denominator: "p",
        min: 1.3,
        max: 2.0,
      },
    ],
    source:
      "SNI 8173.1:2015 — Pakan Ayam Ras Pedaging (Broiler) Bagian 1: Sebelum Masa Awal (BSN, 2015)",
  },
  {
    id: "sni-8173-2-2015",
    name: "Broiler Starter 8–21 hr (SNI 8173.2:2015)",
    nameEn: "Broiler Starter 8–21 d (SNI 8173.2:2015)",
    species: "broiler",
    phase: "Starter (8–21 hari)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 20.0, idealTarget: 21.5, enabled: true },
      { nutrientId: "me_poultry", min: 3000, idealTarget: 3050, enabled: true },
      { nutrientId: "ee", min: 5.0, idealTarget: 5.5, enabled: true },
      { nutrientId: "cf", max: 5.0, idealTarget: 4.0, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.1, idealTarget: 0.95, enabled: true },
      { nutrientId: "p", min: 0.6, max: 0.85, idealTarget: 0.68, enabled: true },
      { nutrientId: "lys", min: 1.2, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.45, isAdvance: true, enabled: true },
    ],
    ratios: [
      {
        id: "ca-p",
        label: "Kalsium : Fosfor (Ca:P)",
        numerator: "ca",
        denominator: "p",
        min: 1.3,
        max: 2.0,
      },
    ],
    source: "SNI 8173.2:2015 — Pakan Ayam Ras Pedaging (Broiler) Bagian 2: Masa Awal (BSN, 2015)",
  },
  {
    id: "sni-8173-3-2015",
    name: "Broiler Finisher >21 hr (SNI 8173.3:2015)",
    nameEn: "Broiler Finisher >21 d (SNI 8173.3:2015)",
    species: "broiler",
    phase: "Finisher (>21 hari – panen)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 19.0, idealTarget: 20.0, enabled: true },
      { nutrientId: "me_poultry", min: 3100, idealTarget: 3150, enabled: true },
      { nutrientId: "ee", min: 5.0, idealTarget: 6.0, enabled: true },
      { nutrientId: "cf", max: 6.0, idealTarget: 4.5, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.1, idealTarget: 0.9, enabled: true },
      { nutrientId: "p", min: 0.5, max: 0.8, idealTarget: 0.62, enabled: true },
      { nutrientId: "lys", min: 1.0, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.38, isAdvance: true, enabled: true },
    ],
    ratios: [
      {
        id: "ca-p",
        label: "Kalsium : Fosfor (Ca:P)",
        numerator: "ca",
        denominator: "p",
        min: 1.3,
        max: 2.0,
      },
    ],
    source: "SNI 8173.3:2015 — Pakan Ayam Ras Pedaging (Broiler) Bagian 3: Masa Akhir (BSN, 2015)",
  },

  // =========================================================================
  // 2. AYAM RAS PETELUR (LAYER) — SNI 8290:2016
  // =========================================================================
  {
    id: "sni-8290-1-2016",
    name: "Layer Pre-Starter 1 hr–4 mgg (SNI 8290.1:2016)",
    nameEn: "Layer Pre-Starter 1 d–4 wk (SNI 8290.1:2016)",
    species: "layer",
    phase: "Pre-Starter (1 hari–4 minggu)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 20.0, idealTarget: 20.5, enabled: true },
      { nutrientId: "me_poultry", min: 2800, idealTarget: 2850, enabled: true },
      { nutrientId: "ee", min: 3.0, idealTarget: 4.0, enabled: true },
      { nutrientId: "cf", max: 6.0, idealTarget: 4.5, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.2, idealTarget: 1.0, enabled: true },
      { nutrientId: "p", min: 0.6, max: 0.85, idealTarget: 0.68, enabled: true },
      { nutrientId: "lys", min: 1.0, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.5, isAdvance: true, enabled: true },
    ],
    source: "SNI 8290.1:2016 — Pakan Ayam Ras Petelur Bagian 1: Sebelum Masa Awal (BSN, 2016)",
  },
  {
    id: "sni-8290-2-2016",
    name: "Layer Starter 5–10 mgg (SNI 8290.2:2016)",
    nameEn: "Layer Starter 5–10 wk (SNI 8290.2:2016)",
    species: "layer",
    phase: "Starter (5–10 minggu)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 19.0, idealTarget: 19.5, enabled: true },
      { nutrientId: "me_poultry", min: 2750, idealTarget: 2800, enabled: true },
      { nutrientId: "ee", min: 3.0, idealTarget: 4.0, enabled: true },
      { nutrientId: "cf", max: 7.0, idealTarget: 5.0, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.2, idealTarget: 0.95, enabled: true },
      { nutrientId: "p", min: 0.55, max: 0.8, idealTarget: 0.65, enabled: true },
      { nutrientId: "lys", min: 0.9, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.4, isAdvance: true, enabled: true },
    ],
    source: "SNI 8290.2:2016 — Pakan Ayam Ras Petelur Bagian 2: Masa Awal (BSN, 2016)",
  },
  {
    id: "sni-8290-3-2016",
    name: "Layer Grower / Dara 11–16 mgg (SNI 8290.3:2016)",
    nameEn: "Layer Grower / Pullet 11–16 wk (SNI 8290.3:2016)",
    species: "layer",
    phase: "Grower / Dara (11–16 minggu)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 15.5, idealTarget: 16.0, enabled: true },
      { nutrientId: "me_poultry", min: 2700, idealTarget: 2750, enabled: true },
      { nutrientId: "ee", min: 3.0, idealTarget: 4.0, enabled: true },
      { nutrientId: "cf", max: 7.0, idealTarget: 5.5, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.2, idealTarget: 1.0, enabled: true },
      { nutrientId: "p", min: 0.46, max: 0.75, idealTarget: 0.58, enabled: true },
      { nutrientId: "lys", min: 0.65, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.3, isAdvance: true, enabled: true },
    ],
    source: "SNI 8290.3:2016 — Pakan Ayam Ras Petelur Bagian 3: Dara / Grower (BSN, 2016)",
  },
  {
    id: "sni-8290-4-2016",
    name: "Pre-Layer 17–18 mgg (SNI 8290.4:2016)",
    nameEn: "Pre-Layer 17–18 wk (SNI 8290.4:2016)",
    species: "layer",
    phase: "Pre-Layer (transisi bertelur)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 16.5, idealTarget: 17.0, enabled: true },
      { nutrientId: "me_poultry", min: 2700, idealTarget: 2750, enabled: true },
      { nutrientId: "ee", min: 3.0, idealTarget: 4.0, enabled: true },
      { nutrientId: "cf", max: 7.0, idealTarget: 5.5, enabled: true },
      { nutrientId: "ca", min: 2.0, max: 2.7, idealTarget: 2.35, enabled: true },
      { nutrientId: "p", min: 0.5, max: 0.75, idealTarget: 0.6, enabled: true },
      { nutrientId: "lys", min: 0.75, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.35, isAdvance: true, enabled: true },
    ],
    source: "SNI 8290.4:2016 — Pakan Ayam Ras Petelur Bagian 4: Sebelum Produksi (BSN, 2016)",
  },
  {
    id: "sni-8290-5-2016",
    name: "Layer Produksi 19–50 mgg (SNI 8290.5:2016)",
    nameEn: "Layer Production 19–50 wk (SNI 8290.5:2016)",
    species: "layer",
    phase: "Masa Produksi (19–50 minggu)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 16.5, idealTarget: 17.5, enabled: true },
      { nutrientId: "me_poultry", min: 2700, idealTarget: 2750, enabled: true },
      { nutrientId: "ee", min: 3.0, idealTarget: 4.0, enabled: true },
      { nutrientId: "cf", max: 7.0, idealTarget: 5.0, enabled: true },
      { nutrientId: "ca", min: 3.25, max: 4.25, idealTarget: 3.75, enabled: true },
      { nutrientId: "p", min: 0.55, max: 0.9, idealTarget: 0.65, enabled: true },
      { nutrientId: "lys", min: 0.8, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.4, isAdvance: true, enabled: true },
    ],
    ratios: [
      {
        id: "ca-p",
        label: "Kalsium : Fosfor (Ca:P)",
        numerator: "ca",
        denominator: "p",
        min: 4.5,
        max: 7.5,
      },
    ],
    source: "SNI 8290.5:2016 — Pakan Ayam Ras Petelur Bagian 5: Masa Produksi (BSN, 2016)",
  },

  // =========================================================================
  // 3. AYAM BURAS / KAMPUNG — SNI 7783:2013
  // =========================================================================
  {
    id: "sni-7783-1-2013",
    name: "Ayam Buras Starter 0–4 mgg (SNI 7783.1:2013)",
    nameEn: "Native Chicken Starter 0–4 wk (SNI 7783.1:2013)",
    species: "buras",
    phase: "Starter (0–4 minggu)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 17.0, idealTarget: 18.0, enabled: true },
      { nutrientId: "me_poultry", min: 2900, idealTarget: 2950, enabled: true },
      { nutrientId: "cf", max: 7.0, idealTarget: 5.0, enabled: true },
      { nutrientId: "ca", min: 0.7, max: 1.2, idealTarget: 0.9, enabled: true },
      { nutrientId: "p", min: 0.45, max: 0.8, idealTarget: 0.55, enabled: true },
    ],
    source: "SNI 7783.1:2013 — Pakan Ayam Buras Bagian 1: Starter (BSN, 2013)",
  },
  {
    id: "sni-7783-2-2013",
    name: "Ayam Buras Grower >4–20 mgg (SNI 7783.2:2013)",
    nameEn: "Native Chicken Grower >4–20 wk (SNI 7783.2:2013)",
    species: "buras",
    phase: "Grower (>4–20 minggu)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 14.0, idealTarget: 15.0, enabled: true },
      { nutrientId: "me_poultry", min: 2500, idealTarget: 2650, enabled: true },
      { nutrientId: "cf", max: 8.0, idealTarget: 6.0, enabled: true },
      { nutrientId: "ca", min: 0.7, max: 1.2, idealTarget: 0.9, enabled: true },
      { nutrientId: "p", min: 0.28, max: 0.7, idealTarget: 0.45, enabled: true },
    ],
    source: "SNI 7783.2:2013 — Pakan Ayam Buras Bagian 2: Grower (BSN, 2013)",
  },
  {
    id: "sni-7783-3-2013",
    name: "Ayam Buras Layer >20 mgg (SNI 7783.3:2013)",
    nameEn: "Native Chicken Layer >20 wk (SNI 7783.3:2013)",
    species: "buras",
    phase: "Layer (>20 minggu)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 14.0, idealTarget: 15.5, enabled: true },
      { nutrientId: "me_poultry", min: 2500, idealTarget: 2600, enabled: true },
      { nutrientId: "cf", max: 8.0, idealTarget: 6.0, enabled: true },
      { nutrientId: "ca", min: 2.5, max: 4.0, idealTarget: 3.2, enabled: true },
      { nutrientId: "p", min: 0.35, max: 0.75, idealTarget: 0.5, enabled: true },
    ],
    source: "SNI 7783.3:2013 — Pakan Ayam Buras Bagian 3: Bertelur / Layer (BSN, 2013)",
  },

  // =========================================================================
  // 4. ITIK PETELUR — SNI 3908 / 3909 / 3910:2017
  // =========================================================================
  {
    id: "sni-3908-2017",
    name: "Itik Starter / Meri 1 hr–6 mgg (SNI 3908:2017)",
    nameEn: "Laying Duck Starter 1 d–6 wk (SNI 3908:2017)",
    species: "duck",
    phase: "Meri / Starter (1 hari–6 minggu)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 18.0, idealTarget: 19.0, enabled: true },
      { nutrientId: "me_poultry", min: 2700, idealTarget: 2800, enabled: true },
      { nutrientId: "ee", min: 3.0, idealTarget: 4.0, enabled: true },
      { nutrientId: "cf", max: 8.0, idealTarget: 6.0, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.2, idealTarget: 1.0, enabled: true },
      { nutrientId: "p", min: 0.6, max: 0.85, idealTarget: 0.65, enabled: true },
    ],
    source: "SNI 3908:2017 — Pakan Meri Petelur / Itik Starter (BSN, 2017)",
  },
  {
    id: "sni-3909-2017",
    name: "Itik Grower / Dara 7–18 mgg (SNI 3909:2017)",
    nameEn: "Laying Duck Grower 7–18 wk (SNI 3909:2017)",
    species: "duck",
    phase: "Dara / Grower (7–18 minggu)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 15.0, idealTarget: 15.5, enabled: true },
      { nutrientId: "me_poultry", min: 2600, idealTarget: 2650, enabled: true },
      { nutrientId: "ee", min: 3.0, idealTarget: 4.0, enabled: true },
      { nutrientId: "cf", max: 9.0, idealTarget: 7.0, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 2.0, idealTarget: 1.2, enabled: true },
      { nutrientId: "p", min: 0.5, max: 0.8, idealTarget: 0.6, enabled: true },
    ],
    source: "SNI 3909:2017 — Pakan Itik Petelur Dara / Grower (BSN, 2017)",
  },
  {
    id: "sni-3910-2017",
    name: "Itik Layer >18 mgg (SNI 3910:2017)",
    nameEn: "Laying Duck Layer >18 wk (SNI 3910:2017)",
    species: "duck",
    phase: "Produksi / Layer (>18 minggu)",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 17.0, idealTarget: 18.0, enabled: true },
      { nutrientId: "me_poultry", min: 2650, idealTarget: 2700, enabled: true },
      { nutrientId: "ee", min: 3.0, idealTarget: 4.0, enabled: true },
      { nutrientId: "cf", max: 10.0, idealTarget: 7.0, enabled: true },
      { nutrientId: "ca", min: 2.9, max: 4.25, idealTarget: 3.4, enabled: true },
      { nutrientId: "p", min: 0.55, max: 0.85, idealTarget: 0.65, enabled: true },
    ],
    source: "SNI 3910:2017 — Pakan Itik Petelur Masa Produksi / Layer (BSN, 2017)",
  },

  // =========================================================================
  // 5. KONSENTRAT SAPI PERAH — SNI 3148-1:2017
  // =========================================================================
  {
    id: "sni-3148-1-ksp1-2017",
    name: "Konsentrat Sapi Perah Pedet Pemula-1 (SNI 3148-1:2017)",
    nameEn: "Dairy Calf Starter-1 Concentrate (SNI 3148-1:2017)",
    species: "cattle_dairy",
    phase: "KSP1 · Pedet 1–4 minggu",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 21.0, idealTarget: 22.0, enabled: true },
      { nutrientId: "tdn", min: 80.0, idealTarget: 82.0, enabled: true },
      { nutrientId: "ee", max: 7.0, idealTarget: 4.5, enabled: true },
      { nutrientId: "ca", min: 0.7, max: 0.9, idealTarget: 0.8, enabled: true },
      { nutrientId: "p", min: 0.4, max: 0.8, idealTarget: 0.55, enabled: true },
    ],
    source: "SNI 3148-1:2017 — Pakan Konsentrat Bagian 1: Sapi Perah (KSP1 Pemula-1, BSN 2017)",
  },
  {
    id: "sni-3148-1-ksp3-2017",
    name: "Konsentrat Sapi Perah Dara (SNI 3148-1:2017)",
    nameEn: "Dairy Heifer Concentrate (SNI 3148-1:2017)",
    species: "cattle_dairy",
    phase: "KSP3 · Dara 7–18 bulan",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 15.0, idealTarget: 16.0, enabled: true },
      { nutrientId: "tdn", min: 70.0, idealTarget: 72.0, enabled: true },
      { nutrientId: "ee", max: 7.0, idealTarget: 4.5, enabled: true },
      { nutrientId: "ca", min: 0.6, max: 1.0, idealTarget: 0.8, enabled: true },
      { nutrientId: "p", min: 0.4, max: 0.6, idealTarget: 0.5, enabled: true },
      { nutrientId: "ndf", max: 30.0, isAdvance: true, enabled: true },
    ],
    source: "SNI 3148-1:2017 — Pakan Konsentrat Bagian 1: Sapi Perah (KSP3 Dara, BSN 2017)",
  },
  {
    id: "sni-3148-1-ksp4-2017",
    name: "Konsentrat Sapi Perah Laktasi Normal (SNI 3148-1:2017)",
    nameEn: "Dairy Lactation Normal Concentrate (SNI 3148-1:2017)",
    species: "cattle_dairy",
    phase: "KSP4 · Laktasi Normal",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 14.0, idealTarget: 15.5, enabled: true },
      { nutrientId: "tdn", min: 68.0, idealTarget: 70.0, enabled: true },
      { nutrientId: "ee", max: 7.0, idealTarget: 4.5, enabled: true },
      { nutrientId: "ca", min: 0.6, max: 1.2, idealTarget: 0.9, enabled: true },
      { nutrientId: "p", min: 0.4, max: 0.6, idealTarget: 0.5, enabled: true },
      { nutrientId: "ndf", max: 35.0, isAdvance: true, enabled: true },
    ],
    source: "SNI 3148-1:2017 — Pakan Konsentrat Bagian 1: Sapi Perah (KSP4 Laktasi, BSN 2017)",
  },
  {
    id: "sni-3148-1-ksp5-2017",
    name: "Konsentrat Sapi Perah Laktasi Tinggi (SNI 3148-1:2017)",
    nameEn: "Dairy High-Yield Lactation Concentrate (SNI 3148-1:2017)",
    species: "cattle_dairy",
    phase: "KSP5 · Laktasi Produksi Tinggi",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 18.0, idealTarget: 19.0, enabled: true },
      { nutrientId: "tdn", min: 68.0, idealTarget: 72.0, enabled: true },
      { nutrientId: "ee", max: 7.0, idealTarget: 5.0, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.3, idealTarget: 1.0, enabled: true },
      { nutrientId: "p", min: 0.4, max: 0.8, idealTarget: 0.6, enabled: true },
      { nutrientId: "ndf", max: 33.0, isAdvance: true, enabled: true },
    ],
    source:
      "SNI 3148-1:2017 — Pakan Konsentrat Bagian 1: Sapi Perah (KSP5 Laktasi Tinggi, BSN 2017)",
  },
  {
    id: "sni-3148-1-ksp6-2017",
    name: "Konsentrat Sapi Perah Kering Bunting (SNI 3148-1:2017)",
    nameEn: "Dairy Dry Pregnant Concentrate (SNI 3148-1:2017)",
    species: "cattle_dairy",
    phase: "KSP6 · Kering Bunting (2 bln pra-beranak)",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 16.0, idealTarget: 16.5, enabled: true },
      { nutrientId: "tdn", min: 68.0, idealTarget: 70.0, enabled: true },
      { nutrientId: "ee", max: 7.0, idealTarget: 4.5, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.2, idealTarget: 1.0, enabled: true },
      { nutrientId: "p", min: 0.4, max: 0.8, idealTarget: 0.55, enabled: true },
      { nutrientId: "ndf", max: 35.0, isAdvance: true, enabled: true },
    ],
    source:
      "SNI 3148-1:2017 — Pakan Konsentrat Bagian 1: Sapi Perah (KSP6 Kering Bunting, BSN 2017)",
  },

  // =========================================================================
  // 6. KONSENTRAT SAPI POTONG — SNI 3148-2:2017
  // =========================================================================
  {
    id: "sni-3148-2-penggemukan-2017",
    name: "Konsentrat Sapi Potong Penggemukan (SNI 3148-2:2017)",
    nameEn: "Beef Fattening Concentrate (SNI 3148-2:2017)",
    species: "cattle_beef",
    phase: "Penggemukan (Fattening)",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 13.0, idealTarget: 14.0, enabled: true },
      { nutrientId: "tdn", min: 68.0, idealTarget: 72.0, enabled: true },
      { nutrientId: "ee", max: 7.0, idealTarget: 4.5, enabled: true },
      { nutrientId: "ca", min: 0.6, max: 1.2, idealTarget: 0.8, enabled: true },
      { nutrientId: "p", min: 0.4, max: 0.8, idealTarget: 0.5, enabled: true },
    ],
    source: "SNI 3148-2:2017 — Pakan Konsentrat Bagian 2: Sapi Potong Penggemukan (BSN, 2017)",
  },
  {
    id: "sni-3148-2-induk-2017",
    name: "Konsentrat Sapi Potong Induk (SNI 3148-2:2017)",
    nameEn: "Beef Broodcow Concentrate (SNI 3148-2:2017)",
    species: "cattle_beef",
    phase: "Induk (Broodcow)",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 12.0, idealTarget: 13.0, enabled: true },
      { nutrientId: "tdn", min: 65.0, idealTarget: 68.0, enabled: true },
      { nutrientId: "ee", max: 7.0, idealTarget: 4.5, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.2, idealTarget: 0.95, enabled: true },
      { nutrientId: "p", min: 0.6, max: 0.8, idealTarget: 0.65, enabled: true },
    ],
    source: "SNI 3148-2:2017 — Pakan Konsentrat Bagian 2: Sapi Potong Induk (BSN, 2017)",
  },
  {
    id: "sni-3148-2-pejantan-2017",
    name: "Konsentrat Sapi Potong Pejantan (SNI 3148-2:2017)",
    nameEn: "Beef Bull Concentrate (SNI 3148-2:2017)",
    species: "cattle_beef",
    phase: "Pejantan (Beef Bull)",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 12.0, idealTarget: 13.0, enabled: true },
      { nutrientId: "tdn", min: 65.0, idealTarget: 68.0, enabled: true },
      { nutrientId: "ee", max: 7.0, idealTarget: 4.5, enabled: true },
      { nutrientId: "ca", min: 0.6, max: 0.8, idealTarget: 0.7, enabled: true },
      { nutrientId: "p", min: 0.3, max: 0.6, idealTarget: 0.45, enabled: true },
    ],
    source: "SNI 3148-2:2017 — Pakan Konsentrat Bagian 2: Sapi Potong Pejantan (BSN, 2017)",
  },

  // =========================================================================
  // 7. KONSENTRAT DOMBA / KAMBING PENGGEMUKAN — SNI 8819:2019
  // =========================================================================
  {
    id: "sni-8819-2019",
    name: "Konsentrat Domba/Kambing Penggemukan (SNI 8819:2019)",
    nameEn: "Fattening Sheep/Goat Concentrate (SNI 8819:2019)",
    species: "goat_sheep",
    phase: "Penggemukan Ruminansia Kecil",
    basis: "dry_matter",
    constraints: [
      { nutrientId: "cp", min: 10.0, idealTarget: 12.0, enabled: true },
      { nutrientId: "tdn", min: 60.0, idealTarget: 65.0, enabled: true },
      { nutrientId: "ee", max: 7.0, idealTarget: 4.5, enabled: true },
      { nutrientId: "ca", min: 0.3, max: 0.8, idealTarget: 0.55, enabled: true },
      { nutrientId: "p", min: 0.2, max: 0.6, idealTarget: 0.35, enabled: true },
      { nutrientId: "ndf", max: 35.0, isAdvance: true, enabled: true },
    ],
    source: "SNI 8819:2019 — Pakan Konsentrat Domba Penggemukan (BSN, 2019)",
  },
];

/**
 * Standar Kebutuhan Nutrien Unggas resmi berdasarkan National Research Council (NRC, 1994)
 * "Nutrient Requirements of Poultry", Ninth Revised Edition (National Academy Press, Washington, D.C.,
 * basis 90% Bahan Kering / As-Fed):
 *
 * - Table 2-6 (hlm. 26): Broilers 0–3, 3–6, dan 6–8 minggu (ME 3200 kcal/kg)
 * - Table 2-1 & 2-3 (hlm. 20–23): White Leghorn Growing Pullets & Laying Hens (intake 80, 100, 120 g/ekor/hr) + Brown-Egg Layers (110 g/ekor/hr)
 * - Table 2-7 (hlm. 27): Broiler Breeders
 * - Table 3-1 (hlm. 36): Turkeys Growing 0–4, 4–8, 8–12, 12–16 minggu
 * - Table 4-1 (hlm. 40): Geese Starting 0–4 minggu & Growing >4 minggu
 * - Table 5-1 (hlm. 42): White Pekin Ducks 0–2, 2–7 minggu & Breeding
 * - Table 6-2 (hlm. 45): Japanese Quail (Coturnix) Starting/Growing & Breeding
 */
export const NRC_1994_POULTRY_REQUIREMENTS: readonly Requirement[] = [
  // =========================================================================
  // 1. BROILERS — NRC (1994) TABLE 2-6
  // =========================================================================
  {
    id: "nrc94-broiler-0-3wk",
    name: "Broiler Starter 0–3 mgg (NRC 1994 Table 2-6)",
    nameEn: "Broiler Starter 0–3 wk (NRC 1994 Table 2-6)",
    species: "broiler",
    phase: "Starter 0–3 minggu · ME 3200 kcal/kg",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 23.0, idealTarget: 23.5, enabled: true },
      { nutrientId: "me_poultry", min: 3200, idealTarget: 3200, enabled: true },
      { nutrientId: "ca", min: 1.0, max: 1.25, idealTarget: 1.05, enabled: true },
      { nutrientId: "p", min: 0.65, max: 0.85, idealTarget: 0.72, enabled: true },
      { nutrientId: "avp", min: 0.45, max: 0.6, idealTarget: 0.48, isAdvance: true, enabled: true },
      { nutrientId: "lys", min: 1.1, idealTarget: 1.2, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.5, idealTarget: 0.54, isAdvance: true, enabled: true },
      { nutrientId: "metcys", min: 0.9, idealTarget: 0.95, isAdvance: true, enabled: true },
      { nutrientId: "thr", min: 0.8, idealTarget: 0.84, isAdvance: true, enabled: true },
      { nutrientId: "trp", min: 0.2, idealTarget: 0.22, isAdvance: true, enabled: false },
      { nutrientId: "val", min: 0.9, idealTarget: 0.95, isAdvance: true, enabled: false },
      {
        nutrientId: "na",
        min: 2000,
        max: 3000,
        idealTarget: 2200,
        isAdvance: true,
        enabled: false,
      },
      { nutrientId: "k", min: 3000, idealTarget: 3500, isAdvance: true, enabled: false },
      {
        nutrientId: "cl",
        min: 2000,
        max: 3200,
        idealTarget: 2200,
        isAdvance: true,
        enabled: false,
      },
    ],
    ratios: [
      {
        id: "ca-p",
        label: "Kalsium : Fosfor (Ca:P)",
        numerator: "ca",
        denominator: "p",
        min: 1.3,
        max: 2.0,
      },
    ],
    source:
      "NRC (1994) Table 2-6 Nutrient Requirements of Broilers (0–3 wk, 90% DM, ME 3200 kcal/kg, PK 23%, Ca 1,00%, AvP 0,45%, Lys 1,10%, Met 0,50%, Met+Cys 0,90%; BK 0,045 kg/hr)",
  },
  {
    id: "nrc94-broiler-3-6wk",
    name: "Broiler Grower 3–6 mgg (NRC 1994 Table 2-6)",
    nameEn: "Broiler Grower 3–6 wk (NRC 1994 Table 2-6)",
    species: "broiler",
    phase: "Grower 3–6 minggu · ME 3200 kcal/kg",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 20.0, idealTarget: 20.5, enabled: true },
      { nutrientId: "me_poultry", min: 3200, idealTarget: 3200, enabled: true },
      { nutrientId: "ca", min: 0.9, max: 1.15, idealTarget: 0.95, enabled: true },
      { nutrientId: "p", min: 0.55, max: 0.8, idealTarget: 0.65, enabled: true },
      { nutrientId: "avp", min: 0.35, max: 0.5, idealTarget: 0.38, isAdvance: true, enabled: true },
      { nutrientId: "lys", min: 1.0, idealTarget: 1.06, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.38, idealTarget: 0.42, isAdvance: true, enabled: true },
      { nutrientId: "metcys", min: 0.72, idealTarget: 0.76, isAdvance: true, enabled: true },
      { nutrientId: "thr", min: 0.74, idealTarget: 0.78, isAdvance: true, enabled: true },
      { nutrientId: "trp", min: 0.18, idealTarget: 0.2, isAdvance: true, enabled: false },
      { nutrientId: "val", min: 0.82, idealTarget: 0.86, isAdvance: true, enabled: false },
      {
        nutrientId: "na",
        min: 1500,
        max: 2800,
        idealTarget: 1800,
        isAdvance: true,
        enabled: false,
      },
      { nutrientId: "k", min: 3000, idealTarget: 3500, isAdvance: true, enabled: false },
      {
        nutrientId: "cl",
        min: 1500,
        max: 2800,
        idealTarget: 1800,
        isAdvance: true,
        enabled: false,
      },
    ],
    ratios: [
      {
        id: "ca-p",
        label: "Kalsium : Fosfor (Ca:P)",
        numerator: "ca",
        denominator: "p",
        min: 1.3,
        max: 2.0,
      },
    ],
    source:
      "NRC (1994) Table 2-6 Nutrient Requirements of Broilers (3–6 wk, 90% DM, ME 3200 kcal/kg, PK 20%, Ca 0,90%, AvP 0,35%, Lys 1,00%, Met 0,38%, Met+Cys 0,72%; BK 0,115 kg/hr)",
  },
  {
    id: "nrc94-broiler-6-8wk",
    name: "Broiler Finisher 6–8 mgg (NRC 1994 Table 2-6)",
    nameEn: "Broiler Finisher 6–8 wk (NRC 1994 Table 2-6)",
    species: "broiler",
    phase: "Finisher 6–8 minggu · ME 3200 kcal/kg",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 18.0, idealTarget: 18.5, enabled: true },
      { nutrientId: "me_poultry", min: 3200, idealTarget: 3200, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.05, idealTarget: 0.85, enabled: true },
      { nutrientId: "p", min: 0.5, max: 0.75, idealTarget: 0.58, enabled: true },
      { nutrientId: "avp", min: 0.3, max: 0.45, idealTarget: 0.33, isAdvance: true, enabled: true },
      { nutrientId: "lys", min: 0.85, idealTarget: 0.9, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.32, idealTarget: 0.36, isAdvance: true, enabled: true },
      { nutrientId: "metcys", min: 0.6, idealTarget: 0.65, isAdvance: true, enabled: true },
      { nutrientId: "thr", min: 0.68, idealTarget: 0.72, isAdvance: true, enabled: true },
      { nutrientId: "trp", min: 0.16, idealTarget: 0.18, isAdvance: true, enabled: false },
      { nutrientId: "val", min: 0.7, idealTarget: 0.74, isAdvance: true, enabled: false },
    ],
    ratios: [
      {
        id: "ca-p",
        label: "Kalsium : Fosfor (Ca:P)",
        numerator: "ca",
        denominator: "p",
        min: 1.3,
        max: 2.0,
      },
    ],
    source:
      "NRC (1994) Table 2-6 Nutrient Requirements of Broilers (6–8 wk, 90% DM, ME 3200 kcal/kg, PK 18%, Ca 0,80%, AvP 0,30%, Lys 0,85%, Met 0,32%, Met+Cys 0,60%; BK 0,160 kg/hr)",
  },

  // =========================================================================
  // 2. IMMATURE & LAYING HENS — NRC (1994) TABLE 2-1, 2-3 & 2-7
  // =========================================================================
  {
    id: "nrc94-pullet-leghorn-0-6wk",
    name: "Ayam Petelur Starter 0–6 mgg (NRC 1994 Table 2-1)",
    nameEn: "White Leghorn Pullet 0–6 wk (NRC 1994 Table 2-1)",
    species: "layer",
    phase: "Pullet Starter 0–6 minggu · ME 2850 kcal/kg",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 18.0, idealTarget: 18.5, enabled: true },
      { nutrientId: "me_poultry", min: 2850, idealTarget: 2900, enabled: true },
      { nutrientId: "ca", min: 0.9, max: 1.15, idealTarget: 0.95, enabled: true },
      { nutrientId: "p", min: 0.6, max: 0.85, idealTarget: 0.68, enabled: true },
      { nutrientId: "avp", min: 0.4, max: 0.55, idealTarget: 0.42, isAdvance: true, enabled: true },
      { nutrientId: "lys", min: 0.85, idealTarget: 0.9, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.3, idealTarget: 0.34, isAdvance: true, enabled: true },
      { nutrientId: "metcys", min: 0.62, idealTarget: 0.66, isAdvance: true, enabled: true },
      { nutrientId: "thr", min: 0.68, idealTarget: 0.72, isAdvance: true, enabled: false },
    ],
    source:
      "NRC (1994) Table 2-1 Immature Leghorn-Type Chickens (0–6 wk, 90% DM, ME 2850 kcal/kg, PK 18%, Ca 0,90%, AvP 0,40%, Lys 0,85%, Met 0,30%; BK 0,028 kg/hr)",
  },
  {
    id: "nrc94-pullet-leghorn-6-12wk",
    name: "Ayam Petelur Grower 6–12 mgg (NRC 1994 Table 2-1)",
    nameEn: "White Leghorn Pullet 6–12 wk (NRC 1994 Table 2-1)",
    species: "layer",
    phase: "Pullet Grower 6–12 minggu · ME 2850 kcal/kg",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 16.0, idealTarget: 16.5, enabled: true },
      { nutrientId: "me_poultry", min: 2850, idealTarget: 2900, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.1, idealTarget: 0.85, enabled: true },
      { nutrientId: "p", min: 0.55, max: 0.8, idealTarget: 0.62, enabled: true },
      { nutrientId: "avp", min: 0.35, max: 0.5, idealTarget: 0.38, isAdvance: true, enabled: true },
      { nutrientId: "lys", min: 0.6, idealTarget: 0.65, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.25, idealTarget: 0.28, isAdvance: true, enabled: true },
      { nutrientId: "metcys", min: 0.52, idealTarget: 0.56, isAdvance: true, enabled: true },
    ],
    source:
      "NRC (1994) Table 2-1 Immature Leghorn-Type Chickens (6–12 wk, 90% DM, ME 2850 kcal/kg, PK 16%, Ca 0,80%, AvP 0,35%, Lys 0,60%, Met 0,25%; BK 0,052 kg/hr)",
  },
  {
    id: "nrc94-layer-intake-80g",
    name: "Layer Produksi · Intake 80 g/hr Tropis Panas (NRC 1994 Table 2-3)",
    nameEn: "Laying Hen · 80 g/d Feed Intake (NRC 1994 Table 2-3)",
    species: "layer",
    phase: "Produksi · Konsumsi 80 g/ekor/hr",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 18.8, idealTarget: 19.2, enabled: true },
      { nutrientId: "me_poultry", min: 2900, idealTarget: 2900, enabled: true },
      { nutrientId: "ca", min: 4.06, max: 4.5, idealTarget: 4.15, enabled: true },
      { nutrientId: "p", min: 0.55, max: 0.85, idealTarget: 0.65, enabled: true },
      {
        nutrientId: "avp",
        min: 0.31,
        max: 0.45,
        idealTarget: 0.35,
        isAdvance: true,
        enabled: true,
      },
      { nutrientId: "lys", min: 0.86, idealTarget: 0.9, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.38, idealTarget: 0.42, isAdvance: true, enabled: true },
      { nutrientId: "metcys", min: 0.73, idealTarget: 0.77, isAdvance: true, enabled: true },
      { nutrientId: "thr", min: 0.59, idealTarget: 0.63, isAdvance: true, enabled: false },
    ],
    source:
      "NRC (1994) Table 2-3 Laying Hens at 80 g/hen/day intake (90% DM, PK 18,8%, Ca 4,06%, AvP 0,31%, Lys 0,86%, Met 0,38%, Met+Cys 0,73%; BK 0,072 kg/hr)",
  },
  {
    id: "nrc94-layer-intake-100g",
    name: "Layer Produksi · Intake 100 g/hr Standar (NRC 1994 Table 2-3)",
    nameEn: "Laying Hen · 100 g/d Feed Intake (NRC 1994 Table 2-3)",
    species: "layer",
    phase: "Produksi · Konsumsi 100 g/ekor/hr",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 15.0, idealTarget: 16.0, enabled: true },
      { nutrientId: "me_poultry", min: 2850, idealTarget: 2900, enabled: true },
      { nutrientId: "ca", min: 3.25, max: 4.0, idealTarget: 3.5, enabled: true },
      { nutrientId: "p", min: 0.5, max: 0.75, idealTarget: 0.58, enabled: true },
      { nutrientId: "avp", min: 0.25, max: 0.4, idealTarget: 0.3, isAdvance: true, enabled: true },
      { nutrientId: "lys", min: 0.69, idealTarget: 0.75, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.3, idealTarget: 0.35, isAdvance: true, enabled: true },
      { nutrientId: "metcys", min: 0.58, idealTarget: 0.63, isAdvance: true, enabled: true },
      { nutrientId: "thr", min: 0.47, idealTarget: 0.52, isAdvance: true, enabled: false },
    ],
    source:
      "NRC (1994) Table 2-3 Laying Hens at 100 g/hen/day intake (90% DM, PK 15,0%, Ca 3,25%, AvP 0,25%, Lys 0,69%, Met 0,30%, Met+Cys 0,58%; BK 0,090 kg/hr)",
  },
  {
    id: "nrc94-layer-brown-110g",
    name: "Layer Telur Cokelat · Intake 110 g/hr (NRC 1994 Table 2-3)",
    nameEn: "Brown-Egg Laying Hen · 110 g/d Intake (NRC 1994 Table 2-3)",
    species: "layer",
    phase: "Telur Cokelat · Konsumsi 110 g/ekor/hr",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 16.5, idealTarget: 17.0, enabled: true },
      { nutrientId: "me_poultry", min: 2800, idealTarget: 2850, enabled: true },
      { nutrientId: "ca", min: 3.6, max: 4.1, idealTarget: 3.75, enabled: true },
      { nutrientId: "p", min: 0.5, max: 0.75, idealTarget: 0.58, enabled: true },
      {
        nutrientId: "avp",
        min: 0.28,
        max: 0.42,
        idealTarget: 0.32,
        isAdvance: true,
        enabled: true,
      },
      { nutrientId: "lys", min: 0.76, idealTarget: 0.8, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.33, idealTarget: 0.37, isAdvance: true, enabled: true },
      { nutrientId: "metcys", min: 0.64, idealTarget: 0.68, isAdvance: true, enabled: true },
    ],
    source:
      "NRC (1994) Table 2-3 Brown-Egg Laying Hens at 110 g/hen/day intake (90% DM, 16,5 g CP/d, 3,6 g Ca/d, 275 mg AvP/d; BK 0,099 kg/hr)",
  },
  {
    id: "nrc94-broiler-breeder-hen",
    name: "Induk Pembibit Broiler / Broiler Breeder (NRC 1994 Table 2-7)",
    nameEn: "Meat-Type Broiler Breeder Hen (NRC 1994 Table 2-7)",
    species: "broiler",
    phase: "Broiler Breeder · 150 g/ekor/hr",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 15.0, idealTarget: 15.5, enabled: true },
      { nutrientId: "me_poultry", min: 2850, idealTarget: 2900, enabled: true },
      { nutrientId: "ca", min: 2.75, max: 3.35, idealTarget: 3.0, enabled: true },
      { nutrientId: "p", min: 0.5, max: 0.75, idealTarget: 0.58, enabled: true },
      { nutrientId: "avp", min: 0.25, max: 0.4, idealTarget: 0.3, isAdvance: true, enabled: true },
      { nutrientId: "lys", min: 0.65, idealTarget: 0.7, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.3, idealTarget: 0.34, isAdvance: true, enabled: true },
      { nutrientId: "metcys", min: 0.55, idealTarget: 0.6, isAdvance: true, enabled: true },
    ],
    source:
      "NRC (1994) Table 2-7 Meat-Type Hens for Breeding (19,5 g CP/d, 4,0 g Ca/d, 350 mg AvP/d, 765 mg Lys/d, 450 mg Met/d pada konsumsi 150 g/hr; BK 0,135 kg/hr)",
  },

  // =========================================================================
  // 3. TURKEYS (KALKUN) — NRC (1994) TABLE 3-1
  // =========================================================================
  {
    id: "nrc94-turkey-0-4wk",
    name: "Kalkun Starter 0–4 mgg (NRC 1994 Table 3-1)",
    nameEn: "Growing Turkey 0–4 wk (NRC 1994 Table 3-1)",
    species: "turkey",
    phase: "Starter 0–4 minggu · ME 2800 kcal/kg",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 28.0, idealTarget: 28.5, enabled: true },
      { nutrientId: "me_poultry", min: 2800, idealTarget: 2850, enabled: true },
      { nutrientId: "ca", min: 1.2, max: 1.5, idealTarget: 1.25, enabled: true },
      { nutrientId: "p", min: 0.8, max: 1.05, idealTarget: 0.88, enabled: true },
      { nutrientId: "avp", min: 0.6, max: 0.75, idealTarget: 0.62, isAdvance: true, enabled: true },
      { nutrientId: "lys", min: 1.6, idealTarget: 1.65, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.55, idealTarget: 0.6, isAdvance: true, enabled: true },
      { nutrientId: "metcys", min: 1.05, idealTarget: 1.1, isAdvance: true, enabled: true },
      { nutrientId: "thr", min: 1.0, idealTarget: 1.05, isAdvance: true, enabled: false },
    ],
    source:
      "NRC (1994) Table 3-1 Nutrient Requirements of Turkeys (0–4 wk, 90% DM, ME 2800 kcal/kg, PK 28%, Ca 1,20%, AvP 0,60%, Lys 1,60%, Met 0,55%, Met+Cys 1,05%; BK 0,045 kg/hr)",
  },
  {
    id: "nrc94-turkey-4-8wk",
    name: "Kalkun Grower-1 4–8 mgg (NRC 1994 Table 3-1)",
    nameEn: "Growing Turkey 4–8 wk (NRC 1994 Table 3-1)",
    species: "turkey",
    phase: "Grower 4–8 minggu · ME 2900 kcal/kg",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 26.0, idealTarget: 26.5, enabled: true },
      { nutrientId: "me_poultry", min: 2900, idealTarget: 2950, enabled: true },
      { nutrientId: "ca", min: 1.0, max: 1.3, idealTarget: 1.05, enabled: true },
      { nutrientId: "p", min: 0.7, max: 0.95, idealTarget: 0.78, enabled: true },
      { nutrientId: "avp", min: 0.5, max: 0.65, idealTarget: 0.52, isAdvance: true, enabled: true },
      { nutrientId: "lys", min: 1.5, idealTarget: 1.55, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.45, idealTarget: 0.5, isAdvance: true, enabled: true },
      { nutrientId: "metcys", min: 0.95, idealTarget: 1.0, isAdvance: true, enabled: true },
      { nutrientId: "thr", min: 0.95, idealTarget: 1.0, isAdvance: true, enabled: false },
    ],
    source:
      "NRC (1994) Table 3-1 Nutrient Requirements of Turkeys (4–8 wk, 90% DM, ME 2900 kcal/kg, PK 26%, Ca 1,00%, AvP 0,50%, Lys 1,50%, Met 0,45%, Met+Cys 0,95%; BK 0,135 kg/hr)",
  },
  {
    id: "nrc94-turkey-8-12wk",
    name: "Kalkun Grower-2 8–12 mgg (NRC 1994 Table 3-1)",
    nameEn: "Growing Turkey 8–12 wk (NRC 1994 Table 3-1)",
    species: "turkey",
    phase: "Grower 8–12 minggu · ME 3000 kcal/kg",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 22.0, idealTarget: 22.5, enabled: true },
      { nutrientId: "me_poultry", min: 3000, idealTarget: 3050, enabled: true },
      { nutrientId: "ca", min: 0.85, max: 1.15, idealTarget: 0.9, enabled: true },
      { nutrientId: "p", min: 0.6, max: 0.85, idealTarget: 0.68, enabled: true },
      {
        nutrientId: "avp",
        min: 0.42,
        max: 0.55,
        idealTarget: 0.45,
        isAdvance: true,
        enabled: true,
      },
      { nutrientId: "lys", min: 1.3, idealTarget: 1.35, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.4, idealTarget: 0.44, isAdvance: true, enabled: true },
      { nutrientId: "metcys", min: 0.8, idealTarget: 0.85, isAdvance: true, enabled: true },
    ],
    source:
      "NRC (1994) Table 3-1 Nutrient Requirements of Turkeys (8–12 wk, 90% DM, ME 3000 kcal/kg, PK 22%, Ca 0,85%, AvP 0,42%, Lys 1,30%, Met 0,40%, Met+Cys 0,80%; BK 0,260 kg/hr)",
  },
  {
    id: "nrc94-turkey-12-16wk",
    name: "Kalkun Finisher 12–16 mgg (NRC 1994 Table 3-1)",
    nameEn: "Finishing Turkey 12–16 wk (NRC 1994 Table 3-1)",
    species: "turkey",
    phase: "Finisher 12–16 minggu · ME 3100 kcal/kg",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 19.0, idealTarget: 19.5, enabled: true },
      { nutrientId: "me_poultry", min: 3100, idealTarget: 3150, enabled: true },
      { nutrientId: "ca", min: 0.75, max: 1.05, idealTarget: 0.8, enabled: true },
      { nutrientId: "p", min: 0.55, max: 0.8, idealTarget: 0.62, enabled: true },
      { nutrientId: "avp", min: 0.38, max: 0.5, idealTarget: 0.4, isAdvance: true, enabled: true },
      { nutrientId: "lys", min: 1.0, idealTarget: 1.05, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.35, idealTarget: 0.38, isAdvance: true, enabled: true },
      { nutrientId: "metcys", min: 0.65, idealTarget: 0.7, isAdvance: true, enabled: true },
    ],
    source:
      "NRC (1994) Table 3-1 Nutrient Requirements of Turkeys (12–16 wk, 90% DM, ME 3100 kcal/kg, PK 19%, Ca 0,75%, AvP 0,38%, Lys 1,00%, Met 0,35%, Met+Cys 0,65%; BK 0,380 kg/hr)",
  },

  // =========================================================================
  // 4. WHITE PEKIN DUCKS (ITIK PEDAGING) — NRC (1994) TABLE 5-1
  // =========================================================================
  {
    id: "nrc94-duck-pekin-0-2wk",
    name: "Itik Pekin Starter 0–2 mgg (NRC 1994 Table 5-1)",
    nameEn: "White Pekin Duck 0–2 wk (NRC 1994 Table 5-1)",
    species: "duck",
    phase: "Starter 0–2 minggu · ME 2900 kcal/kg",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 22.0, idealTarget: 22.5, enabled: true },
      { nutrientId: "me_poultry", min: 2900, idealTarget: 2950, enabled: true },
      { nutrientId: "ca", min: 0.65, max: 1.0, idealTarget: 0.75, enabled: true },
      { nutrientId: "p", min: 0.6, max: 0.85, idealTarget: 0.68, enabled: true },
      { nutrientId: "avp", min: 0.4, max: 0.55, idealTarget: 0.43, isAdvance: true, enabled: true },
      { nutrientId: "lys", min: 0.9, idealTarget: 0.95, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.4, idealTarget: 0.44, isAdvance: true, enabled: true },
      { nutrientId: "metcys", min: 0.7, idealTarget: 0.75, isAdvance: true, enabled: true },
    ],
    source:
      "NRC (1994) Table 5-1 Nutrient Requirements of White Pekin Ducks (0–2 wk, 90% DM, ME 2900 kcal/kg, PK 22%, Ca 0,65%, AvP 0,40%, Lys 0,90%, Met 0,40%, Met+Cys 0,70%; BK 0,075 kg/hr)",
  },
  {
    id: "nrc94-duck-pekin-2-7wk",
    name: "Itik Pekin Grower/Finisher 2–7 mgg (NRC 1994 Table 5-1)",
    nameEn: "White Pekin Duck 2–7 wk (NRC 1994 Table 5-1)",
    species: "duck",
    phase: "Grower 2–7 minggu · ME 3000 kcal/kg",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 16.0, idealTarget: 16.5, enabled: true },
      { nutrientId: "me_poultry", min: 3000, idealTarget: 3000, enabled: true },
      { nutrientId: "ca", min: 0.6, max: 0.95, idealTarget: 0.7, enabled: true },
      { nutrientId: "p", min: 0.5, max: 0.75, idealTarget: 0.58, enabled: true },
      { nutrientId: "avp", min: 0.3, max: 0.45, idealTarget: 0.33, isAdvance: true, enabled: true },
      { nutrientId: "lys", min: 0.65, idealTarget: 0.7, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.3, idealTarget: 0.34, isAdvance: true, enabled: true },
      { nutrientId: "metcys", min: 0.55, idealTarget: 0.6, isAdvance: true, enabled: true },
    ],
    source:
      "NRC (1994) Table 5-1 Nutrient Requirements of White Pekin Ducks (2–7 wk, 90% DM, ME 3000 kcal/kg, PK 16%, Ca 0,60%, AvP 0,30%, Lys 0,65%, Met 0,30%, Met+Cys 0,55%; BK 0,175 kg/hr)",
  },

  // =========================================================================
  // 5. JAPANESE QUAIL (PUYUH) & GEESE (ANGSA) — NRC (1994) TABLE 6-2 & 4-1
  // =========================================================================
  {
    id: "nrc94-quail-starting-growing",
    name: "Puyuh Starter & Grower (NRC 1994 Table 6-2)",
    nameEn: "Japanese Quail Starting & Growing (NRC 1994 Table 6-2)",
    species: "quail",
    phase: "Starter & Grower · ME 2900 kcal/kg",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 24.0, idealTarget: 24.5, enabled: true },
      { nutrientId: "me_poultry", min: 2900, idealTarget: 2900, enabled: true },
      { nutrientId: "ca", min: 0.8, max: 1.1, idealTarget: 0.85, enabled: true },
      { nutrientId: "p", min: 0.55, max: 0.8, idealTarget: 0.62, enabled: true },
      { nutrientId: "avp", min: 0.3, max: 0.45, idealTarget: 0.33, isAdvance: true, enabled: true },
      { nutrientId: "lys", min: 1.3, idealTarget: 1.35, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.5, idealTarget: 0.54, isAdvance: true, enabled: true },
      { nutrientId: "metcys", min: 0.75, idealTarget: 0.8, isAdvance: true, enabled: true },
      { nutrientId: "thr", min: 1.02, idealTarget: 1.06, isAdvance: true, enabled: false },
    ],
    source:
      "NRC (1994) Table 6-2 Nutrient Requirements of Japanese Quail (Coturnix, Starting & Growing, 90% DM, ME 2900 kcal/kg, PK 24%, Ca 0,80%, AvP 0,30%, Lys 1,30%, Met 0,50%, Met+Cys 0,75%; BK 0,018 kg/hr)",
  },
  {
    id: "nrc94-quail-breeding-layer",
    name: "Puyuh Petelur / Breeding (NRC 1994 Table 6-2)",
    nameEn: "Japanese Quail Laying / Breeding (NRC 1994 Table 6-2)",
    species: "quail",
    phase: "Produksi Telur / Breeding · ME 2900 kcal/kg",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 20.0, idealTarget: 20.5, enabled: true },
      { nutrientId: "me_poultry", min: 2900, idealTarget: 2900, enabled: true },
      { nutrientId: "ca", min: 2.5, max: 3.25, idealTarget: 2.65, enabled: true },
      { nutrientId: "p", min: 0.55, max: 0.8, idealTarget: 0.62, enabled: true },
      { nutrientId: "avp", min: 0.35, max: 0.5, idealTarget: 0.38, isAdvance: true, enabled: true },
      { nutrientId: "lys", min: 1.0, idealTarget: 1.05, isAdvance: true, enabled: true },
      { nutrientId: "met", min: 0.45, idealTarget: 0.48, isAdvance: true, enabled: true },
      { nutrientId: "metcys", min: 0.7, idealTarget: 0.74, isAdvance: true, enabled: true },
      { nutrientId: "thr", min: 0.74, idealTarget: 0.78, isAdvance: true, enabled: false },
    ],
    source:
      "NRC (1994) Table 6-2 Nutrient Requirements of Japanese Quail (Coturnix, Breeding/Laying, 90% DM, ME 2900 kcal/kg, PK 20%, Ca 2,50%, AvP 0,35%, Lys 1,00%, Met 0,45%, Met+Cys 0,70%; BK 0,023 kg/hr)",
  },
  {
    id: "nrc94-geese-starting-0-4wk",
    name: "Angsa Starter 0–4 mgg (NRC 1994 Table 4-1)",
    nameEn: "Geese Starting 0–4 wk (NRC 1994 Table 4-1)",
    species: "goose",
    phase: "Starter 0–4 minggu · ME 2900 kcal/kg",
    basis: "as_fed",
    constraints: [
      { nutrientId: "cp", min: 20.0, idealTarget: 20.5, enabled: true },
      { nutrientId: "me_poultry", min: 2900, idealTarget: 2900, enabled: true },
      { nutrientId: "ca", min: 0.65, max: 1.0, idealTarget: 0.75, enabled: true },
      { nutrientId: "p", min: 0.5, max: 0.75, idealTarget: 0.58, enabled: true },
      { nutrientId: "avp", min: 0.3, max: 0.45, idealTarget: 0.35, isAdvance: true, enabled: true },
      { nutrientId: "lys", min: 1.0, idealTarget: 1.05, isAdvance: true, enabled: true },
      { nutrientId: "metcys", min: 0.6, idealTarget: 0.65, isAdvance: true, enabled: true },
    ],
    source:
      "NRC (1994) Table 4-1 Nutrient Requirements of Geese (0–4 wk, 90% DM, ME 2900 kcal/kg, PK 20%, Ca 0,65%, AvP 0,30%, Lys 1,00%, Met+Cys 0,60%; BK 0,110 kg/hr)",
  },
];
