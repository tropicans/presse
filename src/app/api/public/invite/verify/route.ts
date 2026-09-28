import { NextRequest, NextResponse } from 'next/server'
import { getAdminInvitationByToken } from '@/lib/admin-invitations'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json(
      { error: 'Token undangan tidak disertakan' },
      { status: 400 }
    )
  }

  try {
    const invitation = await getAdminInvitationByToken(token)

    if (!invitation) {
      return NextResponse.json(
        { error: 'Tautan undangan tidak valid atau tidak ditemukan' },
        { status: 404 }
      )
    }

    const now = new Date()
    const isExpired = invitation.status === 'EXPIRED' || new Date(invitation.expiresAt) < now

    return NextResponse.json({
      ok: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        isExpired,
        invitedBy: invitation.invitedBy
          ? {
              email: invitation.invitedBy.email,
              name: invitation.invitedBy.name,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('[public/invite/verify] Error:', error)
    return NextResponse.json(
      { error: 'Gagal memverifikasi token undangan' },
      { status: 500 }
    )
  }
}
