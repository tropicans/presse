# Requirements: Milestone v1.9 Interactive Analytics & Submission Data Visualization

**Milestone:** v1.9  
**Status:** In Progress (2026-09-27)  
**Goal:** Membangun antarmuka analitik interaktif yang menyajikan ringkasan KPI data respon formulir/kuis, visualisasi tren harian menggunakan grafik arsitektural, diagram distribusi jawaban per pertanyaan (pilihan, Likert, kuis), serta filter lanjutan dalam estetika Editorial Minimalist Monochrome.

## Requirements

### Analytics UI & Visualization Architecture

- [ ] **ANLY-01**: **Editorial Analytics Dashboard Shell & Metrics Overview** — Merancang rute `/admin/forms/[id]/analytics` dengan judul Playfair Display, pembatas garis arsitektural 4px, dan kartu metrik KPI (Total Respon, Tingkat Selesai, Rata-rata Skor Kuis, Respon Terakhir) dalam tipografi monospace JetBrains Mono bersiku 0px.
- [ ] **ANLY-02**: **Monochrome Daily Volume Timeline Chart** — Menampilkan visualisasi volume pengiriman harian (SVG/CSS bar chart) tanpa rounded corners, dengan garis kisi hairline, sumbu numerik monospace, dan tooltip interaktif kontras tinggi.
- [ ] **ANLY-03**: **Question Response Distribution Breakdown** — Menyajikan breakdown distribusi frekuensi dan persentase untuk setiap jenis pertanyaan (pilihan ganda, kuis benar/salah, skala Likert) menggunakan meter bar horizontal monokrom dengan penanda opsi benar.
- [ ] **ANLY-04**: **Advanced Interactive Filter Suite** — Menyediakan filter rentang tanggal (7 hari, 30 hari, bulan ini, kustom), filter tipe partisipan (semua, internal, eksternal), dan filter pencarian teks yang langsung memperbarui visualisasi analitik secara reaktif.

### Backend Data Aggregation & Verification

- [ ] **ANLY-05**: **Server-Side Submission Aggregation API** — Mengimplementasikan endpoint `GET /api/admin/forms/[id]/analytics` yang melakukan agregasi performan tinggi di PostgreSQL (`prisma.$queryRaw`) untuk menghitung metrik, distribusi opsi, dan time-series tanpa membebani memori server.
- [ ] **ANLY-06**: **Multi-Tier Quality Assurance & Container Up** — Memvalidasi seluruh fungsionalitas analitik dengan automated unit test (Vitest), ESLint, TypeScript compiler, Next.js standalone build, dan Docker containerization.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ANLY-01 | Phase 28 | Planned |
| ANLY-02 | Phase 28 | Planned |
| ANLY-03 | Phase 28 | Planned |
| ANLY-04 | Phase 28 | Planned |
| ANLY-05 | Phase 29 | Planned |
| ANLY-06 | Phase 30 | Planned |

---

*Milestone initiated: 2026-09-27*
