import { useEffect, useState } from 'react'

export function usePing(url: string = 'https://teams.microsoft.com'): boolean {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function ping(): Promise<void> {
      try {
        await fetch(url, { mode: 'no-cors' })
        if (!cancelled) setOnline(true)
      } catch {
        if (!cancelled) setOnline(false)
      }
    }

    ping()
    const id = setInterval(ping, 5000)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [url])

  return online
}
