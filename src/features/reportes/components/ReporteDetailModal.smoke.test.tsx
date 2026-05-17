import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ReporteDetailModal from '@/features/reportes/components/ReporteDetailModal'
import type { Reporte } from '@/features/reportes/types/reporte'

const baseReporte: Reporte = {
  id: 1,
  nombre: 'Reporte ventas',
  tipo: 'VENTAS',
  descripcion: 'desc',
  datos: JSON.stringify({ totalVentas: 5, totalIngresos: 200 }),
  generadoPor: 'admin',
  createdAt: new Date().toISOString(),
}

describe('ReporteDetailModal smoke', () => {
  it('muestra analisis IA cuando fue generado', () => {
    render(
      <ReporteDetailModal
        open
        onClose={vi.fn()}
        reporte={{
          ...baseReporte,
          analisisIaEstado: 'GENERADO',
          analisisIa: 'Las ventas muestran una tendencia estable.',
        }}
      />,
    )

    expect(screen.getByText('Análisis IA')).toBeInTheDocument()
    expect(screen.getByText('Las ventas muestran una tendencia estable.')).toBeInTheDocument()
  })

  it('muestra mensaje sobrio cuando analisis IA no estuvo disponible', () => {
    render(
      <ReporteDetailModal
        open
        onClose={vi.fn()}
        reporte={{
          ...baseReporte,
          analisisIaEstado: 'NO_DISPONIBLE',
          analisisIa: null,
        }}
      />,
    )

    expect(screen.getByText('Análisis IA')).toBeInTheDocument()
    expect(
      screen.getByText('El análisis IA no estuvo disponible al generar este reporte.'),
    ).toBeInTheDocument()
  })
})
