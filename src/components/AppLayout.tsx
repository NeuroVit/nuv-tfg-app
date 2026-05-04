import { NavLink, Outlet, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { logout as logoutRequest } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { AppSidebar } from '@/components/AppSidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { ChevronsUpDown, LogOut, Settings } from 'lucide-react'

const topTabs = [
  { to: '/dashboard', label: 'Inicio' },
  { to: '/productos', label: 'Productos' },
  { to: '/categorias', label: 'Categorías' },
  { to: '/bundles', label: 'Bundles' },
  { to: '/proveedores', label: 'Proveedores' },
  { to: '/pedidos', label: 'Pedidos' },
]

export default function AppLayout() {
  const { user, logout: clearSession } = useAuthStore()
  const navigate = useNavigate()

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : 'U'
  const roleLabel = (user?.role ?? 'ROLE_VIEWER').replace('ROLE_', '')

  const handleLogout = async () => {
    try {
      await logoutRequest()
      toast.success('Sesión cerrada correctamente.')
    } catch {
      // Si falla la llamada remota, igualmente cerramos sesión local.
      toast.error('No se pudo cerrar sesión en el servidor. Se cerrará localmente.')
    }
    clearSession()
    navigate('/login')
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b bg-background px-3 py-2 sm:px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1 overflow-hidden">
            {topTabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto gap-2 px-1.5 py-1 data-[state=open]:bg-accent sm:px-2"
              >
                <Avatar className="h-7 w-7 rounded-full">
                  <AvatarFallback className="rounded-full bg-muted text-muted-foreground text-[10px]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left text-sm leading-tight sm:grid">
                  <span className="max-w-32 truncate font-medium">{user?.username ?? 'Usuario'}</span>
                  <Badge variant="secondary" className="mt-1 w-fit px-1.5 py-0 text-[10px]">
                    {roleLabel}
                  </Badge>
                </div>
                <ChevronsUpDown className="size-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-56 rounded-lg" align="end" side="bottom" sideOffset={8}>
              <DropdownMenuItem onSelect={() => navigate('/settings')}>
                <Settings className="h-4 w-4" />
                Ajustes
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  void handleLogout()
                }}
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
