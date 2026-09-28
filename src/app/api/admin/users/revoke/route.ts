import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { revokeAdminInvitation, revokeAdminUser } from '@/lib/admin-invitations'

export async function POST(req: NextRequest) {
  const session = await getAdminSession()

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Sesi tidak valid atau telah berakhir' },
      { status: 401 }
    )
  }

  if (!session.user.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Hanya Superadmin yang berhak mencabut hak akses atau undangan' },
      { status: 403 }
    )
  }

  let body: { type?: 'invitation' | 'user'; id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Format data JSON tidak valid' },
      { status: 400 }
    )
  }

  if (!body.type || !body.id || typeof body.id !== 'string') {
    return NextResponse.json(
      { error: 'Parameter type dan id wajib diisi' },
      { status: 400 }
    )
  }

  try {
    if (body.type === 'invitation') {
      const revoked = await revokeAdminInvitation(body.id)
      if (!revoked) {
        return NextResponse.json(
          { error: 'Undangan tidak ditemukan atau sudah tidak aktif' },
          { status: 404 }
        )
      }
      return NextResponse.json({ ok: true, message: 'Undangan berhasil dibatalkan' })
    }

    if (body.type === 'user') {
      const result = await revokeAdminUser(body.id, session.user.email)
      if (!result.success) {
        return NextResponse.json(
          { error: result.error ?? 'Gagal mencabut akses pengguna' },
          { status: 400 }
        )
      }
      return NextResponse.json({ ok: true, message: 'Hak akses pengguna berhasil dicabut' })
    }

    return NextResponse.json({ error: 'Tipe pencabutan tidak valid' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan sistem'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
