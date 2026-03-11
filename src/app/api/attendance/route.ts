import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const VALID_SEBAGAI = ['Penguji', 'Coach', 'Mentor']
const MAX_TEXT_LENGTH = 500
const MAX_SIGNATURE_LENGTH = 500000 // ~375KB base64 PNG

// Rate limit: 5 submissions per minute per IP (generous for 700 users)
const POST_RATE_LIMIT = { limit: 5, windowMs: 60_000 }
// Rate limit: 30 reads per minute per IP
const GET_RATE_LIMIT = { limit: 30, windowMs: 60_000 }

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request.headers)
    const rl = rateLimit(`post:${ip}`, POST_RATE_LIMIT)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(POST_RATE_LIMIT.limit),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    const body = await request.json()
    const { namaLengkap, nipNrp, jabatan, unitKerja, sebagai, signature } = body

    // Validation: required fields
    if (!namaLengkap || !nipNrp || !jabatan || !unitKerja || !sebagai || !signature) {
      return NextResponse.json(
        { error: 'Semua field wajib diisi termasuk tanda tangan' },
        { status: 400 }
      )
    }

    // Validation: type checks
    if (
      typeof namaLengkap !== 'string' ||
      typeof nipNrp !== 'string' ||
      typeof jabatan !== 'string' ||
      typeof unitKerja !== 'string' ||
      typeof sebagai !== 'string' ||
      typeof signature !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Format data tidak valid' },
        { status: 400 }
      )
    }

    // Validation: length limits
    if (
      namaLengkap.length > MAX_TEXT_LENGTH ||
      nipNrp.length > 50 ||
      jabatan.length > MAX_TEXT_LENGTH ||
      unitKerja.length > MAX_TEXT_LENGTH
    ) {
      return NextResponse.json(
        { error: 'Data melebihi batas panjang yang diizinkan' },
        { status: 400 }
      )
    }

    // Validation: signature size
    if (signature.length > MAX_SIGNATURE_LENGTH) {
      return NextResponse.json(
        { error: 'Ukuran tanda tangan terlalu besar' },
        { status: 400 }
      )
    }

    // Validation: sebagai value
    if (!VALID_SEBAGAI.includes(sebagai)) {
      return NextResponse.json(
        { error: 'Nilai "Sebagai" tidak valid' },
        { status: 400 }
      )
    }

    // Validation: signature format
    if (!signature.startsWith('data:image/png;base64,')) {
      return NextResponse.json(
        { error: 'Format tanda tangan tidak valid' },
        { status: 400 }
      )
    }

    // Sanitize: trim whitespace
    const sanitized = {
      namaLengkap: namaLengkap.trim(),
      nipNrp: nipNrp.trim(),
      jabatan: jabatan.trim(),
      unitKerja: unitKerja.trim(),
      sebagai,
      signature,
    }

    // Check duplicate NIP/NRP
    const existing = await prisma.attendance.findUnique({
      where: { nipNrp: sanitized.nipNrp },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'NIP/NRP sudah terdaftar. Anda sudah mengisi daftar hadir.' },
        { status: 409 }
      )
    }

    // Create attendance record
    const attendance = await prisma.attendance.create({
      data: sanitized,
    })

    return NextResponse.json(
      { message: 'Daftar hadir berhasil disimpan', id: attendance.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating attendance:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}

// GET - Admin only (requires auth + rate limited)
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Rate limiting
    const ip = getClientIp(request.headers)
    const rl = rateLimit(`get:${ip}`, GET_RATE_LIMIT)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          },
        }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
    const skip = (page - 1) * limit

    const where = search
      ? {
          OR: [
            { namaLengkap: { contains: search, mode: 'insensitive' as const } },
            { nipNrp: { contains: search, mode: 'insensitive' as const } },
            { unitKerja: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const [attendances, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          namaLengkap: true,
          nipNrp: true,
          jabatan: true,
          unitKerja: true,
          sebagai: true,
          signature: true,
          createdAt: true,
        },
      }),
      prisma.attendance.count({ where }),
    ])

    return NextResponse.json({
      data: attendances,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching attendances:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// DELETE - Admin only
export async function DELETE(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: 'ID tidak valid' },
        { status: 400 }
      )
    }

    await prisma.attendance.delete({
      where: { id: Number(id) },
    })

    return NextResponse.json({ message: 'Data berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting attendance:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus data' },
      { status: 500 }
    )
  }
}
