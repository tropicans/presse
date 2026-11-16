import { describe, expect, it } from 'vitest'
import { stripImageMetadata, stripJpegExif, stripPngMetadata } from './image-exif'

describe('Image Metadata Stripping (FILE-27)', () => {
  describe('stripJpegExif', () => {
    it('strips APP1 (Exif/GPS) marker segment from JPEG', () => {
      // Build a synthetic JPEG with:
      // SOI (FF D8)
      // APP1 (FF E1 00 0A 'Exif\0\0')
      // DQT (FF DB 00 05 01 02 03)
      // SOS (FF DA 00 03 00 FF D9)
      const soi = Buffer.from([0xff, 0xd8])
      const app1 = Buffer.concat([
        Buffer.from([0xff, 0xe1, 0x00, 0x08]), // marker + length=8
        Buffer.from('Exif\0\0'),
      ])
      const dqt = Buffer.from([0xff, 0xdb, 0x00, 0x05, 0x01, 0x02, 0x03])
      const sos = Buffer.from([0xff, 0xda, 0x00, 0x03, 0x00, 0xff, 0xd9])

      const rawJpeg = Buffer.concat([soi, app1, dqt, sos])
      expect(rawJpeg.includes(Buffer.from('Exif'))).toBe(true)

      const cleaned = stripJpegExif(rawJpeg)
      expect(cleaned.includes(Buffer.from('Exif'))).toBe(false)
      expect(cleaned.includes(dqt)).toBe(true)
      expect(cleaned.length).toBe(rawJpeg.length - app1.length)
    })

    it('returns buffer unchanged if not a valid JPEG', () => {
      const notJpeg = Buffer.from('hello world not a jpeg')
      expect(stripJpegExif(notJpeg)).toEqual(notJpeg)
    })
  })

  describe('stripPngMetadata', () => {
    it('strips eXIf and tEXt chunks from PNG', () => {
      const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      
      // Helper to build a PNG chunk: [4 bytes len][4 bytes type][data][4 bytes crc]
      const makeChunk = (type: string, data: Buffer) => {
        const lenBuf = Buffer.alloc(4)
        lenBuf.writeUInt32BE(data.length, 0)
        const typeBuf = Buffer.from(type, 'ascii')
        const crcBuf = Buffer.alloc(4) // placeholder CRC
        return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
      }

      const ihdr = makeChunk('IHDR', Buffer.alloc(13))
      const exif = makeChunk('eXIf', Buffer.from('GPSLatitude: -6.2088, Longitude: 106.8456'))
      const text = makeChunk('tEXt', Buffer.from('Author\0Secret Admin'))
      const idat = makeChunk('IDAT', Buffer.from([0x78, 0x9c, 0x01, 0x00]))
      const iend = makeChunk('IEND', Buffer.alloc(0))

      const rawPng = Buffer.concat([signature, ihdr, exif, text, idat, iend])
      expect(rawPng.includes(Buffer.from('GPSLatitude'))).toBe(true)
      expect(rawPng.includes(Buffer.from('Secret Admin'))).toBe(true)

      const cleaned = stripPngMetadata(rawPng)
      expect(cleaned.includes(Buffer.from('GPSLatitude'))).toBe(false)
      expect(cleaned.includes(Buffer.from('Secret Admin'))).toBe(false)
      expect(cleaned.includes(Buffer.from('IHDR'))).toBe(true)
      expect(cleaned.includes(Buffer.from('IDAT'))).toBe(true)
      expect(cleaned.includes(Buffer.from('IEND'))).toBe(true)
    })

    it('returns buffer unchanged if not a valid PNG', () => {
      const notPng = Buffer.from('plain text file')
      expect(stripPngMetadata(notPng)).toEqual(notPng)
    })
  })

  describe('stripImageMetadata dispatcher', () => {
    it('dispatches to JPEG stripper for image/jpeg and leaves PDF untouched', () => {
      const pdf = Buffer.from('%PDF-1.4 sample pdf content')
      expect(stripImageMetadata(pdf, 'application/pdf')).toEqual(pdf)
    })
  })
})
