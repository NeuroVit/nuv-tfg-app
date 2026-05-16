export interface AlertaStock {
  id: number
  productoId: number
  productoNombre: string
  productoSku: string
  tipo: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK' | 'PRICE_ANOMALY' | string
  mensaje: string
  resuelta: boolean
  creadaEn: string
  resueltaEn: string | null
}

export interface AlertaResumen {
  abiertas: number
  stockBajo: number
  anomaliasPrecio: number
  resueltasUltimos7Dias: number
  criticas?: number
  anomalias?: number
}
