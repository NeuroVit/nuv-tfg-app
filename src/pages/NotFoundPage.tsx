import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <p className="text-muted-foreground">Página no encontrada</p>
        <Button variant="link" onClick={() => navigate('/dashboard')} className="text-sm">
          Volver al inicio
        </Button>
      </div>
    </div>
  )
}
