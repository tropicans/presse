# UI Design Contract: Submission Analytics Dashboard & Distribution Visualization UI

**Phase**: 28  
**Milestone**: v1.9 — Interactive Analytics & Submission Data Visualization  
**Target Routes**: `/admin/forms/[id]/analytics` (or analytics view in `/admin/forms/[id]/submissions`)  
**Design Paradigm**: Minimalist Monochrome (Editorial Luxury & Architectural Precision)  

---

## 1. Overview & Objectives

### 1.1 Purpose
Menyediakan antarmuka analitik interaktif berbasis web untuk menvisualisasikan data respon formulir dan kuis secara komprehensif, cepat, dan mudah dipahami oleh administrator tanpa perlu mengekspor ke spreadsheet eksternal.

### 1.2 Target Personas
- **Form Administrator / Event Organizer**: Memerlukan ikhtisar cepat tentang total pendaftar, rasio kehadiran, tren waktu pengisian, dan distribusi demografi instansi/peserta.
- **Assessor / Trainer**: Memerlukan evaluasi hasil kuis, distribusi skor (nilai rata-rata, median, pertanyaan tersulit/termudah), dan sebaran jawaban per opsi.

### 1.3 Key User Stories
1. Sebagai admin, saya dapat melihat kartu metrik ringkasan (Total Kiriman, Tingkat Penyelesaian, Rata-rata Skor Kuis, Waktu Respon Terakhir) dalam format editorial bernilai visual tinggi.
2. Sebagai admin, saya dapat memfilter data analitik berdasarkan rentang tanggal, jenis partisipan (Internal vs Eksternal), atau kata kunci dengan visualisasi yang langsung bereaksi.
3. Sebagai admin, saya dapat melihat diagram distribusi jawaban (persentase dan frekuensi) untuk setiap pertanyaan pilihan ganda, Likert, atau skala penilaian menggunakan representasi bar monokrom arsitektural.
4. Sebagai admin, saya dapat beralih antara Mode Terang dan Mode Gelap dengan kontras biner sempurna tanpa distorsi grafik.

---

## 2. Design System Tokens & Editorial Constraints

Desain ini secara ketat mematuhi spesifikasi **Milestone v1.8 Editorial Minimalist Monochrome**:

| Element | Specification | Rationale |
|---------|---------------|-----------|
| **Headlines Typography** | `Playfair Display`, serif, 700, tracking -0.02em | Memberikan otoritas editorial elegan pada judul dasbor & nama metrik utama |
| **Body Typography** | `Source Serif 4`, serif, 400/600 | Keterbacaan optimal pada label pertanyaan dan deskripsi analitik |
| **Data & Metrics Typography** | `JetBrains Mono`, monospace, 700/800 | Presisi numerik mutlak pada angka metrik, persentase, tanggal, dan ID |
| **Border Radius** | `0px` (*Strict Zero-Radius Architecture*) | Seluruh kartu grafis, filter bar, button, dan meter bar bersudut siku 90 derajat |
| **Drop Shadows** | `none` | Zero ambient blur; batas ruang dibangun lewat kontras garis |
| **Line Hierarchy** | Hairline `1px`, Medium `2px`, Heavy `4px`, Ultra `8px` | Garis arsitektural padat untuk memisahkan tabel, chart bars, dan divider |
| **Color Palette** | Pure Monochrome (`#000000`, `#ffffff`, `#525252`, `#e5e5e5`) | Bebas warna aksen; penekanan visual menggunakan inversi biner hitam/putih |

---

## 3. Layout Architecture & Component Hierarchy

### 3.1 Page Structure (`/admin/forms/[id]/analytics`)

```
+-----------------------------------------------------------------------------------+
|  [< Kembali ke Daftar Form]                     [Lihat Jawaban] [Export CSV]     |
|                                                                                   |
|  P E N D A F T A R A N   S E M I N A R   N A S I O N A L                          |
|  Analitik Data & Distribusi Respon                                                |
|  ===============================================================================  | (4px heavy rule)
|                                                                                   |
|  [ Rentang Tanggal: 7 Hari Terakhir v ]  [ Tipe: Semua v ]  [ Cari Jawaban... ]  |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +--------------------+  +--------------------+  +--------------------+  +------+ |
|  | TOTAL RESPONS      |  | TINGKAT SELESAI    |  | RATA-RATA SKOR     |  | ...  | |
|  | 1,248              |  | 98.4%              |  | 84.5 / 100         |  | ...  | |
|  | +124 hari ini      |  | 1,228 selesai      |  | Tertinggi: 100     |  | ...  | |
|  +--------------------+  +--------------------+  +--------------------+  +------+ |
|                                                                                   |
|  +------------------------------------------------------------------------------+ |
|  | TREN PENGIRIMAN HARIAN                                            [7H] [30H] | |
|  |                                                                              | |
|  | 150 |           |                                                            | |
|  | 100 |     |     |     |           |                                          | |
|  |  50 |  |  |  |  |  |  |  |  |  |  |  |  |                                    | |
|  |   0 +--+--+--+--+--+--+--+--+--+--+--+--+--                                  | |
|  |      Sen Sel Rab Kam Jum Sab Min                                             | |
|  +------------------------------------------------------------------------------+ |
|                                                                                   |
|  D I S T R I B U S I   P E R T A N Y A A N                                        |
|  -------------------------------------------------------------------------------  | (2px rule)
|                                                                                   |
|  +------------------------------------------------------------------------------+ |
|  | Pertanyaan 01: Sesi Materi yang Paling Bermanfaat               (Pilihan)    | |
|  |                                                                              | |
|  | Arsitektur Sistem Berkinerja Tinggi (542 suara - 43.4%)                      | |
|  | [████████████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]     | |
|  |                                                                              | |
|  | Keamanan Data & Privasi Pengguna (398 suara - 31.8%)                         | |
|  | [██████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]     | |
|  |                                                                              | |
|  | Desain Minimalis & Tipografi (308 suara - 24.8%)                             | |
|  | [████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]     | |
|  +------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------+
```

---

## 4. Component Details & Interactive Behavior

### 4.1 Filter Bar Suite (`.analytics-filterbar`)
- **Container**: `display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; padding: 16px; border: 2px solid var(--border-default); background: var(--bg-surface);`
- **Date Range Selector**: Dropdown bersudut siku 0px (`7 Hari Terakhir`, `30 Hari Terakhir`, `Bulan Ini`, `Semua Waktu`).
- **Participant Filter**: Tombol toggle biner (`Semua`, `Internal`, `Eksternal`) dengan status aktif terinversi hitam pekat.
- **Search Query Input**: `input[type="text"]` dengan border 2px solid, monospace placeholder, dan auto-clear button.

### 4.2 KPI Summary Cards (`.analytics-metric-grid`)
- **Grid**: `display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 32px;`
- **Card**:
  - `border: 2px solid var(--border-default);`
  - `background: var(--bg-surface);`
  - `padding: 24px;`
  - `transition: transform 0.1s ease, border-color 0.1s ease;`
  - Hover: `border-color: var(--text-primary);`
- **Label**: Monospace uppercase tracking `0.14em`, font-size `0.72rem`, text-muted.
- **Number**: Playfair Display / JetBrains Mono, font-size `2.25rem`, font-weight `700`, text-primary.
- **Trend/Context**: Monospace, font-size `0.75rem`, text-muted dengan border-top 1px hairline.

### 4.3 Daily Submission Volume Chart (`.analytics-volume-chart`)
- **Rendering**: Pure SVG / CSS architectural bar chart.
- **Bars**: Kotak siku tanpa border-radius, background `var(--text-primary)`, hover inversion (hitam -> outline 2px).
- **Y-Axis & X-Axis**: Monospace ticks (`0, 25, 50, 75, 100+`), hairline grid lines (`1px dashed var(--border-default)`).
- **Tooltip**: Monospace box hitam dengan teks putih siku 0px menampilkan tanggal dan jumlah respon tepat di atas bar saat hover.

### 4.4 Question Response Distribution Breakdown (`.analytics-question-card`)
- **Header**:
  - Question index: Monospace `[ Q01 ]` atau `[ Q02 ]`.
  - Question title: Playfair Display / Source Serif 4, 1.15rem, font-weight `700`.
  - Type indicator chip: Monospace uppercase `[ PILIHAN TUNGGAL ]`, `[ SKALA LIKERT ]`, `[ KUIS ]`.
- **Distribution Row**:
  - Label & Statistics: `display: flex; justify-content: space-between; font-family: var(--font-family-mono); font-size: 0.85rem; font-weight: 700;`
  - Progress Bar Shell: `height: 12px; border: 1px solid var(--border-default); background: var(--bg-surface);`
  - Progress Fill: `height: 100%; background: var(--text-primary); transition: width 0.3s ease;`
- **Quiz Specific**:
  - Menandai opsi jawaban yang benar dengan badge monospace `[ BENAR ]` berinversi biner.

---

## 5. Responsive Design & Viewport Breakpoints

| Breakpoint | Layout Adjustments |
|------------|-------------------|
| **Desktop (> 1024px)** | Grid 4 kolom metrik, chart volume penuh, 2 kolom perbandingan opsi |
| **Tablet (768px - 1023px)** | Grid 2 kolom metrik, scroll horizontal halus pada filter bar |
| **Mobile (< 768px)** | 1 kolom tumpuk metrik, bar chart dengan scroll horizontal, ukuran label menyesuaikan |

---

## 6. Accessibility & Contrast Verification (WCAG 2.1 AA)

1. **Color Contrast**:
   - Light Mode: `#000000` di atas `#ffffff` (Rasio Kontras 21:1, melampaui standar AAA 7:1).
   - Dark Mode: `#ffffff` di atas `#000000` (Rasio Kontras 21:1).
   - Secondary Text: `#525252` di atas `#ffffff` (Rasio Kontras 7.2:1, memenuhi AAA).
2. **Keyboard Focus**:
   - `button:focus-visible`, `select:focus-visible`, `input:focus-visible` memiliki outline 2px solid kontras tinggi dengan `outline-offset: 2px`.
3. **Screen Readers**:
   - Seluruh bar chart SVG dan progress meter dilengkapi atribut `role="meter"`, `aria-valuenow`, `aria-valuemin="0"`, dan `aria-valuemax="100"`.

---

## 7. Delivery & Verification Plan

- **Step 1**: Buat komponen `src/components/admin/FormAnalyticsView.tsx` dan route `/admin/forms/[id]/analytics`.
- **Step 2**: Tambahkan endpoint agregasi statistik backend `GET /api/admin/forms/[id]/analytics`.
- **Step 3**: Tambahkan CSS styling khusus analitik di `src/app/globals.css`.
- **Step 4**: Tambahkan automated unit tests untuk agregasi data dan render komponen di `src/components/admin/FormAnalyticsView.test.tsx`.
