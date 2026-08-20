import React from 'react'
import { useAuth } from '../context/AuthContext' // Assume an auth context exists
import { Permission, hasPermission } from '../config/rbac'

interface RoleGuardProps {
  permission: Permission
  fallback?: React.ReactNode
  children: React.ReactNode
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ permission, fallback = null, children }) => {
  const { user } = useAuth()

  if (!user || !hasPermission(user.role, permission)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
