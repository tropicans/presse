# Phase 10: LLM API Integration & Schema Setup - Context

**Gathered:** 2026-07-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Konfigurasi koneksi LLM (OpenAI-compatible), implementasi skema database `FormAiAnalysis`, serta pembuatan backend API Route endpoints (`POST` & `GET` `/api/admin/forms/[id]/ai-analysis`) untuk memicu dan mengambil hasil analisis.

</domain>

<decisions>
## Implementation Decisions

### LLM Configuration & Fallbacks
- **D-01:** Pengaturan koneksi LLM bersifat wajib dan global melalui file environment (.env). Variabel `LLM_API_KEY`, `LLM_API_BASE`, dan `LLM_MODEL` harus didefinisikan secara lengkap. Proses akan langsung error jika konfigurasi environment ini tidak lengkap (Strict Environment Variables).
- **D-02:** Penanganan kesalahan (timeouts, rate limits, API errors) menggunakan pendekatan fail-fast. Error akan langsung di-bubble up ke klien sebagai HTTP 500 tanpa menyimpan data kosong/gagal ke dalam database (Fail-Fast & Return Error).
- **D-03:** Tidak menyediakan endpoint uji konektivitas khusus (connection test). Uji konektivitas dilakukan secara inline ketika analisis dijalankan.
- **D-04:** Parameter generasi model seperti `temperature` di-hardcode dengan nilai `0.3` di level kode untuk menjaga konsistensi dan objektivitas hasil analisis.

### Prompt Customization vs Static Prompts
- **D-05:** Template prompt bersifat statis di level kode menggunakan fungsi `buildPrompt()` di `src/lib/ai-analysis.ts`, yang saat ini sudah dioptimalkan untuk analisis kepuasan dan riset UX kepegawaian berbahasa Indonesia.
- **D-06:** Menggunakan satu template prompt adaptif tunggal (Single General-Purpose Template) yang secara otomatis mendeteksi dan menggabungkan data kuis, data pilihan, dan jawaban teks bebas jika tersedia.
- **D-07:** Hasil Markdown dari LLM akan di-render apa adanya (Render As-Is) secara fleksibel pada frontend menggunakan renderer Markdown standar tanpa melakukan pemecahan parsial (parsing headers).
- **D-08:** Hasil analisis AI ditargetkan dalam Bahasa Indonesia yang formal dan profesional (Strict Indonesian Response) sesuai dengan gaya penulisan UI copy aplikasi.

### Token Limits & Submission Sampling
- **D-09:** Jumlah sampel kiriman (submissions) dibatasi maksimal 1000 data kiriman terbaru (Hard Limit & Most Recent) demi mencegah pembengkakan token dan biaya API.
- **D-10:** Untuk tipe data kualitatif (teks bebas), data jawaban dibatasi maksimal 50 isian per pertanyaan (Static Sample of 50) yang dikirim ke LLM.
- **D-11:** Tidak menerapkan batas minimum jumlah kiriman (Allow any count > 0) agar fitur bisa diuji sejak data pertama, dengan menyajikan peringatan ukuran sampel rendah di sisi UI.
- **D-12:** Kolom bertipe `yes_no` wajib ditangani sebagai pilihan (Choice Field) dalam fungsi pembantu `isChoiceField` agar dianalisis sebagai persentase distribusi frekuensi (misal: "Yes: 80%, No: 20%") alih-alih dilisting sebagai baris teks jawaban mentah.

### the agent's Discretion
- Developer memiliki kebebasan penuh dalam penanganan error logging internal dan penataan struktur kode API handler Next.js.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database Schema
- `prisma/schema.prisma` — Skema basis data relasional form, submissions, dan form_ai_analyses.

### AI Domain Logic
- `src/lib/ai-analysis.ts` — Logika pre-aggregations, pembangunan prompt, pemanggilan API LLM, dan operasi database Upsert.

### API Routes
- `src/app/api/admin/forms/[id]/ai-analysis/route.ts` — Endpoint GET dan POST handler admin untuk memproses analisis AI.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/ai-analysis.ts`:
  - `preAggregateSubmissions(formId)`: Melakukan pengelompokan data pilihan dan data kualitatif.
  - `buildPrompt(aggregated)`: Menyusun prompt analisis detail ke LLM.
  - `callLlmApi(prompt)`: Helper method yang mengirim fetch call ke endpoint OpenAI-compatible.
  - `generateAndSaveFormAiAnalysis(formId)`: Fungsi utama orkestrasi analisis AI yang memicu pre-aggregate, LLM call, dan saving database.

### Established Patterns
- **API Security:** Setiap rute admin memanggil `getAdminSession()` dari `src/lib/auth.ts` untuk memastikan hanya admin terdaftar yang dapat memicu atau memanggil endpoint.
- **Response Format:** Endpoint Next.js mengembalikan `NextResponse.json` terstandar dengan error handling yang rapi.

### Integration Points
- `/api/admin/forms/[id]/ai-analysis` terintegrasi dengan tabel `form_ai_analyses` di database PostgreSQL.

</code_context>

<specifics>
## Specific Ideas
- Selama diskusi, disepakati bahwa kolom bertipe `yes_no` harus dimasukkan ke dalam fungsi `isChoiceField()` agar hasilnya dapat dikelompokkan dengan baik oleh LLM.

</specifics>

<deferred>
## Deferred Ideas
- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-LLM API Integration & Schema Setup*
*Context gathered: 2026-07-16*
