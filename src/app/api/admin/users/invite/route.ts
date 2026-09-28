import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { createAdminInvitation } from '@/lib/admin-invitations'
import { getAppBaseUrl } from '@/lib/env'

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
      { error: 'Hanya Superadmin yang berhak membuat undangan admin baru' },
      { status: 403 }
    )
  }

  let body: { email?: string; role?: 'SUPERADMIN' | 'ADMIN' }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Format data JSON tidak valid' },
      { status: 400 }
    )
  }

  if (!body.email || typeof body.email !== 'string') {
    return NextResponse.json(
      { error: 'Alamat email wajib diisi' },
      { status: 400 }
    )
  }

  try {
    const result = await createAdminInvitation({
      email: body.email,
      role: body.role ?? 'ADMIN',
      invitedByEmail: session.user.email,
    })

    const origin = getAppBaseUrl(req)
    const inviteUrl = `${origin}/admin/invite?token=${result.invitation.token}`

    return NextResponse.json({
      ok: true,
      invitation: result.invitation,
      inviteUrl,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membuat undangan'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
