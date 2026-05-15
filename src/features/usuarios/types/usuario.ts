export interface UsuarioAdmin {
  id: number
  username: string
  email: string
  nombre: string
  apellidos: string
  role: 'ROLE_ADMIN' | 'ROLE_MANAGER' | 'ROLE_VIEWER' | string
  activo: boolean
  creadoEn: string
  actualizadoEn: string
}

export interface UsuarioInviteResponse {
  usuario: UsuarioAdmin
  temporaryPassword: string
}

export interface UsuarioRoleAudit {
  id: number
  userId: number
  username: string
  changedById: number | null
  changedByUsername: string | null
  oldRole: string
  newRole: string
  reason: string | null
  changedAt: string
}

export interface InvitarUsuarioRequest {
  username: string
  email: string
  nombre: string
  apellidos: string
  role: string
}
