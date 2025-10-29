import { contextBridge, ipcRenderer } from 'electron'
import type { UpdateStatusPayload } from '../shared/updateStatus'

const electronAPI = Object.freeze({
  process: {
    versions: process.versions,
    platform: process.platform
  }
})

// Custom APIs for renderer
const api = {
  exitKiosk: (): void => ipcRenderer.send('exit-kiosk'),
  openTeams: (): void => ipcRenderer.send('open-teams'),
  getConfig: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('get-config'),
  setConfig: (cfg: Record<string, unknown>): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('set-config', cfg),
  onMqttStatus: (cb: (ok: boolean) => void): void => {
    ipcRenderer.on('mqtt-status', (_e, ok) => cb(ok))
  },
  onMqttTopic: (cb: (info: { topic: string | null; hostname: string }) => void): void => {
    ipcRenderer.on('mqtt-topic', (_e, info) => cb(info))
  },
  onIncomingCall: (cb: (active: boolean) => void): void => {
    ipcRenderer.on('incoming-call', (_e, active) => cb(Boolean(active)))
  },
  onConfig: (cb: (cfg: Record<string, unknown>) => void): void => {
    ipcRenderer.on('config', (_e, cfg) => cb(cfg))
  },
  disableMqtt: (disable: boolean): void => ipcRenderer.send('disable-mqtt', disable),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),
  getUpdateStatus: (): Promise<UpdateStatusPayload> => ipcRenderer.invoke('get-update-status'),
  checkForUpdates: (): void => ipcRenderer.send('check-for-updates'),
  onUpdateStatus: (cb: (payload: UpdateStatusPayload) => void): (() => void) => {
    const listener = (_e: Electron.IpcRendererEvent, payload: UpdateStatusPayload) => cb(payload)
    ipcRenderer.on('update-status', listener)
    return () => {
      ipcRenderer.removeListener('update-status', listener)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
