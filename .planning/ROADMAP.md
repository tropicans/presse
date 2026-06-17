# Roadmap - LLM Submission Analysis

Milestone goal: Mengintegrasikan LLM OpenAI-compatible di `https://sembilan.kelazz.my.id/v1` ke Admin Panel untuk melakukan analisis mendalam secara kualitatif dan kuantitatif terhadap data kiriman (*submissions*) pengguna dari Admin Panel secara terstruktur, asinkron, dan efisien.

---

## Phase 10: LLM API Integration & Schema Setup
Goal: Konfigurasi koneksi LLM, implementasi skema database, dan API Route endpoints.
Requirements: LLM-ANALYSIS-01, LLM-ANALYSIS-02, LLM-ANALYSIS-03, LLM-ANALYSIS-04

### Success Criteria
1. Variabel env (`LLM_API_KEY`, `LLM_MODEL`) terhubung dengan modul API OpenAI-compatible di `https://sembilan.kelazz.my.id/v1`.
2. Skema `FormAiAnalysis` ditambahkan ke basis data melalui Prisma migrate.
3. API handler `POST` dan `GET` di `/api/admin/forms/[id]/ai-analysis` berfungsi untuk memicu analisis manual dan menyimpan/mengambil hasilnya dari database.
4. Integrasi dengan data isian pengguna (teks bebas, Likert, kuis) teruji dan terformat dengan baik ke dalam prompt LLM.

---

## Phase 11: Frontend Integration & Markdown Rendering
Goal: Membuat antarmuka tab "Analisis AI" pada panel kiriman formulir.
Requirements: LLM-ANALYSIS-05

### Success Criteria
1. Rute detail kiriman (`/admin/forms/[id]/submissions`) memiliki tab/card baru "Analisis AI".
2. Hasil analisis Markdown dari database dapat di-render dengan visual terformat yang rapi dan responsif.
3. Tombol manual "Buat Analisis AI" memiliki feedback loading state (spinner/disabled button) saat API backend berjalan.
4. Metadata analisis (waktu generate, model, jumlah isian sampel yang dianalisis) ditampilkan secara transparan di UI.
