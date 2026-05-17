import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckSquare,
  CreditCard,
  FileText,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  Truck,
  UserSquare2,
  Users,
} from 'lucide-react'

type Section = {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  content: React.ReactNode
}

const sections: Section[] = [
  {
    id: 'introduccion',
    title: 'Introducción',
    icon: BookOpen,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground leading-relaxed">
          NeuralStock es una plataforma integral de gestión de inventario diseñada para pymes y equipos de trabajo. Centraliza el control de productos, proveedores, ventas, clientes y analítica en un único lugar.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Esta documentación describe todas las funcionalidades disponibles y cómo sacar el máximo partido a cada módulo.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: 'Gestión de inventario', desc: 'Productos, categorías, bundles y movimientos' },
            { label: 'Control operativo', desc: 'Alertas de stock y gestión de tareas' },
            { label: 'Red comercial', desc: 'Clientes, ventas y proveedores' },
            { label: 'Analítica avanzada', desc: 'Dashboards y reportes en tiempo real' },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border bg-secondary/30 p-3">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'inicio',
    title: 'Inicio / Dashboard',
    icon: LayoutDashboard,
    badge: 'Página principal',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground leading-relaxed">
          El panel de inicio ofrece una visión global del estado de tu negocio. Presenta métricas clave, alertas activas, tareas pendientes y actividad reciente de inventario.
        </p>
        <h4 className="font-medium text-sm">Métricas disponibles</h4>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Total de productos y valor del inventario actual</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Alertas de stock abierto y pendientes de atender</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Tareas pendientes asignadas al usuario</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Entradas de inventario de los últimos 7 días</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Ventas del mes en curso</li>
        </ul>
        <p className="text-xs text-muted-foreground bg-secondary/40 rounded-md p-2">
          Tip: las tarjetas del inicio son accesos rápidos. Haz clic en cualquiera de ellas para ir directamente al módulo correspondiente.
        </p>
      </div>
    ),
  },
  {
    id: 'productos',
    title: 'Productos',
    icon: Package,
    badge: 'Inventario',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground leading-relaxed">
          El módulo de productos es el núcleo del inventario. Aquí puedes crear, editar y gestionar todos los artículos de tu catálogo.
        </p>
        <h4 className="font-medium text-sm">Campos de un producto</h4>
        <div className="rounded-lg border overflow-hidden text-sm">
          <table className="w-full">
            <thead className="bg-secondary/40">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Campo</th>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Descripción</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                { campo: 'Nombre', desc: 'Identificador del producto' },
                { campo: 'SKU', desc: 'Código único del artículo' },
                { campo: 'Categoría', desc: 'Grupo al que pertenece' },
                { campo: 'Precio coste', desc: 'Precio de compra al proveedor' },
                { campo: 'Precio venta', desc: 'Precio de venta al cliente' },
                { campo: 'Stock actual', desc: 'Unidades disponibles en inventario' },
                { campo: 'Stock mínimo', desc: 'Umbral para activar alertas' },
              ].map((row) => (
                <tr key={row.campo} className="text-xs">
                  <td className="px-3 py-2 font-medium">{row.campo}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h4 className="font-medium text-sm">Categorías y Bundles</h4>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Las <strong>categorías</strong> agrupan productos para facilitar la navegación y los filtros</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Los <strong>bundles</strong> son packs de varios productos vendidos conjuntamente a un precio especial</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Cada bundle reduce el stock de sus productos componentes al venderse</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'movimientos',
    title: 'Movimientos de Inventario',
    icon: Activity,
    badge: 'Inventario',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground leading-relaxed">
          Los movimientos registran todos los cambios de stock: entradas de mercancía, salidas por venta o merma, y ajustes manuales.
        </p>
        <h4 className="font-medium text-sm">Tipos de movimiento</h4>
        <div className="space-y-2">
          {[
            { tipo: 'ENTRADA', color: 'bg-green-500/10 text-green-700 dark:text-green-400', desc: 'Incrementa el stock. Úsalo cuando recibes mercancía de un proveedor.' },
            { tipo: 'SALIDA', color: 'bg-red-500/10 text-red-700 dark:text-red-400', desc: 'Reduce el stock. Úsalo para registrar ventas manuales o mermas.' },
            { tipo: 'AJUSTE', color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400', desc: 'Corrige el stock sin un motivo de compraventa. Ideal para inventarios físicos.' },
          ].map((item) => (
            <div key={item.tipo} className={`rounded-md p-3 text-sm ${item.color}`}>
              <span className="font-semibold">{item.tipo}</span>
              <span className="ml-2 opacity-80">{item.desc}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground bg-secondary/40 rounded-md p-2">
          Cada movimiento queda registrado con fecha, usuario, producto, cantidad y motivo para garantizar trazabilidad completa.
        </p>
      </div>
    ),
  },
  {
    id: 'proveedores',
    title: 'Proveedores',
    icon: Truck,
    badge: 'Proveedores',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground leading-relaxed">
          Gestiona tus proveedores y los pedidos que realizas a cada uno. Consulta el historial de compras y el estado de cada pedido.
        </p>
        <h4 className="font-medium text-sm">Ficha de proveedor</h4>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Nombre comercial y CIF/NIF</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Persona de contacto, email y teléfono</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Dirección y condiciones de pago</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Historial de pedidos y volumen de compra</li>
        </ul>
        <h4 className="font-medium text-sm">Pedidos a proveedor</h4>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Crea pedidos con líneas de productos y cantidades</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Estado del pedido: pendiente, recibido o cancelado</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Al marcar un pedido como recibido, el stock se actualiza automáticamente</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'alertas',
    title: 'Alertas de Stock',
    icon: AlertTriangle,
    badge: 'Control',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground leading-relaxed">
          El sistema de alertas te avisa automáticamente cuando el stock de un producto cae por debajo del umbral mínimo que hayas configurado.
        </p>
        <h4 className="font-medium text-sm">Cómo funcionan</h4>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Define el <strong>stock mínimo</strong> en la ficha de cada producto</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Cuando el stock baja del umbral se crea automáticamente una alerta</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Las alertas aparecen en el panel lateral de notificaciones</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Cierra la alerta una vez hayas repuesto el stock</li>
        </ul>
        <div className="rounded-md border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-800 dark:text-yellow-200">
          Las alertas abiertas se muestran en el resumen del inicio y en el panel de notificaciones del header.
        </div>
      </div>
    ),
  },
  {
    id: 'tareas',
    title: 'Tareas',
    icon: CheckSquare,
    badge: 'Control',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground leading-relaxed">
          El módulo de tareas permite coordinar el trabajo del equipo. Puedes crear tareas, asignarlas a usuarios de tu organización y hacer seguimiento de su estado.
        </p>
        <h4 className="font-medium text-sm">Estados de una tarea</h4>
        <div className="space-y-2">
          {[
            { estado: 'PENDIENTE', color: 'bg-secondary text-foreground', desc: 'La tarea ha sido creada pero no se ha empezado aún.' },
            { estado: 'EN CURSO', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400', desc: 'La tarea está siendo trabajada activamente.' },
            { estado: 'COMPLETADA', color: 'bg-green-500/10 text-green-700 dark:text-green-400', desc: 'La tarea ha sido finalizada correctamente.' },
            { estado: 'CANCELADA', color: 'bg-red-500/10 text-red-700 dark:text-red-400', desc: 'La tarea ha sido descartada.' },
          ].map((item) => (
            <div key={item.estado} className={`rounded-md p-2.5 text-sm ${item.color}`}>
              <span className="font-semibold text-xs">{item.estado}</span>
              <span className="ml-2 opacity-80">{item.desc}</span>
            </div>
          ))}
        </div>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Solo los usuarios con rol <strong>Admin</strong> o <strong>Manager</strong> pueden crear y asignar tareas</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Los usuarios reciben una notificación cuando se les asigna una tarea</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'clientes',
    title: 'Clientes',
    icon: UserSquare2,
    badge: 'Comercial',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground leading-relaxed">
          Mantén una base de datos completa de tus clientes. Cada cliente tiene asociado su historial de compras y datos de contacto.
        </p>
        <h4 className="font-medium text-sm">Información del cliente</h4>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Nombre, empresa, email y teléfono</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Dirección de envío y facturación</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Historial de ventas asociadas al cliente</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Notas internas del equipo comercial</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'ventas',
    title: 'Ventas',
    icon: ReceiptText,
    badge: 'Comercial',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground leading-relaxed">
          Registra las ventas de tu organización. Cada venta puede incluir varios productos, asignarse a un cliente y generar automáticamente movimientos de salida de inventario.
        </p>
        <h4 className="font-medium text-sm">Flujo de una venta</h4>
        <ol className="space-y-2 text-sm text-muted-foreground">
          {[
            'Selecciona el cliente o crea uno nuevo',
            'Añade los productos y cantidades vendidas',
            'Confirma el precio de venta por unidad',
            'Al guardar, el stock se descuenta automáticamente',
            'La venta queda registrada para analítica y reportes',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    ),
  },
  {
    id: 'analitica',
    title: 'Analítica',
    icon: BarChart3,
    badge: 'Analítica',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground leading-relaxed">
          El módulo de analítica ofrece dashboards interactivos para analizar el rendimiento de tu negocio. Filtra por fechas, categorías o productos para profundizar en los datos.
        </p>
        <h4 className="font-medium text-sm">Secciones disponibles</h4>
        <div className="space-y-2">
          {[
            { name: 'Resumen', desc: 'Vista global: ventas totales, margen, evolución mensual' },
            { name: 'Ventas y Rentabilidad', desc: 'Análisis de ingresos, costes y márgenes por producto' },
            { name: 'Inventario', desc: 'Valor del stock, rotación y productos sin movimiento' },
            { name: 'Precios y Bundles', desc: 'Comparativa de precios y rendimiento de packs' },
            { name: 'Proveedores', desc: 'Volumen de compra y distribución por proveedor' },
          ].map((item) => (
            <div key={item.name} className="flex gap-3 rounded-md border bg-secondary/20 p-3 text-sm">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'reportes',
    title: 'Reportes',
    icon: FileText,
    badge: 'Analítica',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground leading-relaxed">
          Genera informes detallados de tu negocio y descárgalos para compartirlos con tu equipo o para auditoría interna.
        </p>
        <h4 className="font-medium text-sm">Tipos de informe</h4>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" /><strong>Inventario:</strong> estado actual del stock con valoración</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" /><strong>Ventas:</strong> resumen de ventas por período</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" /><strong>Movimientos:</strong> historial de entradas y salidas</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" /><strong>Proveedores:</strong> compras realizadas por proveedor</li>
        </ul>
        <p className="text-xs text-muted-foreground bg-secondary/40 rounded-md p-2">
          Los reportes pueden ser generados con análisis de IA que identifica tendencias y proporciona recomendaciones.
        </p>
      </div>
    ),
  },
  {
    id: 'usuarios',
    title: 'Usuarios y Roles',
    icon: Users,
    badge: 'Ajustes',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground leading-relaxed">
          NeuralStock usa un sistema de roles para controlar el acceso a las funciones. Cada usuario tiene asignado un rol dentro de la organización.
        </p>
        <h4 className="font-medium text-sm">Roles disponibles</h4>
        <div className="space-y-2">
          {[
            { rol: 'Admin', desc: 'Acceso total. Puede gestionar usuarios, configuración y todos los módulos.' },
            { rol: 'Manager', desc: 'Puede crear y editar recursos. No puede cambiar la configuración de la organización.' },
            { rol: 'Viewer', desc: 'Solo lectura. Puede consultar datos pero no modificarlos.' },
          ].map((item) => (
            <div key={item.rol} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{item.rol}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground bg-secondary/40 rounded-md p-2">
          Para invitar nuevos usuarios a tu organización ve a Ajustes → Usuarios.
        </p>
      </div>
    ),
  },
  {
    id: 'ajustes',
    title: 'Ajustes',
    icon: Settings,
    badge: 'Ajustes',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground leading-relaxed">
          En la sección de Ajustes puedes configurar tu perfil personal, la organización y las preferencias generales de la plataforma.
        </p>
        <h4 className="font-medium text-sm">Subsecciones</h4>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" /><strong>Perfil:</strong> nombre, apellidos, email, avatar y zona horaria</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" /><strong>Organización:</strong> nombre e información de tu empresa</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" /><strong>Usuarios:</strong> invita y gestiona los miembros del equipo</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" /><strong>General:</strong> preferencias de idioma y apariencia</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" /><strong>Facturación:</strong> gestión del plan y suscripción</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" /><strong>Seguridad:</strong> cambio de contraseña y sesiones activas</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'facturacion',
    title: 'Facturación y Plan',
    icon: CreditCard,
    badge: 'Ajustes',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground leading-relaxed">
          NeuralStock ofrece un plan de suscripción mensual con acceso completo a todas las funcionalidades. Gestiona tu suscripción desde Ajustes → Facturación.
        </p>
        <h4 className="font-medium text-sm">Acciones disponibles</h4>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Activar o cancelar tu suscripción</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Ver el estado actual del plan (activo, inactivo, vencido)</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Acceder al portal de facturación para actualizar el método de pago</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />Descargar facturas de periodos anteriores</li>
        </ul>
        <p className="text-xs text-muted-foreground bg-secondary/40 rounded-md p-2">
          El pago se gestiona a través de Stripe. Tu información de tarjeta nunca se almacena en los servidores de NeuralStock.
        </p>
      </div>
    ),
  },
]

export default function DocsPage() {
  const [activeId, setActiveId] = useState(sections[0]!.id)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const contentRef = useRef<HTMLDivElement>(null)

  const scrollToSection = (id: string) => {
    setActiveId(id)
    const el = sectionRefs.current[id]
    if (el && contentRef.current) {
      const container = contentRef.current
      const top = el.offsetTop - 24
      container.scrollTo({ top, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    const container = contentRef.current
    if (!container) return
    const handleScroll = () => {
      let closestId = sections[0]!.id
      let closestDistance = Infinity
      for (const section of sections) {
        const el = sectionRefs.current[section.id]
        if (!el) continue
        const distance = Math.abs(el.getBoundingClientRect().top - container.getBoundingClientRect().top - 40)
        if (distance < closestDistance) {
          closestDistance = distance
          closestId = section.id
        }
      }
      setActiveId(closestId)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="flex h-full min-h-0 overflow-hidden px-4 pb-4 pt-2 gap-6">
      {/* Sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold">Documentación</h1>
        </div>
        <ScrollArea className="flex-1">
          <nav className="space-y-0.5 pr-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  activeId === section.id
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <section.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{section.title}</span>
                </div>
              </button>
            ))}
          </nav>
        </ScrollArea>
      </aside>

      {/* Content */}
      <div
        ref={contentRef}
        className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden"
      >
        <div className="max-w-2xl space-y-10 pb-12">
          {sections.map((section) => (
            <article
              key={section.id}
              ref={(el) => { sectionRefs.current[section.id] = el }}
              id={section.id}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <section.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-tight">{section.title}</h2>
                  {section.badge && (
                    <Badge variant="outline" className="mt-0.5 text-xs">{section.badge}</Badge>
                  )}
                </div>
              </div>
              <div className="pl-12">
                {section.content}
              </div>
              <Separator className="mt-10" />
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
