import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { crearTarea } from '@/features/tareas/api/tarea'
import type { PrioridadTarea, TareaAsignableUsuario } from '@/features/tareas/types/tarea'
import ModalShell, { ModalSection, RequiredMark } from '@/components/ModalShell'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Props {
  open: boolean
  asignables: TareaAsignableUsuario[]
  currentUserId?: number | null
  onClose: () => void
  onSuccess: () => void
}

const emptyForm = { titulo: '', descripcion: '', prioridad: 'MEDIA' as PrioridadTarea, asignadoAUserId: '' }

export default function TareaFormModal({ open, asignables, currentUserId, onClose, onSuccess }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const defaultAssigneeId = currentUserId ?? asignables[0]?.id ?? null
    if (!defaultAssigneeId) return
    setForm((prev) => ({ ...prev, asignadoAUserId: String(defaultAssigneeId) }))
  }, [open, currentUserId, asignables])

  const handleClose = () => {
    setForm(emptyForm)
    onClose()
  }

  const handleSubmit = async () => {
    if (!form.titulo.trim()) { toast.error('El título es obligatorio'); return }

    setSaving(true)
    try {
      const parsedAssigneeId = form.asignadoAUserId ? Number(form.asignadoAUserId) : undefined
      if (parsedAssigneeId !== undefined && Number.isNaN(parsedAssigneeId)) {
        toast.error('Selecciona un usuario válido')
        return
      }
      await crearTarea({
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() || undefined,
        prioridad: form.prioridad,
        asignadoAUserId: parsedAssigneeId,
      })
      toast.success('Tarea creada correctamente')
      setForm(emptyForm)
      onSuccess()
      onClose()
    } catch {
      toast.error('No se pudo crear la tarea')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      title="Nueva tarea"
      description="Crea una tarea manual para gestionar desde el panel."
    >
      <div className="space-y-5 px-6 py-5">
        <ModalSection title="Datos de la tarea">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Título <RequiredMark />
              </label>
              <Input
                placeholder="Ej: Contactar proveedor para reposición"
                value={form.titulo}
                onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Descripción <span className="font-normal">(opcional)</span>
              </label>
              <Textarea
                placeholder="Detalles adicionales sobre la tarea…"
                value={form.descripcion}
                onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Prioridad</label>
              <Select
                value={form.prioridad}
                onValueChange={(v) => setForm((p) => ({ ...p, prioridad: v as PrioridadTarea }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALTA">Alta</SelectItem>
                  <SelectItem value="MEDIA">Media</SelectItem>
                  <SelectItem value="BAJA">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Asignar a <RequiredMark />
              </label>
              <Select
                value={form.asignadoAUserId}
                onValueChange={(v) => setForm((p) => ({ ...p, asignadoAUserId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un usuario" />
                </SelectTrigger>
                <SelectContent>
                  {asignables.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.nombreCompleto} ({u.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </ModalSection>

        <div className="flex items-center justify-end gap-2 border-t pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Creando…' : 'Crear tarea'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
