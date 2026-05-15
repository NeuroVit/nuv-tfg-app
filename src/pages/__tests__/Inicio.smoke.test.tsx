import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Inicio from '@/features/inicio/pages/Inicio'

vi.mock('@/hooks/useInventarioDashboard', () => ({
  useInventarioDashboard: () => ({
    valorTotal: 1200,
    totalProductos: 12,
    productosStockBajo: [],
    totalCategorias: 4,
    loading: false,
    error: null,
  }),
}))

vi.mock('@/store/profileStore', () => ({
  useDisplayName: () => 'Javier Test',
}))

vi.mock('@/lib/useFormatters', () => ({
  useFormatters: () => ({
    timeZone: 'Europe/Madrid',
    toUserDayKey: (date: Date) => date.toISOString().slice(0, 10),
    formatShortDate: (date: Date) => date.toISOString().slice(5, 10),
  }),
}))

vi.mock('@/features/analitica/api/analitica', () => ({
  getVelocidadResumenAnalitica: vi.fn().mockResolvedValue([]),
  getTopProductosVelocidadAnalitica: vi.fn().mockResolvedValue([]),
  getFinanzasResumenAnalitica: vi.fn().mockResolvedValue({ margenReal30d: 0 }),
}))

vi.mock('@/features/inventario/api/movimiento', () => ({
  getMovimientos: vi.fn().mockResolvedValue({ content: [], total: 0 }),
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

describe('Inicio smoke', () => {
  it('renders dashboard headline and summary text', () => {
    render(<Inicio />)

    expect(screen.getByText(/Aquí tienes el resumen de tu inventario\./i)).toBeInTheDocument()
    expect(screen.getByText(/Valor total inventario/i)).toBeInTheDocument()
  })
})
