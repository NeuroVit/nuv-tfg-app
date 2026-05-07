import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router'
import { toast } from 'sonner'
import { type CredentialResponse } from '@react-oauth/google'
import { login, googleLogin } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'

import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

const isTauri = () => '__TAURI_INTERNALS__' in window

const schema = z.object({
  username: z.string().min(1, 'Requerido'),
  password: z.string().min(1, 'Requerido'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const isMobile = useIsMobile()
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await login(data)
      setUser({
        username: res.username,
        role: res.role,
        token: res.token,
        mustChangePassword: res.mustChangePassword,
      })
      toast.success(`Bienvenido, ${res.username}.`)
      navigate('/dashboard')
    } catch {
      form.setError('root', { message: 'Credenciales incorrectas' })
      toast.error('Credenciales incorrectas')
    }
  }

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) return
    setIsGoogleSubmitting(true)
    try {
      const res = await googleLogin(response.credential)
      setUser({
        username: res.username,
        role: res.role,
        token: res.token,
        mustChangePassword: res.mustChangePassword,
      })
      toast.success(`Bienvenido, ${res.username}.`)
      navigate('/dashboard')
    } catch {
      form.setError('root', { message: 'Error al iniciar sesión con Google' })
      toast.error('Error al iniciar sesión con Google')
    } finally {
      setIsGoogleSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-4 sm:p-6">
        <div className="pb-4">
          <h1 className="text-2xl font-semibold tracking-tight">NeuralStock</h1>
          <p className="text-sm text-muted-foreground">Introduce tus credenciales para acceder</p>
        </div>
          {form.formState.errors.root && (
            <Alert variant="destructive">
              <AlertDescription>
                {form.formState.errors.root.message}
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario</FormLabel>
                    <FormControl>
                      <Input placeholder="tu_usuario" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Iniciar sesión
              </Button>
            </form>
          </Form>

          {!isTauri() && (
            <>
              <div className="relative">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground uppercase tracking-wide">
                  O continúa con
                </span>
              </div>

              <GoogleAuthButton
                label="Continuar con Google"
                width={isMobile ? '280' : '368'}
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  setIsGoogleSubmitting(false)
                  form.setError('root', { message: 'Error al iniciar sesión con Google' })
                }}
                disabled={isGoogleSubmitting || form.formState.isSubmitting}
              />
            </>
          )}

          <p className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Crear cuenta
            </Link>
          </p>
      </div>
    </div>
  )
}
