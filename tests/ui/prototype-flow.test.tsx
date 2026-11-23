import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../../src/App";
import { FormulationCharts } from "../../src/components/analytics/FormulationCharts";
import {
  DEFAULT_CONFIG,
  MOCK_INGREDIENTS,
  MOCK_REQUIREMENTS,
  evaluateMockFormulation,
} from "../../src/data/mock-state";

describe("OpenFormu Desktop UI Flow", () => {
  it("merender header OpenFormu tanpa keterangan tambahan, dua tabel terpisah, dan KPI biaya", () => {
    render(<App />);

    const header = screen.getByRole("banner");
    expect(screen.getAllByAltText("Logo OpenFormu").length).toBeGreaterThan(0);
    expect(within(header).getByText("Open")).toBeInTheDocument();
    expect(within(header).getByText("Formu")).toBeInTheDocument();
    expect(screen.queryByText(/Formulasi Pakan Presisi/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Workspace$/i)).not.toBeInTheDocument();

    expect(screen.getByLabelText("Kontrol utama formulasi")).toBeInTheDocument();
    expect(screen.getByLabelText("Panel Bahan Pakan")).toBeInTheDocument();
    expect(screen.getByLabelText("Tabel Semua Bahan Pakan")).toBeInTheDocument();
    expect(screen.getByLabelText("Panel Target Nutrien")).toBeInTheDocument();
    expect(screen.getByLabelText("Panel Hasil Formulasi")).toBeInTheDocument();

    // Tidak ada lagi tombol Muat +50 maupun teks Menampilkan X dari Y
    expect(screen.queryByRole("button", { name: /Muat \+50/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Menampilkan \d+ dari \d+/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Simulasi kondisi hasil prototipe")).not.toBeInTheDocument();

    expect(screen.getAllByText(/Jagung Giling Kuning/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Biaya \/ kg/i)).toBeInTheDocument();
  });

  it("mendukung tier kolom Dasar/Standar/Lanjutan, popover Kolom, dan resize lebar kolom nama bahan", async () => {
    const user = userEvent.setup();
    render(<App />);

    const usedPanel = screen.getByLabelText("Panel Bahan Pakan");
    // Tier default Dasar menyembunyikan BK %, Min %, Max % agar tabel lapang
    expect(
      within(usedPanel).queryByRole("columnheader", { name: /BK %/i }),
    ).not.toBeInTheDocument();
    expect(within(usedPanel).getAllByRole("columnheader", { name: /PK/i }).length).toBeGreaterThan(
      0,
    );

    // Beralih ke tier Standar memunculkan BK %, lalu kembali ke Dasar
    await user.click(within(usedPanel).getByRole("button", { name: /^Standar$/i }));
    expect(
      within(usedPanel).getAllByRole("columnheader", { name: /BK %/i }).length,
    ).toBeGreaterThan(0);
    await user.click(within(usedPanel).getByRole("button", { name: /^Dasar$/i }));

    // Buka popover Kolom lalu sembunyikan dan tampilkan kembali Harga/kg
    const kolomBtn = within(usedPanel).getByRole("button", { name: /Kolom/i });
    await user.click(kolomBtn);
    const priceToggle = within(usedPanel).getByLabelText("Harga");
    expect(priceToggle).toBeChecked();
    await user.click(priceToggle);
    expect(
      within(usedPanel).queryByRole("columnheader", { name: "Harga/kg" }),
    ).not.toBeInTheDocument();

    await user.click(priceToggle);
    expect(
      within(usedPanel).getAllByRole("columnheader", { name: "Harga/kg" }).length,
    ).toBeGreaterThan(0);
    await user.click(kolomBtn);

    // Resize kolom nama bahan via keyboard ArrowLeft
    const resizer = screen.getByRole("separator", { name: /Geser lebar kolom nama bahan/i });
    const beforeVal = Number(resizer.getAttribute("aria-valuenow"));
    fireEvent.keyDown(resizer, { key: "ArrowLeft" });
    const afterVal = Number(resizer.getAttribute("aria-valuenow"));
    expect(afterVal).toBeLessThan(beforeVal);
  });

  it("beralih komoditas 4 utama, kalkulator Sapi Potong, & preset SNI Lainnya mengganti basis otomatis", async () => {
    const user = userEvent.setup();
    render(<App />);

    const commodityTrigger = screen.getByRole("combobox", { name: /Pilih komoditas ternak/i });
    await user.click(commodityTrigger);
    await user.click(screen.getByRole("option", { name: /Sapi Potong/i }));
    expect(screen.getByLabelText(/Bobot badan sapi potong kg/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Target PBBH kg per hari/i)).toBeInTheDocument();

    await user.click(commodityTrigger);
    await user.click(screen.getByRole("option", { name: /Lainnya/i }));
    const otherPresetTrigger = screen.getByRole("combobox", { name: /Standar Ternak Lainnya/i });
    await user.click(otherPresetTrigger);
    const searchInput = screen.getByPlaceholderText(/Cari Standar/i);
    await user.type(searchInput, "3148-2");
    await user.click(screen.getByRole("option", { name: /Penggemukan.*3148-2/i }));

    expect(screen.getByText("Basis: BK (DM)")).toBeInTheDocument();

    const asFedBtn = screen.getByRole("button", { name: "As-Fed" });
    await user.click(asFedBtn);
    expect(screen.getByText("Basis: As-Fed")).toBeInTheDocument();
  });

  it("beralih tier Dasar ke Lanjutan pada tabel menyinkronkan asam amino serta SID/AvP di Target Nutrien", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.queryByText(/Triptofan/i)).not.toBeInTheDocument();

    const usedPanel = screen.getByLabelText("Panel Bahan Pakan");
    const advanceBtn = within(usedPanel).getByRole("button", { name: /^Lanjutan$/i });
    await user.click(advanceBtn);

    expect(screen.getAllByText("Protein Kasar").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lisin").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Triptofan").length).toBeGreaterThan(0);

    const sidSwitch = screen.getByRole("switch", {
      name: "Gunakan Basis Digestible SID dan AvP",
    });
    await user.click(sidSwitch);

    expect(screen.getAllByText("SID Lisin").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fosfor Tersedia (AvP)").length).toBeGreaterThan(0);
  });

  it("mendeteksi ADVANCE_NULL_DATA pada evaluator saat bahan aktif memiliki nilai null di kendala Advance", () => {
    const reqWithTrp = {
      ...MOCK_REQUIREMENTS[0]!,
      constraints: [
        ...MOCK_REQUIREMENTS[0]!.constraints,
        { nutrientId: "trp", min: 0.2, isAdvance: true, enabled: true },
      ],
    };
    const res = evaluateMockFormulation(MOCK_INGREDIENTS, reqWithTrp, {
      ...DEFAULT_CONFIG,
      enableAdvanceNutrients: true,
    });
    const nullConflict = res.conflicts?.find((c) => c.code === "ADVANCE_NULL_DATA");
    expect(nullConflict).toBeDefined();
    expect(nullConflict?.message).toContain("Dedak Padi Halus");
  });

  it("Target Nutrien default menampilkan nilai aktual dulu dan Min/Max expand saat diaktifkan", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Default input Min/Max tersembunyi
    expect(screen.queryByLabelText("Target Min Protein Kasar")).not.toBeInTheDocument();

    // Klik baris Protein Kasar untuk expand Min/Max
    const expandCpBtn = screen.getByRole("button", {
      name: /Atur batas Min dan Max Protein Kasar/i,
    });
    await user.click(expandCpBtn);

    expect(screen.getByLabelText("Target Min Protein Kasar")).toBeInTheDocument();
    expect(screen.getByLabelText("Target Max Protein Kasar")).toBeInTheDocument();
  });

  it("mengubah ukuran batch 500 kg dan menavigasi sub-tab Grafik, Harga Bayangan, What-If", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "500 kg" }));
    expect(screen.getByText("Biaya / 500 kg")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Grafik" }));
    expect(screen.getByText(/Radar Target Ideal vs Aktual/i)).toBeInTheDocument();
    expect(screen.getByText(/Porsi Berat \(%\) vs Porsi Biaya \(%\)/i)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Harga Bayangan" }));
    expect(screen.getByText(/Apa itu Harga Bayangan/i)).toBeInTheDocument();
    expect(screen.getByText(/Harga Bayangan Kendala Nutrisi/i)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "What-If" }));
    expect(screen.getByText(/Simulasi Tukar Bahan Cepat/i)).toBeInTheDocument();
  });

  it("bernavigasi antar tab Database (8 kelas & PDF), Profil Kebutuhan (tabel SNI), Project Resep (PDF), Modul Lanjutan (pintasan klik), dan Pengaturan", async () => {
    const user = userEvent.setup();
    render(<App />);

    // 1. Database Bahan: 8 klasifikasi tanpa tombol ekspor database
    await user.click(screen.getAllByRole("button", { name: /Database Bahan/i })[0]!);
    expect(
      screen.getByRole("heading", { name: /Database Kandungan Bahan Pakan/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Semua 8 Kelas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tambah Bahan/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ekspor PDF/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ekspor Excel/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ekspor CSV/i })).not.toBeInTheDocument();

    // 2. Profil Kebutuhan Pakan: tabel ringkas + filter SNI
    await user.click(screen.getAllByRole("button", { name: /Profil Kebutuhan Ternak/i })[0]!);
    expect(
      screen.getByRole("heading", { name: /Profil Kebutuhan Pakan Ternak/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Standar SNI/i })).toBeInTheDocument();
    expect(screen.getAllByText(/SNI 8173\.2:2015/i).length).toBeGreaterThan(0);

    // 3. Project Resep: ringkas & ekspor PDF (tanpa .feed.json)
    await user.click(screen.getAllByRole("button", { name: /Resep & Ekspor/i })[0]!);
    expect(screen.getByRole("heading", { name: /Project Resep Tersimpan/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Ekspor PDF/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /\.feed\.json/i })).not.toBeInTheDocument();

    // 4. Modul Lanjutan: tanpa jargon teknis & pintasan siap pakai bisa diklik
    await user.click(screen.getAllByRole("button", { name: /Modul Lanjutan/i })[0]!);
    expect(screen.getByRole("heading", { name: "Modul Lanjutan" })).toBeInTheDocument();
    expect(screen.queryByText(/Out of Scope/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/CLI \/ Build-Time/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Single-Mix/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Buka Harga Bayangan/i }));
    expect(screen.getAllByText(/Apa itu Harga Bayangan/i).length).toBeGreaterThan(0);

    // 5. Pengaturan: Dasar (Desimal & Bahasa) & Lanjutan (Tier/BETN/NDF/Anti-Nol/Presisi LP)
    await user.click(screen.getAllByRole("button", { name: /Pengaturan/i })[0]!);
    expect(screen.getByText(/Desimal Tampilan Angka/i)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Pengaturan Lanjutan/i }));
    expect(screen.getByText(/Aturan Anti-Nol Otomatis/i)).toBeInTheDocument();
    expect(screen.getByText(/Tampilkan Parameter BETN/i)).toBeInTheDocument();
    expect(screen.getByText(/Tampilkan Parameter NDF & ADF/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Atur Presisi LP/i })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Pengaturan Dasar/i }));
    await user.click(screen.getByRole("combobox", { name: "Pilih bahasa" }));
    await user.click(screen.getByRole("option", { name: "English" }));
    expect(screen.getByRole("heading", { name: "Application Settings" })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Ration Formulation/i })[0]!);
    expect(screen.getByRole("heading", { name: "Ration Formulation" })).toBeInTheDocument();
  });

  it("mendukung penambahan nutrien kustom penuh (nama, satuan, basis dinamis)", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: /Tambah Nutrien Kustom/i })[0]!);
    fireEvent.change(screen.getAllByLabelText("Nama Nutrien Kustom")[0]!, {
      target: { value: "Beta-Glukan" },
    });
    await user.click(screen.getAllByRole("combobox", { name: "Satuan Nutrien Kustom" })[0]!);
    await user.click(screen.getByRole("option", { name: "mg/kg" }));
    await user.click(screen.getAllByRole("combobox", { name: "Basis Nutrien Kustom" })[0]!);
    await user.click(screen.getByRole("option", { name: /Basis BK/i }));
    await user.click(screen.getAllByRole("button", { name: /Simpan Nutrien/i })[0]!);

    expect(screen.getAllByText(/Beta-Glukan/i).length).toBeGreaterThan(0);

    const toggleBasisBtn = screen.getAllByTitle("Klik untuk ubah basis nutrien kustom")[0]!;
    expect(toggleBasisBtn).toHaveTextContent("BK");
    await user.click(toggleBasisBtn);
    expect(toggleBasisBtn).toHaveTextContent("AF");

    await user.click(screen.getAllByRole("button", { name: /Hapus Beta-Glukan/i })[0]!);
    expect(screen.queryByTitle("Klik untuk ubah basis nutrien kustom")).not.toBeInTheDocument();
  });

  it("menampilkan kolom Inklusi % dan mendukung collapse/expand panel Target Nutrien & Sidebar", async () => {
    const user = userEvent.setup();
    render(<App />);

    const inclusionHeaders = screen.getAllByRole("columnheader", { name: "Inklusi %" });
    expect(inclusionHeaders.length).toBeGreaterThan(0);
    expect(inclusionHeaders[0]).toHaveAttribute(
      "title",
      expect.stringMatching(/Persentase porsi bahan pakan dalam total ransum/i),
    );
    expect(screen.getByLabelText("Panel Target Nutrien")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /Sembunyikan panel target nutrien/i,
      }),
    );
    expect(screen.queryByLabelText("Panel Target Nutrien")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /Tampilkan panel target nutrien/i,
      }),
    );
    expect(screen.getByLabelText("Panel Target Nutrien")).toBeInTheDocument();

    // Expand & collapse desktop sidebar
    const expandSidebarBtn = screen.getByRole("button", { name: /Perbesar sidebar navigasi/i });
    await user.click(expandSidebarBtn);
    expect(screen.getByRole("button", { name: /Perkecil sidebar navigasi/i })).toBeInTheDocument();
  });

  it("menghitung Porsi Biaya (%) di FormulationCharts dan mematuhi decimalPlaces global", () => {
    const { rerender } = render(
      <FormulationCharts
        composition={[
          { ingredientId: "corn-ground", fraction: 0.7, weightKg: 70, costContribution: 3000 },
          { ingredientId: "soybean-meal", fraction: 0.3, weightKg: 30, costContribution: 2000 },
        ]}
        nutrients={[
          { nutrientId: "cp", value: 21, min: 20, max: 23, status: "met" },
          { nutrientId: "me_poultry", value: 3000, min: 2950, max: 3150, status: "met" },
          { nutrientId: "ca", value: 1, min: 0.9, max: 1.1, status: "met" },
        ]}
        ingredients={MOCK_INGREDIENTS}
        batchTotalCost={500000}
        simpleMode
        language="id"
      />,
    );

    expect(screen.getByText(/70% berat · 60% biaya/i)).toBeInTheDocument();
    expect(screen.getByText(/30% berat · 40% biaya/i)).toBeInTheDocument();

    rerender(
      <FormulationCharts
        composition={[
          { ingredientId: "corn-ground", fraction: 0.7, weightKg: 70, costContribution: 3000 },
          { ingredientId: "soybean-meal", fraction: 0.3, weightKg: 30, costContribution: 2000 },
        ]}
        nutrients={[
          { nutrientId: "cp", value: 21, min: 20, max: 23, status: "met" },
          { nutrientId: "me_poultry", value: 3000, min: 2950, max: 3150, status: "met" },
          { nutrientId: "ca", value: 1, min: 0.9, max: 1.1, status: "met" },
        ]}
        ingredients={MOCK_INGREDIENTS}
        batchTotalCost={500000}
        decimalPlaces={1}
        simpleMode
        language="id"
      />,
    );

    expect(screen.getByText(/70,0% berat · 60,0% biaya/i)).toBeInTheDocument();
    expect(screen.getByText(/30,0% berat · 40,0% biaya/i)).toBeInTheDocument();
  });
});
