# Form (Himpun) — Comprehensive UI Review (Overall)

**Audited:** 2026-10-06  
**Scope:** Full Application Frontend (Public Form, Admin Portal, Theme Engine, Form Builder, Preview & Live Runtimes)  
**Baseline:** Editorial Minimalist Monochrome Design System & WCAG 2.1 AA Accessibility Standards  
**Screenshots:** Captured (`.planning/ui-reviews/public-form-desktop.png`, `public-form-mobile.png`, `admin-login-desktop.png`, `admin-login-dark.png`)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Konsistensi bahasa Indonesia baku, instruksi jelas di setiap field dan langkah |
| 2. Visuals | 4/4 | Komposisi editorial monokrom yang elegan dengan logo resmi dan hierarki visual tegas |
| 3. Color | 4/4 | Kontras dark & light mode tinggi, perbaikan tuntas pada kontras opsi dropdown/radio |
| 4. Typography | 4/4 | Paduan proporsional Playfair Display (judul), Inter (isi form), dan JetBrains Mono (data/langkah) |
| 5. Spacing | 4/4 | Skala token spasi modular (--space-1 s.d. --space-8) konsisten di desktop dan mobile |
| 6. Experience Design | 3/4 | Alur multi-langkah dan validasi sangat solid; perlu penyempurnaan deteksi prefers-color-scheme OS |

**Overall: 23/24**

---

## Top Priority Fixes & Enhancements

1. **Sinkronisasi Deteksi Tema Awal OS (`prefers-color-scheme`)** — *Experience Design / Color*  
   - **Masalah:** Pada `src/app/layout.tsx` dan `src/components/ThemeToggle.tsx`, pembacaan tema pertama kali membidik fallback statis `'dark'` tanpa mengecek nilai boolean `systemPrefersDark`. Pengguna yang memiliki OS mode terang secara bawaan langsung dipaksa ke mode gelap pada kunjungan pertama sebelum manual toggle.  
   - **Solusi:** Setel fallback tema baru ke: `const theme = (storedTheme === 'dark' || storedTheme === 'light') ? storedTheme : (systemPrefersDark ? 'dark' : 'light')`.

2. **Hilangkan Fokus Otomatis Ring pada Field Radio Langkah Pertama Saat Mount** — *Visuals / Interaction*  
   - **Masalah:** Saat formulir publik dibuka di langkah 0, efek `focusStepField` langsung menembakkan `.focus()` ke radio input pertama (`Internal`), memicu outline fokus putih (`outline: 2px solid var(--primary-900)`). Hal ini dapat membuat pengguna mengira opsi tersebut telah terpilih secara tidak sengaja.  
   - **Solusi:** Batasi autofocus hanya ketika navigasi langkah terjadi (`currentStepIndex > 0`), atau gunakan `:focus-visible` yang hanya aktif melalui interaksi tombol keyboard (Tab/Arrow keys).

3. **Indikator Status Pilihan Terpilih Radio di Mode Gelap** — *Visuals*  
   - **Masalah:** Kotak indikator kustom radio (`.radio-custom`) pada state belum terpilih memiliki outline tipis yang sangat halus di latar belakang hitam.  
   - **Solusi:** Berikan kontras border default sebesar `rgba(255, 255, 255, 0.25)` pada mode gelap untuk memperjelas area klik radio bagi pengguna layar beresolusi rendah.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)
- **Label dan Instruksi:** Semua label formulir (`Tipe Peserta`, `Nama Lengkap`, `NIP/NRP`, `Jabatan`, `Unit Kerja`, `Sebagai`, `Tanda Tangan`) menggunakan tata bahasa Indonesia resmi instansi pemerintah.
- **Pesan Bantuan & Validasi:** Teks bantuan (`Pilih salah satu opsi yang sesuai.`, `Gambar tanda tangan langsung, atau ketik nama...`) informatif dan ringkas tanpa jargon teknis.
- **Pesan Validasi Error:** Error bersifat deskriptif langsung menyebutkan subjek, misal `Nama Lengkap wajib diisi` atau validasi format NIP/NRP 18 digit angka.
- **Halaman Login & Admin:** Copywriting di halaman login (`Masuk ke admin dengan Google`, `Akses terbatas khusus personel terotorisasi`) memberikan impresi enterprise yang aman dan terpercaya.

### Pillar 2: Visuals (4/4)
- **Komposisi Editorial:** Format kartu form mengadopsi nuansa editorial modern yang bersih (border ganda minimalis, sudut kartu terdefinisi tegas, tanpa efek glow yang berlebihan).
- **Brand Consistency:** Lambang Garuda Pancasila dan logo Form terintegrasi secara profesional di header kartu formulir.
- **Step Navigation Indicator:** Desain progres bar monokrom dengan badge monospace (`LANGKAH 01 / 02`) memberikan umpan balik posisi yang instan bagi responden.

### Pillar 3: Color & Contrast (4/4)
- **Perbaikan Kontras Opsi Pilihan:** Opsi dropdown (`SearchableSelect`) dan skala Likert kini sepenuhnya memiliki rasio kontras teks terang (`#f4f4f6`) di atas background gelap (`#13161a` / `#1c2026`), menyelesaikan isu pilihan tak terlihat di mode gelap.
- **Dukungan Dual-Theme:** Mode terang dan mode gelap memiliki padanan warna semantik yang simetris, tidak ada warna artefak teal/cyan yang tertinggal.
- **State Hover & Active:** State aktif pada tombol submit dan item pilihan memiliki transisi lembut dengan kontras warna pembeda yang jelas.

### Pillar 4: Typography (4/4)
- **Kombinasi Tipografi:**
  - `Playfair Display`: Digunakan untuk judul formulir utama, menciptakan identitas dokumen resmi yang berwibawa.
  - `Inter`: Digunakan untuk semua label, input, tombol tindakan, dan body copy untuk kenyamanan membaca optimal.
  - `JetBrains Mono`: Digunakan untuk nomor langkah, badge status, dan NIP/NRP untuk kepastian visual karakter numerik.
- **Skala Ukuran Huruf:** Menggunakan variabel semantik (`0.8125rem` untuk keterangan kecil, `0.95rem` untuk kontrol input, `1.5rem` - `2rem` untuk judul).

### Pillar 5: Spacing (4/4)
- **Skala Spasi:** Seluruh komponen menggunakan sistem token `--space-*` (4px, 8px, 12px, 16px, 24px, 32px).
- **Kerapian Layout:** Jarak vertikal antar-kelompok input konsisten di 20px, dengan jarak label ke input 8px.
- **Responsif:** Grid radio tombol otomatis menyesuaikan kolom di layar lebar desktop dan berganti menjadi susunan vertikal yang rapi di layar ponsel (< 640px).

### Pillar 6: Experience Design (3/4)
- **Pengisian Cepat & Mudah:** Alur percabangan cerdas (webinar branching dan conditional route) menyembunyikan input yang tidak relevan secara dinamis.
- **Tanda Tangan Digital:** Dukungan ganda canvas gambar tangan langsung dan tanda tangan teks ketik dengan live signature preview sangat mempermudah peserta di perangkat tanpa stylus/touchscreen.
- **Deteksi Preferensi Sistem:** Perlu sedikit penyesuaian agar tema bawaan pertama kali mengikuti preferensi gelap/terang OS pengguna secara otomatis sebelum ada aksi simpan di `localStorage`.

---

## Files Audited
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/components/AttendanceForm.tsx`
- `src/components/PublicFormShell.tsx`
- `src/components/SearchableSelect.tsx`
- `src/components/SignaturePad.tsx`
- `src/components/ThemeToggle.tsx`
- `src/components/AdminFormEditor.tsx`
- `src/components/AdminFormPreview.tsx`
- `src/app/admin/login/page.tsx`
