import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  exitKiosk: (): void => ipcRenderer.send('exit-kiosk'),
  closeApp: (): void => ipcRenderer.send('close-app'),
  openTeams: (): void => ipcRenderer.send('open-teams'),
  getConfig: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('get-config'),
  setConfig: (cfg: Record<string, unknown>): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('set-config', cfg),
  onMqttStatus: (cb: (ok: boolean) => void): void => {
    ipcRenderer.on('mqtt-status', (_e, ok) => cb(ok))
  },
  onConfig: (cb: (cfg: Record<string, unknown>) => void): void => {
    ipcRenderer.on('config', (_e, cfg) => cb(cfg))
  },
  disableMqtt: (disable: boolean): void => ipcRenderer.send('disable-mqtt', disable),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version')
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
