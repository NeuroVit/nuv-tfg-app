import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createOrganization, getSession } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(200, 'Máximo 200 caracteres'),
})

type FormData = z.infer<typeof schema>

export default function CreateOrganizationPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      await createOrganization({ name: data.name })
      const session = await getSession()
      if (session.requiresOrganizationOnboarding) {
        setServerError('No se pudo completar la organización. Inténtalo de nuevo.')
        return
      }
      toast.success('Organización creada correctamente')
      navigate('/dashboard', { replace: true })
    } catch {
      setServerError('No se pudo crear la organización')
      toast.error('No se pudo crear la organización')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Crea tu organización</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Necesitas una organización para empezar a usar la app.
          </p>
        </div>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

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
      </div>
    </div>
  )
}
