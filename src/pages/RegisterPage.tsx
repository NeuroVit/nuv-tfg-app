import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuthStore } from '@/store/authStore'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { googleLogin } from '@/api/auth'
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
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, {
        nombre: data.nombre,
        apellidos: data.apellidos,
        username: data.username,
        email: data.email,
        password: data.password,
        })
        setUser({ username: res.data.username, role: res.data.role, token: res.data.token })
        navigate('/dashboard')
    } catch (err: any) {
        const msg =
        err.response?.data?.message ??
        err.response?.data?.mensaje ??
        'Error al crear la cuenta. Inténtalo de nuevo.'
        setServerError(msg)
    }

}

const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) return
    try {
        const res = await googleLogin(response.credential)
        setUser({ username: res.username, role: res.role, token: res.token })
        navigate('/dashboard')
    } catch {
        setServerError('Error al registrarse con Google')
    }
}

  return (
    <div className="min-h-screen flex">

        {/* Left — dark image panel */}
      <div
        className="hidden lg:block w-1/2"
        style={{
          backgroundImage: `url('/public/moon-texture-registrar.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Right — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 bg-white">
        <div className="w-full max-w-md space-y-8">

          <h1 className="text-3xl font-bold text-center text-gray-900">
            Create your account
          </h1>

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              {/* Nombre + Apellidos */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Name" {...field} />
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
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" {...field} />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email" {...field} />
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
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Username" {...field} />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Password" {...field} />
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
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Sign up
              </Button>
            </form>
          </Form>

          

          {/* Google */}
          <div className="flex justify-center">
            <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setServerError('Error al registrarse con Google')}
                theme="outline"
                shape="pill"
                width="448"
            />
            </div>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="underline text-gray-900 font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>

    </div>
  )
}