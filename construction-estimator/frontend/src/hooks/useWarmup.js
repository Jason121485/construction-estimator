import { useState, useEffect } from 'react'
import { warmup } from '../utils/api'

/**
 * Pings /api/health to wake the backend (Render free-tier cold start).
 * Uses a module-level singleton so the HTTP request fires only once,
 * even if Login and Signup both call this hook on the same session.
 * Returns true while the ping is in-flight, false once it settles.
 */
export function useWarmup() {
  const [warming, setWarming] = useState(true)

  useEffect(() => {
    let alive = true
    warmup().finally(() => { if (alive) setWarming(false) })
    return () => { alive = false }
  }, [])

  return warming
}
