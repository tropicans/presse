import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { createAttendanceSubmission, FormSubmissionError } from '@/lib/forms'

// Rate limit: 5 submissions per minute per IP (generous for 700 users)
const POST_RATE_LIMIT = { limit: 5, windowMs: 60_000 }
// Rate limit: 30 reads per minute per IP
const GET_RATE_LIMIT = { limit: 30, windowMs: 60_000 }

export async function POST(request: NextRequest) {
  try {
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
    const result = await createAttendanceSubmission(body)

    return NextResponse.json(
      result,
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof FormSubmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

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
    const idParam = searchParams.get('id')

    if (!idParam) {
      return NextResponse.json(
        { error: 'ID tidak valid' },
        { status: 400 }
      )
    }

    const ids = idParam.split(',').map((v) => Number(v.trim())).filter((v) => !isNaN(v))
    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'ID tidak valid' },
        { status: 400 }
      )
    }

    await prisma.attendance.deleteMany({
      where: {
        id: { in: ids },
      },
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
