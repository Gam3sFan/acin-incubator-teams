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
    const normalisedTarget = normaliseTarget(target)

    if (!normalisedTarget) {
      setOnline(false)
      return () => {
        cancelled = true
      }
    }

    async function ping(url: string): Promise<void> {
      try {
        await fetch(url, { mode: 'no-cors' })
        if (!cancelled) setOnline(true)
      } catch {
        if (!cancelled) setOnline(false)
      }
    }

    void ping(normalisedTarget)
    const id = setInterval(() => { void ping(normalisedTarget) }, 5_000)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [target])

  return online
}
