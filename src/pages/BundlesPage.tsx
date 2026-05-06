import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import {
  actualizarBundle,
  crearBundle,
  eliminarBundle,
  getBundleItems,
  getBundles,
} from '@/api/bundle'
import { getProductos } from '@/api/producto'
import type { BundleItem, BundleSummary, BundleUpsertRequest } from '@/types/bundle'
import type { Producto } from '@/types/producto'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'

type BundleFormItem = {
  productoId: string
  cantidad: number
}

type BundleFormState = {
  nombre: string
  descripcion: string
  descuentoPct: string
  activo: boolean
  items: BundleFormItem[]
}

const emptyBundleForm: BundleFormState = {
  nombre: '',
  descripcion: '',
  descuentoPct: '0',
  activo: true,
  items: [{ productoId: '', cantidad: 1 }],
}

const parseApiError = (error: unknown, fallback: string): string => {
  if (!isAxiosError(error)) return fallback
  const payload = error.response?.data
  if (typeof payload === 'string') return payload
  if (payload && typeof payload === 'object') {
    const data = payload as { message?: string; error?: string }
    if (data.message) return data.message
    if (data.error) return data.error
  }
  return fallback
}

export default function BundlesPage() {
  const { hasRole } = useAuthStore()
  const canEdit = hasRole('ROLE_ADMIN') || hasRole('ROLE_MANAGER')

  const [bundles, setBundles] = useState<BundleSummary[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)

  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedBundle, setSelectedBundle] = useState<BundleSummary | null>(null)
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)

  const [upsertOpen, setUpsertOpen] = useState(false)
  const [upsertMode, setUpsertMode] = useState<'create' | 'edit'>('create')
  const [editingBundle, setEditingBundle] = useState<BundleSummary | null>(null)
  const [bundleForm, setBundleForm] = useState<BundleFormState>(emptyBundleForm)
  const [savingBundle, setSavingBundle] = useState(false)

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

  const openBundleDetail = async (bundle: BundleSummary) => {
    setSelectedBundle(bundle)
    setDetailOpen(true)
    setLoadingItems(true)
    try {
      const items = await getBundleItems(bundle.id)
      setBundleItems(items)
    } catch (error: unknown) {
      setBundleItems([])
      toast.error(parseApiError(error, 'No se pudieron cargar los productos del bundle'))
    } finally {
      setLoadingItems(false)
    }
  }

  const openCreateDialog = () => {
    setUpsertMode('create')
    setEditingBundle(null)
    setBundleForm(emptyBundleForm)
    setUpsertOpen(true)
  }

  const openEditDialog = async (bundle: BundleSummary) => {
    setUpsertMode('edit')
    setEditingBundle(bundle)
    setSavingBundle(false)

    try {
      const items = await getBundleItems(bundle.id)
      setBundleForm({
        nombre: bundle.nombre,
        descripcion: bundle.descripcion ?? '',
        descuentoPct: String(bundle.descuentoPct),
        activo: bundle.activo,
        items: items.length
          ? items.map((item) => ({ productoId: String(item.productoId), cantidad: item.cantidad }))
          : [{ productoId: '', cantidad: 1 }],
      })
      setUpsertOpen(true)
    } catch (error: unknown) {
      toast.error(parseApiError(error, 'No se pudo abrir el bundle para edición'))
    }
  }

  const addItemRow = () => {
    setBundleForm((current) => ({
      ...current,
      items: [...current.items, { productoId: '', cantidad: 1 }],
    }))
  }

  const removeItemRow = (index: number) => {
    setBundleForm((current) => {
      const updated = current.items.filter((_, idx) => idx !== index)
      return {
        ...current,
        items: updated.length ? updated : [{ productoId: '', cantidad: 1 }],
      }
    })
  }

  const updateItemProducto = (index: number, value: string) => {
    setBundleForm((current) => ({
      ...current,
      items: current.items.map((item, idx) => (idx === index ? { ...item, productoId: value } : item)),
    }))
  }

  const updateItemCantidad = (index: number, value: number) => {
    setBundleForm((current) => ({
      ...current,
      items: current.items.map((item, idx) => (idx === index ? { ...item, cantidad: value } : item)),
    }))
  }

  const buildPayload = (): BundleUpsertRequest | null => {
    const nombre = bundleForm.nombre.trim()
    if (!nombre) {
      toast.error('El nombre del bundle es obligatorio')
      return null
    }

    const descuento = Number(bundleForm.descuentoPct)
    if (Number.isNaN(descuento) || descuento < 0 || descuento > 100) {
      toast.error('El descuento debe estar entre 0 y 100')
      return null
    }

    const selectedItems = bundleForm.items
      .map((item) => ({ productoId: Number(item.productoId), cantidad: Number(item.cantidad) }))
      .filter((item) => !Number.isNaN(item.productoId))

    if (selectedItems.length === 0) {
      toast.error('Debes agregar al menos un producto al bundle')
      return null
    }

    if (selectedItems.some((item) => item.cantidad < 1)) {
      toast.error('La cantidad por producto debe ser mayor o igual a 1')
      return null
    }

    const ids = selectedItems.map((item) => item.productoId)
    if (new Set(ids).size !== ids.length) {
      toast.error('No puedes repetir el mismo producto dentro del bundle')
      return null
    }

    return {
      nombre,
      descripcion: bundleForm.descripcion.trim() || undefined,
      descuentoPct: descuento,
      activo: bundleForm.activo,
      items: selectedItems,
    }
  }

  const submitBundle = async () => {
    const payload = buildPayload()
    if (!payload) return

    setSavingBundle(true)
    try {
      if (upsertMode === 'create') {
        await crearBundle(payload)
        toast.success(`Bundle "${payload.nombre}" creado correctamente.`)
      } else if (editingBundle) {
        await actualizarBundle(editingBundle.id, payload)
        toast.success(`Bundle "${payload.nombre}" actualizado correctamente.`)
      }

      await cargarDatos()
      setUpsertOpen(false)
      setEditingBundle(null)
      setBundleForm(emptyBundleForm)
    } catch (error: unknown) {
      toast.error(parseApiError(error, 'No se pudo guardar el bundle'))
    } finally {
      setSavingBundle(false)
    }
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bundles</h1>
            <p className="mt-1 text-sm text-muted-foreground">{bundles.length} bundles creados</p>
          </div>
          {canEdit && (
            <Button className="w-full sm:w-auto" onClick={openCreateDialog}>
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
                <TableHead>Descuento</TableHead>
                <TableHead>Productos</TableHead>
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
              ) : bundles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    No hay bundles para mostrar.
                  </TableCell>
                </TableRow>
              ) : (
                bundles.map((bundle) => (
                  <TableRow
                    key={bundle.id}
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => {
                      void openBundleDetail(bundle)
                    }}
                  >
                    <TableCell className="font-medium">{bundle.nombre}</TableCell>
                    <TableCell className="max-w-[320px] whitespace-normal text-muted-foreground">
                      {bundle.descripcion || 'Sin descripción'}
                    </TableCell>
                    <TableCell>{Number(bundle.descuentoPct).toFixed(2)}%</TableCell>
                    <TableCell>{bundle.cantidadProductos}</TableCell>
                    <TableCell>
                      <Badge variant={bundle.activo ? 'default' : 'secondary'}>
                        {bundle.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(bundle.actualizadoEn).toLocaleString('es-ES', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
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
                              <DropdownMenuItem
                                onSelect={() => {
                                  void openEditDialog(bundle)
                                }}
                              >
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

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) {
            setSelectedBundle(null)
            setBundleItems([])
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Productos del bundle: {selectedBundle?.nombre}</DialogTitle>
          </DialogHeader>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingItems ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                      Cargando productos del bundle...
                    </TableCell>
                  </TableRow>
                ) : bundleItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                      Este bundle no tiene productos asociados.
                    </TableCell>
                  </TableRow>
                ) : (
                  bundleItems.map((item) => (
                    <TableRow key={item.productoId}>
                      <TableCell className="font-medium">{item.productoNombre}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                      <TableCell>{item.cantidad}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={upsertOpen}
        onOpenChange={(open) => {
          setUpsertOpen(open)
          if (!open) {
            setEditingBundle(null)
            setBundleForm(emptyBundleForm)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{upsertMode === 'create' ? 'Nuevo bundle' : 'Editar bundle'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Nombre</Label>
                <Input
                  value={bundleForm.nombre}
                  onChange={(event) => setBundleForm((current) => ({ ...current, nombre: event.target.value }))}
                  placeholder="Ej. Pack Home Office"
                />
              </div>

              <div className="space-y-1">
                <Label>Descuento (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={bundleForm.descuentoPct}
                  onChange={(event) =>
                    setBundleForm((current) => ({ ...current, descuentoPct: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Descripción (opcional)</Label>
              <Textarea
                rows={3}
                value={bundleForm.descripcion}
                onChange={(event) => setBundleForm((current) => ({ ...current, descripcion: event.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label>Estado</Label>
              <Select
                value={bundleForm.activo ? 'true' : 'false'}
                onValueChange={(value) => setBundleForm((current) => ({ ...current, activo: value === 'true' }))}
              >
                <SelectTrigger className="w-full md:w-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Activo</SelectItem>
                  <SelectItem value="false">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Productos del bundle</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                  Añadir producto
                </Button>
              </div>

              <div className="space-y-2">
                {bundleForm.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 gap-2 rounded-md border p-3 md:grid-cols-[1fr_120px_auto]">
                    <Select value={item.productoId} onValueChange={(value) => updateItemProducto(index, value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {productos.map((producto) => (
                          <SelectItem key={producto.id} value={String(producto.id)}>
                            {producto.nombre} ({producto.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      min="1"
                      value={item.cantidad}
                      onChange={(event) => updateItemCantidad(index, Number(event.target.value))}
                    />

                    <Button type="button" variant="ghost" onClick={() => removeItemRow(index)}>
                      Quitar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setUpsertOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void submitBundle()} disabled={savingBundle}>
              {savingBundle ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
