import { useState } from 'react'
import { toast } from 'sonner'
import { generarReporte } from '@/features/reportes/api/reporte'
import type { TipoReporte } from '@/features/reportes/types/reporte'
import ModalShell, { ModalSection, RequiredMark } from '@/components/ModalShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const TIPOS: { value: TipoReporte; label: string }[] = [
  { value: 'INVENTARIO',  label: 'Inventario' },
  { value: 'VENTAS',      label: 'Ventas' },
  { value: 'CLIENTES',    label: 'Clientes' },
  { value: 'MOVIMIENTOS', label: 'Movimientos' },
  { value: 'ALERTAS',     label: 'Alertas' },
]

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const emptyForm = { nombre: '', tipo: '' as TipoReporte | '', descripcion: '' }

export default function ReporteFormModal({ open, onClose, onSuccess }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const handleClose = () => {
    setForm(emptyForm)
    onClose()
  }

  const handleSubmit = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    if (!form.tipo) { toast.error('Selecciona un tipo de reporte'); return }

    setSaving(true)
    try {
      await generarReporte({
        nombre: form.nombre.trim(),
        tipo: form.tipo as TipoReporte,
        descripcion: form.descripcion.trim() || undefined,
      })
      toast.success('Reporte generado correctamente')
      setForm(emptyForm)
      onSuccess()
      onClose()
    } catch {
      toast.error('No se pudo generar el reporte')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      title="Nuevo reporte"
      description="Selecciona el tipo y ponle un nombre para identificarlo."
    >
      <div className="space-y-5 px-6 py-5">
        <ModalSection title="Datos del reporte">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Nombre <RequiredMark />
              </label>
              <Input
                placeholder="Ej: Inventario semanal Q2"
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Tipo <RequiredMark />
              </label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm((p) => ({ ...p, tipo: v as TipoReporte }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo…" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Descripción <span className="font-normal">(opcional)</span>
              </label>
              <Input
                placeholder="Notas adicionales sobre el reporte…"
                value={form.descripcion}
                onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
              />
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
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
          >
            {saving ? <Spinner data-icon="inline-start" /> : null}
            {saving ? 'Generando' : 'Generar reporte'}
          </Button>
        </div>
      </div>
    </ModalShell>
  )
}
