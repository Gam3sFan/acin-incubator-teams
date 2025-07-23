import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      exitKiosk: () => void
      closeApp: () => void
      openTeams: () => void
      getConfig: () => Promise<Record<string, unknown>>
      setConfig: (cfg: Record<string, unknown>) => Promise<{ ok: boolean }>
      onMqttStatus: (cb: (ok: boolean) => void) => void
      onConfig: (cb: (cfg: Record<string, unknown>) => void) => void
    }
  }
}
