import * as React from 'react'

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const getIsMobile = React.useCallback(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < MOBILE_BREAKPOINT
  }, [])

  const [isMobile, setIsMobile] = React.useState<boolean>(getIsMobile)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => setIsMobile(getIsMobile())

    onChange()

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange)
    } else {
      mql.addListener(onChange)
    }
    window.addEventListener('resize', onChange)
    window.addEventListener('orientationchange', onChange)
    window.visualViewport?.addEventListener('resize', onChange)

    return () => {
      if (typeof mql.removeEventListener === 'function') {
        mql.removeEventListener('change', onChange)
      } else {
        mql.removeListener(onChange)
      }
      window.removeEventListener('resize', onChange)
      window.removeEventListener('orientationchange', onChange)
      window.visualViewport?.removeEventListener('resize', onChange)
    }
  }, [getIsMobile])

  return isMobile
}
