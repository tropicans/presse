# Requirements - Milestone v1.4

## Overview
Peningkatan visual dan ergonomi antarmuka pengguna pada suite Admin (`isian`) berdasarkan temuan UI Designer Audit.

## Milestone v1.4 Requirements

### Table Ergonomics & Readability (TABLE)
- [ ] **TABLE-01**: User dapat melihat header kolom tabel kiriman (`/admin/forms/[id]/submissions`) tetap mengambang di atas saat melakukan scroll vertikal (sticky header), dengan latar belakang solid yang adaptif pada light mode dan dark mode.

### Loading State Visual Experience (LOAD)
- [ ] **LOAD-01**: User disajikan animasi skeleton shimmer cards di halaman `/admin/forms` saat data formulir sedang dimuat, menggantikan spinner statis.
- [ ] **LOAD-02**: User disajikan animasi skeleton shimmer rows pada tabel `/admin/forms/[id]/submissions` saat data kiriman sedang di-fetch.

### Empty State Guidance & Aesthetics (EMPTY)
- [ ] **EMPTY-01**: User disajikan ilustrasi SVG minimalis dan tombol Call-to-Action "Buat Formulir Baru" di `/admin/forms` ketika belum ada formulir yang dibuat.
- [ ] **EMPTY-02**: User disajikan ilustrasi SVG minimalis dan pesan panduan informatif di `/admin/forms/[id]/submissions` ketika belum ada kiriman jawaban yang masuk.

## Future Requirements
- **EXPORT-01**: Kustomisasi kolom yang diekspor ke Excel secara dinamis melalui dialog modal.
- **ANALYTICS-01**: Visualisasi grafik interaktif (pie chart & bar chart) untuk jawaban pilihan ganda.

## Out of Scope
- Penambahan pustaka animasi JS berat pihak ketiga (tetap menggunakan Vanilla CSS murni).
- Perubahan skema basis data PostgreSQL.

## Traceability
| Requirement | Phase | Status |
|-------------|-------|--------|
| TABLE-01    | Phase 12 | Planned |
| LOAD-01     | Phase 12 | Planned |
| LOAD-02     | Phase 12 | Planned |
| EMPTY-01    | Phase 13 | Planned |
| EMPTY-02    | Phase 13 | Planned |

---
*Requirements frozen for Milestone v1.4*
