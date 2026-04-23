import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  actualizarStock,
  crearProducto,
  deleteProducto,
  editarProducto,
  getCategorias,
  getProductos,
} from '@/api/producto'
import type { ActualizarStockRequest, Categoria, Producto } from '@/types/producto'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertTriangle, Pencil, Plus, Trash2 } from 'lucide-react'

const productoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  sku: z.string().min(1, 'El SKU es obligatorio'),
  descripcion: z.string().optional(),
  precioUnitario: z.coerce.number().positive('El precio debe ser mayor a 0'),
  cantidadActual: z.coerce.number().int().min(0, 'La cantidad no puede ser negativa'),
  nivelMinimoStock: z.coerce.number().int().min(0, 'El stock mínimo no puede ser negativo'),
  categoriaId: z.string().min(1, 'La categoría es obligatoria'),
})

type ProductoFormValues = z.infer<typeof productoSchema>
type EstadoFiltro = 'all' | 'low' | 'normal'

const defaultProductoValues: ProductoFormValues = {
  nombre: '',
  sku: '',
  descripcion: '',
  precioUnitario: 0,
  cantidadActual: 0,
  nivelMinimoStock: 0,
  categoriaId: '',
}

const parseApiError = (error: unknown, fallback: string): string => {
  if (!isAxiosError(error)) return fallback
  const payload = error.response?.data
  if (typeof payload === 'string') return payload
  if (payload && typeof payload === 'object') {
    const data = payload as {
      message?: string
      error?: string
      errors?: Array<{ message?: string }>
    }
    if (data.message) return data.message
    if (data.error) return data.error
    if (Array.isArray(data.errors) && data.errors[0]?.message) return data.errors[0].message
  }
  return fallback
}

export default function ProductosPage() {
  const { hasRole } = useAuthStore()
  const canEdit = hasRole('ROLE_ADMIN') || hasRole('ROLE_MANAGER')

  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('all')
  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>('all')

  const [stockDialog, setStockDialog] = useState(false)
  const [createDialog, setCreateDialog] = useState(false)
  const [editDialog, setEditDialog] = useState(false)

  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null)
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null)
  const [stockError, setStockError] = useState<string | null>(null)

  const [stockForm, setStockForm] = useState<ActualizarStockRequest>({
    delta: 0,
    razon: 'ADJUSTMENT',
  })
  const [submittingStock, setSubmittingStock] = useState(false)
  const [submittingCreate, setSubmittingCreate] = useState(false)
  const [submittingEdit, setSubmittingEdit] = useState(false)

  const createForm = useForm<ProductoFormValues>({
    resolver: zodResolver(productoSchema),
    defaultValues: defaultProductoValues,
  })

  const editForm = useForm<ProductoFormValues>({
    resolver: zodResolver(productoSchema),
    defaultValues: defaultProductoValues,
  })

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const [productosData, categoriasData] = await Promise.all([getProductos(), getCategorias()])
      setProductos(productosData)
      setCategorias(categoriasData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void cargarDatos()
  }, [])

  const handleOpenStock = (producto: Producto) => {
    setSelectedProducto(producto)
    setStockForm({ delta: 0, razon: 'ADJUSTMENT' })
    setStockError(null)
    setStockDialog(true)
  }

  const handleOpenCreate = () => {
    createForm.reset(defaultProductoValues)
    createForm.clearErrors()
    setCreateDialog(true)
  }

  const handleOpenEdit = (producto: Producto) => {
    const categoriaIdActual =
      producto.categoriaId ??
      categorias.find((categoria) => categoria.nombre === producto.categoriaNombre)?.id ??
      null

    editForm.reset({
      nombre: producto.nombre,
      sku: producto.sku,
      descripcion: producto.descripcion ?? '',
      precioUnitario: Number(producto.precioUnitario),
      cantidadActual: producto.cantidadActual,
      nivelMinimoStock: producto.nivelMinimoStock,
      categoriaId: categoriaIdActual ? String(categoriaIdActual) : '',
    })
    editForm.clearErrors()
    setProductoEditando(producto)
    setEditDialog(true)
  }

  const handleCreateSubmit = async (values: ProductoFormValues) => {
    setSubmittingCreate(true)
    createForm.clearErrors()
    try {
      await crearProducto({
        nombre: values.nombre,
        sku: values.sku,
        descripcion: values.descripcion?.trim() ? values.descripcion.trim() : undefined,
        precioUnitario: values.precioUnitario,
        cantidadActual: values.cantidadActual,
        nivelMinimoStock: values.nivelMinimoStock,
        categoriaId: Number(values.categoriaId),
      })
      await cargarDatos()
      setCreateDialog(false)
    } catch (error: unknown) {
      createForm.setError('root', {
        message: parseApiError(error, 'No se pudo crear el producto'),
      })
    } finally {
      setSubmittingCreate(false)
    }
  }

  const handleEditSubmit = async (values: ProductoFormValues) => {
    if (!productoEditando) return
    setSubmittingEdit(true)
    editForm.clearErrors()
    try {
      await editarProducto(productoEditando.id, {
        nombre: values.nombre,
        sku: values.sku,
        descripcion: values.descripcion?.trim() ? values.descripcion.trim() : undefined,
        precioUnitario: values.precioUnitario,
        cantidadActual: values.cantidadActual,
        nivelMinimoStock: values.nivelMinimoStock,
        categoriaId: Number(values.categoriaId),
      })
      await cargarDatos()
      setEditDialog(false)
      setProductoEditando(null)
    } catch (error: unknown) {
      editForm.setError('root', {
        message: parseApiError(error, 'No se pudo actualizar el producto'),
      })
    } finally {
      setSubmittingEdit(false)
    }
  }

  const handleUpdateStock = async () => {
    if (!selectedProducto) return
    setSubmittingStock(true)
    setStockError(null)
    try {
      await actualizarStock(selectedProducto.id, stockForm)
      await cargarDatos()
      setStockDialog(false)
    } catch (error: unknown) {
      setStockError(parseApiError(error, 'No se pudo actualizar el stock'))
    } finally {
      setSubmittingStock(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este producto?')) return
    try {
      await deleteProducto(id)
      await cargarDatos()
    } catch (error: unknown) {
      alert(parseApiError(error, 'No se pudo eliminar el producto'))
    }
  }

  const productosFiltrados = useMemo(() => {
    return productos.filter((producto) => {
      const categoriaOk =
        filtroCategoria === 'all' || String(producto.categoriaId) === filtroCategoria

      const esStockBajo = producto.cantidadActual <= producto.nivelMinimoStock
      const estadoOk =
        filtroEstado === 'all' ||
        (filtroEstado === 'low' && esStockBajo) ||
        (filtroEstado === 'normal' && !esStockBajo)

      return categoriaOk && estadoOk
    })
  }, [productos, filtroCategoria, filtroEstado])

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
      cell: ({ getValue }) => <span className="font-medium text-gray-900">{getValue<string>()}</span>,
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
            {low && <AlertTriangle className="h-3 w-3 text-red-500" />}
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
        return <Badge variant={low ? 'destructive' : 'default'}>{low ? 'Stock bajo' : 'Normal'}</Badge>
      },
    },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleOpenStock(row.original)}>
                Stock
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleOpenEdit(row.original)}
                aria-label="Editar producto"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(row.original.id)}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                aria-label="Eliminar producto"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data: productosFiltrados,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  })

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
            <p className="mt-1 text-sm text-gray-500">{productosFiltrados.length} productos en inventario</p>
          </div>
          {canEdit && (
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo producto
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input
            placeholder="Buscar por nombre, SKU, categoría..."
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-sm"
          />

          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder="Filtrar por categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categorias.map((categoria) => (
                <SelectItem key={categoria.id} value={String(categoria.id)}>
                  {categoria.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroEstado} onValueChange={(value) => setFiltroEstado(value as EstadoFiltro)}>
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="low">Stock bajo</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-lg border bg-white">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
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
                  <TableCell colSpan={columns.length} className="py-12 text-center text-gray-400">
                    Cargando productos...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-12 text-center text-gray-400">
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

      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear producto</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              {createForm.formState.errors.root?.message && (
                <Alert variant="destructive">
                  <AlertDescription>{createForm.formState.errors.root.message}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={createForm.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="precioUnitario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio unitario</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="categoriaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categorias.map((categoria) => (
                            <SelectItem key={categoria.id} value={String(categoria.id)}>
                              {categoria.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="cantidadActual"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad actual</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="nivelMinimoStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock mínimo</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createForm.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (opcional)</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submittingCreate}>
                  {submittingCreate ? 'Guardando...' : 'Guardar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editDialog}
        onOpenChange={(open) => {
          setEditDialog(open)
          if (!open) setProductoEditando(null)
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              {editForm.formState.errors.root?.message && (
                <Alert variant="destructive">
                  <AlertDescription>{editForm.formState.errors.root.message}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={editForm.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="precioUnitario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio unitario</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="categoriaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categorias.map((categoria) => (
                            <SelectItem key={categoria.id} value={String(categoria.id)}>
                              {categoria.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="cantidadActual"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad actual</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="nivelMinimoStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock mínimo</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (opcional)</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submittingEdit}>
                  {submittingEdit ? 'Guardando...' : 'Guardar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={stockDialog} onOpenChange={setStockDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Actualizar Stock — {selectedProducto?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {stockError && (
              <Alert variant="destructive">
                <AlertDescription>{stockError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1">
              <Label>Delta (positivo = entrada, negativo = salida)</Label>
              <Input
                type="number"
                value={stockForm.delta}
                onChange={(event) =>
                  setStockForm((current) => ({ ...current, delta: Number(event.target.value) }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Razón</Label>
              <Select
                value={stockForm.razon}
                onValueChange={(value) =>
                  setStockForm((current) => ({
                    ...current,
                    razon: value as ActualizarStockRequest['razon'],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PURCHASE">Compra</SelectItem>
                  <SelectItem value="SALE">Venta</SelectItem>
                  <SelectItem value="ADJUSTMENT">Ajuste</SelectItem>
                  <SelectItem value="RETURN">Devolución</SelectItem>
                  <SelectItem value="DAMAGE">Merma</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notas (opcional)</Label>
              <Input
                value={stockForm.notas ?? ''}
                onChange={(event) =>
                  setStockForm((current) => ({ ...current, notas: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateStock} disabled={submittingStock}>
              {submittingStock ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
