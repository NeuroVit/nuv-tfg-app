import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
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
import { getProveedores } from '@/api/provider'
import type { ActualizarStockRequest, Categoria, Producto } from '@/types/producto'
import type { Proveedor } from '@/types/provider'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertTriangle, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { HugeiconsIcon } from '@hugeicons/react'
import { PackageSearchIcon } from '@hugeicons/core-free-icons'
import ProductoModal from '@/components/ProductoModal'
import { parseApiError } from '@/lib/apiError'

const productoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  sku: z.string().min(1, 'El SKU es obligatorio'),
  descripcion: z.string().optional(),
  precioUnitario: z.coerce.number().positive('El precio debe ser mayor a 0'),
  costoUnitario: z.coerce.number().positive('El coste debe ser mayor a 0'),
  cantidadActual: z.coerce.number().int().min(0, 'La cantidad no puede ser negativa'),
  nivelMinimoStock: z.coerce.number().int().min(0, 'El stock mÃ­nimo no puede ser negativo'),
  categoriaId: z.string().min(1, 'La categorÃ­a es obligatoria'),
  providerId: z.string().min(1, 'El proveedor es obligatorio'),
})

type ProductoFormValues = z.infer<typeof productoSchema>
type EstadoFiltro = 'all' | 'low' | 'normal'
const PAGE_SIZE = 17

const defaultProductoValues: ProductoFormValues = {
  nombre: '',
  sku: '',
  descripcion: '',
  precioUnitario: 0,
  costoUnitario: 0,
  cantidadActual: 0,
  nivelMinimoStock: 0,
  categoriaId: '',
  providerId: '',
}

export default function ProductosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasRole } = useAuthStore()
  const canEdit = hasRole('ROLE_ADMIN') || hasRole('ROLE_MANAGER')

  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('all')
  const [filtroProveedor, setFiltroProveedor] = useState('all')
  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>('all')
  const [offset, setOffset] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [productoEditar, setProductoEditar] = useState<Producto | null>(null)

  const [stockDialog, setStockDialog] = useState(false)
  const [createDialog, setCreateDialog] = useState(false)
  const [editDialog, setEditDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)

  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null)
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null)
  const [productoEliminando, setProductoEliminando] = useState<Producto | null>(null)
  const [stockError, setStockError] = useState<string | null>(null)

  const [stockForm, setStockForm] = useState<ActualizarStockRequest>({
    delta: 0,
    razon: 'ADJUSTMENT',
  })
  const [submittingStock, setSubmittingStock] = useState(false)
  const [submittingCreate, setSubmittingCreate] = useState(false)
  const [submittingEdit, setSubmittingEdit] = useState(false)
  const [submittingDelete, setSubmittingDelete] = useState(false)

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
      const [productosData, categoriasData, proveedoresData] = await Promise.all([
        getProductos(),
        getCategorias(),
        getProveedores(),
      ])
      setProductos(productosData)
      setCategorias(categoriasData)
      setProveedores(proveedoresData.filter((provider) => provider.activo))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void cargarDatos()
  }, [])

  useEffect(() => {
    const search = searchParams.get('search')
    const categoria = searchParams.get('categoria')
    const proveedor = searchParams.get('proveedor')
    const estado = searchParams.get('estado')

    if (search) setGlobalFilter(search)
    if (categoria) setFiltroCategoria(categoria)
    if (proveedor) setFiltroProveedor(proveedor)
    if (estado === 'all' || estado === 'low' || estado === 'normal') {
      setFiltroEstado(estado)
    }
    // Se carga una sola vez para hidratar estado inicial desde URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const next = new URLSearchParams(searchParams)

    if (globalFilter.trim()) next.set('search', globalFilter.trim())
    else next.delete('search')

    if (filtroCategoria !== 'all') next.set('categoria', filtroCategoria)
    else next.delete('categoria')

    if (filtroProveedor !== 'all') next.set('proveedor', filtroProveedor)
    else next.delete('proveedor')

    if (filtroEstado !== 'all') next.set('estado', filtroEstado)
    else next.delete('estado')

    const prevSerialized = searchParams.toString()
    const nextSerialized = next.toString()
    if (prevSerialized !== nextSerialized) {
      setSearchParams(next, { replace: true })
    }
  }, [filtroCategoria, filtroEstado, filtroProveedor, globalFilter, searchParams, setSearchParams])

  const handleOpenStock = (producto: Producto) => {
    setSelectedProducto(producto)
    setStockForm({ delta: 0, razon: 'ADJUSTMENT' })
    setStockError(null)
    setStockDialog(true)
  }

  const handleOpenEdit = (producto: Producto) => {
    const categoriaIdActual =
      producto.categoriaId ??
      categorias.find((categoria) => categoria.nombre === producto.categoriaNombre)?.id ??
      null
    const providerIdActual =
      producto.providerId ??
      proveedores.find((provider) => provider.nombre === producto.providerNombre)?.id ??
      null

    editForm.reset({
      nombre: producto.nombre,
      sku: producto.sku,
      descripcion: producto.descripcion ?? '',
      precioUnitario: Number(producto.precioUnitario),
      costoUnitario: Number(producto.costoUnitario ?? producto.precioUnitario),
      cantidadActual: producto.cantidadActual,
      nivelMinimoStock: producto.nivelMinimoStock,
      categoriaId: categoriaIdActual ? String(categoriaIdActual) : '',
      providerId: providerIdActual ? String(providerIdActual) : '',
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
        costoUnitario: values.costoUnitario,
        cantidadActual: values.cantidadActual,
        nivelMinimoStock: values.nivelMinimoStock,
        categoriaId: Number(values.categoriaId),
        providerId: Number(values.providerId),
      })
      await cargarDatos()
      setCreateDialog(false)
      toast.success(`Producto "${values.nombre}" creado correctamente.`)
    } catch (error: unknown) {
      const errorMessage = parseApiError(error, 'No se pudo crear el producto')
      createForm.setError('root', {
        message: errorMessage,
      })
      toast.error(errorMessage)
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
        costoUnitario: values.costoUnitario,
        cantidadActual: values.cantidadActual,
        nivelMinimoStock: values.nivelMinimoStock,
        categoriaId: Number(values.categoriaId),
        providerId: Number(values.providerId),
      })
      await cargarDatos()
      setEditDialog(false)
      setProductoEditando(null)
      toast.success(`Producto "${values.nombre}" actualizado correctamente.`)
    } catch (error: unknown) {
      const errorMessage = parseApiError(error, 'No se pudo actualizar el producto')
      editForm.setError('root', {
        message: errorMessage,
      })
      toast.error(errorMessage)
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
      toast.success(`Stock actualizado para "${selectedProducto.nombre}".`)
    } catch (error: unknown) {
      const errorMessage = parseApiError(error, 'No se pudo actualizar el stock')
      setStockError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setSubmittingStock(false)
    }
  }

  const handleDeleteRequest = (producto: Producto) => {
    setProductoEliminando(producto)
    setDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    if (!productoEliminando) return
    setSubmittingDelete(true)
    try {
      const deletedName = productoEliminando.nombre
      await deleteProducto(productoEliminando.id)
      await cargarDatos()
      setDeleteDialog(false)
      setProductoEliminando(null)
      toast.success(`Producto "${deletedName}" eliminado correctamente.`)
    } catch (error: unknown) {
      setDeleteDialog(false)
      toast.error(parseApiError(error, 'No se pudo eliminar el producto'))
    } finally {
      setSubmittingDelete(false)
    }
  }

  const productosFiltrados = useMemo(() => {
    const filtrados = productos.filter((producto) => {
      const categoriaOk =
        filtroCategoria === 'all' || String(producto.categoriaId) === filtroCategoria
      const providerOk =
        filtroProveedor === 'all' || String(producto.providerId) === filtroProveedor

      const esStockBajo = producto.cantidadActual <= producto.nivelMinimoStock
      const estadoOk =
        filtroEstado === 'all' ||
        (filtroEstado === 'low' && esStockBajo) ||
        (filtroEstado === 'normal' && !esStockBajo)

      return categoriaOk && providerOk && estadoOk
    })

    return filtrados.sort((a, b) => {
      const aTime = a.creadoEn ? new Date(a.creadoEn).getTime() : Number.NaN
      const bTime = b.creadoEn ? new Date(b.creadoEn).getTime() : Number.NaN
      const safeATime = Number.isFinite(aTime) ? aTime : 0
      const safeBTime = Number.isFinite(bTime) ? bTime : 0

      if (safeBTime !== safeATime) return safeBTime - safeATime
      return b.id - a.id
    })
  }, [productos, filtroCategoria, filtroProveedor, filtroEstado])

  const columns: ColumnDef<Producto>[] = [
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-muted-foreground">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'nombre',
      header: 'Nombre',
      cell: ({ getValue }) => <span className="font-medium text-foreground">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'cantidadActual',
      header: 'Stock Actual',
      cell: ({ row }) => {
        const actual = row.original.cantidadActual
        const minimo = row.original.nivelMinimoStock
        const low = actual <= minimo
        return (
          <div className="flex items-center justify-center gap-2">
            <span className={low ? 'text-red-600 font-semibold' : ''}>{actual}</span>
            {low && <AlertTriangle className="h-3 w-3 text-red-500" />}
          </div>
        )
      },
    },
    {
      accessorKey: 'nivelMinimoStock',
      header: 'Stock MÃ­nimo',
    },
    {
      accessorKey: 'precioUnitario',
      header: 'Precio venta',
      cell: ({ getValue }) => `€${Number(getValue<number>()).toFixed(2)}`,
    },
    {
      accessorKey: 'costoUnitario',
      header: 'Coste unitario',
      cell: ({ getValue }) => {
        const value = getValue<number | null>()
        return value == null ? '—' : `€${Number(value).toFixed(2)}`
      },
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
        <div className="flex items-center justify-center gap-2" onClick={(event) => event.stopPropagation()}>
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Acciones de producto">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem onSelect={() => handleOpenStock(row.original)}>
                  <HugeiconsIcon icon={PackageSearchIcon} strokeWidth={2} className="h-4 w-4" />
                  Stock
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleOpenEdit(row.original)}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => handleDeleteRequest(row.original)}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

  const filteredRows = table.getRowModel().rows
  const total = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const paginatedRows = useMemo(
    () => filteredRows.slice(offset, offset + PAGE_SIZE),
    [filteredRows, offset]
  )

  useEffect(() => {
    setOffset(0)
  }, [globalFilter, filtroCategoria, filtroProveedor, filtroEstado])

  useEffect(() => {
    if (offset >= total && total > 0) {
      setOffset(Math.max(0, (Math.ceil(total / PAGE_SIZE) - 1) * PAGE_SIZE))
    }
  }, [offset, total])

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-2">
          <Input
            placeholder="Buscar por nombre, SKU, categorÃ­a..."
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="w-full xl:min-w-[280px] xl:flex-1"
          />

          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="w-full xl:w-56">
              <SelectValue placeholder="Filtrar por categorÃ­a" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorÃ­as</SelectItem>
              {categorias.map((categoria) => (
                <SelectItem key={categoria.id} value={String(categoria.id)}>
                  {categoria.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroProveedor} onValueChange={setFiltroProveedor}>
            <SelectTrigger className="w-full xl:w-56">
              <SelectValue placeholder="Filtrar por proveedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los proveedores</SelectItem>
              {proveedores.map((proveedor) => (
                <SelectItem key={proveedor.id} value={String(proveedor.id)}>
                  {proveedor.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroEstado} onValueChange={(value) => setFiltroEstado(value as EstadoFiltro)}>
            <SelectTrigger className="w-full xl:w-48">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="low">Stock bajo</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>

          <Button
            className="w-full xl:ml-auto xl:w-auto xl:shrink-0"
            onClick={() => {
              setProductoEditar(null)
              setModalOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo producto
          </Button>
        </div>

        <div className="rounded-lg border bg-card">
          <Table className="min-w-[900px]">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-center">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-12 text-center text-muted-foreground">
                    Cargando productos...
                  </TableCell>
                </TableRow>
              ) : paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-12 text-center text-muted-foreground">
                    No se encontraron productos.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => {
                      setProductoEditar(row.original)
                      setModalOpen(true)
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="text-center align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Pagina {currentPage} de {totalPages} Â· {total} registros</p>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
              disabled={offset === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              onClick={() => setOffset((prev) => (prev + PAGE_SIZE >= total ? prev : prev + PAGE_SIZE))}
              disabled={offset + PAGE_SIZE >= total}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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
                  name="costoUnitario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coste unitario</FormLabel>
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
                      <FormLabel>CategorÃ­a</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una categorÃ­a" />
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
                  name="providerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proveedor</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un proveedor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {proveedores.map((proveedor) => (
                            <SelectItem key={proveedor.id} value={String(proveedor.id)}>
                              {proveedor.nombre}
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
                      <FormLabel>Stock mÃ­nimo</FormLabel>
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
                    <FormLabel>DescripciÃ³n (opcional)</FormLabel>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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
                  name="costoUnitario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coste unitario</FormLabel>
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
                      <FormLabel>CategorÃ­a</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una categorÃ­a" />
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
                  name="providerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proveedor</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un proveedor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {proveedores.map((proveedor) => (
                            <SelectItem key={proveedor.id} value={String(proveedor.id)}>
                              {proveedor.nombre}
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
                      <FormLabel>Stock mÃ­nimo</FormLabel>
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
                    <FormLabel>DescripciÃ³n (opcional)</FormLabel>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Actualizar Stock â€” {selectedProducto?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {stockError && (
              <Alert variant="destructive">
                <AlertDescription>{stockError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1">
              <Label>Cantidad a ajustar en el stock</Label>
              <Input
                type="number"
                placeholder="Usa un nÃºmero positivo si entra stock o negativo si sale stock."
                value={stockForm.delta}
                onChange={(event) =>
                  setStockForm((current) => ({ ...current, delta: Number(event.target.value) }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>RazÃ³n</Label>
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
                  <SelectItem value="RETURN">DevoluciÃ³n</SelectItem>
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

      <AlertDialog
        open={deleteDialog}
        onOpenChange={(open) => {
          setDeleteDialog(open)
          if (!open) {
            setProductoEliminando(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar producto</AlertDialogTitle>
            <AlertDialogDescription>
              Â¿Seguro que quieres eliminar el producto "{productoEliminando?.nombre}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submittingDelete}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={submittingDelete}>
              {submittingDelete ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProductoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          void cargarDatos()
        }}
        producto={productoEditar}
      />
    </div>
  )
}






