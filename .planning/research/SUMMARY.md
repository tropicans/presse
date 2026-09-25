# Research Synthesis: Admin Form Builder UX & Scalability Enhancement

**Domain:** Admin Form Editor (isian)
**Completed:** 2026-09-25

## Executive Summary

Admin Form Editor saat ini memiliki kendala skalabilitas visual yang signifikan: ketika formulir memiliki lebih dari 10–15 pertanyaan (seperti pada survei evaluasi atau kuis presensi panjang), seluruh field ditampilkan dalam bentuk kartu vertikal yang sepenuhnya terbuka (expanded) dalam satu daftar flat tanpa pemisahan langkah yang jelas. Hal ini menyebabkan admin harus melakukan scroll vertikal tanpa akhir dan kesulitan mengatur atau meninjau struktur form.

Riset teknis menunjukkan bahwa masalah ini dapat diselesaikan secara elegan tanpa dependensi eksternal baru, dengan mengandalkan React 19 hooks dan Vanilla CSS design system yang sudah ada di `src/app/globals.css`.

## Key Findings by Dimension

### 1. Technology Stack (`STACK.md`)
- **No external JS libraries needed:** Hindari pustaka drag-and-drop berat (`@dnd-kit`, `react-beautiful-dnd`) atau animasi berat (`framer-motion`).
- **Native Web APIs:** Gunakan native CSS smooth scrolling (`scrollIntoView`), CSS Grid/Flexbox untuk responsive layout, dan `crypto.randomUUID()` untuk kloning identitas field.
- **Design Tokens:** Maksimalkan class utilities dan custom properties di `src/app/globals.css`.

### 2. Feature Landscape (`FEATURES.md`)
- **Table Stakes:**
  - Navigasi Tab Langkah (Step Tabs) dengan filter per langkah dan opsi "Semua Langkah".
  - Kartu field collapsible / akordeon dengan status ringkasan pada header kartu.
  - Aksi duplikasi field 1-klik (`Duplicate`).
  - Penambahan field baru langsung ke langkah yang sedang aktif.
  - Tombol aksi massal: "Buka Semua" (Expand All) dan "Tutup Semua" (Collapse All).
- **Differentiators:**
  - Panel samping Outline / Quick Jump untuk melihat hierarki pertanyaan dan melompat langsung ke field tertentu dengan auto-expand dan auto-scroll.
  - Quick field reordering and step reassignment.
- **Anti-Features:**
  - Drag-and-drop kanvas kompleks yang mengorbankan input focus dan responsivitas layar sentuh.

### 3. Architecture (`ARCHITECTURE.md`)
- **State Additions:** `activeStepId` (string: `'all'` | `page.id`), `expandedFieldIds` (`Set<string>`), `showOutline` (`boolean`), `outlineSearch` (`string`).
- **Presentational Separation:** Data form tetap berada pada single source of truth (`form` state), sementara tab filter dan status collapse/expand hanya mengontrol proyeksi tampilan.
- **Safe Indexing:** Reordering dan insertion memperhitungkan posisi absolut di `form.fields` tanpa merusak keterkaitan step.

### 4. Pitfalls & Watch-outs (`PITFALLS.md`)
- **Reordering Index Corruption:** Perhitungan `moveField` harus akurat pada scope filtered vs global.
- **Event Bubbling on Card Toggle:** Header klik untuk toggle accordion harus memisahkan klik pada tombol aksi (Up, Down, Duplicate, Delete) dengan `event.stopPropagation()`.
- **Step Deletion Fallback:** Menghapus langkah aktif harus secara otomatis memulihkan `activeStepId` ke `'all'` atau langkah pertama.
- **Render Performance:** Kartu yang tertutup (collapsed) hanya merender DOM ringkas untuk mempertahankan rendering 60fps bahkan pada 50+ field.

---

*Synthesis complete: 2026-09-25*
