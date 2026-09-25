# Requirements: Milestone v1.5 Admin Form Builder UX & Scalability Enhancement

**Milestone:** v1.5
**Status:** In Progress
**Goal:** Memodernisasi UI & UX Admin Form Editor agar pengelolaan formulir dengan puluhan field menjadi ringkas, terstruktur per langkah, cepat dinavigasi, dan nyaman disunting tanpa scroll vertikal yang melelahkan.

## Requirements

### Step-Based Navigation & Organization

- [ ] **BUILDER-01**: User dapat memfilter tampilan daftar field berdasarkan Langkah tertentu melalui bilah tab (Step Tabs: Langkah 1, 2, ..., n) atau menampilkan "Semua Langkah" dalam satu klik.
- [ ] **BUILDER-02**: Bilah tab langkah menampilkan indikator jumlah field (badge count) pada setiap tab dan memberikan indikasi visual jika suatu langkah masih kosong.

### Collapsible Field Cards & Information Density

- [ ] **BUILDER-03**: User dapat melipat (collapse) dan membuka (expand) setiap kartu field secara individual dengan mengklik header kartu, dengan isolasi event agar tombol aksi tidak memicu toggle tak sengaja.
- [ ] **BUILDER-04**: Header kartu field yang tertutup (collapsed) menyajikan ringkasan padat dan informatif (nomor urut, label pertanyaan, pill tipe field, badge wajib diisi, dan jumlah opsi/poin kuis).
- [ ] **BUILDER-05**: User dapat melakukan aksi kontrol massal melalui tombol "Buka Semua" (Expand All) dan "Tutup Semua" (Collapse All) untuk mempermudah audit keseluruhan form.

### Outline & Quick Jump Navigation

- [ ] **BUILDER-06**: User dapat mengakses panel samping Outline (peta navigasi formulir) yang menampilkan struktur hierarki langkah dan daftar seluruh pertanyaan secara ringkas.
- [ ] **BUILDER-07**: Mengklik salah satu pertanyaan pada panel Outline secara mulus menggulirkan viewport (`scrollIntoView`), mengalihkan tab langkah aktif bila perlu, dan membuka (auto-expand) kartu field target.

### Fast Actions & Editing Velocity

- [ ] **BUILDER-08**: User dapat menduplikasi field yang ada dalam 1 klik melalui tombol aksi "Duplikasi" pada kartu field, menghasilkan salinan field beserta seluruh konfigurasi dan opsinya pada langkah yang sama.
- [ ] **BUILDER-09**: Menambahkan field baru melalui tombol toolbar tipe field secara otomatis menempatkan field baru ke dalam langkah yang sedang aktif saat ini.
- [ ] **BUILDER-10**: Editor menyediakan sticky action header & toolbar yang menjaga status penyimpanan auto-save, tombol Simpan/Batalkan, dan tombol navigasi tetap berada di jangkauan pengguna saat scrolling.

## Future Requirements (Deferred)

- **BUILDER-F01**: Drag-and-drop kanvas interaktif untuk menggeser kartu field dengan pointer gesture (dievaluasi setelah navigasi tombol stabil).
- **BUILDER-F02**: Pemindahan field massal (bulk move) antar langkah form.
- **BUILDER-F03**: Penyimpanan template section / blok pertanyaan siap pakai untuk dimasukkan berulang kali.

## Out of Scope

- Perubahan pada skema basis data PostgreSQL atau model Prisma (struktur `pages` dan `fields` yang ada sudah menampung seluruh metadata).
- Penggunaan library drag-and-drop pihak ketiga yang menambah ukuran bundle atau merusak event touch pada browser seluler/tablet.
- Perubahan pada alur pengisian formulir di sisi publik (`/f/[slug]`).

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUILDER-01 | Phase 14 | Planned |
| BUILDER-02 | Phase 14 | Planned |
| BUILDER-03 | Phase 15 | Planned |
| BUILDER-04 | Phase 15 | Planned |
| BUILDER-05 | Phase 15 | Planned |
| BUILDER-06 | Phase 16 | Planned |
| BUILDER-07 | Phase 16 | Planned |
| BUILDER-08 | Phase 16 | Planned |
| BUILDER-09 | Phase 14 | Planned |
| BUILDER-10 | Phase 16 | Planned |

---

*Requirements defined: 2026-09-25*
