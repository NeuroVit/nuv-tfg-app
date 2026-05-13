import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { eliminarBundle, getBundles } from '@/api/bundle'
import { getProductos } from '@/api/producto'
import type { BundleSummary } from '@/types/bundle'
import type { Producto } from '@/types/producto'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { parseApiError } from '@/lib/apiError'
import { useFormatters } from '@/lib/useFormatters'
import BundleDetailModal from '@/components/BundleDetailModal'
import BundleFormModal from '@/components/BundleFormModal'

export default function BundlesPage() {
  const { formatDateTime } = useFormatters()
  const { hasRole } = useAuthStore()
  const canEdit = hasRole('ROLE_ADMIN') || hasRole('ROLE_MANAGER')

  const [bundles, setBundles] = useState<BundleSummary[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [bundleSearch, setBundleSearch] = useState('')
  const [bundleStatus, setBundleStatus] = useState<'all' | 'active' | 'inactive'>('all')

  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedBundle, setSelectedBundle] = useState<BundleSummary | null>(null)

  const [upsertOpen, setUpsertOpen] = useState(false)
  const [editingBundle, setEditingBundle] = useState<BundleSummary | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingBundle, setDeletingBundle] = useState<BundleSummary | null>(null)
  const [deleting, setDeleting] = useState(false)

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const [bundlesData, productosData] = await Promise.all([getBundles(), getProductos()])
      setBundles(bundlesData)
      setProductos(productosData)
    } catch (error: unknown) {
      toast.error(parseApiError(error, 'No se pudieron cargar los datos de bundles'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void cargarDatos()
  }, [])

  const bundlesFiltrados = useMemo(() => {
    const term = bundleSearch.trim().toLowerCase()
    return bundles.filter((bundle) => {
      const textOk =
        !term ||
        bundle.nombre.toLowerCase().includes(term) ||
        (bundle.descripcion ?? '').toLowerCase().includes(term)
      const statusOk =
        bundleStatus === 'all' ||
        (bundleStatus === 'active' && bundle.activo) ||
        (bundleStatus === 'inactive' && !bundle.activo)
      return textOk && statusOk
    })
  }, [bundleSearch, bundleStatus, bundles])

  const openBundleDetail = (bundle: BundleSummary) => {
    setSelectedBundle(bundle)
    setDetailOpen(true)
  }

  const openCreateDialog = () => {
    setEditingBundle(null)
    setUpsertOpen(true)
  }

  const openEditDialog = (bundle: BundleSummary) => {
    setEditingBundle(bundle)
    setUpsertOpen(true)
  }

  const requestDelete = (bundle: BundleSummary) => {
    setDeletingBundle(bundle)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingBundle) return
    setDeleting(true)
    try {
      await eliminarBundle(deletingBundle.id)
      await cargarDatos()
      toast.success(`Bundle "${deletingBundle.nombre}" eliminado correctamente.`)
      setDeleteOpen(false)
      setDeletingBundle(null)
    } catch (error: unknown) {
      toast.error(parseApiError(error, 'No se pudo eliminar el bundle'))
      setDeleteOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <h1 className="shrink-0 text-2xl font-bold text-foreground">Bundles</h1>
          <Input
            value={bundleSearch}
            onChange={(event) => setBundleSearch(event.target.value)}
            placeholder="Buscar por nombre o descripción"
            className="w-full lg:ml-4 lg:max-w-sm"
          />
          <Select value={bundleStatus} onValueChange={(value) => setBundleStatus(value as 'all' | 'active' | 'inactive')}>
            <SelectTrigger className="w-full lg:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
          {canEdit && (
            <Button className="w-full lg:ml-auto lg:w-auto" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo bundle
            </Button>
          )}
        </div>
<div className="rounded-lg border bg-card">
          <Table className="min-w-[1020px]">
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-center">Descuento</TableHead>
                <TableHead className="text-center">Productos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Actualizado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    Cargando bundles...
                  </TableCell>
                </TableRow>
              ) : bundlesFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    No hay bundles para mostrar.
                  </TableCell>
                </TableRow>
              ) : (
                bundlesFiltrados.map((bundle) => (
                  <TableRow
                    key={bundle.id}
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => openBundleDetail(bundle)}
                  >
                    <TableCell className="font-medium">{bundle.nombre}</TableCell>
                    <TableCell className="max-w-[320px] whitespace-normal text-muted-foreground">
                      {bundle.descripcion || 'Sin descripción'}
                    </TableCell>
                    <TableCell className="text-center">{Number(bundle.descuentoPct).toFixed(2)}%</TableCell>
                    <TableCell className="text-center">{bundle.cantidadProductos}</TableCell>
                    <TableCell>
                      <Badge variant={bundle.activo ? 'default' : 'secondary'}>
                        {bundle.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDateTime(bundle.actualizadoEn, { dateStyle: 'short', timeStyle: 'short' })}
                    </TableCell>
                    <TableCell>
                      {canEdit && (
                        <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Acciones de bundle">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-40">
                              <DropdownMenuItem onSelect={() => openEditDialog(bundle)}>
                                <Pencil className="h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => requestDelete(bundle)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <BundleDetailModal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false)
          setSelectedBundle(null)
        }}
        bundle={selectedBundle}
      />

      <BundleFormModal
        open={upsertOpen}
        onClose={() => {
          setUpsertOpen(false)
          setEditingBundle(null)
        }}
        onSaved={() => void cargarDatos()}
        bundle={editingBundle}
        productos={productos}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar bundle</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que quieres eliminar el bundle "{deletingBundle?.nombre}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

