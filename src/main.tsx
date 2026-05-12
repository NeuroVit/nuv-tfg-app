import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App'


if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const preventGestureZoom = (event: Event) => {
    event.preventDefault()
  }

  document.addEventListener('gesturestart', preventGestureZoom as EventListener, { passive: false })
  document.addEventListener('gesturechange', preventGestureZoom as EventListener, { passive: false })
  document.addEventListener('gestureend', preventGestureZoom as EventListener, { passive: false })

  document.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey) {
        event.preventDefault()
      }
    },
    { passive: false },
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
)
