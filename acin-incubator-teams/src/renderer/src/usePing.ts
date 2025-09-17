import { useEffect, useState } from 'react'

function normaliseTarget(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `http://${trimmed}`
}

export function usePing(target: string = '10.107.188.153'): boolean {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    let cancelled = false
    const requestUrl = normaliseTarget(target)

    if (!requestUrl) {
      setOnline(false)
      return () => {
        cancelled = true
      }
    }

    async function ping(): Promise<void> {
      try {
        await fetch(requestUrl, { mode: 'no-cors' })
        if (!cancelled) setOnline(true)
      } catch {
        if (!cancelled) setOnline(false)
      }
    }

    ping()
    const id = setInterval(ping, 5_000)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [target])

  return online
}
