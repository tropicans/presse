import { describe, it, expect } from 'vitest'
import { parseDescriptionBlocks } from './form-description'

describe('parseDescriptionBlocks', () => {
  it('handles null or empty strings gracefully', () => {
    expect(parseDescriptionBlocks(null)).toEqual([])
    expect(parseDescriptionBlocks('')).toEqual([])
    expect(parseDescriptionBlocks('   \n  \n ')).toEqual([])
  })

  it('parses single paragraph', () => {
    const blocks = parseDescriptionBlocks('Halo selamat datang di formulir ini.')
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toEqual({
      type: 'paragraph',
      text: 'Halo selamat datang di formulir ini.',
    })
  })

  it('parses multiple paragraphs separated by blank lines or newlines', () => {
    const raw = `Paragraf pertama.
Masih paragraf pertama baris dua.

Paragraf kedua.`
    const blocks = parseDescriptionBlocks(raw)
    expect(blocks).toHaveLength(2)
    expect(blocks[0].type).toBe('paragraph')
    expect(blocks[1].type).toBe('paragraph')
  })

  it('parses unordered lists with - or * or bullet dots', () => {
    const raw = `Ketentuan:
- Item satu
- Item dua
* Item tiga
• Item empat`
    const blocks = parseDescriptionBlocks(raw)
    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toEqual({
      type: 'paragraph',
      text: 'Ketentuan:',
    })
    expect(blocks[1]).toEqual({
      type: 'unordered-list',
      items: ['Item satu', 'Item dua', 'Item tiga', 'Item empat'],
    })
  })

  it('parses ordered lists with numbers', () => {
    const raw = `Langkah pendaftaran:
1. Isi identitas
2. Upload berkas
3. Kirim formulir`
    const blocks = parseDescriptionBlocks(raw)
    expect(blocks).toHaveLength(2)
    expect(blocks[0].type).toBe('paragraph')
    expect(blocks[1]).toEqual({
      type: 'ordered-list',
      items: [
        { number: '1', text: 'Isi identitas' },
        { number: '2', text: 'Upload berkas' },
        { number: '3', text: 'Kirim formulir' },
      ],
    })
  })

  it('correctly parses user e-sport KORPRI description structure', () => {
    const sample = `Formulir ini digunakan untuk pendaftaran seleksi internal cabang e-sport KORPRI bagi ASN di lingkungan Satker Sekretariat Kementerian dan Kedeputian.

Sebelum mengisi formulir, siapkan NIP, unit organisasi, nomor WhatsApp aktif, nickname, serta User ID akun game. Khusus Mobile Legends, sertakan Zone/Server.

Ketentuan pendaftaran:
- Mobile Legends: dapat mendaftar sebagai individu atau tim beranggotakan 2–6 orang. Susunan tim lengkap terdiri atas 5 pemain inti dan maksimal 1 pemain cadangan.
- eFootball: dapat mendaftar sebagai individu atau tim. Tim lengkap terdiri atas 2 pemain.
- Pendaftar individu atau tim yang belum lengkap akan dibantu dalam proses pencocokan anggota oleh panitia.
- Pembentukan atau pelengkapan tim bergantung pada ketersediaan peserta dan tidak dapat dijamin.
- Jika sampai batas waktu yang ditentukan tim belum terbentuk atau jumlah pemain belum memenuhi ketentuan, peserta tidak dapat mengikuti pertandingan.

Pendaftaran dibuka sampai 19 Oktober 2026.`

    const blocks = parseDescriptionBlocks(sample)
    expect(blocks.length).toBeGreaterThanOrEqual(4)
    
    // Check paragraphs
    expect(blocks[0].type).toBe('paragraph')
    expect(blocks[1].type).toBe('paragraph')
    expect(blocks[2].type).toBe('paragraph')
    if (blocks[2].type === 'paragraph') {
      expect(blocks[2].text).toBe('Ketentuan pendaftaran:')
    }

    // Check list
    expect(blocks[3].type).toBe('unordered-list')
    if (blocks[3].type === 'unordered-list') {
      expect(blocks[3].items).toHaveLength(5)
      expect(blocks[3].items[0]).toContain('Mobile Legends:')
      expect(blocks[3].items[1]).toContain('eFootball:')
      expect(blocks[3].items[4]).toContain('tidak dapat mengikuti pertandingan')
    }

    // Check footer
    const lastBlock = blocks[blocks.length - 1]
    expect(lastBlock.type).toBe('paragraph')
    if (lastBlock.type === 'paragraph') {
      expect(lastBlock.text).toBe('Pendaftaran dibuka sampai 19 Oktober 2026.')
    }
  })
})
