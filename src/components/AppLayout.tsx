import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { getMetaAnalitica } from '@/api/analitica'
import { getAlertas } from '@/api/alerta'
import { getMe } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import type { UserProfile } from '@/types/auth'
import type { AnaliticaMeta } from '@/types/analitica'
import type { AlertaStock } from '@/types/alerta'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { AppSidebar } from '@/components/AppSidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { BarChart3, Bell, Package, ReceiptText, Sparkles, UserCircle2 } from 'lucide-react'
import { useProfileStore } from '@/store/profileStore'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const toTitleCase = (str: string) =>
  str.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase())

type TopTab = { to: string; label: string }

const productosTabs: TopTab[] = [
  { to: '/productos', label: 'Productos' },
  { to: '/categorias', label: 'Categorías' },
  { to: '/bundles', label: 'Bundles' },
]

const proveedoresTabs: TopTab[] = [
  { to: '/proveedores', label: 'Proveedores' },
  { to: '/pedidos', label: 'Pedidos' },
]

const analiticaTabs: TopTab[] = [
  { to: '/analitica/resumen', label: 'Resumen' },
  { to: '/analitica/ventas-rentabilidad', label: 'Ventas y Rentabilidad' },
  { to: '/analitica/inventario', label: 'Inventario' },
  { to: '/analitica/precios-bundles', label: 'Precios y Bundles' },
]

const inRouteGroup = (pathname: string, routes: string[]) =>
  routes.some((route) => pathname === route || pathname.startsWith(`${route}/`))

const latestFeatures = [
  {
    icon: UserCircle2,
    title: 'Perfil en el sidebar',
    description: 'Accede a tu cuenta, modo oscuro y ajustes desde el pie del menú lateral.',
  },
  {
    icon: Sparkles,
    title: 'Historial de novedades',
    description: 'Consulta los últimos cambios y mejoras de NeuralStock en cualquier momento.',
  },
  {
    icon: ReceiptText,
    title: 'Modales de creación',
    description: 'Nueva venta y nuevo cliente se abren en un modal limpio sin perder el contexto.',
  },
]

export default function AppLayout() {
  const { user } = useAuthStore()
  const setDisplayName = useProfileStore((s) => s.setDisplayName)
  const navigate = useNavigate()
  const location = useLocation()
  const isSettingsRoute = location.pathname.startsWith('/settings')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [analyticsMeta, setAnalyticsMeta] = useState<AnaliticaMeta | null>(null)
  const [openAlertsCount, setOpenAlertsCount] = useState(0)
  const [recentOpenAlerts, setRecentOpenAlerts] = useState<AlertaStock[]>([])
  const [alertsDrawerOpen, setAlertsDrawerOpen] = useState(false)
  const [whatsNewOpen, setWhatsNewOpen] = useState(false)

  const topTabs = useMemo(() => {
    if (isSettingsRoute) return []
    if (inRouteGroup(location.pathname, ['/productos', '/categorias', '/bundles'])) return productosTabs
    if (inRouteGroup(location.pathname, ['/proveedores', '/pedidos'])) return proveedoresTabs
    if (inRouteGroup(location.pathname, ['/analitica'])) return analiticaTabs
    return []
  }, [isSettingsRoute, location.pathname])

  const accountLabel = useMemo(() => {
    const fullName = [profile?.nombre?.trim(), profile?.apellidos?.trim()]
      .filter(Boolean)
      .join(' ')
      .trim()
    return toTitleCase(fullName || user?.username || 'Usuario')
  }, [profile?.apellidos, profile?.nombre, user?.username])

  useEffect(() => {
    setDisplayName(accountLabel)
  }, [accountLabel, setDisplayName])

  const sectionLabel = useMemo(() => {
    const path = location.pathname
    if (path === '/' || path === '/inicio' || path === '/dashboard') return 'Inicio'
    if (inRouteGroup(path, ['/productos', '/categorias', '/bundles'])) return 'Productos'
    if (inRouteGroup(path, ['/proveedores', '/pedidos'])) return 'Proveedores'
    if (path.startsWith('/movimientos')) return 'Movimientos'
    if (path.startsWith('/alertas')) return 'Alertas'
    if (path.startsWith('/analitica')) return 'Analítica'
    if (path.startsWith('/clientes')) return 'Clientes'
    if (path.startsWith('/ventas')) return 'Ventas'
    if (path.startsWith('/settings')) return 'Ajustes'
    return ''
  }, [location.pathname])

  useEffect(() => {
    let isMounted = true
    const loadProfile = async () => {
      if (!user?.token) { if (isMounted) setProfile(null); return }
      try {
        const me = await getMe()
        if (!isMounted) return
        setProfile(me)
      } catch {
        if (!isMounted) return
        setProfile(null)
      }
    }
    void loadProfile()
    return () => { isMounted = false }
  }, [user?.token])

  useEffect(() => {
    let isMounted = true
    const loadMeta = async () => {
      if (!user?.token) { if (isMounted) setAnalyticsMeta(null); return }
      try {
        const meta = await getMetaAnalitica(30)
        if (!isMounted) return
        setAnalyticsMeta(meta)
      } catch {
        if (!isMounted) return
        setAnalyticsMeta(null)
      }
    }
    void loadMeta()
    return () => { isMounted = false }
  }, [user?.token])

  useEffect(() => {
    let isMounted = true
    const loadOpenAlerts = async () => {
      if (!user?.token) {
        if (isMounted) {
          setOpenAlertsCount(0)
          setRecentOpenAlerts([])
        }
        return
      }
      try {
        const openAlerts = await getAlertas(false)
        if (!isMounted) return
        setOpenAlertsCount(openAlerts.length)
        setRecentOpenAlerts(openAlerts.slice(0, 5))
      } catch {
        if (!isMounted) return
        setOpenAlertsCount(0)
        setRecentOpenAlerts([])
      }
    }

    void loadOpenAlerts()
    const timer = window.setInterval(() => {
      void loadOpenAlerts()
    }, 30000)

    return () => {
      isMounted = false
      window.clearInterval(timer)
    }
  }, [user?.token])

  const dataModeLabel = useMemo(() => {
    if (!analyticsMeta) return null
    const isMockMode =
      analyticsMeta.source === 'API_REAL_LOCAL_SEEDED' ||
      analyticsMeta.source === 'API_REAL_SEED_PENDING'
    return isMockMode ? 'Modo de datos de prueba' : 'API real'
  }, [analyticsMeta])

  return (
    <SidebarProvider>
      <AppSidebar isSettingsRoute={isSettingsRoute} />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        <header className="shrink-0 border-b bg-background">
          <div className="flex min-h-14 items-center gap-2 px-3 sm:px-4">
            <SidebarTrigger className="-ml-1" />
            {topTabs.length > 0 ? (
              <Tabs value={location.pathname} className="flex-1">
                <TabsList
                  variant="line"
                  className="h-auto w-auto justify-start gap-0 rounded-none bg-transparent"
                >
                  {topTabs.map((tab) => (
                    <TabsTrigger
                      key={tab.to}
                      value={tab.to}
                      onClick={() => {
                        const shouldKeepSearch = location.pathname.startsWith('/analitica')
                        navigate({
                          pathname: tab.to,
                          search: shouldKeepSearch ? location.search : '',
                        })
                      }}
                      className="flex-none rounded-none px-3 py-2 text-sm"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            ) : (
              <>
                {sectionLabel && (
                  <span className="ml-1 text-sm font-medium text-foreground">{sectionLabel}</span>
                )}
                <div className="flex-1" />
              </>
            )}

            <Sheet open={alertsDrawerOpen} onOpenChange={setAlertsDrawerOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-8 w-8"
                  aria-label="Notificaciones de alertas"
                >
                  <Bell className="h-4 w-4" />
                  {openAlertsCount > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
                      {openAlertsCount > 99 ? '99+' : openAlertsCount}
                    </span>
                  ) : null}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader className="pb-2">
                  <SheetTitle>Notificaciones</SheetTitle>
                  <SheetDescription>Alertas abiertas ({openAlertsCount})</SheetDescription>
                </SheetHeader>
                <div className="flex-1 space-y-2 overflow-y-auto px-6 pb-4">
                  {recentOpenAlerts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay alertas abiertas.</p>
                  ) : (
                    recentOpenAlerts.map((alert) => (
                      <button
                        key={alert.id}
                        type="button"
                        className="w-full rounded-md border p-3 text-left transition-colors hover:bg-muted"
                        onClick={() => {
                          setAlertsDrawerOpen(false)
                          navigate('/alertas')
                        }}
                      >
                        <p className="text-sm font-medium">{alert.productoNombre} · {alert.tipo}</p>
                        <p className="truncate text-xs text-muted-foreground">{alert.mensaje}</p>
                      </button>
                    ))
                  )}
                </div>
                <div className="border-t p-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setAlertsDrawerOpen(false)
                      navigate('/alertas')
                    }}
                  >
                    Ver alertas
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {dataModeLabel ? (
              <Badge variant={dataModeLabel === 'Modo de datos de prueba' ? 'outline' : 'secondary'} className="mr-1">
                {dataModeLabel}
              </Badge>
            ) : null}

            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setWhatsNewOpen(true)}
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Novedades</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </SidebarInset>

      {/* What's New modal */}
      <Dialog open={whatsNewOpen} onOpenChange={setWhatsNewOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogTitle className="sr-only">Novedades de NeuralStock</DialogTitle>

          {/* Hero */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-background px-8 pb-6 pt-8">
            {/* Decorative blur */}
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />

            {/* Connected icons */}
            <div className="relative mb-6 flex items-center justify-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border bg-background shadow-sm">
                <Package className="h-5 w-5 text-foreground" />
              </div>
              <div className="h-px w-14 bg-gradient-to-r from-border to-primary/60" />
              <div className="flex h-13 w-13 items-center justify-center rounded-xl border-2 border-primary bg-background shadow-lg ring-4 ring-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="h-px w-14 bg-gradient-to-r from-primary/60 to-border" />
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>

            <p className="mb-1.5 text-center text-[11px] font-semibold uppercase tracking-widest text-primary">
              Nueva actualización · v1.2
            </p>
            <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">
              Tu espacio de trabajo,<br />renovado
            </h2>
          </div>

          {/* Feature list */}
          <div className="space-y-1 px-6 py-5">
            {latestFeatures.map((feat) => (
              <div key={feat.title} className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted">
                  <feat.icon className="h-4 w-4 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{feat.title}</p>
                  <p className="text-xs text-muted-foreground">{feat.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setWhatsNewOpen(false)}
            >
              Más tarde
            </Button>
            <Button size="sm" onClick={() => setWhatsNewOpen(false)}>
              Entendido →
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
