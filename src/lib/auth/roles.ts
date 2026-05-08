import type { DbUser } from '@/types/database'

export function isAdmin(user: DbUser | null): boolean {
  return user?.role === 'admin' && user?.is_active === true
}

export function isActiveClient(user: DbUser | null): boolean {
  return user?.role === 'client' && user?.is_active === true
}

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
}
