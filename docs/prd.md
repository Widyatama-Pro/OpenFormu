# Product Requirements Document (PRD) & Panduan Spesifikasi Fitur Lengkap — OpenFormul

Dokumen ini adalah **panduan induk (_Single Source of Truth_)** yang menyatukan seluruh fitur fungsional, aturan anti-bentrok, arsitektur lintas platform (_Desktop & Mobile PWA_), model data, formulasi matematis, hingga modul rekayasa kelas industri untuk repositori **OpenFormul**.

> **Sumber Primer (`project-brief/`):**
>
> 1. [spesifikasi_rancangan_repositori_formulasi_pakan.md](../project-brief/spesifikasi_rancangan_repositori_formulasi_pakan.md) (168 baris) — Spesifikasi fitur inti, analisis 5 bentrok logika, 5 fitur tambahan lapangan, 7 fitur komersial hasil _reverse engineering_, dan fitur ekosistem _open-source_.
> 2. [analisis_arsitektur_perangkat_lunak_formulasi_pakan.md](../project-brief/analisis_arsitektur_perangkat_lunak_formulasi_pakan.md) (603 baris) — Analisis arsitektur 4 lapis, perbandingan 10 platform komersial/akademis global, persamaan regresi & biologis, serta spesifikasi _state logic_ 12 modul kelas industri.
>
> **Dokumen Repositori Terkait:** [src/types/index.ts](../src/types/index.ts) · [docs/data-schema.md](data-schema.md) · [docs/formulation-math.md](formulation-math.md) · [docs/architecture.md](architecture.md) · [docs/advanced-feature-research-plan.md](advanced-feature-research-plan.md) · [docs/ROADMAP.md](ROADMAP.md) · [docs/DESIGN.md](DESIGN.md)

---

## 1. Problem Statement, Visi & Target Pengguna

### 1.1 Problem Statement

Biaya pakan menyumbang **60–70% total biaya produksi peternakan**. Di lapangan, peternak skala kecil–menengah, mahasiswa, penyuluh, nutrisiwan independen, maupun pabrik pakan menghadapi empat hambatan utama:

1. **Keterbatasan Kalkulasi Manual:** Metode _trial-and-error_, _Pearson Square_, atau spreadsheet manual hanya mampu menyeimbangkan 1–2 nutrien sekaligus, tidak menjamin biaya termurah (_least-cost_), dan rawan salah hitung akibat pencampuran basis **As-Fed** vs **Bahan Kering (Dry Matter / BK)**—terutama pada ransum ruminansia dengan hijauan berkadar air 70–80%.
2. **Ketidakpastian Kegagalan & Fluktuasi Bahan Baku:** Alat sederhana berhenti kaku ketika target mustahil dicapai (_infeasible_) tanpa menjelaskan kendala penyebabnya. Selain itu, kalkulasi deterministik berbasis nilai rata-rata ($\mu$) hanya memberikan tingkat keyakinan statistik **~50%** karena mengabaikan variabilitas/standar deviasi ($\sigma$) antar-kiriman bahan baku.
3. **Paywall Fitur Presisi & Ketergantungan Jaringan:** Perangkat lunak komersial (Bestmix, Brill Formulation / Datacor Ara, Allix3, WinFeed, MixitWin, NDS Pro, AMTS) mematok biaya lisensi tinggi dan memisahkan fitur krusial (_Multi-Blend_, _Shadow Price_, _Stochastic Formulation_, _Enzyme Matrix_, _Moisture Shrink_, _Ruminant Bio-Models_, _VFD Sequencing_) ke dalam modul berbayar, sementara pekerjaan lapangan kerap terjadi tanpa akses internet stabil.
4. **Celah antara Formulasi Teoretis & Operasional Timbangan/Kandang:** Tanpa kontrol pembulatan timbangan (_free-fall_ & timbangan mikro untuk bahan $<1\%$), koreksi susut air peleting/ekstrusi (_moisture shrink_), dan sinkronisasi hasil lab/FT-NIR, komposisi di karung pakan dan biaya riil (_Mill Cost_) menyimpang jauh dari formula di layar.

### 1.2 Visi Produk

Membangun **OpenFormul**: aplikasi formulasi pakan ternak **open-source** dengan arsitektur **offline-first (Desktop & Mobile Android/PWA)** yang memadukan pengalaman pakai yang ringkas untuk peternak harian dengan kekuatan optimasi matematis, analitik ekonomi, dan pemodelan biologis kelas industri—berjalan **100% di sisi klien** untuk lingkup inti (_HiGHS WebAssembly + IndexedDB_) serta siap diekspansi ke modul riset dan pabrik (_All-in-One Architecture_).

### 1.3 Persona & Target Pengguna

| Persona                                           | Konteks Penggunaan                                        | Kebutuhan Fitur Utama                                                                                                                                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Peternak & Operator Kandang/Gudang**            | HP Android offline di kandang/gudang atau laptop          | Preset ternak instan, edit harga custom harian, aturan Anti-Nol, kalkulator adukan (kg), lembar timbang PDF _Print Batch Only_ / CSV                                                                                   |
| **Ahli Nutrisi & Konsultan Lapangan**             | Desktop/tablet dengan matriks bahan lokal & impor beragam | Mode _Advance_ (asam amino total/SID, NDF/ADF, AvP, ANF, lemak cair), rasio nutrien (Ca:P, ME:CP, _Ideal Protein_), 5 Mode Optimasi, _Shadow Price / Opportunity Cost_, _What-If_ Lock, Formulasi Stokastik ($\sigma$) |
| **Pabrik Pakan (_Feed Mill_) & Tim QC/Pembelian** | Operasi batch harian, multi-produk & pengadaan bahan      | _Base vs Overlay Ingredients_, _FT-NIR / Sample Basket_, _Multi-Blend_ silo & kontrak, _Moisture Shrink_, _Mill Cost_, pelabelan regulasi otomatis & VFD _carry-over sequencing_                                       |
| **Akademisi, Peneliti & Kontributor Open-Source** | Riset kampus, Jupyter Notebook, kontribusi dataset GitHub | _Decoupled Core Engine_, transparansi persamaan energi/DMI/metana, _Community Feed Packs_ JSON/YAML bersitasi resmi, resep portabel `.feed.json`, _auto-search_ dataset terbuka                                        |

---

## 2. User Stories Inti

1. **Sebagai peternak**, saya ingin memilih komoditas dan fase ternak (mis. _Broiler Starter_, _Ayam Petelur_, _Sapi Potong_, _Sapi Perah_) agar seluruh target nutrien terisi otomatis sebagai template awal, tetapi tetap bebas saya sesuaikan.
2. **Sebagai formulator**, saya ingin mengubah harga custom harian tanpa merusak harga acuan pasar, mencentang bahan yang tersedia, serta mengatur batas `Min %`, `Max %`, dan opsi **Anti-Nol** (baik global maupun per-bahan).
3. **Sebagai ahli nutrisi**, saya ingin menyalakan menu **Advance** secara _opt-in_ untuk mengontrol asam amino esensial (Lisin, Metionin, Met+Cis, Treonin, Triptofan, Valin, Arginin), fraksi serat (NDF, ADF, Pati), faktor antinutrisi (ANF), lemak cair mixer, serta mengganti basis perhitungan **As-Fed ↔ BK (DM)** dan **Total ↔ Digestible (SID / AvP)**.
4. **Sebagai pengguna dengan prioritas bisnis berbeda**, saya ingin memilih **5 Mode Optimasi** (_Hemat_ hingga _Presisi Tinggi_ mendekati _target midpoint_) dan tetap mendapat solusi terdekat via **Mode Relaksasi Elastik** lengkap dengan tanda peringatan merah dan diagnosis konflik ketika target mustahil dipenuhi 100%.
5. **Sebagai pengambil keputusan pembelian**, saya ingin memantau **Shadow Price** nutrien, **Opportunity Cost / Break-even Price** bahan `0%`, **Rentang Harga Aman (_Price Range_)**, analisis parametrik, serta melakukan simulasi **"What-If" Manual Lock** untuk mengevaluasi substitusi bahan secara cepat.
6. **Sebagai operator pencampuran**, saya ingin memasukkan target berat produksi adukan (mis. `50 kg`, `100 kg`, `500 kg`, `1.000 kg`) dan mencetak lembar takaran dalam kg beserta opsi **Print Batch Only** tanpa membocorkan analisis nutrien rahasia.
7. **Sebagai peneliti dan kontributor**, saya ingin memisahkan tegas antara **Database Kandungan Bahan** dan **Database Standar Kebutuhan Ternak**, menyimpan proyek dalam format **`.feed.json`** yang 100% reproduktif, serta memakai mesin matematisnya secara terpisah (_decoupled_) dari antarmuka web.

---

## 3. Arsitektur Konseptual & Lintas Platform

### 3.1 Arsitektur 4 Lapisan (_All-in-One Architecture_)

Untuk menyatukan paradigma **Manufaktur Pakan Komposit/Monogastrik** (Bestmix, Brill/Ara, Allix3, WinFeed, MixitWin, FeedSoft) dan **Pemodelan Biologis Ruminansia** (NDS Pro, AMTS.Cattle.Pro, CPM-Dairy, NASEM 2021, UC Davis), sistem dirancang dalam empat lapisan alur data berurutan:

1. **Lapisan 1 — Data Input & Quality Control:** Memuat profil bahan baku (_Base & Overlay_), input lab basah / FT-NIR via _Sample Basket_, stok kontrak/silo, serta parameter fisiologis dan lingkungan ternak.
2. **Lapisan 2 — Dynamic Matrix Normalization:** Normalisasi basis _Dry Matter (BK)_ vs _As-Fed_, koreksi susut kelembaban proses (_moisture shrink_), evaluasi persamaan regresi energi & elektrolit secara dinamis, serta diskretisasi kurva dosis enzim non-linear (_piecewise linear_).
3. **Lapisan 3 — Hybrid Optimization Solver Engine:** Menggabungkan _Single-Mix LP_ (dengan 5 mode optimasi & _Elastic Fallback_), _Chance-Constrained Stochastic Solver_ ($\sigma$), _Multi-Blend MILP_ (silo & langkah produksi), dan _Non-Linear / Genetic IOFC Optimizer_.
4. **Lapisan 4 — Mill Operations, Analytics & Compliance Output:** Kalkulator _batching_ (kg & kompensasi timbangan/_Mill Cost_), pelabelan regulasi & _premix explosion_, urutan produksi VFD _anti-carryover_, analitik _Shadow Price / Opportunity Cost_, dan ekspor portabel (`.feed.json`, CSV, XLSX, PDF).

### 3.2 Pemisahan Lapisan Teknis OpenFormul (Client-Side PWA vs Ekspansi)

| Lapisan                                       | Implementasi Wajib                                                                                                                | Prinsip Teknis                                                                                                                                                |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Core Engine (`src/solver/`, `src/utils/`)** | TypeScript murni bebas React + **HiGHS WASM (`highs`)** di Web Worker                                                             | 100% offline-first, tipe `readonly`, validasi pasca-solve toleransi `1e-6`, pembatalan `requestId` usang                                                      |
| **Penyimpanan Lokal (`src/storage/`)**        | **IndexedDB** (`openformul-db`: `ingredients`, `requirements`, `recipes`, `preferences`) + **Service Worker** (`vite-plugin-pwa`) | Dilarang menyimpan katalog/riwayat di `localStorage`; aset `.wasm` wajib ter-_precache_                                                                       |
| **UI Cross-Platform (`src/components/`)**     | React 19 + TypeScript ketat (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) + Tailwind CSS v4                | Mematuhi `DESIGN.md`, `frontend-anti-slop` (8pt spacing grid, `tabular-nums`, palet netral + semantik `emerald/amber/rose`), target sentuh mobile `≥ 44×44px` |

### 3.3 Audit Lingkup Offline-First PWA (_In-Scope vs Out-of-Scope_)

Agar OpenFormul tetap **100% offline-first**, ringan di browser/Android, dan bertumpu pada satu mesin solver (**HiGHS WASM LP/MILP + IndexedDB**), seluruh fitur di PRD diklasifikasikan tegas menjadi tiga kategori:

| Klasifikasi Lingkup                                  | Daftar Fitur / Modul                                                                                                                                                                                   | Alasan Arsitektural                                                                                                                                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **✅ In-Scope PWA (Inti & Lanjutan LP/Aljabar)**     | `F-01` s/d `F-18`, `F-20`, `F-22`, `F-23`, `F-24`, `F-25` _(hanya evaluator DMI/rumen pasca-solve)_, `F-31` _(evaluator emisi ringan)_, `F-32` s/d `F-36`, `F-41` (`PR-01`, `PR-02`, `PR-04`, `PR-05`) | Murni LP/SLP/aljabar di Web Worker HiGHS WASM + IndexedDB tanpa internet runtime, hardware eksternal, maupun solver non-linear baru.                                                                                   |
| **🔧 Dipisah ke Tooling / CLI Terpisah**             | `F-19` (_Auto-Crawler_ dataset), `F-35` / `EN-01` (paket `@openformul/core`)                                                                                                                           | Crawler butuh akses internet & terblokir CORS di browser sehingga dijalankan saat _build-time_ (CLI) untuk menghasilkan JSON statis terkurasi.                                                                         |
| **🕒 Opsional Single-Mix Pabrik (LP/MILP Terbatas)** | `F-28` (`ML-02` _Moisture Shrink_), `F-37` (`ML-03` bentrok aditif & mikotoksin), `ML-01` (_semi-continuous_ & step timbangan)                                                                         | Masih dapat diselesaikan HiGHS LP/MILP untuk 1 formula tunggal secara offline, namun opsional dan bukan prioritas pengguna harian.                                                                                     |
| **🚫 Out of Scope (PWA Offline)**                    | `F-21` (lintas pabrik), `F-25` (_Genetic Algorithm_ IOFC), `F-26` (Gompertz GRG), `F-27`, `F-29`, `F-30`, `F-38`, `F-39`, `F-40` (`ML-04`, `ML-05`, `EN-02`–`EN-05`)                                   | Bentrok dengan prinsip offline-first/PWA: butuh sinkronisasi server multi-user, driver hardware pabrik (FT-NIR/timbangan/PLC), liabilitas regulasi dinamis, database LCA berlisensi, atau solver NLP/GA di luar HiGHS. |

### 3.4 Desain Navigasi & Transformasi Layout Adaptif (Desktop, Tablet & Mobile)

| Breakpoint                       | Pola Navigasi Utama                                                                                                                               | Penataan Workbench Formulasi                                                                                                                                                    | Transformasi Tabel Data Kompleks                                                                                                                                                                                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Desktop (`≥ 1024px / lg`)**    | **Sidebar Kiri Permanen** (dapat diciutkan `240px ↔ 64px` icon-rail) + indikator status offline                                                   | **3-Panel Grid:** Daftar Bahan (kiri, ~55% lebar), Target Nutrien (kanan atas), Hasil & Analitik (kanan bawah)                                                                  | Grid penuh dengan kolom kiri (`Aktif ☑`, `Nama Bahan`) & header **sticky**, navigasi keyboard (`Enter`, `↓`, `↑`, `Tab`), virtualisasi untuk >50 bahan                                                                                                                                               |
| **Tablet (`768px–1023px / md`)** | Header ringkas + **Drawer Geser**                                                                                                                 | Layout 2 kolom / bertumpuk proporsional tanpa scroll horizontal halaman                                                                                                         | Tabel responsif + dukungan toggle tampilan                                                                                                                                                                                                                                                           |
| **Mobile (`< 768px`)**           | **Bottom Navigation Bar** 4 tujuan (`Formulasi`, `Bahan`, `Resep`, `Menu/Lainnya`) + **Drawer** (`Profil Ternak`, `Modul Lanjutan`, `Pengaturan`) | **Segmented Stepper 3-Langkah** (`1. Bahan` → `2. Target` → `3. Hasil`) + **Sticky Action Bar** di atas bottom nav (`Estimasi/kg` + badge status + tombol aksi primer `≥ 44px`) | **Card-Stack + Bottom Sheet Editor:** tiap bahan jadi kartu ringkas (toggle aktif `≥ 44px`, Harga, Min%, Max%, 3 nutrien kunci + _shortcut_ **Edit Nutrien** ke _Bottom Sheet_ bertab kategori); tersedia pula tombol toggle **Tabel Kompak**; Target Nutrien & Hasil memakai format kartu prioritas |

---

## 4. Katalog & Panduan Lengkap Seluruh Fitur

Setiap fitur dari kedua berkas `project-brief/` dipetakan di bawah ini lengkap dengan **aturan fungsional**, **rumus/parameter teknis**, **batasan**, dan **target rilis roadmap**.

---

### Modul A — Workspace Formulasi Inti & Pengaturan Bahan (`Core Workbench`)

#### `F-01` Mesin Formulasi Dasar (_Single-Mix Least-Cost LP_)

- **Tujuan:** Menghitung proporsi campuran bahan pakan tepat **100%** ($\sum_{i=1}^{n} x_i = 1$, $x_i \in [0, 1]$) yang memenuhi seluruh batas kebutuhan nutrien dengan biaya optimal.
- **Cakupan Nutrien Dasar (_Default View_):** Energi Metabolis Unggas (`me_poultry`, kcal/kg) / `tdn` (%), Protein Kasar (`cp`, %), Lemak Kasar (`ee`, %), Serat Kasar (`cf`, %), Kalsium (`ca`, %), dan Fosfor Total (`p`, %).
- **Aturan Wajib:** Proporsi internal disimpan sebagai fraksi `0..1` presisi penuh; pembulatan hanya di lapisan tampilan UI (`%` 2 desimal, biaya/energi `0` desimal).
- **Status / Rilis:** Fase 1 ✅ (UI) → Fase 2 ✅ (HiGHS WASM Worker di `src/solver/`).

#### `F-02` Pemilihan Preset Standar Ternak (_Nutrient Requirement Presets_)

- **Tujuan:** Memilih komoditas dan fase pemeliharaan (mis. _Broiler Starter 0–21 hari_, _Broiler Finisher_, _Ayam Petelur Fase Produksi_, _Sapi Potong Penggemukan_, _Sapi Perah Laktasi_, _Kambing/Domba_) untuk mengisi otomatis (_auto-fill_) seluruh target nutrien dasar dan rasio standar.
- **Batasan Penting:** Preset berlaku hanya sebagai **template awal**. Setelah dipilih, pengguna bebas mengubah nilai Min/Max maupun menyusun profil kebutuhan baru dari nol. Memilih preset Sapi/Ruminansia otomatis menyarankan/mengaktifkan basis Bahan Kering (`dry_matter`).
- **Status / Rilis:** Fase 1 ✅ → Fase 3 ✅ (`hartadi-feeds.ts` 304 bahan, `kearl-requirements.ts` 82 Kearl 1982 + 24 NRC 1988 profil sapi perah; riset CNCPS/NASEM lanjutan di Fase 4A–5).

#### `F-03` Kustomisasi Target Nutrien (_Custom Nutrient Constraints_)

- **Tujuan:** Menetapkan batas **Minimum (`Min`)** dan **Maksimum (`Max`)** yang masing-masing bersifat opsional per nutrien, termasuk mendefinisikan **nutrien kustom baru** (nama, satuan `%`, `kcal/kg`, `MJ/kg`, `mg/kg`, `IU/kg`, `mEq/kg`, serta basis dinamis `as_fed` ↔ `dry_matter`).
- **Validasi Wajib:** Memastikan `Min ≤ Max` pada setiap nutrien. Jika `Min > Max`, tampilkan indikator error `rose` langsung di sel dan blokir eksekusi solver hingga diperbaiki.
- **Status / Rilis:** Fase 1 ✅ (edit Min/Max) · Fase 2 ✅ (solver live) · Fase 3 ✅ (builder nutrien kustom penuh pengguna).

#### `F-04` Manajemen Biaya Bahan Pakan (_Market Reference vs Custom Override_)

- **Tujuan:** Mengelola dua lapis harga per kg (`As-Fed`, IDR):
  1. **Harga Pasaran (_Market Reference_, `pricePerKg`):** harga acuan sistem yang tersimpan di database bahan.
  2. **Harga Custom (_User Override_, `priceOverride`):** harga input pengguna sesuai kondisi pasar lokal/tanggal beli yang selalu menimpa harga acuan selama sesi formulasi berlangsung, lengkap dengan penanda visual dan tombol _Reset ke Harga Pasar_.
- **Status / Rilis:** Fase 1 ✅ (UI override & reset) → Fase 2–3 ✅ (integrasi solver live & persistensi IndexedDB).

#### `F-05` Batasan Inklusi Bahan & Aturan Anti-Nol (_Inclusion Bounds & Zero-Inclusion_)

- **Tujuan:** Mengatur porsi penggunaan tiap bahan melalui batas `Min %` ($L_i$) dan `Max %` ($U_i$), serta sakelar **Aturan Anti-Nol (`Zero-Inclusion`)**:
  - **Boleh 0% (Default):** Solver bebas memilih `0%` jika bahan tidak ekonomis/tidak cocok.
  - **Tidak Boleh Nol:** Bahan aktif dipaksa terpakai minimal sebesar persentase tertentu (mis. `0,5%` atau `1%`), dapat diatur secara **global** maupun **per-bahan**.
- **Aturan Guardrail Anti-Bentrok:**
  - Tampilkan peringatan proaktif `ANTI_NOL_CONFLICT` apabila `(Jumlah Bahan Aktif × Min Otomatis) > 50%`.
  - Terapkan batas pengaman `min(autoMin, max)` agar penguncian global tidak memaksa bahan mikro (`premix`, `mineral` dengan `max = 0,5%`) melanggar batas atasnya sendiri.
  - Prioritaskan pengaturan _Anti-Nol_ per-bahan agar pengguna bisa mengunci bahan spesifik saja tanpa melumpuhkan _Mode Hemat_.
- **Status / Rilis:** Fase 1 ✅ (UI global + per-bahan) → Fase 2 ✅ (`precheck.ts` & `buildModel.ts`).

#### `F-06` 5 Mode Optimasi (_Objective Weighting Modes_)

Seluruh kalkulasi solver selalu menggunakan bobot dari **5 Mode Optimasi** (baik saat formula terpenuhi 100% maupun saat _Near-Feasible_):

| Mode  | Nama               | Fokus Utama                         | Perilaku Terhadap Biaya                              |                                                                                                                                       Perilaku Terhadap Target Nutrisi |
| :---: | ------------------ | ----------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| **1** | **Hemat**          | Biaya terendah (_Least-Cost_ murni) | Menekan harga semurah mungkin ($w_{\text{dev}} = 0$) |                                                                                                            Memenuhi batas minimal standar secara longgar di tepi bawah |
| **2** | **Agak Hemat**     | Biaya rendah + margin aman          | Sedikit lebih tinggi dari Mode 1                     |                                                                                                                       Menjaga jarak aman sedikit di atas batas minimal |
| **3** | **Seimbang**       | Kompromi biaya & nutrisi            | Seimbang antara efisiensi harga & kualitas           |                                                                                                                  Menjaga kedekatan target tanpa membuat biaya melonjak |
| **4** | **Presisi**        | Akurasi nutrisi tinggi              | Lebih toleran terhadap kenaikan biaya                |                                                                                                           Mengutamakan kedekatan target; harga menjadi prioritas kedua |
| **5** | **Presisi Tinggi** | Performa & keseimbangan ideal       | Mengabaikan faktor harga ($w_{\text{cost}} = 0$)     | Meminimalkan total deviasi terhadap **titik tengah target ideal (_target midpoint_)** serta kelengkapan nutrien _Advance_ (bukan menaikkan angka nutrien tanpa batas!) |

- **Status / Rilis:** Fase 1 ✅ (selector & skor) → Fase 2 ✅ (Goal Programming LP di HiGHS WASM).

#### `F-07` Menu Presisi Tinggi (_Advance Nutrient Breakdown_), Basis Tercerna & ANF

- **Tujuan:** Secara _default_, UI menyembunyikan parameter lanjutan agar ringkas bagi pemula. Saat tombol/menu **Advance** dinyalakan (_opt-in_), pengguna dapat mencentang parameter spesifik:
  1. **Fraksi Protein / Asam Amino:** Lisin (`lys`), Metionin (`met`), Metionin+Sistin (`metcys`), Treonin (`thr`), Triptofan (`trp`), Valin (`val`), Arginin (`arg`), dll.
  2. **Fraksi Karbohidrat & Serat:** Serat Kasar (`cf`), `NDF`, `ADF`, Pati / BETN (`starch`).
  3. **Sakelar Basis Nutrisi Tercerna (_Digestible Basis_):** Berpindah antara **Total Basis** dan **Digestible Basis (`SID` Asam Amino & `Available Phosphorus / AvP`)**, karena formulasi unggas dan babi modern bertumpu pada kecernaan ileal standar ($a_{\text{SID-AA}, j} = a_{\text{Total-AA}, j} \times \text{dc}_{\text{ileal}, j}$) serta fosfor tersedia.
  4. **Faktor Antinutrisi (ANF) & Kualitas Fisik Pelet (_Max-Only Constraints_):** Batas atas Tanin (`tannin`), Gossypol, Trypsin Inhibitor, Aflatoksin, dan kadar minyak/lemak cair maksimal di mixer (`liquid_fat`, untuk mencegah adonan selip pada _pellet die_).
- **Aturan Wajib `0` vs `Null / N/A`:** Jika ada nutrien _Advance_ yang diaktifkan tetapi bahan terpilih memiliki nilai `null` (data lab kosong), sistem **wajib memunculkan peringatan amber (`ADVANCE_NULL_DATA`)** sebelum/saat solve agar angka kosong tidak dianggap `0%` secara diam-diam.
- **Status / Rilis:** Fase 1 ✅ (UI opt-in + toggle SID/AvP + warning `null`) → Fase 2 ✅ (integrasi LP matrix & precheck `ADVANCE_NULL_DATA`).

#### `F-08` Konversi Basis Dinamis: Bahan Kering (BK / _Dry Matter_) ↔ Segar (_As-Fed_)

- **Tujuan:** Mencegah pencampuran satuan antara bahan basah (seperti hijauan ruminansia berkadar air 70–80%, BK 20–30%) dan konsentrat kering (BK 88–90%).
- **Rumus Konversi Wajib:**
  $$\text{BK}_j = 100 - \text{Moisture \%}, \qquad a_{ij}^{\text{DM}} = a_{ij}^{\text{As-Fed}} \cdot \frac{100}{\text{BK}_j}, \qquad c_j^{\text{DM}} = c_j^{\text{As-Fed}} \cdot \frac{100}{\text{BK}_j}$$
  Saat formula dihitung pada basis `dry_matter`, sistem mengonversi fraksi BK ($x_j$) kembali ke proporsi berat segar aktual (**As-Fed Fraction**) untuk keperluan penimbangan di kandang/gudang:
  $$x_j^{\text{AF}} = \frac{x_j / \text{BK}_j}{\sum_{k=1}^{n} (x_k / \text{BK}_k)}$$
- **Status / Rilis:** Fase 1 ✅ (indikator basis) → Fase 2 ✅ (`src/utils/basis.ts` + unit test hijauan basah di `tests/basis-equations.test.ts` & `tests/solver-highs.test.ts`).

#### `F-09` Pengunci Rasio Nutrien, Grup Bahan & Aturan Substitusi

- **Tujuan:** Menjaga keseimbangan biologis yang tidak tertangkap oleh batas min–max tunggal:
  1. **Kendala Rasio Antar-Nutrien (Terlinearisasi):** Rasio `Ca:P` (atau `Ca:AvP`), `ME:CP`, `SID Lys:ME` ($\gamma_{\text{Lys:ME}}$), serta rasio _Ideal Protein_ mengambang terhadap **SID Lysine = 100%** (contoh broiler starter: Met+Sis ~75%, Thr ~65%, Trp ~18%; babi tumbuh 10–20 kg: SID Trp:Lys 18,2%; lele NRC 1993: Phe+Tyr 98%, Arg 84%, Leu 68%, Val 59%, Ile 51%, Met+Cys 45%, Thr 39%, His 29%, Trp 10%):
     $$\sum_j (a_{pj} - R_{\min} a_{qj}) x_j \ge 0, \qquad \sum_j (a_{pj} - R_{\max} a_{qj}) x_j \le 0$$
  2. **Batasan Grup Bahan (_Group Constraints_):** Membatasi akumulasi bahan sejenis (mis. 4 jenis molase yang masing-masing dibatasi 2,5% agar total tidak menjadi 10%):
     $$\text{Min}_G \le \sum_{j \in G} x_j \le \text{Max}_G$$
  3. **Aturan Substitusi & Faktor Ekuivalensi (_Substitute & Equivalence Rules_):** Ketika bahan $A$ turun di bawah ambang $\theta_A$, sistem memaksa substitusi proporsional bahan $B$/aditif dengan faktor konversi $\gamma$: $\gamma x_A + x_B \ge \gamma \theta_A$.
- **Status / Rilis:** Fase 1 ✅ (UI rasio Ca:P) → Fase 2 ✅ (`buildModel.ts` rasio terlinearisasi & grup bahan) → Fase 4 ⬜ (substitusi kompleks).

#### `F-10` Simulasi Tukar Bahan Cepat (_"What-If" Manual Lock_)

- **Tujuan:** Menyediakan mode simulasi manual di samping _Auto-Optimize_. Formulator dapat mengunci proporsi satu atau beberapa bahan dan menggeser persentase bahan secara manual (mis. menukar 5% jagung dengan polar gandum) untuk melihat pergeseran biaya dan indikator bar nutrien hijau/merah secara _real-time_.
- **Status / Rilis:** Fase 1 ✅ (tab _What-If_) → Fase 2 ✅ (`manualLocks` terhubung ke solver HiGHS via `src/solver/modelHelpers.ts`).

#### `F-11` Kalkulator Skala Adukan (_Batch Mixer Scaling_) & _Print Batch Only_

- **Tujuan:** Mengonversi hasil persentase (`%`) ke takaran timbang nyata (**kg per adukan**) berdasarkan input **Total Berat Produksi** (preset cepat `50 kg`, `100 kg`, `500 kg`, `1.000 kg`, atau input bebas hingga skala pabrik `1.000.000 kg`), menghitung **total biaya per batch** dan **biaya/kg** (mengonversi otomatis ke berat segar As-Fed bila formulasi berbasis BK).
- **Fitur Keamanan Formula:** Mendukung mode **Print Batch Only** (terinspirasi WinFeed) saat ekspor/cetak sehingga operator gudang/mixer hanya menerima takaran timbang (kg) tanpa melihat profil analisis nutrisi rahasia perusahaan.
- **Status / Rilis:** Fase 1 ✅ (kalkulator batch UI) → Fase 3 ✅ (ekspor CSV, OOXML `.xlsx`, PDF 1.4 _Full_ & _Print Batch Only_).

---

### Modul B — Solver Outcomes, Diagnostik Konflik & Analitik Ekonomi

#### `F-12` Penanganan 2 Outcome Solver & Mode Relaksasi Elastik (_Fallback Solver_)

- **Outcome 1 — Feasible / Optimal:** Seluruh kendala nutrien, rasio, dan inklusi bahan terpenuhi 100% dengan toleransi pasca-solve `< 1e-6`.
- **Outcome 2 — Near-Feasible / Mode Relaksasi Elastik:** Jika kombinasi bahan secara matematis _infeasible_, dan opsi relaksasi aktif, solver menyisipkan variabel pelonggaran non-negatif $v_i, w_i \ge 0$ dengan bobot penalti $\ell_1$ ($g_i \gg c_j$):
  $$\min Z_{\text{elastic}} = \sum_{j=1}^{n} c_j x_j + \sum_{i=1}^{m} g_i (v_i + w_i)$$
  $$b_i^{\min} - v_i \le \sum_{j=1}^{n} a_{ij} x_j \le b_i^{\max} + w_i$$
  Setelah konvergen, sistem menghitung kembali **biaya formula riil** ($Z^* - \sum g_i(v_i^* + w_i^*)$), menampilkan formula terdekat bertanda `Near-Feasible (Elastik)`, dan menandai nutrien yang meleset (`v_i^* > 0` atau `w_i^* > 0`) dengan warna merah serta besaran deviasi minimumnya. Jika Mode Relaksasi dimatikan, sistem **tidak boleh** menampilkan komposisi optimal palsu.
- **Status / Rilis:** Fase 1 ✅ (simulasi 3 status & banner) → Fase 2 ✅ (Elastic $\ell_1$ LP solver nyata di `buildModel.ts` & `parseResult.ts`).

#### `F-13` Validasi Pra-Kalkulasi (_Pre-Check_) & Detektor Konflik Cerdas (_Infeasibility Debugger / IIS_)

- **Pre-Check Wajib Sebelum Memanggil Solver:**
  1. Validasi per-baris: `Min ≤ Max` dan semua input numerik $\ge 0$ (tidak ada `NaN`).
  2. Validasi jumlah inklusi: $\sum L_i \le 100\%$ dan $\sum U_i \ge 100\%$ (termasuk batas grup bahan).
  3. Validasi jangkauan nutrien: $\max_i a_{ki} \ge b_k^{\min}$ dan $\min_i a_{ki} \le b_k^{\max}$ pada himpunan bahan aktif.
- **Diagnostik Konflik Cerdas (IIS):** Ketika terjadi _infeasible_, sistem mengidentifikasi pasangan kendala yang saling bertabrakan dan mengeluarkan diagnosis spesifik beserta saran perbaikan (contoh: _"Target Protein Kasar Min 23% bentrok dengan Batas Maksimal Bungkil Kedelai 15%"_).
- **Status / Rilis:** Fase 1 ✅ (`ConflictDiagnosticsBanner`) → Fase 2 ✅ (`precheck.ts` + parser konflik elastik).

#### `F-14` Analisis Dual: Shadow Price, Bound Duals, Opportunity Cost & Price Range

Ekstraksi variabel dual dari solusi Simplex akhir (Brill, Bestmix, WinFeed, Ara, Taurus) dengan aturan pemisahan tegas:

1. **Shadow Price Kendala Nutrisi** ($y_i = -\bar{c}_{\text{slack}_i} = \frac{\partial Z^*}{\partial b_i}$): Perubahan biaya per kg pakan bila batas nutrien dilonggarkan 1 unit (`0` jika kendala _non-binding_).
2. **Bound Duals Batas Bahan (Terpisah dari Shadow Price Nutrisi!):** Ketika suatu bahan menempel batas inklusi ($x_j^* = L_j$ atau $x_j^* = U_j$), terjadi degenerasi dual; penalti batas inklusi bahan dilaporkan di tabel **Bound Duals** terpisah agar tidak dikacaukan dengan nilai nutrisi murni.
3. **Opportunity Cost / Break-Even Price (untuk bahan `0%`):** Menghitung nilai sumber daya internal $\pi_j = \sum_{i=1}^{m} a_{ij} y_i$ dan _reduced cost_ $\bar{c}_j = c_j - \pi_j$ (contoh UI: _"Tepung Ikan saat ini Rp14.500/kg tidak terpakai; baru layak masuk jika harga turun di bawah Rp11.890/kg"_).
4. **Rentang Harga Aman (_Price Range / Basis Ranging_ $[c_j^{\min}, c_j^{\max}]$):** Rentang harga bawah dan atas suatu bahan terpilih di mana komposisi basis optimal saat ini tidak berubah (mendukung isolasi per-formula vs set _Multi-Blend_).

- **Status / Rilis:** Fase 1 ✅ (sub-tab _Shadow Price_) → Fase 2 ✅ (ekstraksi dual, _bound duals_, _opportunity cost_, & _price range_ dari HiGHS).

#### `F-15` Parametric Stepping (1D–3D Decision Surface)

- **Tujuan:** Menjalankan solver secara berulang di sepanjang grid parameter $\theta \in [\theta_{\min}, \theta_{\max}]$ untuk menggeser harga bahan $c_j(\theta)$, batas nutrisi $b_i(\theta)$, atau kandungan nutrisi bahan $a_{ij}(\theta)$ guna memetakan kurva elastisitas permintaan bahan baku terhadap harga, mengevaluasi pemasok berbeda, hingga memvisualisasikan _3-variable decision surface_.
- **Status / Rilis:** Fase 4A (`PRO-03`).

#### `F-16` Visualisasi Interaktif (_Charts & Progress Bars_)

- **Radar Chart:** Membandingkan **Target Ideal (100%) vs Hasil Aktual** untuk nutrien aktif utama.
- **Bar Chart Komparatif:** Membandingkan **Porsi Berat (%) vs Porsi Biaya (%)** tiap bahan agar formulator langsung melihat bahan mana yang paling menguras anggaran.
- **Constraint Progress Bars:** Bilah progres horizontal rentang `Min–Max` dengan penanda aktual (_emerald/amber/rose_).
- **Status / Rilis:** Fase 1 ✅ (SVG murni ringan tanpa dependensi berat) → Fase 2 ✅ (tersambung hasil HiGHS nyata).

---

### Modul C — Database Terpisah, Dataset Komunitas & Mesin Persamaan Dinamis

#### `F-17` Pemisahan Tegas Database Kandungan Bahan vs Standar Kebutuhan Ternak

- **Aturan Arsitektural Mutlak:** Data bahan baku (_Ingredient Database_) dan standar kebutuhan gizi ternak (_Livestock Requirement Database_) **harus disimpan dan dicari pada dua modul terpisah**. Fitur pencarian maupun _auto-search_ tidak boleh mencampuradukkan angka "kandungan nutrisi suatu bahan" dengan angka "kebutuhan ternak".
- **Status / Rilis:** Fase 1 ✅ (dua halaman & koleksi terpisah).

#### `F-18` Community Feed Packs (JSON / YAML) Bersitasi Wajib

- **Tujuan:** Paket data terstruktur yang mudah dibaca manusia dan siap kontribusi Pull Request komunitas, mencakup bahan standar maupun bahan lokal tropis/Indonesia (jagung kuning, bungkil kedelai, dedak padi, bungkil inti sawit/BIS, onggok, maggot BSF, azolla, rumput gajah, tebon jagung, dll.) serta standar kebutuhan ternak.
- **Aturan Ketat:** **Dilarang menambah data nutrien tanpa mencantumkan sumber (`source`)** (mis. NRC, SNI, CVB, INRA, Feedipedia, Tabel Komposisi Pakan Indonesia / Hartadi).
- **Status / Rilis:** Sampel JSON dasar tersedia di `src/data/` ✅ · Ekspansi penuh pustaka [`hartadi-feeds.ts`](../src/data/hartadi-feeds.ts) (304 bahan), [`kearl-requirements.ts`](../src/data/kearl-requirements.ts) (`KEARL_REQUIREMENTS` 82 profil & `NRC_1988_DAIRY_REQUIREMENTS` 24 profil), serta arsip PDF/JSON/MD lengkap di [`docs/references/`](references/) ✅.

#### `F-19` Auto-Search & Crawler Database Nutrisi Terbuka _(🔧 Dipisah ke CLI Build-Time)_

- **Tujuan:** Mengagregasi dan mencari data nutrisi dari basis data internal maupun sumber tabel ilmiah terbuka (NRC, SNI, CVB, INRA, Feedipedia, Hartadi) dengan pemisah entitas _Bahan_ vs _Kebutuhan_.
- **Catatan Arsitektural & Status Lingkup:** Karena aplikasi inti PWA berjalan 100% _offline-first_ tanpa panggilan jaringan runtime (`AGENTS.md`) dan browser memblokir _scraping_ lintas origin (CORS), fitur _crawler_ **dikeluarkan dari runtime aplikasi web**. Di aplikasi PWA hanya tersedia pencarian katalog statis lokal; skrip _crawler_ dipisah menjadi tooling CLI _build-time_ (`EN-01`) untuk menghasilkan JSON statis terkurasi.
- **Status / Rilis:** 🔧 Dipisah ke CLI Build-Time (`EN-01`, bukan fitur runtime PWA).

#### `F-20` Penanganan Nilai `0` vs `Null / N/A`

- **Aturan Skema:** `nutrients: Record<NutrientId, number | null>`.
  - `0` berarti bahan sudah diuji dan memang tidak mengandung nutrien tersebut.
  - `null` berarti data laboratorium belum tersedia / **N/A**.
- **Perilaku UI & Solver:** Form edit bahan & impor data menjaga pembedaan `0` vs kosong; bila nutrien _Advance_ dicentang dan ada bahan aktif bernilai `null`, UI memunculkan peringatan eksplisit agar hasil optimasi tidak bias.
- **Status / Rilis:** Fase 1 ✅ (tipe + form + peringatan) → Fase 2–3 ✅ (`precheck` live + validasi impor CSV/TSV/`.feed.json`).

#### `F-21` Base vs Overlay Ingredients, Partial Merge & Seasonality _(🚫 Out of Scope PWA untuk Multi-Plant)_

- **Tujuan (Skala Pabrik / Multi-Lokasi):** Memisahkan **Base Ingredients** (tabel nutrisi standar pusat dengan _Plant Code_ kosong) dan **Overlay Ingredients** (penimpaan spesifik pabrik/periode berdasarkan hasil uji QC/NIR lokal) serta aturan musiman (**Seasonality Constraints**) tanpa menduplikasi resep.
- **Edge Case Impor:** Saat mengimpor hasil lab parsial (XML/CSV/NIR yang hanya memuat proksimat tanpa asam amino/mineral), sistem melakukan **partial merge** (menimpa atribut yang diuji saja sambil mempertahankan nilai asam amino/mineral lama di Base/Overlay) dan mendukung konversi kolom _factor field_ (format `.xtn`).
- **Catatan Lingkup:** _Partial merge_ impor CSV lokal sudah aktif di Fase 3 ✅. Namun arsitektur **Base vs Overlay lintas pabrik (`Plant Code`)** memerlukan sinkronisasi database terpusat multi-user, sehingga ditandai **🚫 Out of Scope PWA Offline** (tidak sesuai penyimpanan lokal IndexedDB tunggal).
- **Status / Rilis:** Impor CSV _partial merge_ lokal ✅ (Fase 3) · Multi-Plant Base/Overlay (`ENT-03` / `EN-04`) 🚫 Out of Scope PWA.

#### `F-22` Kalkulator Keseimbangan Elektrolit (dEB / DCAD / dUA) & Persamaan Regresi Energi Dinamis (_Online Equations_)

1. **Keseimbangan Elektrolit Diet (`mEq/kg`, input mineral dalam `mg/kg`):**
   - **$\text{dEB}$:** $\frac{\text{Na}}{23,0} + \frac{\text{K}}{39,1} - \frac{\text{Cl}}{35,5}$
   - **$\text{DCAD}$:** $\frac{\text{Na}}{23,0} + \frac{\text{K}}{39,1} - \frac{\text{Cl}}{35,5} - \frac{2 \cdot \text{S}}{32,1}$
   - **$\text{dUA}$:** menyertakan kation $\text{Mg}$ dan anion fosfat di samping Na, K, Cl, S.
   - **Edge Case Kritis:** L-Lysine HCl komersial (98,5%) menyumbang ion klorida ($\text{Cl}^-$) yang menurunkan dEB/DCAD secara signifikan—nilai $\text{Cl}$ wajib dihitung di matriks bahan agar tidak memicu asidosis metabolik.
2. **Persamaan Regresi Energi & Kecernaan Dinamis (_Online Equations_):** Menghitung otomatis nilai energi bila komposisi proksimat bahan berubah:
   - **Unggas:** Koreksi $\text{AMEn}$ ($8,22\text{ kcal/g N}$), persamaan WPSA 1986/1989 & CVB ($\text{ME MJ/kg} = \frac{15,51\cdot\text{CP} + 34,31\cdot\text{CFat} + 13,01\cdot\text{Sugar} + 16,69\cdot\text{Starch}}{1000}$), serta persamaan meta-analisis spesifik bahan (jagung: $4021,8 - 227,55\cdot\text{Ash}$; kedelai: $-822,33 + 69,54\cdot\text{CP} - 45,26\cdot\text{ADF} + 90,81\cdot\text{EE}$; Mariano EQ2/EQ3).
   - **Babi (Noblet/INRA & CVB & GfE):** Persamaan $\text{DC}_e$, $\text{DEE} = 0,82\cdot\text{EE} - 0,02\cdot\text{NDF} - 0,7$, rasio $\text{ME}/\text{DE}$, $k_g$, serta $\text{NE}_2 / \text{NE}_4 / \text{NE}_7$ (INRA) dan $\text{NE}_{\text{CVB 1993 / F4a}}$.
   - **Ruminansia (NASEM 2021 & Galyean):** Energi pokok dewasa ($0,107\text{ Mcal ME/kg BW}^{0,75}$ + koreksi suhu $2,01\text{ kcal/kg BW}^{0,75}/^\circ\text{C}$) & _heifer_, $\text{NE}_g$ Galyean et al. (2016), $\text{RE}$, $\text{EBG}$, dan $\text{NP}_g$.
   - **Aturan Penjepit (_Safety Clamp_):** Nilai persamaan regresi wajib dijepit pada $\max(0, \text{Nilai})$ (mis. $\text{DEE}$ pada bahan berkadar lemak rendah) dan sistem wajib mendeteksi **circular dependency** antar-persamaan sebelum disimpan.

- **Status / Rilis:** Persamaan dEB/DCAD & energi/lemak dasar Unggas/Babi (`src/utils/equations.ts`) di Fase 2 ✅ → Persamaan penuh & editor persamaan dinamis di Fase 4 ⬜.

---

### Modul D — Formulasi Stokastik, Enzim & Pemodelan Biologis (`Precision & Bio-Models`)

#### `F-23` Formulasi Stokastik / _Margin of Safety_ ($\sigma$ & Chance-Constrained Programming) _(✅ Lanjut — Offline SLP)_

- **Masalah Nyata:** Bahan baku alami memiliki simpangan baku ($\sigma$) nyata (mis. jagung PK $9,2\% \pm 0,5\%$, SBM $44,5\% \pm 1,4\%$). _Margin of safety_ linear statis ($\mu - 0,5\sigma$) mengabaikan sifat kuadratik varians ($\text{Var}(cX) = c^2 \text{Var}(X)$) sehingga memicu kelebihan protein (_CP overfeeding_) dan pemborosan biaya.
- **Mekanisme Kerja:**
  - Kolom opsional standar deviasi (`stdDev` / $\sigma_{ij}$) per nutrien bahan + kontrol **Tingkat Kepercayaan (_Confidence Level_ $p_i \in [50\%, 99,99\%]$)** (dikunci dalam rentang valid $50\text{–}99,99$ tanpa `%`).
  - Transformasi deterministik menggunakan deviasi normal standar $\phi_i = \Phi^{-1}(p_i)$ ($p_i = 0,50 \implies \phi = 0$; $p_i = 0,95 \implies |\phi| = 1,645$):
    $$\sum_{j=1}^{n} \mu_{ij} x_j - |\phi_i| \sqrt{\sum_{j=1}^{n} \sigma_{ij}^2 x_j^2 + \epsilon} \ge b_i^{\min}, \qquad \sum_{j=1}^{n} \mu_{ij} x_j + |\phi_i| \sqrt{\sum_{j=1}^{n} \sigma_{ij}^2 x_j^2 + \epsilon} \le b_i^{\max}$$
  - Diselesaikan dengan _Recursive Linear Programming_ (Munford, 1996) di Worker HiGHS (tanpa perlu solver non-linear GRG eksternal), dengan konstanta regularisasi $\epsilon = 10^{-12}$ di bawah akar untuk mencegah _division by zero_.
  - Keluaran menampilkan $\mu_{\text{diet}, i}$, $\sigma_{\text{diet}, i}$, dan probabilitas tercapainya setiap nutrien.
- **Status / Rilis:** Kolom `stdDev` sudah ada di `src/types/index.ts` ✅ → UI editor + solver _Recursive LP_ di Fase 4A (`PR-04`).

#### `F-24` Matriks Enzim Non-Linear (_Piecewise Linear_) & Plafon Substrat _Phytate-P_ _(✅ Lanjut — Offline LP)_

- **Tujuan:** Menangani enzim eksogen (_Phytase_, _Xylanase_, _Protease_, $\beta$-mananase) sebagai kategori `enzyme` dengan properti **Nutrient Uplift** (membebaskan AvP, Ca, ME, dan asam amino dari bahan nabati) tanpa menduplikasi nama bahan di UI.
- **Mekanisme & Guardrail Wajib:**
  - Kurva respons Michaelis-Menten / Lineweaver-Burk didiskretisasi menjadi segmen _piecewise linear_ (mis. dosis 350, 500, 1.000, 1.500 FTU/kg) dengan variabel segmen $s_k \in [0, D_k - D_{k-1}]$ dan pelepasan nutrisi $r_i \le \sum m_{i,k} s_k$.
  - **Plafon Substrat _Phytate-P_:** Klaim pelepasan fosfor dibatasi oleh total _phytate-P_ aktual ransum dikali degradabilitas maksimum $\eta_{\max} \in [0,70, 0,80]$:
    $$r_{\text{AvP}} \le \eta_{\max} \sum_{j=1}^{n} \text{PhytateP}_j \cdot x_j$$
  - Memvalidasi syarat kecekungan kemiringan ($m_{i,1} \ge m_{i,2} \ge \dots \ge m_{i,K}$); bila non-cekung, aktifkan pengunci biner MILP antar-segmen. Membatasi dosis maksimum biologis ($\le 2.000\text{ FTU/kg}$) serta memberi peringatan jika klaim enzim terpotong rendahnya substrat _phytate-P_.
- **Status / Rilis:** Kategori `"enzyme"` & field `phytateP` sudah ada di `src/types/index.ts` ✅ → Solver kurva NLA di Fase 4A (`PR-05`).

#### `F-25` Pemodelan Biologis Ruminansia (CNCPS / NASEM 2021 / INRA Systali) & _Genetic Optimizer_ _(Evaluator Lanjut · 🚫 GA Out of Scope PWA)_

- **Cakupan Biologis Rumen:**
  - **Fraksinasi Protein CNCPS ($A, B_1, B_2, B_3, C$):** Berbasis kelarutan bufer borat-fosfat, agen pengendap protein, dan NDIP/ADIP, dengan perhitungan $\text{RDP} = A + \sum_{k=1}^{3} B_k \frac{k_{d,k}}{k_{d,k} + k_p}$ dan $\text{RUP} = 100 - \text{RDP}$, di mana $k_p$ dihitung dinamis per hijauan basah, hijauan kering, dan konsentrat (NRC 2001 / CNCPS dengan faktor ukuran partikel $\text{peNDF}$), serta sistem **INRA Systali** (`UFL`, `UFV`, `PDIA`, `PDIN`, `PDIE` via $k_{ft}, k_{ct}, k_{lt}$).
  - **Prediksi _Dry Matter Intake_ (DMI):** Persamaan NRC (2001), ICAR (2013), CNCPS (dengan _Lag_ untuk minggu laktasi $\text{WOL} \le 16$), NASEM (2021) / ICAR Comprehensive TMR (berbasis paritas, BCS, DIM, dan $\text{MilkE}$), serta NASEM (2021) untuk sapi kering transisi (_Close-Up Dry Cows_ $< 3$ minggu sebelum beranak).
  - **Kinetika Serat, Pati & Kesehatan Rumen (Tolok Ukur 2026):** $\text{pdNDF}$ ($\text{Lignin} \times 2,4$) & $\text{uNDF}_{240}$ (target $<10\%\text{ DM}$, risiko *physical fill* $>12\%\text{ DM}$), $\text{NDFd}_{30}$ ($>58\%$ NDF), $\text{IVSD}_{7\text{hr}}$ ($>75\%$ pati), pati berjenjang (_pre-fresh_ 14–16%, _post-fresh_ 22–26%, puncak laktasi 28–30%), $\text{peNDF}$ ($\ge 21\text{–}23\%\text{ DM}$), profil asam silase (pH 3,8–4,2, rasio laktat:asetat ~3:1, butirat $<0,1\%\text{ DM}$, $\text{Ammonia-N} < 8\%\text{ CP}$), serta pemantau risiko depresi lemak susu (**RUFAL** / _High Risk RUFAL_).
- **Optimasi Non-Linear (_Genetic Algorithm_):** Mendukung _Safe Min/Max_ keras vs _Min/Max_ panduan, _Logistic Transition Functions_ (CPM-Dairy) agar gradien mulus antar-regresi, _flattening_ bahan komposit bersarang, mode cepat/normal/_in-depth_, memaksimalkan **IOFC / IOpurFC**, dan visualisasi _green constraint bars_.
- **Status / Rilis:** Evaluator aljabar DMI & fermentasi rumen pasca-solve **lanjut** di Fase 4A (`PR-05`) ✅ · **🚫 Out of Scope PWA** untuk mesin optimasi _Genetic Algorithm_ IOFC (`ML-05`), karena HiGHS WASM hanya mendukung LP/MILP dan GA memperberat ukuran/kecepatan di browser mobile.

#### `F-26` Model Pertumbuhan Monogastrik, Kualitas Pelet/Akuakultur & Maksimasi Profit Karkas (_Gompertz / GRG_) _(🚫 Out of Scope PWA)_

- **Monogastrik Broiler & Babi:** Menggabungkan kurva pertumbuhan potensial **Gompertz** (EFG Model, Cerrate & Waldroup 2009, DietForge Swine _Cost per Gain_ & IOFC) dengan respons polinomial kuadratik terhadap **Dietary Nutrient Density ($\text{ME}$, kcal/g)** dan suhu kandang ($T, ^\circ\text{C}$) untuk memprediksi bobot panen aktual ($aBW$), konsumsi pakan ($aFC$), _Dressing Percentage_ ($DP$), bobot daging dada ($BM$) & paha atas ($T_{\text{cut}}$), lalu memaksimalkan laba bersih ($P$) via solver non-linear GRG—dengan **penguncian domain kalibrasi biologis** (mis. $\text{ME} \in [3,00, 3,35]\text{ kcal/g}$) guna mencegah ekstrapolasi polinomial tidak realistis.
- **Tantangan Spesifik Unggas & Akuakultur:** Kelarutan & ukuran partikel sumber kalsium (_layer_), jadwal transisi pakan antar-bin, target keutuhan pelet minimal 40% di tempat pakan (McKinney & Teeter, 2004), serta kendala kadar pati akuakultur untuk _Pellet Durability Index_ (PDI), kepadatan, daya apung (_floating vs sinking_), dan stabilitas air.
- **Status / Rilis:** **🚫 Out of Scope PWA (`ML-05`)** — membutuhkan solver non-linear GRG di luar HiGHS WASM serta kalibrasi genetik/kandang yang sangat spesifik.

---

### Modul E — Operasi Pabrik (_Feed Mill_), QC/NIR, Regulasi & Keberlanjutan

#### `F-27` Multi-Blend, Multi-Plant, Silo Allocation & Step Values (MILP) _(🚫 Out of Scope PWA · kecuali Step Single-Mix `ML-01`)_

- **Masalah Nyata:** Mengoptimalkan formula satu per satu menghabiskan stok bahan murah/terbatas pada beberapa formula awal saja, melanggar kuota kontrak pemasok, gagal menguras stok berlebih/hampir rusak, dan melampaui kapasitas fisik bin/silo di pabrik.
- **Mekanisme MILP _Block-Angular_:**
  - Mengoptimalkan simultan himpunan formula $f \in \{1..F\}$ dengan tonase $T_{f,p,t}$ lintas pabrik $p$ dan periode $t$.
  - Tiga sumber pasokan bahan: **stok gudang** ($u^{\text{stock}} \le S_{j,p}$), **kontrak pemasok** ($Q^{\min} \le u^{\text{contract}} \le Q^{\max}$), dan **pasar spot** ($u^{\text{spot}}$), plus opsi _sell-back to market_ bila kuota kontrak minimum melampaui daya serap formula.
  - **Alokasi Silo Biner:** Variabel biner $y_{j,p} \in \{0, 1\}$ dengan $\sum_{j=1}^N y_{j,p} \le N_{\text{silo}, p}$ dan $x_{j,f,p,t} \le y_{j,p}$.
  - **Production Minima & Step Values:** Variabel integer $z_{j,f,p} \in \mathbb{Z}_{\ge 0}$ untuk kelipatan langkah produksi (serendah 0,01% bobot batch).
  - **Kemampuan Khusus:** _'Zero' ton formulas_ (mengevaluasi formula musiman $T_f = 0$ menggunakan bobot virtual $\epsilon = 10^{-4}$ tanpa mengonsumsi stok fisik), _Shared Premix Blend_, serta _Re-use of Incorrectly Produced Feed_.
- **Status / Rilis:** **🚫 Out of Scope PWA (`EN-02`)** — memerlukan basis data server terpusat lintas pengguna/pabrik dan matriks MILP skala besar yang tidak cocok di IndexedDB satu perangkat. _(Catatan: penguncian anti-nol semi-continuous & step timbangan untuk **1 formula tunggal** dicatat sebagai opsi MILP terbatas di `ML-01`)._

#### `F-28` Moisture Shrinkage & Multi-Stage Extrusion/Pelleting Optimization _(🕒 Opsional Single-Mix Mill LP)_

- **Tujuan:** Memodelkan penambahan air/uap di _conditioner_ (suhu 82–93°C selama 30–45 detik; $\le 18\%$ total kadar air di _die_ agar _press_ tidak _choke_), pembatasan lemak di mixer ($\le 1\text{–}3\%$ sebelum _cooler_, sisanya _post-pellet liquid coating_), kehilangan debu siklon ($\delta_{\text{dust}} \approx 3{,}4 \times 10^{-5}$), penguapan di _cooler_, serta skor kualitas pelet (`PDI / PQF`) langsung dalam kesetimbangan massa **1,00 kg produk jadi** pada solver LP:
  $$(1 - \delta_{\text{dust}})\sum_{j=1}^{n} x_j + x_{\text{water/steam}} + x_{\text{oil,coater}} - x_{\text{evap}} = 1{,}00$$
  sehingga bahan kering tak menguap terkonsentrasi akurat sesuai jaminan kemasan tanpa _over-dosing_.
- **Status / Rilis:** **🕒 Opsional Single-Mix (`ML-02`)** — masih kompatibel dengan LP HiGHS WASM untuk 1 formula tunggal, namun bukan prioritas pengguna harian.

#### `F-29` Integrasi QC Lab, FT-NIR, _Sample Basket_ & Kalkulasi _Mill Cost_ _(🚫 Out of Scope PWA)_

- **Akuisisi Data QC:** Koneksi/impor hasil prediksi instrumen FT-NIR (FOSS, Bruker, Perten, Buchi, Unity) dan laporan laboratorium eksternal (Eurofins, SGS, NutriControl, Nutrilab, LUFA-ITL) untuk air, lemak, protein, serat, abu, pati, dan mineral.
- **Kontrol Mutu 3 Tingkat & Sample Basket:** Evaluasi deviasi terhadap batas _Warning_, _Alarm_, dan _Error_; sampel lolos dikumpulkan ke _Sample Basket_ dengan _Moving Averages & Resampling_ untuk memperbarui **Overlay Ingredient** tanpa guncangan formula akibat _outlier_ tunggal.
- **Verifikasi & Eksekusi Timbangan Pabrik:**
  - Pengunci _"Optimize and Verify"_ wajib sebelum formula disimpan ke lini produksi.
  - Alokasi otomatis berdasarkan sensitivitas timbangan (_Major, Minor, Micro, Liquid, Hand-Add_)—khususnya mengalihkan bahan berinklusi `< 1%` (seperti _limestone_) ke timbangan mikro untuk mencegah _over-delivery_.
  - Kompensasi _free-fall_, panjang pulsa, _high-speed shutoff_, pelacakan lot _barcode/RFID_, pembuatan _Certificate of Analysis_ (CoA), dan perhitungan **Mill Cost** pasca-pembulatan/_ingredient splitting_ untuk dibandingkan langsung terhadap _Current Cost_.
- **Status / Rilis:** **🚫 Out of Scope PWA (`EN-04` / `ENT-03`)** — membutuhkan driver hardware pabrik/lab (PLC, FT-NIR, timbangan fisik, barcode/RFID) di luar sandbox browser offline.

#### `F-30` Automated Regulatory Labeling, Premix Explosion & VFD Carry-Over Compliance _(🚫 Out of Scope PWA)_

- **Pelabelan Otomatis:** _Premix Explosion_ rekursif lintas pabrik (mencari sub-resep ke _Premix Plant_ pusat bila tidak ada di pabrik lokal), pengurutan daftar bahan **menurun berdasarkan bobot pada basis air produk akhir** (sesuai EU Reg 767/2009, kode FEDIAF, & AAFCO), pencetakan _Guaranteed Analysis_, instruksi pakan, _barcode_, dan _Safety Data Sheet_ (SDS).
- **Kepatuhan Obat & VFD (FDA 21 CFR Part 225 / 558.6, EU Reg 2019/4 & 2019/6):**
  - Validasi aditif obat terhadap _Feed Additive Compendium_ (spesies target, dosis, kombinasi terlarang) serta perhitungan _withdrawal cascade_ ($1,5\times$ masa henti terpanjang, atau minimal 28 hari daging, 7 hari susu, 10 hari telur, 500 _degree-days_ akuatik).
  - **Hard Block Kontaminasi Silang:** Memblokir penjadwalan berurutan yang mematikan/ilegal (ionofor/monensin → pakan kuda, salinomisin → pengganti susu pedet, narasin + tiamulin → babi, VFD/masa henti → sapi perah betina >20 bulan atau pakan _finisher_ tanpa pembilasan).
  - **Sequencing & Flush Batch Audit:** Mewajibkan _Sequencing_ aman atau _Flushing_ 1%–10% kapasitas mixer (jagung giling ~600 mikron, gandum, kapur, sekam), mengarantina material hasil _flush_ ke lot khusus pakan berobat kompatibel, dan mencatat bukti audit cGMP.
- **Status / Rilis:** **🚫 Out of Scope PWA (`EN-05`)** — regulasi pakan obat lintas negara terus berubah (berisiko liabilitas hukum jika kedaluwarsa di aplikasi offline) serta bergantung pada penjadwalan lini mixer pabrik.

#### `F-31` Multi-Objective Sustainability & Environmental Footprint _(Evaluator Ringan Lanjut · 🚫 LCA Eksternal Out of Scope)_

- **Tujuan:** Meminimalkan biaya bersama dampak lingkungan ($\min (1-\omega)\sum c_j x_j + \omega \cdot \text{Environmental Impact}$) atau memasang kuota batas atas polutan dengan melaporkan _Marginal Abatement Cost / Shadow Price_ pengurangan polutan:
  - **Ekskresi N & P:** Prediksi ekskresi N tahunan (perbandingan _EU Nitrates Directive_, mis. pedet pra-sapih 7,1 kg/thn vs pasca-sapih 23,96 kg/thn) serta prediksi _Orthophosphate_ terlarut dari Total P ($\text{Ortho-P}_f = -2,447 + 0,966 \cdot \text{TP}$ dan $\text{Ortho-P}_m = -0,204 + 0,590 \cdot \text{TP}$).
  - **Emisi Metana Enterik** ($\text{eCH}_4$, g/hari): IPCC Tier 2 ($\text{eCH}_4 = \frac{\text{DMI} \times 18,5 \times Y_m}{55,65}$ dengan $Y_m = 3,0\%$ jika konsentrat $\ge 90\%$ dan $6,5\%$ jika $<90\%$) serta persamaan Escobar-Bahamondes et al. (2016) (_HF-MC_, _LF-MC_, _AL-OR_) dengan **pemilih persamaan otomatis** berdasarkan proporsi hijauan diet.
  - **Aditif Penekan Metana:** Pemodelan reduksi emisi (3-NOP / Bovaer ~30,6%, _essential oils_ ~13,5%, _Asparagopsis_ 51–67%) sambil memvalidasi batas RUFAL dan keamanan residu/bromoform.
- **Status / Rilis:** Evaluator aljabar ringan pasca-solve ($\text{eCH}_4$ / ekskresi N-P sederhana) dapat dilanjutkan sebagai kalkulator offline ✅ · Perluasan Pareto LCA dengan database GFLI/ECOALIM (`F-40` / `ML-04`) ditandai **🚫 Out of Scope PWA**.

---

### Modul F — Penyimpanan Offline, Portabilitas Resep, Ekspor & Ekosistem Developer

#### `F-32` Penyimpanan Lokal Offline (_IndexedDB Projects & Preferences_)

- **Tujuan:** Menyimpan katalog bahan, standar kebutuhan ternak, resep tersimpan, riwayat formulasi, dan preferensi pengguna secara persisten di **IndexedDB** (`idb`), disertai _Service Worker_ (`vite-plugin-pwa`) yang melakukan _precache_ aplikasi dan `highs.wasm` agar berjalan 100% tanpa jaringan di Desktop & Android.
- **Status / Rilis:** Fase 3 ✅ (`STG-01`, `STG-02`: IndexedDB `openformul-db` v1 di `src/storage/db.ts` + PWA offline `vite-plugin-pwa` precache `highs-*.wasm`).

#### `F-33` Resep Portabel & Reproduktif (`.feed.json`)

- **Tujuan:** Format file tunggal ber-`schemaVersion` yang memaketkan daftar bahan aktif/tidak aktif, harga custom (`priceOverride`), batas inklusi, target kebutuhan ternak, `FormulationConfig` (basis, mode 1–5, advance, batch, anti-nol, kunci manual), dan hasil `FormulationResult`, sehingga dapat diimpor ulang di perangkat lain dengan reproduksi hasil **100% identik**.
- **Aturan Wajib:** Validasi skema ketat di batas sistem (tolak `dryMatter <= 0` / `> 100`, harga negatif, `schemaVersion` tidak dikenal, atau tipe rusak).
- **Status / Rilis:** Fase 1 ✅ (dialog) → Fase 3 ✅ (`recipeTransfer.ts` + `validators.ts` & I/O penuh di `SavedRecipesPage`/`ExportDialog`).

#### `F-34` Ekspor Lembar Kerja (PDF / Excel `.xlsx` / CSV) & Paste TSV Spreadsheet

- **Tujuan:** Menghasilkan dokumen siap cetak/olah secara **100% client-side offline**:
  - **CSV & Excel (`.xlsx`):** komposisi %, berat batch (kg), rincian biaya, profil nutrien, dan analitik dual.
  - **PDF:** pilihan **Lembar Formula Lengkap** dan **Print Batch Only** (tanpa membocorkan analisis nutrisi rahasia ke lantai produksi).
  - **Paste TSV:** menempel langsung blok angka dari Excel/Google Sheets ke grid bahan Desktop dengan parser angka lokal Indonesia (koma/titik).
- **Status / Rilis:** Fase 1 ✅ (modal) → Fase 3 ✅ (`exportCsvXlsx.ts`, `exportPdf.ts`, `tsvPaste.ts`, `ingredientCsvImport.ts`).

#### `F-35` Decoupled Core Engine, Internasionalisasi (`ID / EN`), & UX Input Lokal

- **Decoupled Core Engine:** Seluruh logika optimasi dan konversi domain (`src/solver`, `src/utils`) bebas DOM/React agar dapat diuji unit secara terisolasi maupun dikemas ulang di Fase 4B sebagai paket CLI/library/API riset (Jupyter Notebook).
- **Internasionalisasi (`ID / EN`) & Tema (`Light / Dark`):** Switch bahasa antarmuka Bahasa Indonesia ↔ English dan Light/Dark mode.
- **Input Desimal Lokal & Windowing Progresif:** Mendukung tanda koma (`,`) dan titik (`.`) (`src/utils/locale-number.ts`) serta _windowing_ progresif ketika tabel memuat `> 50` hingga `300+` bahan baku maupun profil kebutuhan ternak.
- **Status / Rilis:** Parser angka lokal (Fase 1 ✅) · _windowing_ progresif `> 50` item (Fase 3 ✅) · Deploy PWA Desktop/Mobile & i18n penuh (Fase 4 🟨) → Paket `@openformul/core` (Fase 6 `EN-01` ⬜).

---

### Modul G — Fitur Baru & Penguatan Algoritma Industri (Riset Pasca-Audit · _Coming Soon_ di Menu Advance)

> Seluruh modul di bawah ini telah dipetakan ke menu **Modul Lanjutan (`AdvancedModulesPreview.tsx`)** sebagai katalog **Coming Soon** dengan penjelasan ramah pengguna, sementara spesifikasi matematis, algoritma solver HiGHS WASM, dan daftar 30 pustaka jurnal terverifikasinya tersimpan di [docs/advanced-feature-research-plan.md](advanced-feature-research-plan.md). Setelah **Audit Lingkup Offline-First PWA** (Bagian 3.3), modul-modul ini diklasifikasikan sebagai berikut:

- **`F-36` Optimasi Rasio Biaya/Nutrisi (`Charnes–Cooper Fractional LP`, Fase 4A `PR-03` — ✅ Lanjut Offline LP):** Meminimalkan biaya per Mcal energi atau per gram SID Lisin ($\min \frac{\sum c_j x_j}{\sum e_j x_j}$) via transformasi variabel linear $z_j = t x_j$, sekaligus melindungi penyebut rasio `0/0` dan menjalankan `dEB/DCAD` sebagai baris kendala aktif.
- **`F-37` Matriks Kompatibilitas Aditif & Beban Mikotoksin Kumulatif (Fase 5 `ML-03` — 🕒 Opsional Single-Mix MILP):** Pengunci biner MILP untuk melarang pasangan fatal (seperti ionofor–tiamulin atau koksidiostat bertabrakan) pada tahap formulasi, ditambah indeks akumulasi racun jamur lintas bahan ($\text{MTEI} \le 1{,}0$).
- **`F-38` _Cross-Formula Procurement Valuation Matrix_ & _Multi-Lot Silo Blending_ (Fase 6 `EN-02`, `EN-03` — 🚫 Out of Scope PWA):** Evaluasi penawaran pemasok secara serentak di seluruh formula pabrik plus optimasi pencampuran antar-lot bahan yang berbeda kualitas/kadar air sebelum kedaluwarsa _(memerlukan basis data server multi-user & blok MILP skala pabrik)_.
- **`F-39` Penjadwalan Batch Anti-Carryover (GLSP/ATSP) & Label Patuh SNI RI (Fase 6 `EN-05` — 🚫 Out of Scope PWA):** Optimasi urutan produksi batch guna meminimalkan limbah pembilasan (_flushing_) mixer disertai generator label regulasi **SNI / Permentan RI** selain EU Reg 767/2009 dan AAFCO/VFD _(memerlukan antrean mixer pabrik & pemeliharaan regulasi hukum dinamis)_.
- **`F-40` Ekosistem LCA _Cradle-to-Mill-Gate_ (GFLI/ECOALIM), Neraca N/P Monogastrik, & Pareto $\epsilon$-Constraint (Fase 5 `ML-04` — 🚫 Out of Scope PWA):** Perluasan `F-31` lintas unggas/babi/ruminansia dengan kurva trade-off biaya vs jejak karbon ($\text{CO}_2\text{-eq}$) dan kalkulasi _Marginal Abatement Cost_ eksplisit _(bergantung pada database LCA berlisensi komersial & di luar fokus biaya pakan harian)_.
- **`F-41` Loop Tertutup QC FT-NIR ($\hat{\sigma}\_{\text{EWMA}}$) & Penguatan Solver (`PR-01`, `PR-02`, `PR-04`, `PR-05`, `ML-01`, `EN-04`):**
  - **Diagnostik IIS & Priority Tiers (`PR-01` — ✅ Lanjut Offline LP):** _Chinneck Deletion Filter_ (1997) mengisolasi 2–3 kendala bentrok + larangan relaksasi Tier-0 toksin + Mode 5 Chebyshev $\epsilon$-Lexicographic.
  - **RHS Ranging & Degeneracy (`PR-02` — ✅ Lanjut Offline LP):** Ekstraksi validitas _shadow price_ $[b_i^{\text{down}}, b_i^{\text{up}}]$, peringatan _dual degeneracy_, dan tangga harga beli eksak.
  - **Stokastik SLP Lengkap (`PR-04` — ✅ Lanjut Offline SLP):** Kovarians ($\mathbf{x}^\top \Sigma^{(i)}\mathbf{x}$), varians ternak $\sigma_{b_i}^2$, batas _Cantelli_, & langkah redaman _Munford SLP_.
  - **Multi-Enzim Sub-Aditif & Hybrid CNCPS SLP (`PR-05` — ✅ Lanjut Offline LP/Evaluator):** Plafon Xilanase/Protease, faktor redaman gabungan pencegah _double-counting_, retensi termal peleting vs PPLA, serta evaluator CNCPS/DMI + $\text{peuNDF}_{240}$.
  - **MILP Pabrik (`ML-01` — 🕒 Opsional Single-Mix MILP):** Semi-continuous anti-nol ($L_j^{\text{prod}} y_j \le x_j \le U_j y_j$) & kelipatan kantong/timbangan untuk 1 formula tunggal.
  - **Loop EWMA FT-NIR (`EN-04` — 🚫 Out of Scope PWA):** Umpan balik $\hat{\sigma}_{\text{EWMA}}$ langsung dari instrumen lab/NIR pabrik ke matriks stokastik _(memerlukan integrasi hardware/LIMS pabrik)_.

---

## 5. Model Data & Kontrak State Sistem

Kontrak tipe kanonik didefinisikan secara ketat di [src/types/index.ts](../src/types/index.ts) (dengan `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`; dilarang `any` atau duplikasi tipe di luar `src/types/`).

| Tipe Utama                       | Field Kunci & Kontrak                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`Nutrient`**                   | `id`, `name`, `nameEn?`, `unit` (`% \| kcal/kg \| MJ/kg \| mg/kg \| IU/kg \| mEq/kg`), `tier?` (`basic \| amino_acid \| fiber_carb \| mineral_electrolyte \| anf_physical`), `isDigestibleVariant?`, `isCustom?`, `defaultBasis?`                                                                                                                                                                     |
| **`Ingredient`**                 | `id`, `name`, `nameEn?`, `category` (`energy \| protein \| mineral \| premix \| forage \| additive \| enzyme`), `pricePerKg`, `priceOverride?`, `dryMatter` `(0–100]`, `basis`, `isActive?`, `nutrients: Record<NutrientId, number \| null>`, `stdDev?`, `inclusion?`, `zeroInclusionRule?`, `groupId?`, `phytateP?`, `source` (wajib)                                                                |
| **`Requirement`**                | `id`, `name`, `nameEn?`, `species`, `phase?`, `basis`, `constraints: NutrientConstraint[]` (`min?`, `max?`, `isAdvance?`, `enabled?`, `idealTarget?`), `ratios?: RatioConstraint[]`, `ingredientGroups?: IngredientGroupConstraint[]`, `source?`                                                                                                                                                      |
| **`FormulationConfig`**          | `optimizationMode` (`1\|2\|3\|4\|5`), `activeBasis`, `batchSizeKg`, `enableAdvanceNutrients`, `enableDigestibleBasis`, `enableElasticFallback`, `globalZeroInclusion`, `manualLocks?`, `customNutrients?`                                                                                                                                                                                             |
| **`FormulationResult`**          | `status` (`optimal \| near_feasible \| infeasible \| error`), `basis`, `costPerKg` (`null` jika gagal), `batchTotalCost?`, `batchSizeKg?`, `composition` (`fraction`, `asFedFraction?`, `weightKg?`, `costContribution?`, `priceRange?`), `nutrients` (`value`, `status`, `deviation?`, `shadowPrice?`), `opportunityCosts?`, `boundDuals?`, `conflicts?`, `messages`, `solvedAt`                     |
| **`Recipe` & `UserPreferences`** | `Recipe` (`schemaVersion: 1`, `id`, `name`, `notes?`, `ingredients`, `requirement`, `config?`, `result`, `createdAt`, `updatedAt`); `UserPreferences` (`language`, `theme`, `themePalette?`, `themeModeSetting?`, `amoledPureBlack?`, `uiMode?`, `uiEnhancer?`, `renderingEngine?`, `motionEngine?`, `decimalPlaces?`, `tableViewTier?`, `defaultBasis`, `defaultBatchKg`, `zeroInclusionDefaultPct`) |

### Alur Eksekusi Optimasi (_Non-Blocking Worker Flow_)

1. Perubahan pada grid bahan, harga, target nutrien, atau mode optimasi memperbarui state UI serta persistensi **IndexedDB** (_debounced_ `200 ms`).
2. Hook orkestrasi melakukan _debounce_ (`120 ms`, `0 ms` saat inisialisasi) dan menerbitkan tiket / `requestId` unik.
3. Domain engine melakukan normalisasi basis (**As-Fed ↔ BK**), mendeteksi sel `null` pada nutrien _Advance_, dan menjalankan **Pre-Check**.
4. Jika lolos Pre-Check, model CPLEX LP dikirim via `postMessage` ke **Web Worker (`highs.worker.ts`)**; jika `infeasible` dan relaksasi elastik aktif, worker membangun serta menyelesaikan model relaksasi $\ell_1$.
5. Hasil dari worker diverifikasi pasca-solve terhadap seluruh batas dan $\sum x_i = 1$ dengan toleransi **`1e-6`**; respons dengan `requestId` usang dibuang.

---

## 6. Edge Cases & Aturan Anti-Bentrok Wajib

1. **Bentrok Konsep 5 Mode vs Mode Relaksasi (_Elastic Fallback_):** **5 Mode Optimasi** selalu berjalan sebagai bobot tujuan di setiap kalkulasi (feasible maupun near-feasible), sedangkan **Relaksasi Elastik** hanya menyala otomatis ketika masalah secara matematis _infeasible_ dan mengurangi total penalti dari biaya tampil agar harga pakan tetap akurat.
2. **Mode 5 (_Presisi Tinggi_) Dilarang Over-Dosing:** Tujuan Mode 5 bukan memaksimalkan angka nutrien ke tak hingga, melainkan meminimalkan deviasi absolut terhadap **target midpoint** dalam rentang aman $[b_k^{\min}, b_k^{\max}]$ tanpa dibatasi faktor harga.
3. **Nilai `0` vs `Null / N/A` pada Mode Advance:** Data kosong tidak boleh diperlakukan diam-diam sebagai `0` tanpa peringatan (`ADVANCE_NULL_DATA`); form database harus membedakan kolom kosong vs angka `0`.
4. **Aturan Anti-Nol Massal vs Bahan Mikro & Mode Hemat:** Peringatkan pengguna bila `(Jumlah Bahan Aktif × Min Otomatis) > 50%`, gunakan `min(autoMin, max)` agar bahan mikro (`premix`/`limestone` max `0,5%`) tidak menjadi infeasible sendiri, dan prioritaskan sakelar per-bahan.
5. **Pencampuran Basis As-Fed & BK (DM):** Semua bahan wajib dinormalisasi ke basis model aktif sebelum masuk matriks LP; hasil berbasis BK wajib menampilkan proporsi penimbangan **As-Fed** di kalkulator adukan.
6. **Validasi Batas Angka & Race Condition Worker:** Blokir solver jika `Min > Max`, nilai negatif, $\sum L_i > 1$, atau $\sum U_i < 1$; abaikan hasil worker dengan `requestId` usang; pulihkan worker HiGHS otomatis jika WASM crash.
7. **Kestabilan Persamaan Turunan & Kuadratik:** Nilai persamaan energi regresi dijepit di $\max(0, \text{Nilai})$; turunan kuadratik stokastik memakai regularisasi $\epsilon = 10^{-12}$; kurva respon enzim diverifikasi cekung (atau pakai pengunci biner MILP); polinomial pertumbuhan monogastrik dikunci dalam rentang kalibrasi biologis.
8. **Pemisahan Shadow Price vs Bound Duals & Keamanan Regulasi:** Jangan mencampur _dual_ batas bahan baku (_Bound Duals_) ke _Shadow Price_ nutrien; terapkan _hard block_ terhadap kontaminasi silang pakan berobat/VFD.

---

## 7. Struktur File Target & Peta Jalan Implementasi

### 7.1 Peta Fase Pengembangan & Status Saat Ini

| Fase        | Lingkup Task          | Fokus Deliverable                                                                                                                                                                                                                                                                                                                 | Status Saat Ini                                                                                                                                                                                                                                                                     |
| ----------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fase 1**  | `CORE-01` s/d `FE-10` | Scaffold Vite+React+TS+Tailwind, sistem desain Anti-Slop, skema tipe kanonik, parser angka lokal, Adaptive Layout Desktop & Mobile, seluruh layar UI interaktif dengan evaluator & dataset mock, unit/UI tests                                                                                                                    | **✅ Selesai** (prototype UI lengkap & lolos verifikasi)                                                                                                                                                                                                                            |
| **Fase 2**  | `ENG-01` s/d `ENG-08` | Konversi basis murni (`basis.ts`), persamaan dEB/DCAD & energi (`equations.ts`), pre-check (`precheck.ts`), LP builder 5 mode/rasio/grup/elastik (`buildModel.ts`), HiGHS WASM Web Worker, ekstraktor dual & verifikasi `1e-6` (`parseResult.ts`), integrasi UI live (`usePrototypeStore`)                                        | **✅ Selesai** (`src/solver/` + Web Worker HiGHS WASM aktif, benchmark manual & seluruh test solver/UI lulus)                                                                                                                                                                       |
| **Fase 3**  | `STG-01` s/d `OPT-02` | Penyimpanan IndexedDB (`db.ts`), Service Worker PWA offline penuh (`vite-plugin-pwa`), resep portabel `.feed.json` + validator, ekspor CSV/XLSX/PDF (_Full_ & _Batch Only_), Paste TSV, nutrien kustom penuh, windowing progresif >50 bahan/profil, pustaka penuh Hartadi 1980 (304) & Kearl 1982 (82) + NRC 1988 (24)            | **✅ Selesai** — IndexedDB, PWA (`highs-*.wasm` precache), `.feed.json`, CSV/XLSX/PDF, Paste TSV, nutrien kustom penuh (nama, satuan, basis dinamis), windowing progresif >50 item, & pustaka ruminansia lengkap + arsip `docs/references/` aktif; i18n penuh dilanjutkan di Fase 4 |
| **Fase 4**  | Deploy, PWA & i18n    | Deploy GitHub Pages + Bundel Portabel GitHub Releases, tombol instal PWA lintas Desktop & Mobile (`beforeinstallprompt`), halaman Modul Lanjutan (`AdvancedModulesPreview.tsx`), serta i18n penuh (`ID / EN` via `src/i18n/`)                                                                                                     | **✅ Selesai** — workflow GitHub Pages & Releases, `.exe` Tauri / `.apk` Capacitor, PWA offline, & kamus `ID / EN` aktif _(signing Store opsional saat publikasi toko aplikasi)_                                                                                                    |
| **Fase 4A** | `PR-01` s/d `PR-05`   | _Precision Core & SLP (Offline PWA):_ Minimal IIS _Deletion Filter_ + Priority Tiers, _RHS Validity Ranging_ & _Critical-Region Stepping_, _Charnes–Cooper / Dinkelbach Fractional LP_ & kendala aktif `dEB/DCAD`, Stokastik SLP (Munford & Cantelli), Multi-Enzim Sub-Aditif, & evaluator biologis rumen CNCPS/NASEM pasca-solve | **✅ Selesai (100% Offline HiGHS LP/SLP)** — terimplementasi di `src/solver/`, terhubung ke Workbench UI (`PrecisionEngineDialog`, `ShadowPriceTab`, `ResultsPanel`, `NutrientTargetsPanel`, `IngredientDetailSheet`) & lolos unit test `solver-pr01`–`pr05`                        |
| **Fase 5**  | `ML-01` s/d `ML-05`   | _Single-Mix Mill MILP vs Eco/NLP:_ `ML-01` (_semi-continuous_ & step timbangan), `ML-02` (_Moisture Shrink_ & PDI), `ML-03` (bentrok aditif & mikotoksin); sedangkan `ML-04` (Pareto LCA GFLI/ECOALIM) & `ML-05` (IOFC Gompertz/GA) ditandai keluar dari lingkup PWA                                                              | **🕒 `ML-01`–`ML-03` Opsional Single-Mix · 🚫 `ML-04`–`ML-05` Out of Scope PWA** (butuh database LCA komersial / solver NLP-GA di luar HiGHS WASM)                                                                                                                                  |
| **Fase 6**  | `EN-01` s/d `EN-05`   | _CLI Terpisah vs Enterprise Pabrik:_ `EN-01` (`@openformul/core` & crawler _build-time_ CLI terpisah); sedangkan `EN-02` (_Multi-Blend / Silo / Multi-Lot_), `EN-03` (_Procurement Matrix_), `EN-04` (FT-NIR EWMA), & `EN-05` (_Batch Sequencing_ & label regulasi) ditandai keluar dari lingkup PWA                              | **🔧 `EN-01` Dipisah ke CLI/NPM · 🚫 `EN-02`–`EN-05` Out of Scope PWA** (butuh server multi-user, hardware pabrik/FT-NIR, & regulasi hukum dinamis)                                                                                                                                 |

### 7.2 Rencana Struktur Modul Target (Fase 1–3 Penuh)

```text
OpenFormul/
├── README.md
├── docs/                              # prd.md (dokumen ini), DESIGN.md, anti-slop-design-direction.md, ROADMAP.md, architecture.md, data-schema.md, formulation-math.md
├── e2e/                               # Suite E2E Playwright opaque-box (run-e2e.mjs, lib/, tiers/) ✅
├── project-brief/                     # Dokumen sumber spesifikasi & analisis industri
├── src/
│   ├── types/index.ts                 # Kontrak tipe domain kanonik tunggal ✅
│   ├── data/                          # Sampel JSON, mock-state, hartadi-feeds (304), kearl-requirements (82 Kearl + 24 NRC) ✅
│   ├── utils/                         # locale-number.ts ✅, basis.ts ✅, equations.ts ✅, validators.ts ✅, ingredientCsvImport.ts ✅, tsvPaste.ts ✅, download.ts ✅
│   ├── solver/                        # precheck.ts, buildModel.ts, toLpString.ts, parseResult.ts, solveFormulation.ts, iis.ts, criticalStepping.ts, stochastic.ts, enzymes.ts, rumenEvaluator.ts, highs.worker.ts, solverClient.ts ✅
│   ├── storage/                       # db.ts IndexedDB ✅, recipeTransfer.ts .feed.json ✅, exportCsvXlsx.ts ✅, exportPdf.ts ✅
│   ├── i18n/                          # Kamus & helper terjemahan ID / EN penuh ✅
│   ├── hooks/                         # use-prototype-store.ts ✅, use-pwa-status.ts ✅
│   └── components/                    # layout/ ✅, ui/ ✅, formulation/ ✅, analytics/ ✅, database/ ✅, recipes/ ✅, settings/ ✅
└── tests/                             # basis-equations ✅, locale-number ✅, validators ✅, solver-model ✅, solver-highs ✅, solver-pr01..pr05 ✅, export-generators ✅, storage-db ✅, ui/* ✅
```

---

## 8. Acceptance Criteria Global (Definition of Done)

- [x] **(Fase 1)** Prototype antarmuka lengkap berfungsi di Desktop (`Sidebar` + `3-Panel Grid`) dan Mobile (`Bottom Nav` + `Drawer` + `3-Step Stepper` + `Card-Stack` + `Bottom Sheet`) tanpa _horizontal overflow_ di `375px` serta lolos `tsc --noEmit`, ESLint, Vitest, dan Vite build.
- [x] **(Fase 2)** Solver HiGHS WASM berjalan non-blocking di Web Worker untuk seluruh 5 Mode Optimasi, konversi BK ↔ As-Fed, rasio nutrien, Mode Advance (AA/NDF/ANF/SID/AvP), Anti-Nol, Relaksasi Elastik, dan Shadow Price; lolos verifikasi pasca-solve `< 1e-6` dan contoh manual 2 bahan (Jagung 67,61% + SBM 32,39%, Rp6.374/kg).
- [x] **(Fase 3)** PWA offline + IndexedDB + precache `highs-*.wasm`, `.feed.json`, ekspor CSV/XLSX/PDF _Full_ & _Batch Only_, impor CSV partial-merge, Paste TSV, nutrien kustom penuh (nama, satuan, basis dinamis), _windowing_ progresif `> 50` item, & pustaka penuh Hartadi 1980 (304) + Kearl 1982 (82) + NRC 1988 (24) beserta arsip `docs/references/` lulus uji.
- [x] **(Fase 4)** Aplikasi ter-deploy publik di GitHub Pages & GitHub Releases, dapat dipasang sebagai PWA offline di Desktop & Mobile, menu Modul Lanjutan aktif, dan kamus `ID / EN` (`src/i18n/`) lengkap.
- [x] **(Fase 4A)** Seluruh modul presisi offline (`PR-01`–`PR-05`) terimplementasi di engine LP/SLP HiGHS WASM & terintegrasi dengan antarmuka Workbench tanpa melanggar prinsip _offline-first_; sementara modul opsional `ML-01`–`ML-03`, CLI `EN-01`, dan fitur pabrik/server/non-linear (`ML-04`–`ML-05`, `EN-02`–`EN-05`) dipisahkan sesuai audit lingkup di [docs/advanced-feature-research-plan.md](advanced-feature-research-plan.md).
- [x] **(Dokumentasi)** Sinkronisasi [README.md](../README.md), [docs/ROADMAP.md](ROADMAP.md), [docs/prd.md](prd.md), dan folder [docs/](data-schema.md) diperbarui mengikuti status implementasi terkini sesuai `docs-sync-maintainer`.
