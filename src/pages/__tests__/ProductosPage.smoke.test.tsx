import { MemoryRouter } from 'react-router'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ProductosPage from '@/features/productos/pages/ProductosPage'

vi.mock('@/features/productos/api/producto', () => ({
  getCategorias: vi.fn().mockResolvedValue([{ id: 1, nombre: 'Bebidas' }]),
  getProductosPaged: vi.fn().mockResolvedValue({
    content: [
      {
        id: 10,
        nombre: 'Café',
        sku: 'CAF-001',
        descripcion: 'desc',
        precioUnitario: 3.5,
        costoUnitario: 2.0,
        cantidadActual: 40,
        nivelMinimoStock: 5,
        categoriaNombre: 'Bebidas',
        categoriaId: 1,
        providerNombre: 'Proveedor X',
        providerId: 9,
      },
    ],
    total: 1,
    limit: 17,
    offset: 0,
  }),
  actualizarStock: vi.fn(),
  crearProducto: vi.fn(),
  editarProducto: vi.fn(),
  deleteProducto: vi.fn(),
}))

vi.mock('@/features/proveedores/api/provider', () => ({
  getProveedores: vi.fn().mockResolvedValue([{ id: 9, nombre: 'Proveedor X', activo: true }]),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    hasRole: () => true,
  }),
}))

vi.mock('@/features/productos/components/ProductoModal', () => ({
  default: () => null,
}))

describe('ProductosPage smoke', () => {
  it('renders product table and loads data', async () => {
    render(
      <MemoryRouter>
        <ProductosPage />
      </MemoryRouter>,
    )

    expect(screen.getByPlaceholderText(/Buscar por nombre, SKU, categoría/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Café')).toBeInTheDocument()
    })
  })
})
