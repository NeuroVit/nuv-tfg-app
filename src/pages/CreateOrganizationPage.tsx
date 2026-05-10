import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createOrganization, joinOrganization, searchOrganizations } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { parseApiError } from '@/lib/apiError'
import { useSessionStore } from '@/store/sessionStore'
import type { OrganizationSearchItem } from '@/types/auth'

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(200, 'Máximo 200 caracteres'),
})

type FormData = z.infer<typeof schema>

export default function CreateOrganizationPage() {
  const navigate = useNavigate()
  const refreshSession = useSessionStore((s) => s.refreshSession)
  const [serverError, setServerError] = useState<string | null>(null)
  const [joinQuery, setJoinQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [joining, setJoining] = useState(false)
  const [searchResults, setSearchResults] = useState<OrganizationSearchItem[]>([])
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('')

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  })

  const refreshSessionAndRedirect = async (successMessage: string) => {
    const session = await refreshSession({ withLoading: false })
    if (!session || session.requiresOrganizationOnboarding) {
      setServerError('No se pudo completar la organización. Inténtalo de nuevo.')
      return
    }

    toast.success(successMessage)
    navigate('/dashboard', { replace: true })
  }

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      await createOrganization({ name: data.name })
      await refreshSessionAndRedirect('Organización creada correctamente')
    } catch (error) {
      const message = parseApiError(error, 'No se pudo crear la organización')
      setServerError(message)
      toast.error(message)
    }
  }

  const onSearchOrganizations = async () => {
    const normalizedQuery = joinQuery.trim()
    if (normalizedQuery.length < 2) {
      setServerError('Introduce al menos 2 caracteres para buscar una organización.')
      return
    }

    setServerError(null)
    setSearching(true)
    try {
      const organizations = await searchOrganizations(normalizedQuery, 10)
      setSearchResults(organizations)
      setSelectedOrganizationId(organizations[0]?.id.toString() ?? '')
      if (organizations.length === 0) {
        setServerError('No se encontraron organizaciones con ese nombre.')
      }
    } catch (error) {
      const message = parseApiError(error, 'No se pudo buscar organizaciones')
      setServerError(message)
      toast.error(message)
      setSearchResults([])
      setSelectedOrganizationId('')
    } finally {
      setSearching(false)
    }
  }

  const onJoinOrganization = async () => {
    if (!selectedOrganizationId) {
      setServerError('Selecciona una organización para continuar.')
      return
    }

    setServerError(null)
    setJoining(true)
    try {
      await joinOrganization({ organizationId: Number(selectedOrganizationId) })
      await refreshSessionAndRedirect('Te uniste a la organización correctamente')
    } catch (error) {
      const message = parseApiError(error, 'No se pudo unir a la organización')
      setServerError(message)
      toast.error(message)
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configura tu organización</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Necesitas una organización para empezar a usar la app.
          </p>
        </div>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Crear organización</TabsTrigger>
            <TabsTrigger value="join">Unirme a una existente</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la organización</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Clinic" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  Crear organización
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="join" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organization-search">Buscar organización por nombre</Label>
              <div className="flex gap-2">
                <Input
                  id="organization-search"
                  placeholder="Escribe el nombre de la organización"
                  value={joinQuery}
                  onChange={(event) => setJoinQuery(event.target.value)}
                />
                <Button type="button" variant="outline" onClick={onSearchOrganizations} disabled={searching}>
                  {searching ? 'Buscando...' : 'Buscar'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization-select">Organizaciones encontradas</Label>
              <Select value={selectedOrganizationId} onValueChange={setSelectedOrganizationId}>
                <SelectTrigger id="organization-select">
                  <SelectValue placeholder="Selecciona una organización" />
                </SelectTrigger>
                <SelectContent>
                  {searchResults.map((organization) => (
                    <SelectItem key={organization.id} value={organization.id.toString()}>
                      {organization.name} ({organization.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="button" className="w-full" onClick={onJoinOrganization} disabled={joining || !selectedOrganizationId}>
              {joining ? 'Uniéndote...' : 'Unirme como Viewer'}
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
