import { useNavigate } from 'react-router'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-gray-200">404</h1>
        <p className="text-gray-500">Página no encontrada</p>
        <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:underline text-sm">
          Volver al dashboard
        </button>
      </div>
    </div>
  )
}
