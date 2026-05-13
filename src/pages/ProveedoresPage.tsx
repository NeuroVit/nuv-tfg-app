import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Archive, Eye, MoreHorizontal, Pencil, Plus, RotateCcw, Truck } from 'lucide-react'
import {
  archivarProveedor,
  getProveedores,
  restaurarProveedor,
} from '@/api/provider'
import type { Proveedor } from '@/types/provider'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { parseApiError } from '@/lib/apiError'
import ProveedorModal from '@/components/ProveedorModal'

const PAGE_SIZE = 20

export default function ProveedoresPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedProviderId = Number(searchParams.get('providerId')) || null

  const { hasRole } = useAuthStore()
  const canEdit = hasRole('ROLE_ADMIN') || hasRole('ROLE_MANAGER')

  const [providers, setProviders] = useState<Proveedor[]>([])
  const [loadingProviders, setLoadingProviders] = useState(true)

  const [providerSearch, setProviderSearch] = useState('')
  const [providerStatusFilter, setProviderStatusFilter] = useState<'all' | 'active' | 'archived'>('active')
  const [offset, setOffset] = useState(0)

  const [providerDialogOpen, setProviderDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Proveedor | null>(null)

  const loadProviders = async () => {
    setLoadingProviders(true)
    try {
      const data = await getProveedores(true)
      setProviders(data)
    } catch (error: unknown) {
      toast.error(parseApiError(error, 'No se pudieron cargar los proveedores'))
    } finally {
      setLoadingProviders(false)
    }
  }

  useEffect(() => {
    void loadProviders()
  }, [])

  const filteredProviders = useMemo(() => {
    const term = providerSearch.trim().toLowerCase()
    return providers.filter((provider) => {
      const statusOk =
        providerStatusFilter === 'all' ||
        (providerStatusFilter === 'active' && provider.activo) ||
        (providerStatusFilter === 'archived' && !provider.activo)

      const textOk =
        !term ||
        provider.nombre.toLowerCase().includes(term) ||
        provider.ubicacionAlmacen.toLowerCase().includes(term)

      return statusOk && textOk
    })
  }, [providers, providerSearch, providerStatusFilter])

  const total = filteredProviders.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const paginatedProviders = useMemo(
    () => filteredProviders.slice(offset, offset + PAGE_SIZE),
    [filteredProviders, offset]
  )

  useEffect(() => {
    setOffset(0)
  }, [providerSearch, providerStatusFilter])

  useEffect(() => {
    if (offset >= total && total > 0) {
      setOffset(Math.max(0, (Math.ceil(total / PAGE_SIZE) - 1) * PAGE_SIZE))
    }
  }, [offset, total])

  const openCreateProvider = () => {
    setEditingProvider(null)
    setProviderDialogOpen(true)
  }

  const openEditProvider = (provider: Proveedor) => {
    setEditingProvider(provider)
    setProviderDialogOpen(true)
  }

  const toggleArchiveProvider = async (provider: Proveedor) => {
    try {
      if (provider.activo) {
        await archivarProveedor(provider.id)
        toast.success(`Proveedor "${provider.nombre}" archivado.`)
      } else {
        await restaurarProveedor(provider.id)
        toast.success(`Proveedor "${provider.nombre}" restaurado.`)
      }
      await loadProviders()
    } catch (error: unknown) {
      toast.error(parseApiError(error, 'No se pudo actualizar el estado del proveedor'))
    }
  }

  const goToPedidosForProvider = (provider: Proveedor) => {
    navigate(`/pedidos?providerId=${provider.id}`)
  }

  const goToProviderDetail = (provider: Proveedor) => {
    navigate(`/proveedores/${provider.id}`)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              placeholder="Buscar proveedor o almacén..."
              value={providerSearch}
              onChange={(event) => setProviderSearch(event.target.value)}
              className="w-full md:w-80"
            />
            <Select
              value={providerStatusFilter}
              onValueChange={(value) => setProviderStatusFilter(value as 'all' | 'active' | 'archived')}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="archived">Archivados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {canEdit && (
            <Button className="w-full md:w-auto" onClick={openCreateProvider}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo proveedor
            </Button>
          )}
        </div>

        <div className="rounded-lg border bg-card">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Nombre</TableHead>
                <TableHead className="w-[24%]">Almacén</TableHead>
                <TableHead className="w-[14%] text-center">Entrega (días)</TableHead>
                <TableHead className="w-[12%] text-center">Productos</TableHead>
                <TableHead className="w-[10%]">Estado</TableHead>
                <TableHead className="w-[10%] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingProviders ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Cargando proveedores...
                  </TableCell>
                </TableRow>
              ) : paginatedProviders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No hay proveedores para mostrar.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProviders.map((provider) => (
                  <TableRow
                    key={provider.id}
                    className={`cursor-pointer hover:bg-accent ${selectedProviderId === provider.id ? 'bg-muted' : ''}`}
                    onClick={() => goToProviderDetail(provider)}
                  >
                    <TableCell className="font-medium">
                      <span className="block truncate" title={provider.nombre}>{provider.nombre}</span>
                    </TableCell>
                    <TableCell>{provider.ubicacionAlmacen}</TableCell>
                    <TableCell className="text-center">{provider.diasEntrega}</TableCell>
                    <TableCell className="text-center">{provider.cantidadProductos}</TableCell>
                    <TableCell>
                      <Badge variant={provider.activo ? 'default' : 'secondary'}>
                        {provider.activo ? 'Activo' : 'Archivado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div onClick={(event) => event.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Acciones de proveedor">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-52">
                            <DropdownMenuItem onSelect={() => goToPedidosForProvider(provider)}>
                              <Truck className="h-4 w-4" />
                              Ver pedidos de este proveedor
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => goToProviderDetail(provider)}>
                              <Eye className="h-4 w-4" />
                              Ver detalle del proveedor
                            </DropdownMenuItem>
                            {canEdit && (
                              <>
                                <DropdownMenuItem onSelect={() => openEditProvider(provider)}>
                                  <Pencil className="h-4 w-4" />
                                  Editar proveedor
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => {
                                    void toggleArchiveProvider(provider)
                                  }}
                                >
                                  {provider.activo ? (
                                    <>
                                      <Archive className="h-4 w-4" />
                                      Archivar proveedor
                                    </>
                                  ) : (
                                    <>
                                      <RotateCcw className="h-4 w-4" />
                                      Restaurar proveedor
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Página {currentPage} de {totalPages} · {total} registros</p>
          <div className="flex items-center gap-2">
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

      <ProveedorModal
        open={providerDialogOpen}
        onClose={() => setProviderDialogOpen(false)}
        onSaved={() => void loadProviders()}
        proveedor={editingProvider}
      />
    </div>
  )
}
