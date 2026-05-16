export type TipoReporte = 'INVENTARIO' | 'ALERTAS' | 'CLIENTES' | 'MOVIMIENTOS' | 'VENTAS'
export type FrecuenciaReporte = 'DIARIO' | 'SEMANAL' | 'MENSUAL'

export type Reporte = {
  id: number
  nombre: string
  tipo: TipoReporte
  descripcion: string | null
  datos: string | null
  generadoPor: string | null
  createdAt: string
}

export type CrearReportePayload = {
  nombre: string
  tipo: TipoReporte
  descripcion?: string
}

export type ReporteProgramado = {
  id: number
  tipo: TipoReporte
  frecuencia: FrecuenciaReporte
  activo: boolean
  creadoPor: string | null
  ultimaEjecucion: string | null
  proximaEjecucion: string
  createdAt: string
}

export type CrearReporteProgramadoPayload = {
  tipo: TipoReporte
  frecuencia: FrecuenciaReporte
}
