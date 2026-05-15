import client from '@/api/client'
import type {
  CrearReportePayload,
  CrearReporteProgramadoPayload,
  Reporte,
  ReporteProgramado,
} from '@/types/reporte'

export const getReportes = async (tipo?: string): Promise<Reporte[]> => {
  const params = tipo ? { tipo } : {}
  const res = await client.get<Reporte[]>('/reportes', { params })
  return res.data
}

export const generarReporte = async (payload: CrearReportePayload): Promise<Reporte> => {
  const res = await client.post<Reporte>('/reportes', payload)
  return res.data
}

export const eliminarReporte = async (id: number): Promise<void> => {
  await client.delete(`/reportes/${id}`)
}

export const getReportesProgramados = async (): Promise<ReporteProgramado[]> => {
  const res = await client.get<ReporteProgramado[]>('/reportes/programados')
  return res.data
}

export const crearReporteProgramado = async (
  payload: CrearReporteProgramadoPayload
): Promise<ReporteProgramado> => {
  const res = await client.post<ReporteProgramado>('/reportes/programados', payload)
  return res.data
}

export const toggleReporteProgramado = async (id: number): Promise<ReporteProgramado> => {
  const res = await client.patch<ReporteProgramado>(`/reportes/programados/${id}/toggle`)
  return res.data
}

export const eliminarReporteProgramado = async (id: number): Promise<void> => {
  await client.delete(`/reportes/programados/${id}`)
}
