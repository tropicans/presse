import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import FormDescription from './FormDescription'

describe('FormDescription Component', () => {
  it('renders fallback when description is null or empty', () => {
    const htmlNull = renderToString(
      <FormDescription description={null} fallback="Deskripsi kosong" />
    )
    expect(htmlNull).toContain('Deskripsi kosong')
    expect(htmlNull).toContain('form-description-fallback')

    const htmlEmpty = renderToString(
      <FormDescription description="" fallback="Isi form dengan benar" />
    )
    expect(htmlEmpty).toContain('Isi form dengan benar')
  })

  it('renders paragraphs and inline bold text', () => {
    const html = renderToString(
      <FormDescription description="Halo **peserta**, selamat datang." />
    )
    expect(html).toContain('form-description-paragraph')
    expect(html).toContain('<strong class="form-description-bold">peserta</strong>')
  })

  it('renders unordered list with bullet dots and proper items', () => {
    const text = `Ketentuan:
- Syarat 1
- Syarat 2`
    const html = renderToString(<FormDescription description={text} />)
    expect(html).toContain('form-description-list form-description-unordered')
    expect(html).toContain('form-description-bullet')
    expect(html).toContain('Syarat 1')
    expect(html).toContain('Syarat 2')
  })

  it('renders ordered list with numbers', () => {
    const text = `Petunjuk:
1. Daftar akun
2. Konfirmasi email`
    const html = renderToString(<FormDescription description={text} />)
    expect(html).toContain('form-description-list form-description-ordered')
    expect(html).toContain('form-description-number')
    expect(html).toContain('1.')
    expect(html).toContain('Daftar akun')
  })

  it('renders the user e-sport KORPRI description with lists and paragraphs beautifully', () => {
    const text = `Formulir ini digunakan untuk pendaftaran seleksi internal cabang e-sport KORPRI bagi ASN di lingkungan Satker Sekretariat Kementerian dan Kedeputian.

Sebelum mengisi formulir, siapkan NIP, unit organisasi, nomor WhatsApp aktif, nickname, serta User ID akun game. Khusus Mobile Legends, sertakan Zone/Server.

Ketentuan pendaftaran:
- Mobile Legends: dapat mendaftar sebagai individu atau tim beranggotakan 2–6 orang. Susunan tim lengkap terdiri atas 5 pemain inti dan maksimal 1 pemain cadangan.
- eFootball: dapat mendaftar sebagai individu atau tim. Tim lengkap terdiri atas 2 pemain.
- Pendaftar individu atau tim yang belum lengkap akan dibantu dalam proses pencocokan anggota oleh panitia.
- Pembentukan atau pelengkapan tim bergantung pada ketersediaan peserta dan tidak dapat dijamin.
- Jika sampai batas waktu yang ditentukan tim belum terbentuk atau jumlah pemain belum memenuhi ketentuan, peserta tidak dapat mengikuti pertandingan.

Pendaftaran dibuka sampai 19 Oktober 2026.`

    const html = renderToString(
      <FormDescription description={text} variant="public" />
    )

    // Verify it has the public variant class
    expect(html).toContain('form-description-public')
    // Verify paragraphs
    expect(html).toContain('Ketentuan pendaftaran:')
    expect(html).toContain('Pendaftaran dibuka sampai 19 Oktober 2026.')
    // Verify unordered list
    expect(html).toContain('form-description-unordered')
    expect(html).toContain('Mobile Legends: dapat mendaftar sebagai individu')
    expect(html).toContain('eFootball: dapat mendaftar sebagai individu')
    expect(html).toContain('tidak dapat mengikuti pertandingan.')
  })
})
