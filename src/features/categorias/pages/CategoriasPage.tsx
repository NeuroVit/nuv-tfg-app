import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { eliminarCategoria, getCategorias } from '@/features/categorias/api/categoria'
import type { Categoria } from '@/features/productos/types/producto'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { parseApiError } from '@/lib/apiError'
import CategoriaModal from '@/features/categorias/components/CategoriaModal'

export default function CategoriasPage() {
  const { hasRole } = useAuthStore()
  const canEdit = hasRole('ROLE_ADMIN') || hasRole('ROLE_MANAGER')

  const [categories, setCategories] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState<Categoria | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getCategorias()
      const sorted = [...data].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-ES'))
      setCategories(sorted)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return categories

    return categories.filter((category) => {
      const name = category.nombre.toLowerCase()
      const description = (category.descripcion ?? '').toLowerCase()
      return name.includes(term) || description.includes(term)
    })
  }, [categories, search])

  const openCreateDialog = () => {
    setEditingCategory(null)
    setDialogOpen(true)
  }

  const openEditDialog = (category: Categoria) => {
    setEditingCategory(category)
    setDialogOpen(true)
  }

  const requestDelete = (category: Categoria) => {
    setDeletingCategory(category)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingCategory) return

    setSubmitting(true)
    try {
      const deletedName = deletingCategory.nombre
      await eliminarCategoria(deletingCategory.id)
      await loadData()
      setDeleteOpen(false)
      setDeletingCategory(null)
      setPageError(null)
      toast.success(`Categoría "${deletedName}" eliminada correctamente.`)
    } catch (error: unknown) {
      const rawMessage = parseApiError(error, 'No se pudo eliminar la categoría')
      const errorMessage = /foreign key|constraint|referenc|error interno del servidor|internal server|unexpected error/i.test(rawMessage)
        ? 'No puedes eliminar esta categoría porque tiene productos asociados.'
        : rawMessage
      setPageError(errorMessage)
      setDeleteOpen(false)
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <h1 className="shrink-0 text-2xl font-bold text-foreground">Categorías</h1>
          <Input
            placeholder="Buscar por nombre o descripción..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full lg:ml-4 lg:max-w-sm"
          />
          {canEdit && (
            <Button className="w-full lg:ml-auto lg:w-auto" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva categoría
            </Button>
          )}
        </div>

        {!canEdit && (
          <Alert>
            <AlertDescription>
              Tu rol actual es de solo lectura en esta sección.
            </AlertDescription>
          </Alert>
        )}

        {pageError && (
          <Alert variant="destructive">
            <AlertDescription>{pageError}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border bg-card">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                    Cargando categorías...
                  </TableCell>
                </TableRow>
              ) : filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                    No hay categorías para mostrar.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.nombre}</TableCell>
                    <TableCell className="max-w-[420px] whitespace-normal text-muted-foreground">
                      {category.descripcion || 'Sin descripción'}
                    </TableCell>
                    <TableCell>
                      {canEdit && (
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Acciones de categoría">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-40">
                              <DropdownMenuItem onSelect={() => openEditDialog(category)}>
                                <Pencil className="h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" onSelect={() => requestDelete(category)}>
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

      <CategoriaModal
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditingCategory(null)
        }}
        onSaved={() => void loadData()}
        categoria={editingCategory}
        existingCategorias={categories}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar categoría</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que quieres eliminar la categoría "{deletingCategory?.nombre}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={submitting}>
              {submitting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
