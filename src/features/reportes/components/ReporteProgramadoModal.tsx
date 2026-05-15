import { useState } from 'react'
import { toast } from 'sonner'
import { crearReporteProgramado } from '@/features/reportes/api/reporte'
import type { FrecuenciaReporte, TipoReporte } from '@/features/reportes/types/reporte'
import ModalShell, { ModalSection, RequiredMark } from '@/components/ModalShell'
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

const FRECUENCIAS: { value: FrecuenciaReporte; label: string; desc: string }[] = [
  { value: 'DIARIO',   label: 'Diario',   desc: 'Se genera cada día a medianoche' },
  { value: 'SEMANAL',  label: 'Semanal',  desc: 'Se genera cada semana' },
  { value: 'MENSUAL',  label: 'Mensual',  desc: 'Se genera el 1.º de cada mes' },
]

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const emptyForm = { tipo: '' as TipoReporte | '', frecuencia: '' as FrecuenciaReporte | '' }

export default function ReporteProgramadoModal({ open, onClose, onSuccess }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const handleClose = () => {
    setForm(emptyForm)
    onClose()
  }

  const handleSubmit = async () => {
    if (!form.tipo) { toast.error('Selecciona el tipo de reporte'); return }
    if (!form.frecuencia) { toast.error('Selecciona la frecuencia'); return }

    setSaving(true)
    try {
      await crearReporteProgramado({
        tipo: form.tipo as TipoReporte,
        frecuencia: form.frecuencia as FrecuenciaReporte,
      })
      toast.success('Programación creada correctamente')
      setForm(emptyForm)
      onSuccess()
      onClose()
    } catch {
      toast.error('No se pudo crear la programación')
    } finally {
      setSaving(false)
    }
  }

  const selectedFrecuencia = FRECUENCIAS.find((f) => f.value === form.frecuencia)

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      title="Nueva programación"
      description="El reporte se generará automáticamente con la frecuencia elegida."
    >
      <div className="space-y-5 px-6 py-5">
        <ModalSection title="Configuración">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Tipo de reporte <RequiredMark />
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
              <label className="text-sm font-medium">
                Frecuencia <RequiredMark />
              </label>
              <div className="grid grid-cols-3 gap-2">
                {FRECUENCIAS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, frecuencia: f.value }))}
                    className={`rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                      form.frecuencia === f.value
                        ? 'border-primary bg-primary/5 font-medium text-primary'
                        : 'border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {selectedFrecuencia && (
                <p className="text-xs text-muted-foreground">{selectedFrecuencia.desc}</p>
              )}
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
            {saving ? 'Creando…' : 'Crear programación'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
