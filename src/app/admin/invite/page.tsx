import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { getAdminInvitationByToken, acceptAdminInvitation } from '@/lib/admin-invitations'
import AdminInviteClaim from '@/components/AdminInviteClaim'

export default async function AdminInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return (
      <AdminInviteClaim
        inviteInfo={{
          valid: false,
          error: 'Tautan undangan tidak menyertakan token yang valid.',
        }}
      />
    )
  }

  const invitation = await getAdminInvitationByToken(token)

  if (!invitation) {
    return (
      <AdminInviteClaim
        inviteInfo={{
          valid: false,
          error: 'Tautan undangan tidak ditemukan atau sudah kadaluwarsa.',
        }}
      />
    )
  }

  const now = new Date()
  const isExpired = invitation.status === 'EXPIRED' || new Date(invitation.expiresAt) < now

  if (isExpired) {
    return (
      <AdminInviteClaim
        inviteInfo={{
          valid: false,
          isExpired: true,
          error: 'Masa berlaku tautan undangan ini telah habis (melebihi 48 jam).',
        }}
      />
    )
  }

  // Check if user is already logged in
  const session = await getAdminSession()
  if (session?.user?.email) {
    const loggedInEmail = session.user.email.toLowerCase()
    if (loggedInEmail === invitation.email.toLowerCase()) {
      // Auto-claim and redirect to forms
      await acceptAdminInvitation(token, {
        email: loggedInEmail,
        name: session.user.name,
      })
      redirect('/admin/forms')
    }
  }

  return (
    <AdminInviteClaim
      inviteInfo={{
        valid: true,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt.toISOString(),
        isExpired: false,
        invitedBy: invitation.invitedBy
          ? {
              email: invitation.invitedBy.email,
              name: invitation.invitedBy.name,
            }
          : null,
      }}
    />
  )
}
