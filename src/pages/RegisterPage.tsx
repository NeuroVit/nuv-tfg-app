import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuthStore } from '@/store/authStore'
import { type CredentialResponse } from '@react-oauth/google'
import { googleLogin, register } from '@/api/auth'
import { useIsMobile } from '@/hooks/use-mobile'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'
import {
  isTauriMobile,
  registerTauriMobileGoogleListener,
  startTauriMobileGoogleLogin,
} from '@/lib/tauriMobileGoogleAuth'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const registerSchema = z
  .object({
    nombre: z.string().min(2, 'Mínimo 2 caracteres'),
    apellidos: z.string().min(2, 'Mínimo 2 caracteres'),
    username: z
      .string()
      .min(3, 'Mínimo 3 caracteres')
      .regex(/^[a-z0-9_]+$/, 'Solo letras minúsculas, números y guiones bajos'),
    email: z.string().email('Correo no válido'),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
    const navigate = useNavigate()
    const [serverError, setServerError] = useState<string | null>(null)
    const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
    const isMobile = useIsMobile()
    const tauriMobile = isTauriMobile()

    const form = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
        nombre: '',
        apellidos: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        },
    })
  
    const setUser = useAuthStore((s) => s.setUser)

    const onSubmit = async (data: RegisterFormData) => {
    setServerError(null)
    try {
        const res = await register({
        nombre: data.nombre,
        apellidos: data.apellidos,
        username: data.username,
        email: data.email,
        password: data.password,
        })
        setUser({
          username: res.username,
          role: res.role,
          token: res.token,
          mustChangePassword: res.mustChangePassword,
        })
        toast.success(`Cuenta creada correctamente. Bienvenido, ${res.username}.`)
        navigate('/dashboard')
    } catch (err: unknown) {
        const msg = isAxiosError<{ message?: string; mensaje?: string }>(err)
          ? (err.response?.data?.message ??
            err.response?.data?.mensaje ??
            'Error al crear la cuenta. Inténtalo de nuevo.')
          : 'Error al crear la cuenta. Inténtalo de nuevo.'
        setServerError(msg)
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
            'Error al registrarse con Google')
          : 'Error al registrarse con Google'
        setServerError(msg)
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
        setServerError(message)
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
        setServerError('No se pudo inicializar Google en móvil')
      })

    return () => {
      active = false
      cleanup?.()
    }
}, [navigate, setUser, tauriMobile])

const startMobileGoogleLogin = async () => {
    setIsGoogleSubmitting(true)
    try {
      await startTauriMobileGoogleLogin()
    } catch {
      setIsGoogleSubmitting(false)
      setServerError('No se pudo abrir Google en el navegador')
    }
}

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 dark:hidden" style={{ background: 'linear-gradient(180deg, #f4f7fb 0%, #e9eef6 52%, #e3e9f3 100%)' }} />
        <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(180deg, #0b0b0c 0%, #050505 100%)' }} />
      </div>

        {/* Left — dark image panel */}
      <div
        className="relative z-10 hidden w-1/2 overflow-hidden lg:block"
        style={{
          backgroundImage: `url('/moon-texture-registrar.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Right — form */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center overflow-hidden bg-card/90 px-4 py-8 backdrop-blur-sm sm:px-8">
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
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
        <div className="relative z-10 w-full max-w-md space-y-6 sm:space-y-8">

          <h1 className="text-3xl font-bold text-center text-foreground">
            Crea tu cuenta
          </h1>

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              {/* Nombre + Apellidos */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apellidos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellidos</FormLabel>
                      <FormControl>
                        <Input placeholder="Apellidos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="correo@empresa.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Username */}
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

              {/* Password */}
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

              {/* Confirm password */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full border border-border bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Crear cuenta
              </Button>
            </form>
          </Form>
          
          {/* Google */}
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
              className="mx-auto max-w-md hover:bg-accent/90"
              label="Continuar con Google"
              width={isMobile ? '280' : '448'}
              onSuccess={handleGoogleSuccess}
              onError={() => {
                setIsGoogleSubmitting(false)
                setServerError('Error al registrarse con Google')
              }}
              disabled={isGoogleSubmitting || form.formState.isSubmitting}
            />
          )}

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="underline text-foreground font-medium">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>

    </div>
  )
}
