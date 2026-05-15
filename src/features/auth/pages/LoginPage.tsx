import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { useNavigate, Link } from 'react-router'
import { toast } from 'sonner'
import { type CredentialResponse } from '@react-oauth/google'
import { login, googleLogin } from '@/features/auth/api/auth'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GoogleAuthButton } from '@/features/auth/components/GoogleAuthButton'

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
    if (isGoogleSubmitting) return
    form.clearErrors('root')
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
    } catch (err: unknown) {
      let msg = 'No se pudo iniciar sesión'
      let status: number | undefined
      if (isAxiosError<{ message?: string; mensaje?: string; error?: string }>(err)) {
        status = err.response?.status
        const backendMsg =
          err.response?.data?.message ??
          err.response?.data?.mensaje ??
          err.response?.data?.error
        if (backendMsg) {
          msg = backendMsg
        } else if (status === 401) {
          msg = 'Credenciales incorrectas'
        } else if (status === 429) {
          msg = 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
        } else if (!err.response) {
          msg = 'No se pudo conectar con el servidor. Revisa tu conexión.'
        } else if (status && status >= 500) {
          msg = 'Error del servidor. Inténtalo de nuevo en unos minutos.'
        }
      }
      if (import.meta.env.DEV) {
        console.warn('[login] classic login failed', {
          status,
          endpoint: '/api/auth/login',
        })
      }
      form.setError('root', { message: msg })
      toast.error(msg)
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
        <div
          className="absolute inset-[-20%] dark:hidden blur-[24px]"
          style={{
            background:
              'radial-gradient(circle at 20% 18%, rgba(71,85,105,0.20), transparent 30%), radial-gradient(circle at 78% 26%, rgba(59,130,246,0.16), transparent 33%), linear-gradient(180deg, #f8fbff, #e9eef6)',
          }}
        />
        <div
          className="absolute inset-0 dark:hidden opacity-90 blur-[5px]"
          style={{
            background:
              'radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,0.98), transparent 60%), radial-gradient(120% 60% at 50% 24%, rgba(203,213,225,0.42), transparent 61%), radial-gradient(120% 60% at 50% 50%, rgba(148,163,184,0.33), transparent 62%), radial-gradient(120% 60% at 50% 76%, rgba(148,163,184,0.24), transparent 62%)',
          }}
        />
        <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(180deg, #0b0b0c 0%, #050505 100%)' }} />
        <div
          className="absolute inset-[-20%] hidden dark:block blur-[34px]"
          style={{
            background:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08), transparent 25%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.05), transparent 30%), linear-gradient(180deg, #0b0b0c, #050505)',
          }}
        />
        <div
          className="absolute inset-0 hidden dark:block opacity-95 blur-[8px]"
          style={{
            background:
              'radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,0.08), transparent 60%), radial-gradient(120% 60% at 50% 25%, rgba(255,255,255,0.05), transparent 60%), radial-gradient(120% 60% at 50% 50%, rgba(255,255,255,0.06), transparent 60%), radial-gradient(120% 60% at 50% 75%, rgba(255,255,255,0.04), transparent 60%)',
          }}
        />
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
                    <FormLabel>Usuario o email</FormLabel>
                    <FormControl>
                      <Input placeholder="tu_usuario o correo@dominio.com" {...field} />
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
                disabled={form.formState.isSubmitting || isGoogleSubmitting}
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
