import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  AlertTriangle,
  BarChart3,
  CheckSquare,
  Package,
  Rocket,
  Truck,
} from 'lucide-react'
import { completeOnboarding } from '@/features/auth/api/auth'
import { useProfileStore } from '@/store/profileStore'

type Step = {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  details: string[]
  action?: { label: string; path: string }
}

const steps: Step[] = [
  {
    title: '¡Bienvenido a NeuralStock!',
    description: 'Tu plataforma de gestión de inventario y negocio. En los próximos pasos te mostraremos las funciones principales.',
    icon: Rocket,
    badge: 'Inicio',
    details: [
      'Gestión completa de inventario y productos',
      'Analítica avanzada de ventas y rentabilidad',
      'Control de alertas, tareas y pedidos',
      'Informes detallados y en tiempo real',
    ],
  },
  {
    title: 'Inventario y Productos',
    description: 'Gestiona tu catálogo de productos, categorías y bundles. Registra movimientos de entrada y salida para mantener tu stock actualizado.',
    icon: Package,
    badge: 'Inventario',
    details: [
      'Productos: añade, edita y elimina artículos con precio de coste y venta',
      'Categorías: organiza tus productos en grupos',
      'Bundles: crea packs de productos a precio especial',
      'Movimientos: registra entradas, salidas y ajustes de stock',
    ],
    action: { label: 'Ver Productos', path: '/productos' },
  },
  {
    title: 'Proveedores y Pedidos',
    description: 'Mantén un registro de tus proveedores y gestiona los pedidos que realizas. Consulta el historial y el estado de cada pedido.',
    icon: Truck,
    badge: 'Proveedores',
    details: [
      'Proveedores: ficha completa con contacto y condiciones',
      'Pedidos: crea y gestiona órdenes de compra',
      'Historial de pedidos por proveedor',
      'Estado de pedidos: pendiente, recibido, cancelado',
    ],
    action: { label: 'Ver Proveedores', path: '/proveedores' },
  },
  {
    title: 'Alertas y Tareas',
    description: 'Configura alertas de stock mínimo para que nunca te quedes sin productos. Asigna tareas a tu equipo y haz seguimiento de su progreso.',
    icon: AlertTriangle,
    badge: 'Control',
    details: [
      'Alertas: notificaciones automáticas de stock bajo',
      'Tareas: crea y asigna tareas a usuarios de tu organización',
      'Seguimiento de estado: pendiente, en curso, completada',
      'Panel de resumen con alertas y tareas activas',
    ],
    action: { label: 'Ver Alertas', path: '/alertas' },
  },
  {
    title: 'Comercial y Analítica',
    description: 'Registra tus ventas, gestiona clientes y analiza el rendimiento de tu negocio con informes detallados y visualizaciones interactivas.',
    icon: BarChart3,
    badge: 'Analítica',
    details: [
      'Clientes: base de datos de clientes y su historial',
      'Ventas: registra transacciones y consulta histórico',
      'Analítica: gráficos de ventas, rentabilidad e inventario',
      'Reportes: genera y descarga informes de tu negocio',
    ],
    action: { label: 'Ver Analítica', path: '/analitica/resumen' },
  },
  {
    title: '¡Todo listo!',
    description: 'Ya conoces las funciones principales de NeuralStock. Puedes consultar la documentación completa en cualquier momento desde Ajustes → Documentación.',
    icon: CheckSquare,
    badge: 'Completado',
    details: [
      'Explora cada sección a tu ritmo',
      'Consulta la documentación en Ajustes → Documentación si tienes dudas',
      'Configura tu perfil y organización en Ajustes',
      'El equipo de NeuralStock está aquí para ayudarte',
    ],
    action: { label: 'Ver Documentación', path: '/settings/docs' },
  },
]

type OnboardingModalProps = {
  open: boolean
  onComplete: () => void
}

export function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completing, setCompleting] = useState(false)
  const navigate = useNavigate()
  const setProfile = useProfileStore((s) => s.setProfile)
  const profile = useProfileStore((s) => s.profile)

  const step = steps[currentStep]!
  const isLast = currentStep === steps.length - 1
  const progress = ((currentStep + 1) / steps.length) * 100

  const handleNext = () => {
    if (!isLast) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleComplete = async () => {
    setCompleting(true)
    try {
      await completeOnboarding()
      if (profile) {
        setProfile({ ...profile, onboardingCompleted: true })
      }
    } catch {
      // silently continue — onboarding state is non-critical
    } finally {
      setCompleting(false)
      onComplete()
    }
  }

  const handleActionClick = (path: string) => {
    void handleComplete().then(() => navigate(path))
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) void handleComplete() }}>
      <DialogContent className="max-w-lg gap-0 p-0 overflow-hidden">
        <div className="bg-primary/5 px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {step.badge && <Badge variant="secondary" className="text-xs">{step.badge}</Badge>}
            </div>
            <span className="text-xs text-muted-foreground">
              {currentStep + 1} / {steps.length}
            </span>
          </div>
          <Progress value={progress} className="h-1.5 mb-4" />
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <step.icon className="h-6 w-6 text-primary" />
            </div>
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-lg leading-tight">{step.title}</DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                {step.description}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <div className="px-6 py-4">
          <ul className="space-y-2">
            {step.details.map((detail) => (
              <li key={detail} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                {detail}
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-2 border-t px-6 py-4">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                Anterior
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step.action && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleActionClick(step.action!.path)}
              >
                {step.action.label}
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={() => void handleComplete()} disabled={completing}>
                {completing ? 'Guardando...' : 'Empezar'}
              </Button>
            ) : (
              <Button size="sm" onClick={handleNext}>
                Siguiente
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
