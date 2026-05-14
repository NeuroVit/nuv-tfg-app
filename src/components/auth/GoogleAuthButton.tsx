import { useState } from 'react'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GoogleAuthButtonProps {
  label: string
  width: string | number
  onSuccess: (response: CredentialResponse) => void
  onError: () => void
  disabled?: boolean
  className?: string
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3 .8 3.7 1.4l2.5-2.5C16.8 3.6 14.6 2.7 12 2.7 6.9 2.7 2.8 6.9 2.8 12s4.1 9.3 9.2 9.3c5.3 0 8.9-3.7 8.9-8.9 0-.6-.1-1.1-.2-1.6H12Z" />
      <path fill="#34A853" d="M3.8 7.6l3.2 2.4c.9-1.8 2.8-3 5-3 1.8 0 3 .8 3.7 1.4l2.5-2.5C16.8 3.6 14.6 2.7 12 2.7c-3.5 0-6.5 2-8.2 4.9Z" />
      <path fill="#FBBC05" d="M2.8 12c0 1.5.4 2.9 1 4.1l3.7-2.9c-.2-.5-.4-1-.4-1.6s.1-1.1.4-1.6L3.8 7.6A9.1 9.1 0 0 0 2.8 12Z" />
      <path fill="#4285F4" d="M12 21.3c2.5 0 4.7-.8 6.3-2.3l-3-2.4c-.8.6-1.8 1-3.3 1-2.2 0-4.1-1.5-4.8-3.5l-3.7 2.9c1.6 3 4.7 4.3 8.5 4.3Z" />
    </svg>
  )
}

export function GoogleAuthButton({
  label,
  width,
  onSuccess,
  onError,
  disabled = false,
  className,
}: GoogleAuthButtonProps) {
  const [activated, setActivated] = useState(false)

  return (
    <div
      className={cn('group relative w-full', className)}
      onPointerDownCapture={() => {
        if (!activated && !disabled) setActivated(true)
      }}
    >
      <div
        className={cn(
          'inline-flex h-9 w-full items-center justify-center gap-2 rounded-4xl border border-transparent bg-primary px-3 text-sm font-medium text-primary-foreground transition-all',
          'group-hover:bg-primary/90 group-focus-within:bg-primary/90',
          disabled && 'pointer-events-none opacity-50'
        )}
      >
        {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        {label}
      </div>

      {activated && !disabled && (
        <GoogleLogin
          onSuccess={onSuccess}
          onError={onError}
          text="continue_with"
          shape="rectangular"
          theme="outline"
          size="large"
          width={width}
          containerProps={{
            className:
              'absolute inset-0 z-10 cursor-pointer overflow-hidden rounded-4xl opacity-0 [&>div]:!h-full [&>div]:!w-full [&_iframe]:!h-full [&_iframe]:!w-full',
            style: {
              height: '100%',
              width: '100%',
            },
          }}
        />
      )}
    </div>
  )
}
