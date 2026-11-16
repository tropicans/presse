/**
 * Lightweight, zero-dependency, memory-safe image metadata stripper.
 * Strips EXIF, GPS, camera metadata, and comments from JPEG and PNG buffers
 * without re-encoding the compressed pixel stream.
 */

export function stripJpegExif(buffer: Buffer): Buffer {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return buffer
  }

  const chunks: Buffer[] = [Buffer.from([0xff, 0xd8])]
  let offset = 2

  while (offset < buffer.length - 1) {
    if (buffer[offset] !== 0xff) {
      // Non-marker byte encountered unexpectedly; return original buffer safely
      return buffer
    }

    const marker = buffer[offset + 1]

    // Standalone markers without payload length:
    // RST0..RST7 (0xD0..0xD7), TEM (0x01), SOI (0xD8)
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      chunks.push(buffer.subarray(offset, offset + 2))
      offset += 2
      continue
    }

    // SOS (Start of Scan - 0xDA): Image bitstream begins here, copy all remaining bytes
    if (marker === 0xda) {
      chunks.push(buffer.subarray(offset))
      break
    }

    // EOI (End of Image - 0xD9)
    if (marker === 0xd9) {
      chunks.push(buffer.subarray(offset, offset + 2))
      break
    }

    // Check bounds for segment length
    if (offset + 4 > buffer.length) {
      return buffer
    }

    const length = buffer.readUInt16BE(offset + 2)
    if (length < 2 || offset + 2 + length > buffer.length) {
      return buffer
    }

    // APP1 (0xE1: Exif, XMP, GPS) or COM (0xFE: Comments)
    if (marker === 0xe1 || marker === 0xfe) {
      // Skip this metadata segment completely
      offset += 2 + length
      continue
    }

    // Preserve other structural markers (e.g. APP0 JFIF, DQT, DHT, SOF0)
    chunks.push(buffer.subarray(offset, offset + 2 + length))
    offset += 2 + length
  }

  return Buffer.concat(chunks)
}

export function stripPngMetadata(buffer: Buffer): Buffer {
  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return buffer
  }

  const chunks: Buffer[] = [PNG_SIGNATURE]
  let offset = 8

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const chunkType = buffer.toString('ascii', offset + 4, offset + 8)
    const totalChunkLength = 4 + 4 + length + 4 // length + type + data + crc

    if (offset + totalChunkLength > buffer.length) {
      return buffer
    }

    // Strip metadata chunks: eXIf (Exif), tEXt / zTXt / iTXt (text comments and annotations)
    if (['eXIf', 'tEXt', 'zTXt', 'iTXt'].includes(chunkType)) {
      offset += totalChunkLength
      continue
    }

    chunks.push(buffer.subarray(offset, offset + totalChunkLength))
    offset += totalChunkLength

    if (chunkType === 'IEND') {
      break
    }
  }

  return Buffer.concat(chunks)
}

export function stripImageMetadata(buffer: Buffer, mime: string): Buffer {
  if (mime === 'image/jpeg') {
    return stripJpegExif(buffer)
  }
  if (mime === 'image/png') {
    return stripPngMetadata(buffer)
  }
  return buffer
}
