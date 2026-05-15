import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { getBillingStatus, createCheckoutSession, createPortalSession } from '@/api/billing'
import { useAuthStore } from '@/store/authStore'
import type { BillingStatus } from '@/types/billing'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, CreditCard, Loader2, XCircle, AlertCircle, Clock } from 'lucide-react'

const FEATURES = [
  'Gestión de inventario ilimitada',
  'Alertas de stock automáticas',
  'Tareas y gestión de incidencias',
  'Reportes y analítica avanzada',
  'Múltiples usuarios y roles',
  'Gestión de ventas y clientes',
  'Proveedores y pedidos',
  'Soporte prioritario',
]

const STATUS_CONFIG = {
  ACTIVE: {
    label: 'Activo',
    variant: 'default' as const,
    badgeClass: 'bg-green-500 hover:bg-green-500/90 text-white border-transparent',
    icon: CheckCircle2,
    color: 'text-green-500',
    description: 'Tu suscripción está activa y al día.',
  },
  INACTIVE: {
    label: 'Sin suscripción',
    variant: 'secondary' as const,
    badgeClass: '',
    icon: XCircle,
    color: 'text-muted-foreground',
    description: 'Suscríbete para acceder a todas las funcionalidades.',
  },
  PAST_DUE: {
    label: 'Pago vencido',
    variant: 'destructive' as const,
    badgeClass: '',
    icon: AlertCircle,
    color: 'text-destructive',
    description: 'El último cobro falló. Actualiza tu método de pago.',
  },
  CANCELLED: {
    label: 'Cancelado',
    variant: 'outline' as const,
    badgeClass: '',
    icon: Clock,
    color: 'text-muted-foreground',
    description: 'Tu suscripción ha sido cancelada.',
  },
} as const

export default function BillingPage() {
  const { user } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const isAdmin = user?.role === 'ROLE_ADMIN'

  useEffect(() => {
    const success = searchParams.get('success')
    const cancelled = searchParams.get('cancelled')

    if (success === 'true') {
      toast.success('Pago procesado. La suscripción se activará en breve.')
      setSearchParams({})
    } else if (cancelled === 'true') {
      toast.info('Proceso de suscripción cancelado.')
      setSearchParams({})
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    getBillingStatus()
      .then(setBilling)
      .catch(() => toast.error('No se pudo cargar el estado de facturación.'))
      .finally(() => setLoading(false))
  }, [])

  const handleSubscribe = async () => {
    setActionLoading(true)
    try {
      const origin = window.location.origin
      const { url } = await createCheckoutSession(
        `${origin}/billing?success=true`,
        `${origin}/billing?cancelled=true`
      )
      window.location.href = url
    } catch {
      toast.error('No se pudo iniciar el proceso de pago.')
      setActionLoading(false)
    }
  }

  const handleManage = async () => {
    setActionLoading(true)
    try {
      const { url } = await createPortalSession(`${window.location.origin}/billing`)
      window.location.href = url
    } catch {
      toast.error('No se pudo abrir el portal de facturación.')
      setActionLoading(false)
    }
  }

  const status = billing?.status ?? 'INACTIVE'
  const config = STATUS_CONFIG[status]
  const StatusIcon = config.icon

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-2">
      <div>
        <h1 className="text-2xl font-semibold">Facturación</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestiona tu suscripción y consulta tus facturas.
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-xl">Plan Pro</CardTitle>
                  <CardDescription className="text-base font-medium">
                    30 € <span className="text-sm font-normal text-muted-foreground">/ mes</span>
                  </CardDescription>
                </div>
                <Badge variant={config.variant} className={`shrink-0 ${config.badgeClass}`}>
                  {config.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <StatusIcon className={`h-4 w-4 ${config.color}`} />
                <p className="text-sm text-muted-foreground">{config.description}</p>
              </div>
            </CardHeader>

            <Separator />

            <CardContent className="pt-5">
              <p className="text-sm font-medium mb-3">Incluye:</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                {FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            {isAdmin && (
              <CardFooter className="flex flex-col gap-3 pt-0">
                <Separator />
                {status === 'ACTIVE' ? (
                  <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Cambia de plan, actualiza el pago o cancela desde el portal de Stripe.
                    </p>
                    <Button
                      onClick={handleManage}
                      disabled={actionLoading}
                      variant="outline"
                      className="shrink-0"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      Gestionar suscripción
                    </Button>
                  </div>
                ) : status === 'PAST_DUE' ? (
                  <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-destructive">
                      Actualiza tu método de pago para evitar la cancelación.
                    </p>
                    <Button
                      onClick={handleManage}
                      disabled={actionLoading}
                      variant="destructive"
                      className="shrink-0"
                    >
                      {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Actualizar método de pago
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleSubscribe}
                    disabled={actionLoading}
                    className="w-full"
                    size="lg"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    Suscribirse — 30 €/mes
                  </Button>
                )}
              </CardFooter>
            )}
          </Card>

          {status === 'ACTIVE' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Facturas</CardTitle>
                <CardDescription>
                  Descarga tus facturas desde el portal de Stripe.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={handleManage} disabled={actionLoading || !isAdmin}>
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Ver facturas
                </Button>
                {!isAdmin && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Solo los administradores pueden gestionar la suscripción.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {!isAdmin && status !== 'ACTIVE' && (
            <Card className="border-dashed">
              <CardContent className="flex items-center gap-3 py-4">
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Contacta con un administrador de tu organización para gestionar la suscripción.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
