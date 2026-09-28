import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { acceptAdminInvitation } from '@/lib/admin-invitations'

export async function POST(req: NextRequest) {
  const session = await getAdminSession()

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Silakan masuk dengan akun Google terlebih dahulu' },
      { status: 401 }
    )
  }

  let body: { token?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Format data JSON tidak valid' },
      { status: 400 }
    )
  }

  if (!body.token || typeof body.token !== 'string') {
    return NextResponse.json(
      { error: 'Token undangan wajib disertakan' },
      { status: 400 }
    )
  }

  try {
    const result = await acceptAdminInvitation(body.token, {
      email: session.user.email,
      name: session.user.name,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'Gagal menerima undangan' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      role: result.role,
      message: 'Undangan berhasil diterima. Akses admin aktif.',
    })
  } catch (error) {
    console.error('[public/invite/accept] Error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat menerima undangan' },
      { status: 500 }
    )
  }
}
