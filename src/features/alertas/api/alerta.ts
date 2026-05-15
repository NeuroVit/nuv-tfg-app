import client from '@/api/client'
import type { AlertaResumen, AlertaStock } from '@/features/alertas/types/alerta'
import type { PagedResponse } from '@/types/pagination'

export const getAlertas = async (resueltas?: boolean): Promise<AlertaStock[]> => {
  const page = await getAlertasPaged({
    resueltas,
    limit: 1000,
    offset: 0,
  })
  return page.content
}

export type GetAlertasPagedParams = {
  resueltas?: boolean
  search?: string
  limit?: number
  offset?: number
}

export const getAlertasPaged = async (params: GetAlertasPagedParams = {}): Promise<PagedResponse<AlertaStock>> => {
  const { data } = await client.get<PagedResponse<AlertaStock>>('/alertas/paged', { params })
  return data
}

export const getAlertasResumen = async (): Promise<AlertaResumen> => {
  const { data } = await client.get<AlertaResumen>('/alertas/resumen')
  return data
}

export const resolverAlerta = async (id: number): Promise<AlertaStock> => {
  const { data } = await client.patch<AlertaStock>(`/alertas/${id}/resolve`)
  return data
}
