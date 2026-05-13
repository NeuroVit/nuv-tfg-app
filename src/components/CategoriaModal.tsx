import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { crearCategoria, editarCategoria } from '@/api/categoria'
import type { Categoria, CategoriaRequest } from '@/types/producto'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import ModalShell, { ModalFooter, ModalSection, ModalSubmitButton, RequiredMark } from '@/components/ModalShell'
import { parseApiError } from '@/lib/apiError'

const categoriaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  descripcion: z.string().max(500, 'Máximo 500 caracteres').optional(),
})

type CategoriaFormValues = z.infer<typeof categoriaSchema>

const defaultFormValues: CategoriaFormValues = {
  nombre: '',
  descripcion: '',
}

const normalizarTexto = (text: string): string => text.trim().toLocaleLowerCase('es-ES')

interface CategoriaModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  categoria?: Categoria | null
  existingCategorias: Categoria[]
}

export default function CategoriaModal({ open, onClose, onSaved, categoria, existingCategorias }: CategoriaModalProps) {
  const isEdit = !!categoria
  const form = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: defaultFormValues,
  })

  useEffect(() => {
    if (!open) return
    if (categoria) {
      form.reset({ nombre: categoria.nombre, descripcion: categoria.descripcion ?? '' })
    } else {
      form.reset(defaultFormValues)
    }
    form.clearErrors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, categoria])

  const isNombreDuplicado = (nombre: string): boolean => {
    const nombreNormalizado = normalizarTexto(nombre)
    return existingCategorias.some((c) => {
      if (isEdit && categoria?.id === c.id) return false
      return normalizarTexto(c.nombre) === nombreNormalizado
    })
  }

  const submitCategory = async (values: CategoriaFormValues) => {
    form.clearErrors()

    const nombreLimpio = values.nombre.trim()
    if (!nombreLimpio) {
      form.setError('nombre', { message: 'El nombre es obligatorio' })
      return
    }
    if (isNombreDuplicado(nombreLimpio)) {
      form.setError('nombre', { message: 'Ya existe una categoría con ese nombre' })
      return
    }

    const payload: CategoriaRequest = {
      nombre: nombreLimpio,
      descripcion: values.descripcion?.trim() ? values.descripcion.trim() : undefined,
    }

    try {
      if (isEdit && categoria) {
        await editarCategoria(categoria.id, payload)
        toast.success(`Categoría "${payload.nombre}" actualizada correctamente.`)
      } else {
        await crearCategoria(payload)
        toast.success(`Categoría "${payload.nombre}" creada correctamente.`)
      }
      onClose()
      onSaved()
    } catch (error: unknown) {
      const errorMessage = parseApiError(error, 'No se pudo guardar la categoría')
      form.setError('root', { message: errorMessage })
      toast.error(errorMessage)
    }
  }

  const submitting = form.formState.isSubmitting
  const watchedNombre = form.watch('nombre') ?? ''
  const watchedDescripcion = form.watch('descripcion') ?? ''
  const isFormValid =
    Boolean(watchedNombre.trim()) &&
    watchedNombre.trim().length <= 100 &&
    watchedDescripcion.length <= 500 &&
    !isNombreDuplicado(watchedNombre.trim())

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar categoría' : 'Nueva categoría'}
      description="Asigna un nombre y, opcionalmente, una descripción."
      widthClassName="max-w-[520px]"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submitCategory)} className="space-y-5 px-6 py-5">
          {form.formState.errors.root?.message && (
            <Alert variant="destructive">
              <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
            </Alert>
          )}

          <ModalSection title="Datos de la categoría">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre <RequiredMark /></FormLabel>
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
          </ModalSection>

          <ModalFooter onCancel={onClose}>
            <ModalSubmitButton disabled={submitting || !isFormValid}>
              {submitting ? 'Guardando…' : 'Guardar categoría'}
            </ModalSubmitButton>
          </ModalFooter>
        </form>
      </Form>
    </ModalShell>
  )
}
