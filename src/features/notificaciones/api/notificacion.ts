import client from '@/api/client'
import type { PagedResponse } from '@/types/pagination'
import type { ConteoNoLeidas, Notificacion } from '@/features/notificaciones/types/notificacion'

export type GetNotificacionesPagedParams = {
  soloNoLeidas?: boolean
  limit?: number
  offset?: number
}

export const getNotificacionesPaged = async (
  params: GetNotificacionesPagedParams = {},
): Promise<PagedResponse<Notificacion>> => {
  const res = await client.get<PagedResponse<Notificacion>>('/notificaciones/paged', { params })
  return res.data
}

export const getConteoNoLeidas = async (): Promise<ConteoNoLeidas> => {
  const res = await client.get<ConteoNoLeidas>('/notificaciones/no-leidas/count')
  return res.data
}

export const marcarNotificacionLeida = async (id: number): Promise<Notificacion> => {
  const res = await client.patch<Notificacion>(`/notificaciones/${id}/leer`)
  return res.data
}

export const marcarTodasNotificacionesLeidas = async (): Promise<void> => {
  await client.patch('/notificaciones/leer-todas')
}
