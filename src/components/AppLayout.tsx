import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { AlertTriangle, Bell, X } from 'lucide-react'

import { getMetaAnalitica } from '@/api/analitica'
import { getAlertas } from '@/api/alerta'
import { getMe, updateMe } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { useProfileStore } from '@/store/profileStore'
import type { AnaliticaMeta } from '@/types/analitica'
import type { AlertaStock } from '@/types/alerta'
import { AppSidebar } from '@/components/AppSidebar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type TopTab = { to: string; label: string }

const productosTabs: TopTab[] = [
  { to: '/productos', label: 'Productos' },
  { to: '/categorias', label: 'Categorias' },
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

export default function AppLayout() {
  const { user } = useAuthStore()
  const setProfile = useProfileStore((s) => s.setProfile)
  const navigate = useNavigate()
  const location = useLocation()

  const isSettingsRoute = location.pathname.startsWith('/settings')
  const [analyticsMeta, setAnalyticsMeta] = useState<AnaliticaMeta | null>(null)
  const [openAlertsCount, setOpenAlertsCount] = useState(0)
  const [openAlerts, setOpenAlerts] = useState<AlertaStock[]>([])
  const [alertsDrawerOpen, setAlertsDrawerOpen] = useState(false)
  const [alertsFilter, setAlertsFilter] = useState<'all' | 'critical' | 'warning'>('all')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const topTabs = useMemo(() => {
    if (isSettingsRoute) return []
    if (inRouteGroup(location.pathname, ['/productos', '/categorias', '/bundles'])) return productosTabs
    if (inRouteGroup(location.pathname, ['/proveedores', '/pedidos'])) return proveedoresTabs
    if (inRouteGroup(location.pathname, ['/analitica'])) return analiticaTabs
    return []
  }, [isSettingsRoute, location.pathname])

  const sectionLabel = useMemo(() => {
    const path = location.pathname
    if (path === '/' || path === '/inicio' || path === '/dashboard') return 'Inicio'
    if (inRouteGroup(path, ['/productos', '/categorias', '/bundles'])) return 'Productos'
    if (inRouteGroup(path, ['/proveedores', '/pedidos'])) return 'Proveedores'
    if (path.startsWith('/movimientos')) return 'Movimientos'
    if (path.startsWith('/alertas')) return 'Alertas'
    if (path.startsWith('/analitica')) return 'Analitica'
    if (path.startsWith('/clientes')) return 'Clientes'
    if (path.startsWith('/ventas')) return 'Ventas'
    if (path.startsWith('/settings')) return 'Ajustes'
    return ''
  }, [location.pathname])

  useEffect(() => {
    let isMounted = true
    const loadProfile = async () => {
      if (!user?.token) {
        if (isMounted) setProfile(null)
        return
      }
      try {
        let me = await getMe()
        const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
        const shouldDetect =
          (!me.timeZone || me.timeZone === 'Europe/Madrid') &&
          !localStorage.getItem('tz-detected-once') &&
          Boolean(detectedTimeZone)
        if (shouldDetect) {
          try {
            me = await updateMe({
              nombre: me.nombre,
              apellidos: me.apellidos,
              email: me.email,
              timeZone: detectedTimeZone,
            })
            localStorage.setItem('tz-detected-once', '1')
          } catch {
            // ignore auto-detection errors
          }
        }
        if (!isMounted) return
        setProfile(me)
      } catch {
        if (!isMounted) return
        setProfile(null)
      }
    }
    void loadProfile()
    return () => {
      isMounted = false
    }
  }, [user?.token, setProfile])

  useEffect(() => {
    let isMounted = true
    const loadMeta = async () => {
      if (!user?.token) {
        if (isMounted) setAnalyticsMeta(null)
        return
      }
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
    return () => {
      isMounted = false
    }
  }, [user?.token])

  useEffect(() => {
    let isMounted = true
    const loadOpenAlerts = async () => {
      if (!user?.token) {
        if (isMounted) {
          setOpenAlertsCount(0)
          setOpenAlerts([])
        }
        return
      }
      try {
        const openAlertsData = await getAlertas(false)
        if (!isMounted) return
        setOpenAlertsCount(openAlertsData.length)
        setOpenAlerts(openAlertsData)
      } catch {
        if (!isMounted) return
        setOpenAlertsCount(0)
        setOpenAlerts([])
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

  const criticalAlerts = useMemo(
    () => openAlerts.filter((alert) => alert.tipo === 'OUT_OF_STOCK'),
    [openAlerts]
  )
  const warningAlerts = useMemo(
    () => openAlerts.filter((alert) => alert.tipo !== 'OUT_OF_STOCK'),
    [openAlerts]
  )
  const filteredAlerts = useMemo(() => {
    if (alertsFilter === 'critical') return criticalAlerts
    if (alertsFilter === 'warning') return warningAlerts
    return openAlerts
  }, [alertsFilter, criticalAlerts, warningAlerts, openAlerts])

  const dataModeLabel = useMemo(() => {
    if (!analyticsMeta) return null
    const isMockMode =
      analyticsMeta.source === 'API_REAL_LOCAL_SEEDED' ||
      analyticsMeta.source === 'API_REAL_SEED_PENDING'
    return isMockMode ? 'Modo de datos de prueba' : 'API real'
  }, [analyticsMeta])

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <AppSidebar isSettingsRoute={isSettingsRoute} collapsible="offcanvas" />
      <SidebarInset className="relative h-dvh min-h-0 min-w-0 overflow-hidden bg-transparent">
        <div className="pointer-events-none absolute inset-0 -z-10">
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

        <header className="sticky top-0 z-50 shrink-0 overflow-hidden border-b border-border/60">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 dark:hidden"
            style={{ background: 'linear-gradient(180deg, #f4f7fb 0%, #e9eef6 52%, #e3e9f3 100%)' }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[-20%] z-0 dark:hidden blur-[24px]"
            style={{
              background:
                'radial-gradient(circle at 20% 18%, rgba(71,85,105,0.20), transparent 30%), radial-gradient(circle at 78% 26%, rgba(59,130,246,0.16), transparent 33%), linear-gradient(180deg, #f8fbff, #e9eef6)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 dark:hidden opacity-90 blur-[5px]"
            style={{
              background:
                'radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,0.98), transparent 60%), radial-gradient(120% 60% at 50% 24%, rgba(203,213,225,0.42), transparent 61%), radial-gradient(120% 60% at 50% 50%, rgba(148,163,184,0.33), transparent 62%), radial-gradient(120% 60% at 50% 76%, rgba(148,163,184,0.24), transparent 62%)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 hidden dark:block"
            style={{ background: 'linear-gradient(180deg, #0b0b0c 0%, #050505 100%)' }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[-20%] z-0 hidden dark:block blur-[34px]"
            style={{
              background:
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08), transparent 25%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.05), transparent 30%), linear-gradient(180deg, #0b0b0c, #050505)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 hidden dark:block opacity-95 blur-[8px]"
            style={{
              background:
                'radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,0.08), transparent 60%), radial-gradient(120% 60% at 50% 25%, rgba(255,255,255,0.05), transparent 60%), radial-gradient(120% 60% at 50% 50%, rgba(255,255,255,0.06), transparent 60%), radial-gradient(120% 60% at 50% 75%, rgba(255,255,255,0.04), transparent 60%)',
            }}
          />
          <div className="relative z-10 flex min-h-14 items-center gap-2 px-3 sm:px-4">
            <SidebarTrigger className="-ml-1" />
            {topTabs.length > 0 ? (
              <Tabs value={location.pathname} className="flex-1">
                <TabsList variant="line" className="h-auto w-auto justify-start gap-0 rounded-none bg-transparent">
                  {topTabs.map((tab) => (
                    <TabsTrigger
                      key={tab.to}
                      value={tab.to}
                      onClick={() => {
                        const shouldKeepSearch = location.pathname.startsWith('/analitica')
                        navigate({ pathname: tab.to, search: shouldKeepSearch ? location.search : '' })
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
                {sectionLabel && <span className="ml-1 text-sm font-medium text-foreground">{sectionLabel}</span>}
                <div className="flex-1" />
              </>
            )}

            <Sheet open={alertsDrawerOpen} onOpenChange={setAlertsDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8" aria-label="Notificaciones de alertas">
                  <Bell className="h-4 w-4" />
                  {openAlertsCount > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
                      {openAlertsCount > 99 ? '99+' : openAlertsCount}
                    </span>
                  ) : null}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                showCloseButton={false}
                className="w-full overflow-hidden border-l border-white/10 bg-transparent p-0 sm:max-w-md"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(180deg, rgba(5,5,5,0.92) 0%, rgba(5,5,5,0.74) 45%, rgba(5,5,5,0.38) 100%), url('/moon-texture-registrar.jpg')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    opacity: 0.95,
                  }}
                />
                <div className="relative z-10 flex h-full flex-col">
                <div className="flex justify-end px-4 pt-4">
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/10">
                      <X className="h-4 w-4" />
                      <span className="sr-only">Cerrar</span>
                    </Button>
                  </SheetClose>
                </div>
                <SheetHeader className="pb-2">
                  <SheetTitle>Notificaciones</SheetTitle>
                  <SheetDescription>Alertas abiertas ({openAlertsCount})</SheetDescription>
                </SheetHeader>
                <div className="px-6 pb-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAlertsFilter('all')}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        alertsFilter === 'all'
                          ? 'bg-primary/25 text-primary-foreground ring-1 ring-primary/50'
                          : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                      }`}
                    >
                      Todas ({openAlerts.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAlertsFilter('critical')}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        alertsFilter === 'critical'
                          ? 'bg-red-500/20 text-red-200 ring-1 ring-red-400/50'
                          : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                      }`}
                    >
                      Críticas ({criticalAlerts.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAlertsFilter('warning')}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        alertsFilter === 'warning'
                          ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/50'
                          : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                      }`}
                    >
                      Advertencias ({warningAlerts.length})
                    </button>
                  </div>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto px-6 pb-4">
                  {filteredAlerts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay alertas abiertas.</p>
                  ) : (
                    filteredAlerts.slice(0, 12).map((alert) => (
                      <button
                        key={alert.id}
                        type="button"
                        className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-left transition-colors hover:bg-white/5"
                        onClick={() => {
                          setAlertsDrawerOpen(false)
                          navigate('/alertas')
                        }}
                      >
                        <p className="text-sm font-medium text-white">{alert.productoNombre} - {alert.tipo}</p>
                        <p className="truncate text-xs text-slate-300">{alert.mensaje}</p>
                      </button>
                    ))
                  )}
                </div>
                <div className="px-6 pb-4">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-white">Mantente al día con NeuralStock</p>
                    <p className="mt-1 text-xs text-slate-300">
                      Te avisaremos cuando aparezcan alertas críticas o cambios importantes en inventario.
                    </p>
                  </div>
                </div>
                <div className="border-t p-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => {
                      setAlertsDrawerOpen(false)
                      navigate('/alertas')
                    }}
                  >
                    Ver alertas
                  </Button>
                </div>
                </div>
              </SheetContent>
            </Sheet>

            {dataModeLabel ? (
              <Badge variant={dataModeLabel === 'Modo de datos de prueba' ? 'outline' : 'secondary'} className="mr-1">
                {dataModeLabel}
              </Badge>
            ) : null}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain pt-2 sm:pt-3">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
