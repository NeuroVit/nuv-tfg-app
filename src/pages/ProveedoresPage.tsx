import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Archive, Eye, MoreHorizontal, Pencil, Plus, RotateCcw, Truck } from 'lucide-react'
import {
  archivarProveedor,
  crearProveedor,
  editarProveedor,
  getProveedores,
  restaurarProveedor,
} from '@/api/provider'
import type { Proveedor, ProveedorRequest } from '@/types/provider'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { parseApiError } from '@/lib/apiError'

type ProviderFormState = {
  nombre: string
  ubicacionAlmacen: string
  diasEntrega: string
}

const emptyProviderForm: ProviderFormState = {
  nombre: '',
  ubicacionAlmacen: '',
  diasEntrega: '0',
}
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
  const [providerDialogMode, setProviderDialogMode] = useState<'create' | 'edit'>('create')
  const [providerForm, setProviderForm] = useState<ProviderFormState>(emptyProviderForm)
  const [editingProvider, setEditingProvider] = useState<Proveedor | null>(null)
  const [savingProvider, setSavingProvider] = useState(false)

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
    setProviderDialogMode('create')
    setEditingProvider(null)
    setProviderForm(emptyProviderForm)
    setProviderDialogOpen(true)
  }

  const openEditProvider = (provider: Proveedor) => {
    setProviderDialogMode('edit')
    setEditingProvider(provider)
    setProviderForm({
      nombre: provider.nombre,
      ubicacionAlmacen: provider.ubicacionAlmacen,
      diasEntrega: String(provider.diasEntrega),
    })
    setProviderDialogOpen(true)
  }

  const submitProvider = async () => {
    const payload: ProveedorRequest = {
      nombre: providerForm.nombre.trim(),
      ubicacionAlmacen: providerForm.ubicacionAlmacen.trim(),
      diasEntrega: Number(providerForm.diasEntrega),
    }

    if (!payload.nombre || !payload.ubicacionAlmacen) {
      toast.error('Nombre y ubicaciÃ³n de almacÃ©n son obligatorios')
      return
    }
    if (Number.isNaN(payload.diasEntrega) || payload.diasEntrega < 0) {
      toast.error('El plazo de entrega debe ser un nÃºmero mayor o igual a 0')
      return
    }

    setSavingProvider(true)
    try {
      if (providerDialogMode === 'create') {
        await crearProveedor(payload)
        toast.success('Proveedor creado correctamente')
      } else if (editingProvider) {
        await editarProveedor(editingProvider.id, payload)
        toast.success('Proveedor actualizado correctamente')
      }
      setProviderDialogOpen(false)
      await loadProviders()
    } catch (error: unknown) {
      toast.error(parseApiError(error, 'No se pudo guardar el proveedor'))
    } finally {
      setSavingProvider(false)
    }
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
              placeholder="Buscar proveedor o almacÃ©n..."
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>AlmacÃ©n</TableHead>
                <TableHead>Entrega (dÃ­as)</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-16 text-right">Acciones</TableHead>
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
                    <TableCell className="font-medium">{provider.nombre}</TableCell>
                    <TableCell>{provider.ubicacionAlmacen}</TableCell>
                    <TableCell>{provider.diasEntrega}</TableCell>
                    <TableCell>{provider.cantidadProductos}</TableCell>
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
          <p className="text-sm text-muted-foreground">Pagina {currentPage} de {totalPages} Â· {total} registros</p>
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

      <Dialog open={providerDialogOpen} onOpenChange={setProviderDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {providerDialogMode === 'create' ? 'Crear proveedor' : 'Editar proveedor'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={providerForm.nombre}
                onChange={(event) =>
                  setProviderForm((current) => ({ ...current, nombre: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>UbicaciÃ³n del almacÃ©n</Label>
              <Input
                value={providerForm.ubicacionAlmacen}
                onChange={(event) =>
                  setProviderForm((current) => ({ ...current, ubicacionAlmacen: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>DÃ­as de entrega</Label>
              <Input
                type="number"
                min="0"
                value={providerForm.diasEntrega}
                onChange={(event) =>
                  setProviderForm((current) => ({ ...current, diasEntrega: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProviderDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void submitProvider()} disabled={savingProvider}>
              {savingProvider ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


