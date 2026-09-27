export function sanitizeNipNrp(value: string): string {
  return value.replace(/[\s.-]/g, '')
}

export function isNipNrpField(field: { name: string; label?: string }): boolean {
  if (field.name === 'nipNrp') return true
  const normLabel = (field.label ?? '').trim().toLowerCase()
  return normLabel === 'nip' || normLabel === 'nrp' || normLabel === 'nip/nrp'
}

export function validateNipNrp(value: string): string | null {
  const sanitized = sanitizeNipNrp(value)
  if (!sanitized) {
    return null
  }
  if (!/^\d+$/.test(sanitized)) {
    return 'NIP/NRP hanya boleh berisi angka'
  }
  if (sanitized.length < 5) {
    return 'NIP/NRP terlalu pendek (minimal 5 digit)'
  }
  if (sanitized.length > 8 && sanitized.length < 18) {
    return 'NIP harus 18 digit angka, atau NRP 5-8 digit angka'
  }
  if (sanitized.length > 18) {
    return 'NIP/NRP maksimal 18 digit angka'
  }
  return null
}
