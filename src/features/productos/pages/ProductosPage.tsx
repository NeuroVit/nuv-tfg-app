import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  actualizarStock,
  crearProducto,
  deleteProducto,
  editarProducto,
  getCategorias,
  getProductosPaged,
} from '@/features/productos/api/producto'
import { getProveedores } from '@/features/proveedores/api/provider'
import type { ActualizarStockRequest, Categoria, Producto } from '@/features/productos/types/producto'
import type { Proveedor } from '@/features/proveedores/types/provider'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import ProductoDeleteDialog from '@/features/productos/components/ProductoDeleteDialog'
import ProductoFormDialog from '@/features/productos/components/ProductoFormDialog'
import ProductoStockDialog from '@/features/productos/components/ProductoStockDialog'
import ProductosTableSection from '@/features/productos/components/ProductosTableSection'
import { AlertTriangle, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { HugeiconsIcon } from '@hugeicons/react'
import { PackageSearchIcon } from '@hugeicons/core-free-icons'
import ProductoModal from '@/features/productos/components/ProductoModal'
import { parseApiError } from '@/lib/apiError'
import {
  defaultProductoValues,
  hasPriceAnomaly,
  isLowStock,
  isOutOfStock,
  isOverstock,
  productoSchema,
  type EstadoFiltro,
  type ProductoFormValues,
} from '@/features/productos/productoForm'

const PAGE_SIZE = 16

export default function ProductosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasRole } = useAuthStore()
  const canEdit = hasRole('ROLE_ADMIN') || hasRole('ROLE_MANAGER')

  const [productos, setProductos] = useState<Producto[]>([])
  const [totalProductos, setTotalProductos] = useState(0)
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

  const cargarCatalogos = async () => {
    try {
      const [categoriasData, proveedoresData] = await Promise.all([
        getCategorias(),
        getProveedores(),
      ])
      setCategorias(categoriasData)
      setProveedores(proveedoresData.filter((provider) => provider.activo))
    } catch {
      toast.error('No se pudieron cargar categorías o proveedores')
    }
  }

  const cargarProductos = useCallback(async () => {
    setLoading(true)
    try {
      const page = await getProductosPaged({
        search: globalFilter.trim() || undefined,
        categoriaId: filtroCategoria === 'all' ? undefined : Number(filtroCategoria),
        providerId: filtroProveedor === 'all' ? undefined : Number(filtroProveedor),
        estado: filtroEstado,
        limit: PAGE_SIZE,
        offset,
      })
      setProductos(page.content)
      setTotalProductos(page.total)
    } finally {
      setLoading(false)
    }
  }, [filtroCategoria, filtroEstado, filtroProveedor, globalFilter, offset])

  useEffect(() => {
    void cargarCatalogos()
  }, [])

  useEffect(() => {
    void cargarProductos()
  }, [cargarProductos])

  useEffect(() => {
    const search = searchParams.get('search')
    const categoria = searchParams.get('categoria')
    const proveedor = searchParams.get('proveedor')
    const estado = searchParams.get('estado')

    if (search) setGlobalFilter(search)
    if (categoria) setFiltroCategoria(categoria)
    if (proveedor) setFiltroProveedor(proveedor)
    if (estado === 'all' || estado === 'low' || estado === 'normal' || estado === 'anomaly') {
      setFiltroEstado(estado)
    }
    // Se carga una sola vez para hidratar estado inicial desde URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const editProductIdRaw = searchParams.get('editProductId')
    if (!editProductIdRaw) return

    const editProductId = Number(editProductIdRaw)
    if (!Number.isFinite(editProductId)) {
      const next = new URLSearchParams(searchParams)
      next.delete('editProductId')
      next.delete('focus')
      setSearchParams(next, { replace: true })
      return
    }

    const productToEdit = productos.find((product) => product.id === editProductId)
    if (!productToEdit) return

    setProductoEditar(productToEdit)
    setModalOpen(true)

    const next = new URLSearchParams(searchParams)
    next.delete('editProductId')
    next.delete('focus')
    setSearchParams(next, { replace: true })
  }, [productos, searchParams, setSearchParams])

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
      nivelMaximoStock: producto.nivelMaximoStock ?? Math.max(producto.nivelMinimoStock * 5, producto.nivelMinimoStock, 1),
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
        nivelMaximoStock: values.nivelMaximoStock,
        categoriaId: Number(values.categoriaId),
        providerId: Number(values.providerId),
      })
      await cargarProductos()
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
        nivelMaximoStock: values.nivelMaximoStock,
        categoriaId: Number(values.categoriaId),
        providerId: Number(values.providerId),
      })
      await cargarProductos()
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
      await cargarProductos()
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
      await cargarProductos()
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
        const low = isLowStock(row.original) || isOutOfStock(row.original)
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
      header: 'Stock Mínimo',
    },
    {
      accessorKey: 'nivelMaximoStock',
      header: 'Stock Máximo',
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
        const critical = isOutOfStock(row.original)
        const low = isLowStock(row.original)
        const overstock = isOverstock(row.original)
        const priceAnomaly = hasPriceAnomaly(row.original)
        if (critical) return <Badge variant="destructive">Crítica</Badge>
        if (low) return <Badge variant="destructive">Stock bajo</Badge>
        if (overstock) return <Badge variant="secondary">Sobrestock</Badge>
        if (priceAnomaly) return <Badge variant="secondary">Anomalía en precio</Badge>
        return <Badge variant="default">Normal</Badge>
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
    data: productos,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const total = totalProductos
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

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
            placeholder="Buscar por nombre, SKU, categoría..."
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="w-full xl:min-w-[280px] xl:flex-1"
          />

          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="w-full xl:w-56">
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
              <SelectItem value="anomaly">Anomalía en precio</SelectItem>
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

        <ProductosTableSection
          table={table}
          columnsLength={columns.length}
          loading={loading}
          pageSize={PAGE_SIZE}
          currentPage={currentPage}
          totalPages={totalPages}
          total={total}
          canGoPrev={offset !== 0}
          canGoNext={offset + PAGE_SIZE < total}
          onPrev={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
          onNext={() => setOffset((prev) => (prev + PAGE_SIZE >= total ? prev : prev + PAGE_SIZE))}
          onRowClick={(producto) => {
            setProductoEditar(producto)
            setModalOpen(true)
          }}
        />
      </div>

      <ProductoFormDialog
        open={createDialog}
        onOpenChange={setCreateDialog}
        title="Crear producto"
        form={createForm}
        categorias={categorias}
        proveedores={proveedores}
        submitting={submittingCreate}
        onSubmit={handleCreateSubmit}
      />

      <ProductoFormDialog
        open={editDialog}
        onOpenChange={setEditDialog}
        title="Editar producto"
        form={editForm}
        categorias={categorias}
        proveedores={proveedores}
        submitting={submittingEdit}
        onSubmit={handleEditSubmit}
        productoEditando={productoEditando}
        onClose={() => setProductoEditando(null)}
      />

      <ProductoStockDialog
        open={stockDialog}
        onOpenChange={setStockDialog}
        selectedProducto={selectedProducto}
        stockForm={stockForm}
        setStockForm={setStockForm}
        stockError={stockError}
        submitting={submittingStock}
        onSubmit={handleUpdateStock}
      />

      <ProductoDeleteDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        productoEliminando={productoEliminando}
        submitting={submittingDelete}
        onConfirm={handleDeleteConfirm}
        onClose={() => setProductoEliminando(null)}
      />

      <ProductoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          void cargarProductos()
        }}
        producto={productoEditar}
      />
    </div>
  )
}
