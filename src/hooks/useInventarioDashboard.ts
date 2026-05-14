import { useEffect, useState } from 'react'
import client from '@/api/client'
import { getInventarioAnalitica } from '@/api/analitica'

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
  loading: boolean
  error: string | null
}

const DASHBOARD_CATEGORIES_LIMIT = 300

const initialState: DashboardState = {
  valorTotal: 0,
  totalProductos: 0,
  productosStockBajo: [],
  totalCategorias: 0,
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
        const inventario = await getInventarioAnalitica()
        const categoriasPromise = client
          .get<unknown>('/categorias', { params: { limit: DASHBOARD_CATEGORIES_LIMIT } })
          .then((response) => {
            const raw = response.data
            const list = Array.isArray(raw)
              ? raw
              : raw && typeof raw === 'object' && Array.isArray((raw as { content?: unknown[] }).content)
                ? (raw as { content: unknown[] }).content
                : []

            return list
              .map((item): CategoriaApi | null => {
                if (!item || typeof item !== 'object') return null
                const row = item as Record<string, unknown>
                return {
                  id: Number(row.id ?? 0),
                  nombre: String(row.nombre ?? '').trim(),
                }
              })
              .filter((categoria): categoria is CategoriaApi => categoria !== null && categoria.nombre.length > 0)
          })
          .catch(() => [])
        const categorias = await categoriasPromise

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
