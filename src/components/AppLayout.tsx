import { NavLink, Outlet } from 'react-router'
import { Separator } from '@/components/ui/separator'
import { AppSidebar } from '@/components/AppSidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'

const topTabs = [
  { to: '/dashboard', label: 'Inicio' },
  { to: '/productos', label: 'Productos' },
  { to: '/categorias', label: 'Categorías' },
]

export default function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <nav className="flex items-center gap-1 overflow-x-auto">
            {topTabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm transition-colors ${
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
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
