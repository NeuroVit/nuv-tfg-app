import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getMe, updateMe } from '@/features/auth/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { parseApiError } from '@/lib/apiError'
import { useProfileStore } from '@/store/profileStore'

const FALLBACK_TIME_ZONES = [
  'Europe/Madrid',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
]

const detectTimeZones = () => {
  const maybeIntl = Intl as typeof Intl & {
    supportedValuesOf?: (key: 'timeZone') => string[]
  }
  if (typeof maybeIntl.supportedValuesOf === 'function') {
    return maybeIntl.supportedValuesOf('timeZone')
  }
  return FALLBACK_TIME_ZONES
}

export default function SettingsProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const profile = useProfileStore((s) => s.profile)
  const setProfile = useProfileStore((s) => s.setProfile)
  const [form, setForm] = useState({ nombre: '', apellidos: '', email: '' })
  const [timeZone, setTimeZone] = useState('Europe/Madrid')
  const [timeZones] = useState<string[]>(() => detectTimeZones())

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const me = await getMe()
        setProfile(me)
        setForm({
          nombre: me.nombre ?? '',
          apellidos: me.apellidos ?? '',
          email: me.email ?? '',
        })
        setTimeZone(me.timeZone ?? 'Europe/Madrid')
      } catch (error: unknown) {
        toast.error(parseApiError(error, 'No se pudo cargar tu perfil'))
      } finally {
        setLoading(false)
      }
    }

    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSave = async () => {
    if (!form.nombre.trim() || !form.apellidos.trim() || !form.email.trim()) {
      toast.error('Nombre, apellidos y email son obligatorios')
      return
    }

    setSaving(true)
    try {
      const updated = await updateMe({
        nombre: form.nombre.trim(),
        apellidos: form.apellidos.trim(),
        email: form.email.trim(),
        timeZone,
      })
      setProfile(updated)
      toast.success('Perfil actualizado correctamente')
    } catch (error: unknown) {
      toast.error(parseApiError(error, 'No se pudo actualizar el perfil'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl text-sm text-muted-foreground">Cargando perfil...</div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Perfil</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestiona tu información de cuenta.</p>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm sm:p-6 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-username">Usuario</Label>
              <Input id="profile-username" value={profile?.username ?? ''} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-role">Rol</Label>
              <Input id="profile-role" value={profile?.role ?? ''} readOnly />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Nombre</Label>
              <Input
                id="profile-name"
                value={form.nombre}
                onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-lastname">Apellidos</Label>
              <Input
                id="profile-lastname"
                value={form.apellidos}
                onChange={(event) => setForm((prev) => ({ ...prev, apellidos: event.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Zona horaria</Label>
            <Select value={timeZone} onValueChange={setTimeZone}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona zona horaria" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {timeZones.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Button onClick={onSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
