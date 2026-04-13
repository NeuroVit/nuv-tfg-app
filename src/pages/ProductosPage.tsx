import { useEffect, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { getProductos, actualizarStock, deleteProducto } from '@/api/producto'
import type { Producto, ActualizarStockRequest } from '../types/producto'
import { useAuthStore } from '../store/authStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pencil, Trash2, AlertTriangle } from 'lucide-react'

export default function ProductosPage() {
  const { hasRole } = useAuthStore()
  const canEdit = hasRole('ROLE_ADMIN') || hasRole('ROLE_MANAGER')

  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')

  // Stock dialog state
  const [stockDialog, setStockDialog] = useState(false)
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null)
  const [stockForm, setStockForm] = useState<ActualizarStockRequest>({
    delta: 0,
    razon: 'AJUSTE',
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchProductos = async () => {
    try {
      const data = await getProductos()
      setProductos(data)
    } catch (err) {
      console.error('Error cargando productos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProductos() }, [])

  const handleOpenStock = (producto: Producto) => {
    setSelectedProducto(producto)
    setStockForm({ delta: 0, razon: 'AJUSTE' })
    setStockDialog(true)
  }

  const handleUpdateStock = async () => {
    if (!selectedProducto) return
    setSubmitting(true)
    try {
      await actualizarStock(selectedProducto.id, stockForm)
      await fetchProductos()
      setStockDialog(false)
    } catch (err) {
      console.error('Error actualizando stock:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este producto?')) return
    try {
      await deleteProducto(id)
      await fetchProductos()
    } catch (err) {
      console.error('Error eliminando producto:', err)
    }
  }

  const columns: ColumnDef<Producto>[] = [
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-gray-500">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'nombre',
      header: 'Nombre',
      cell: ({ getValue }) => (
        <span className="font-medium text-gray-900">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'categoriaNombre',
      header: 'Categoría',
      cell: ({ getValue }) => getValue<string>() ?? '—',
    },
    {
      accessorKey: 'cantidadActual',
      header: 'Stock Actual',
      cell: ({ row }) => {
        const actual = row.original.cantidadActual
        const minimo = row.original.nivelMinimoStock
        const low = actual <= minimo
        return (
          <div className="flex items-center gap-2">
            <span className={low ? 'text-red-600 font-semibold' : ''}>{actual}</span>
            {low && <AlertTriangle className="w-3 h-3 text-red-500" />}
          </div>
        )
      },
    },
    {
      accessorKey: 'nivelMinimoStock',
      header: 'Stock Mínimo',
    },
    {
      accessorKey: 'precioUnitario',
      header: 'Precio',
      cell: ({ getValue }) => `€${Number(getValue<number>()).toFixed(2)}`,
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: ({ row }) => {
        const low = row.original.cantidadActual <= row.original.nivelMinimoStock
        return (
          <Badge variant={low ? 'destructive' : 'default'}>
            {low ? 'Stock bajo' : 'Normal'}
          </Badge>
        )
      },
    },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          {canEdit && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenStock(row.original)}
              >
                <Pencil className="w-3 h-3 mr-1" />
                Stock
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(row.original.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data: productos,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  })

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
            <p className="text-sm text-gray-500 mt-1">{productos.length} productos en inventario</p>
          </div>
        </div>

        {/* Search */}
        <Input
          placeholder="Buscar por nombre, SKU, categoría..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />

        {/* Table */}
        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead key={header.id}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-12 text-gray-400">
                    Cargando productos...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-12 text-gray-400">
                    No se encontraron productos.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-gray-50">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Stock update dialog */}
      <Dialog open={stockDialog} onOpenChange={setStockDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Actualizar Stock — {selectedProducto?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Delta (positivo = entrada, negativo = salida)</Label>
              <Input
                type="number"
                value={stockForm.delta}
                onChange={(e) => setStockForm((f) => ({ ...f, delta: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Razón</Label>
              <Select
                value={stockForm.razon}
                onValueChange={(v) =>
                  setStockForm((f) => ({ ...f, razon: v as ActualizarStockRequest['razon'] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPRA">Compra</SelectItem>
                  <SelectItem value="VENTA">Venta</SelectItem>
                  <SelectItem value="AJUSTE">Ajuste</SelectItem>
                  <SelectItem value="DEVOLUCION">Devolución</SelectItem>
                  <SelectItem value="MERMA">Merma</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notas (opcional)</Label>
              <Input
                value={stockForm.notas ?? ''}
                onChange={(e) => setStockForm((f) => ({ ...f, notas: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockDialog(false)}>Cancelar</Button>
            <Button onClick={handleUpdateStock} disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}