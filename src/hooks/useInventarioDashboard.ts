import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import client from '@/api/client'
import { getInventarioAnalitica } from '@/api/analitica'

type MovimientoStock = {
  id: number
  productoNombre: string
  productoSku: string
  cantidad: number
  tipo: 'ENTRADA' | 'SALIDA'
  fecha: string
}

type CategoriaApi = {
  id: number
  nombre: string
}

export type ProductoStockBajo = {
  id: number
  nombre: string
  sku: string
  stockActual: number
  stockMinimo: number
}

type DashboardState = {
  valorTotal: number
  totalProductos: number
  productosStockBajo: ProductoStockBajo[]
  totalCategorias: number
  movimientos: MovimientoStock[]
  loading: boolean
  error: string | null
}

const initialState: DashboardState = {
  valorTotal: 0,
  totalProductos: 0,
  productosStockBajo: [],
  totalCategorias: 0,
  movimientos: [],
  loading: true,
  error: null,
}

export function useInventarioDashboard() {
  const [state, setState] = useState<DashboardState>(initialState)

  useEffect(() => {
    let isMounted = true

    const loadDashboard = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        const inventarioPromise = getInventarioAnalitica()
        const categoriasPromise = client.get<CategoriaApi[]>('/categorias')
        const movimientosPromise = client
          .get<unknown>('/movimientos', { params: { limit: 50 } })
          .then((response) => {
            const raw = response.data
            const list = Array.isArray(raw)
              ? raw
              : raw && typeof raw === 'object' && Array.isArray((raw as { content?: unknown[] }).content)
                ? (raw as { content: unknown[] }).content
                : []

            return list
              .map((item, index): MovimientoStock | null => {
                if (!item || typeof item !== 'object') return null
                const row = item as Record<string, unknown>
                const cantidad = Number(row.cantidad ?? row.delta ?? 0)
                const tipoRaw = String(row.tipo ?? '')
                const tipo: 'ENTRADA' | 'SALIDA' =
                  tipoRaw === 'ENTRADA' || tipoRaw === 'SALIDA'
                    ? tipoRaw
                    : cantidad >= 0
                      ? 'ENTRADA'
                      : 'SALIDA'

                return {
                  id: Number(row.id ?? index),
                  productoNombre: String(row.productoNombre ?? row.nombreProducto ?? row.productName ?? 'Producto'),
                  productoSku: String(row.productoSku ?? row.skuProducto ?? row.productSku ?? 'N/A'),
                  cantidad: Math.abs(cantidad),
                  tipo,
                  fecha: String(row.fecha ?? row.movedAt ?? row.createdAt ?? new Date().toISOString()),
                }
              })
              .filter((movimiento): movimiento is MovimientoStock => movimiento !== null)
          })
          .catch((error: unknown) => {
            if (isAxiosError(error) && error.response?.status === 404) {
              return []
            }
            throw error
          })

        const [inventario, movimientos, categoriasRes] = await Promise.all([
          inventarioPromise,
          movimientosPromise,
          categoriasPromise,
        ])

        const categorias = categoriasRes.data ?? []

        const valorTotal = inventario.reduce(
          (total, producto) => total + Number(producto.stockValue ?? 0),
          0
        )

        const productosStockBajo = inventario
          .filter((producto) => producto.stockStatus === 'LOW_STOCK')
          .map((producto) => ({
            id: producto.productId,
            nombre: producto.productName,
            sku: producto.sku,
            stockActual: producto.currentQuantity,
            stockMinimo: producto.minimumStockLevel,
          }))

        const categoriasUnicas = new Set(categorias.map((categoria) => categoria.nombre.trim().toLowerCase()))

        if (!isMounted) return
        setState({
          valorTotal,
          totalProductos: inventario.length,
          productosStockBajo,
          totalCategorias: categoriasUnicas.size,
          movimientos: movimientos.slice(0, 50),
          loading: false,
          error: null,
        })
      } catch {
        if (!isMounted) return
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'No se pudo cargar el dashboard de inventario.',
        }))
      }
    }

    void loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  return state
}
