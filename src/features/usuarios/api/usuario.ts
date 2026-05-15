import client from '@/api/client'
import type {
  InvitarUsuarioRequest,
  UsuarioAdmin,
  UsuarioInviteResponse,
  UsuarioRoleAudit,
} from '@/features/usuarios/types/usuario'

export const getUsuarios = async (): Promise<UsuarioAdmin[]> => {
  const { data } = await client.get<UsuarioAdmin[]>('/usuarios')
  return data
}

export const invitarUsuario = async (payload: InvitarUsuarioRequest): Promise<UsuarioInviteResponse> => {
  const { data } = await client.post<UsuarioInviteResponse>('/usuarios/invite', payload)
  return data
}

export const actualizarRolUsuario = async (
  id: number,
  role: string,
  reason?: string
): Promise<UsuarioAdmin> => {
  const { data } = await client.patch<UsuarioAdmin>(`/usuarios/${id}/role`, { role, reason })
  return data
}

export const desactivarUsuario = async (id: number): Promise<UsuarioAdmin> => {
  const { data } = await client.patch<UsuarioAdmin>(`/usuarios/${id}/deactivate`)
  return data
}

export const activarUsuario = async (id: number): Promise<UsuarioAdmin> => {
  const { data } = await client.patch<UsuarioAdmin>(`/usuarios/${id}/activate`)
  return data
}

export const getAuditoriaUsuarios = async (limit = 100): Promise<UsuarioRoleAudit[]> => {
  const { data } = await client.get<UsuarioRoleAudit[]>('/usuarios/auditoria', { params: { limit } })
  return data
}
