import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getSession, updateCurrentOrganization } from '@/api/auth'
import type { SessionContext } from '@/types/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseApiError } from '@/lib/apiError'
import { useProfileStore } from '@/store/profileStore'

export default function SettingsOrganizationPage() {
  const setOrganizationNameInStore = useProfileStore((s) => s.setOrganizationName)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [session, setSession] = useState<SessionContext | null>(null)
  const [organizationName, setOrganizationName] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const currentSession = await getSession()
        setSession(currentSession)
        setOrganizationName(currentSession.organization?.name ?? '')
        setOrganizationNameInStore(currentSession.organization?.name ?? '')
      } catch (error: unknown) {
        toast.error(parseApiError(error, 'No se pudo cargar la configuración de organización'))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [setOrganizationNameInStore])

  const canEdit = useMemo(() => {
    const role = (session?.role ?? '').toLowerCase()
    return role === 'owner' || role === 'admin'
  }, [session?.role])

  const onSave = async () => {
    const normalized = organizationName.trim()
    if (!normalized) {
      toast.error('El nombre de la organización es obligatorio')
      return
    }

    setSaving(true)
    try {
      await updateCurrentOrganization({ name: normalized })
      const refreshed = await getSession()
      setSession(refreshed)
      setOrganizationName(refreshed.organization?.name ?? normalized)
      setOrganizationNameInStore(refreshed.organization?.name ?? normalized)
      toast.success('Organización actualizada correctamente')
    } catch (error: unknown) {
      toast.error(parseApiError(error, 'No se pudo actualizar la organización'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl text-sm text-muted-foreground">Cargando organización...</div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organización</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona los datos principales compartidos por toda tu organización.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm sm:p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="organization-id">ID de organización</Label>
            <Input id="organization-id" value={session?.organization?.id ?? ''} readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization-slug">Identificador URL</Label>
            <Input id="organization-slug" value={session?.organization?.slug ?? ''} readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization-name">Nombre de la organización</Label>
            <Input
              id="organization-name"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              disabled={!canEdit}
              placeholder="Escribe el nombre de la organización"
            />
            {!canEdit ? (
              <p className="text-xs text-muted-foreground">
                Solo usuarios con rol <strong>owner</strong> o <strong>admin</strong> pueden editar esta sección.
              </p>
            ) : null}
          </div>

          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Próximamente: más opciones de configuración propiedad de la organización (branding, datos fiscales,
            políticas internas, etc.).
          </div>

          <div>
            <Button onClick={onSave} disabled={saving || !canEdit}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
