export type Role = 'admin' | 'editor' | 'viewer'

export type Permission =
  | 'view:dashboard'
  | 'view:reports'
  | 'create:report'
  | 'edit:report'
  | 'delete:report'
  | 'moderate:report'
  | 'manage:users'

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  viewer: [
    'view:dashboard',
    'view:reports',
  ],
  editor: [
    'view:dashboard',
    'view:reports',
    'create:report',
    'edit:report',
    'moderate:report',
  ],
  admin: [
    'view:dashboard',
    'view:reports',
    'create:report',
    'edit:report',
    'delete:report',
    'moderate:report',
    'manage:users',
  ],
}

export function hasPermission(userRole: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) ?? false
}
