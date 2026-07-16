# Requirements: LLM Submission Analysis

**Defined:** 2026-06-17
**Core Value:** Mengintegrasikan kecerdasan buatan (LLM OpenAI-compatible) untuk membantu administrator menganalisis pola kualitatif dan kuantitatif dari kiriman pengguna (saran, keluhan, korelasi nilai, sentimen) langsung dari Admin Panel secara terstruktur dan efisien.

## v1.3 Requirements (LLM Submission Analysis)

### API Connection & Config
- [x] **LLM-ANALYSIS-01**: Konfigurasi koneksi LLM OpenAI-compatible di `https://sembilan.kelazz.my.id/v1` dengan autentikasi API Key (`LLM_API_KEY`) dan nama model (`LLM_MODEL`) melalui berkas env.

### Data Storage Schema
- [x] **LLM-ANALYSIS-02**: Skema model database `FormAiAnalysis` (menggunakan Prisma migrate) untuk menyimpan teks analisis (Markdown), jumlah data yang dianalisis, nama model, dan timestamp pembaruan terakhir.

### Backend Endpoints
- [x] **LLM-ANALYSIS-03**: Handler API `POST /api/admin/forms/[id]/ai-analysis` yang mengumpulkan data kiriman, memformat prompt analisis kualitatif/kuantitatif, memanggil LLM, dan memperbarui database.
- [x] **LLM-ANALYSIS-04**: Handler API `GET /api/admin/forms/[id]/ai-analysis` untuk mengambil data analisis terakhir.

### Frontend Integration
- [x] **LLM-ANALYSIS-05**: Tab/Card baru "Analisis AI" pada rute `/admin/forms/[id]/submissions` yang menampilkan Markdown hasil analisis, ringkasan metadata sampel, dan tombol interaktif "Buat Analisis AI" dengan status loading spinner.

## Out of Scope
- Analisis otomatis di background worker setiap kali ada kiriman baru (dibatasi pemicuan tombol manual saja).
- Grafik interaktif AI visual di luar rendering HTML Markdown terformat.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LLM-ANALYSIS-01 | Phase 10 | Active |
| LLM-ANALYSIS-02 | Phase 10 | Active |
| LLM-ANALYSIS-03 | Phase 10 | Active |
| LLM-ANALYSIS-04 | Phase 10 | Active |
| LLM-ANALYSIS-05 | Phase 11 | Active |

---
*Requirements defined: 2026-06-17*
*Last updated: 2026-06-17*
