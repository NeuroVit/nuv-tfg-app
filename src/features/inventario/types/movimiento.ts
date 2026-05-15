export type MovimientoTipo = 'ENTRADA' | 'SALIDA'

export interface MovimientoStock {
  id: number
  productoNombre: string
  productoSku: string
  cantidad: number
  tipo: MovimientoTipo
  razon: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE' | 'INITIAL' | string
  notas: string | null
  fecha: string
}

export interface MovimientosPageResponse {
  content: MovimientoStock[]
  total: number
  limit: number
  offset: number
}
