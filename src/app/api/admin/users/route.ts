import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { listAdminTeam } from '@/lib/admin-invitations'

export async function GET() {
  const session = await getAdminSession()

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Sesi tidak valid atau telah berakhir' },
      { status: 401 }
    )
  }

  if (!session.user.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Hanya Superadmin yang memiliki hak akses ke manajemen pengguna' },
      { status: 403 }
    )
  }

  try {
    const team = await listAdminTeam()
    return NextResponse.json({ ok: true, data: team })
  } catch (error) {
    console.error('[admin/users] Failed to list admin team:', error)
    return NextResponse.json(
      { error: 'Gagal memuat daftar tim pengelola' },
      { status: 500 }
    )
  }
}
