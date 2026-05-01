import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { crearCategoria, editarCategoria, eliminarCategoria, getCategorias } from '@/api/categoria'
import type { Categoria, CategoriaRequest } from '@/types/producto'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const categoriaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  descripcion: z.string().max(500, 'Máximo 500 caracteres').optional(),
})

type CategoriaFormValues = z.infer<typeof categoriaSchema>

type DialogMode = 'create' | 'edit'

const defaultFormValues: CategoriaFormValues = {
  nombre: '',
  descripcion: '',
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

export default function CategoriasPage() {
  const { hasRole } = useAuthStore()
  const canEdit = hasRole('ROLE_ADMIN') || hasRole('ROLE_MANAGER')

  const [categories, setCategories] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<DialogMode>('create')
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState<Categoria | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: defaultFormValues,
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getCategorias()
      setCategories(data)
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
    setDialogMode('create')
    setEditingCategory(null)
    form.reset(defaultFormValues)
    form.clearErrors()
    setDialogOpen(true)
  }

  const openEditDialog = (category: Categoria) => {
    setDialogMode('edit')
    setEditingCategory(category)
    form.reset({
      nombre: category.nombre,
      descripcion: category.descripcion ?? '',
    })
    form.clearErrors()
    setDialogOpen(true)
  }

  const submitCategory = async (values: CategoriaFormValues) => {
    setSubmitting(true)
    form.clearErrors()

    const payload: CategoriaRequest = {
      nombre: values.nombre,
      descripcion: values.descripcion?.trim() ? values.descripcion.trim() : undefined,
    }

    try {
      if (dialogMode === 'create') {
        await crearCategoria(payload)
      } else if (editingCategory) {
        await editarCategoria(editingCategory.id, payload)
      }

      await loadData()
      setDialogOpen(false)
      setEditingCategory(null)
    } catch (error: unknown) {
      form.setError('root', {
        message: parseApiError(error, 'No se pudo guardar la categoría'),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const requestDelete = (category: Categoria) => {
    setDeletingCategory(category)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingCategory) return

    setSubmitting(true)
    try {
      await eliminarCategoria(deletingCategory.id)
      await loadData()
      setDeleteOpen(false)
      setDeletingCategory(null)
    } catch (error: unknown) {
      form.setError('root', {
        message: parseApiError(error, 'No se pudo eliminar la categoría'),
      })
      setDeleteOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
            <p className="mt-1 text-sm text-gray-500">{filteredCategories.length} categorías</p>
          </div>
          {canEdit && (
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva categoría
            </Button>
          )}
        </div>

        {form.formState.errors.root?.message && (
          <Alert variant="destructive">
            <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
          </Alert>
        )}

        <Input
          placeholder="Buscar por nombre o descripción..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-sm"
        />

        <div className="overflow-hidden rounded-lg border bg-white">
          <Table>
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
                  <TableCell colSpan={3} className="py-10 text-center text-gray-400">
                    Cargando categorías...
                  </TableCell>
                </TableRow>
              ) : filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-gray-400">
                    No hay categorías para mostrar.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.nombre}</TableCell>
                    <TableCell className="max-w-[420px] whitespace-normal text-gray-600">
                      {category.descripcion || '—'}
                    </TableCell>
                    <TableCell>
                      {canEdit && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(category)}
                            aria-label="Editar categoría"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => requestDelete(category)}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            aria-label="Eliminar categoría"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingCategory(null)
            form.clearErrors()
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? 'Nueva categoría' : 'Editar categoría'}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(submitCategory)} className="space-y-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Electrónica" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (opcional)</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder="Descripción de la categoría" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Guardar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
