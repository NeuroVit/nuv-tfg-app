import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
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
import {
  MOBILE_GOOGLE_DEBUG_ENABLED,
  MOBILE_GOOGLE_DEBUG_EVENT,
  getMobileGoogleDebugTimeline,
  isTauriMobile,
  type MobileGoogleDebugEntry,
  registerTauriMobileGoogleListener,
  startTauriMobileGoogleLogin,
} from '@/lib/tauriMobileGoogleAuth'

const schema = z.object({
  username: z.string().min(1, 'Requerido'),
  password: z.string().min(1, 'Requerido'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const isMobile = useIsMobile()
  const tauriMobile = isTauriMobile()
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const [mobileGoogleDebug, setMobileGoogleDebug] = useState<MobileGoogleDebugEntry[]>(
    () => (tauriMobile ? getMobileGoogleDebugTimeline() : [])
  )

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
    } catch (err: unknown) {
      const msg = isAxiosError<{ message?: string; mensaje?: string }>(err)
        ? (err.response?.data?.message ??
          err.response?.data?.mensaje ??
          'Error al iniciar sesión con Google')
        : 'Error al iniciar sesión con Google'
      form.setError('root', { message: msg })
      toast.error(msg)
    } finally {
      setIsGoogleSubmitting(false)
    }
  }

  useEffect(() => {
    if (!tauriMobile) return

    let active = true
    let cleanup: (() => void) | undefined

    registerTauriMobileGoogleListener({
      onSuccess: async (res) => {
        setUser({
          username: res.username,
          role: res.role,
          token: res.token,
          mustChangePassword: res.mustChangePassword,
        })
        toast.success(`Bienvenido, ${res.username}.`)
        navigate('/dashboard')
      },
      onError: (message) => {
        setIsGoogleSubmitting(false)
        form.setError('root', { message })
        toast.error(message)
      },
    })
      .then((unlisten) => {
        if (!active) {
          unlisten()
          return
        }
        cleanup = unlisten
      })
      .catch(() => {
        setIsGoogleSubmitting(false)
        form.setError('root', { message: 'No se pudo inicializar Google en móvil' })
      })

    return () => {
      active = false
      cleanup?.()
    }
  }, [form, navigate, setUser, tauriMobile])

  useEffect(() => {
    if (!tauriMobile || !MOBILE_GOOGLE_DEBUG_ENABLED) return

    const syncDebugTimeline = () => {
      setMobileGoogleDebug(getMobileGoogleDebugTimeline())
    }

    window.addEventListener(MOBILE_GOOGLE_DEBUG_EVENT, syncDebugTimeline)
    syncDebugTimeline()

    return () => {
      window.removeEventListener(MOBILE_GOOGLE_DEBUG_EVENT, syncDebugTimeline)
    }
  }, [tauriMobile])

  const startMobileGoogleLogin = async () => {
    setIsGoogleSubmitting(true)
    try {
      await startTauriMobileGoogleLogin()
    } catch {
      setIsGoogleSubmitting(false)
      form.setError('root', { message: 'No se pudo abrir Google en el navegador' })
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 dark:hidden" style={{ background: 'linear-gradient(180deg, #f4f7fb 0%, #e9eef6 52%, #e3e9f3 100%)' }} />
        <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(180deg, #0b0b0c 0%, #050505 100%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-4 p-4 sm:p-6">
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

          {tauriMobile && MOBILE_GOOGLE_DEBUG_ENABLED && mobileGoogleDebug.length > 0 && (
            <div className="rounded-md border border-muted p-3 text-xs">
              <p className="font-medium text-foreground">Debug Google móvil</p>
              <div className="mt-2 space-y-1 text-muted-foreground">
                {mobileGoogleDebug.slice(-6).map((entry, index) => (
                  <p key={`${entry.at}-${entry.step}-${index}`}>
                    [{new Date(entry.at).toLocaleTimeString()}] {entry.step}
                    {entry.detail ? ` - ${entry.detail}` : ''}
                  </p>
                ))}
              </div>
            </div>
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

          <>
            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 text-xs text-muted-foreground uppercase tracking-wide">
                O continúa con
              </span>
            </div>

            {tauriMobile ? (
              <Button
                type="button"
                className="w-full"
                onClick={startMobileGoogleLogin}
                disabled={isGoogleSubmitting || form.formState.isSubmitting}
              >
                {isGoogleSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continuar con Google
              </Button>
            ) : (
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
            )}
          </>

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
