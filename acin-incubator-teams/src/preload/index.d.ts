import type { UpdateStatusPayload } from '../shared/updateStatus'

declare global {
  interface RendererElectronAPI {
    process: {
      versions: NodeJS.ProcessVersions
      platform: NodeJS.Platform
    }
  }

  interface Window {
    electron: RendererElectronAPI
    api: {
      exitKiosk: () => void
      openTeams: () => void
      getConfig: () => Promise<Record<string, unknown>>
      setConfig: (cfg: Record<string, unknown>) => Promise<{ ok: boolean }>
      onMqttStatus: (cb: (ok: boolean) => void) => void
      onMqttTopic: (cb: (info: { topic: string | null; hostname: string }) => void) => void
      onIncomingCall: (cb: (active: boolean) => void) => void
      onConfig: (cb: (cfg: Record<string, unknown>) => void) => void
      disableMqtt: (disable: boolean) => void
      getAppVersion: () => Promise<string>
      getUpdateStatus: () => Promise<UpdateStatusPayload>
      checkForUpdates: () => void
      onUpdateStatus: (cb: (payload: UpdateStatusPayload) => void) => () => void
    }
  }
}

export {}
