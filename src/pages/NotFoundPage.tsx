import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-gray-200">404</h1>
        <p className="text-gray-500">Página no encontrada</p>
        <Button variant="link" onClick={() => navigate('/dashboard')} className="text-sm">
          Volver al inicio
        </Button>
      </div>
    </div>
  )
}
