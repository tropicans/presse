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

export function isEmailField(field: { name: string; label?: string }): boolean {
  const name = field.name.toLowerCase()
  const label = (field.label ?? '').toLowerCase()
  return name.includes('email') || name.includes('surel') || label.includes('email') || label.includes('surel')
}

export function sanitizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function validateEmail(value: string): string | null {
  const clean = sanitizeEmail(value)
  if (!clean) return null
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  if (!emailRegex.test(clean)) {
    return 'Format email tidak valid (contoh: nama@domain.com)'
  }
  return null
}

export function isPhoneField(field: { name: string; label?: string }): boolean {
  const name = field.name.toLowerCase()
  const label = (field.label ?? '').toLowerCase()
  return (
    name.includes('telepon') ||
    name.includes('telp') ||
    name.includes('whatsapp') ||
    name.includes('phone') ||
    name.includes('nohp') ||
    name.includes('no_hp') ||
    label.includes('telepon') ||
    label.includes('telp') ||
    label.includes('whatsapp') ||
    label.includes('wa') ||
    label.includes('no hp') ||
    label.includes('no. hp') ||
    label.includes('handphone') ||
    label.includes('kontak')
  )
}

export function sanitizePhoneNumber(value: string): string {
  let clean = value.replace(/[\s().-]/g, '')
  if (clean.startsWith('+62')) {
    clean = '0' + clean.slice(3)
  } else if (clean.startsWith('62') && clean.length >= 11) {
    clean = '0' + clean.slice(2)
  }
  return clean
}

export function validatePhoneNumber(value: string): string | null {
  const clean = sanitizePhoneNumber(value)
  if (!clean) return null
  if (!/^\d+$/.test(clean)) {
    return 'Nomor telepon/WhatsApp hanya boleh berisi angka'
  }
  if (clean.length < 10) {
    return 'Nomor telepon/WhatsApp terlalu pendek (minimal 10 digit)'
  }
  if (clean.length > 15) {
    return 'Nomor telepon/WhatsApp maksimal 15 digit'
  }
  return null
}

export function isNameField(field: { name: string; label?: string }): boolean {
  const name = field.name.toLowerCase()
  const label = (field.label ?? '').toLowerCase()
  return (
    name === 'namalengkap' ||
    name === 'name' ||
    label.includes('nama lengkap') ||
    label.includes('nama peserta')
  )
}

export function sanitizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function validateName(value: string): string | null {
  const clean = sanitizeName(value)
  if (!clean) return null
  if (clean.length < 2) {
    return 'Nama lengkap minimal 2 karakter'
  }
  if (/[<>{}[\]\\;/]/.test(clean)) {
    return 'Nama lengkap mengandung karakter yang tidak diizinkan'
  }
  return null
}

export function validateSignatureValue(value: string): string | null {
  const clean = value.trim()
  if (!clean) return null
  if (!clean.startsWith('data:image/png;base64,')) {
    return 'Format tanda tangan tidak valid'
  }
  const base64Content = clean.slice('data:image/png;base64,'.length)
  if (!base64Content) {
    return 'Tanda tangan tidak boleh kosong'
  }
  return null
}

export function getFieldInputMode(field: { name: string; label?: string }): 'numeric' | 'email' | 'tel' | undefined {
  if (isNipNrpField(field)) return 'numeric'
  if (isEmailField(field)) return 'email'
  if (isPhoneField(field)) return 'tel'
  return undefined
}

export function getFieldFormatHint(field: { name: string; label?: string }): string | null {
  if (isNipNrpField(field)) {
    return '18 digit angka untuk NIP ASN atau 5–8 digit untuk NRP TNI/Polri (tanpa spasi).'
  }
  if (isEmailField(field)) {
    return 'Masukkan alamat email aktif (contoh: nama@domain.com).'
  }
  if (isPhoneField(field)) {
    return 'Nomor WhatsApp/telepon aktif (10-15 digit angka).'
  }
  return null
}
