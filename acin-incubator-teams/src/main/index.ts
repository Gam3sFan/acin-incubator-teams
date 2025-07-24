import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'fs'
import ini from 'ini'
import AutoLaunch from 'auto-launch'
import { spawn } from 'child_process'
import robot from 'robotjs'
import os from 'os'
let mqtt: typeof import('mqtt') | undefined

import { electronApp, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = !app.isPackaged
let win: BrowserWindow | null

/* ---------- CONFIG ---------- */
const cfgDir = path.join(app.getPath('userData'))
const cfgPath = path.join(cfgDir, 'config.ini')
interface Config {
  room: string
  broker: string
  topicTemplate: string
  [key: string]: unknown
}
const defaultCfg: Config = {
  room: 'Incubator Future',
  broker: 'mqtt://10.107.188.153:1883',
  topicTemplate: 'teams/${hostname}'
}
function loadConfig(): Config {
  try {
    if (!fs.existsSync(cfgPath)) {
      if (!fs.existsSync(cfgDir)) fs.mkdirSync(cfgDir, { recursive: true })
      fs.writeFileSync(cfgPath, ini.stringify(defaultCfg))
    }
    return { ...defaultCfg, ...ini.parse(fs.readFileSync(cfgPath, 'utf-8')) }
  } catch (e) {
    console.error('Config load error', e)
    return { ...defaultCfg }
  }
}
function saveConfig(newCfg: Config): boolean {
  try {
    fs.writeFileSync(cfgPath, ini.stringify({ ...defaultCfg, ...newCfg }))
    return true
  } catch (e) {
    console.error('Config save error', e)
    return false
  }
}
let CONFIG: Config = loadConfig()

/* ---------- util ---------- */
function sendMqttStatus(ok: boolean): void {
  win?.webContents?.send('mqtt-status', ok)
}
function sendConfigToRenderer(): void {
  win?.webContents?.send('config', CONFIG)
}
function bringTeamsFullScreen(): void {
  try {
    const ps = spawn('powershell', [
      '-Command',
      'Get-Process Teams | ForEach-Object {($_.MainWindowHandle)}'
    ])
    ps.stdout.on('data', (b) => {
      const hWnd = b.toString().trim()
      if (hWnd) {
        spawn('powershell', [
          '-Command',
          `Add-Type "[DllImport('user32.dll')]public static extern bool SetForegroundWindow(IntPtr h);" -Name a -Namespace b; [b.a]::SetForegroundWindow([intptr]${hWnd})`
        ])
      }
    })

    setTimeout(() => robot.keyTap('f', ['control', 'shift']), 300)
  } catch (err) {
    console.error('Teams full-screen failed', err)
  }
}

/* ---------- MQTT ---------- */
let mqttClient: import('mqtt').MqttClient | undefined
async function setupMqttListener(): Promise<void> {
  if (mqttClient) mqttClient.end(true)
  try {
    mqtt = await import('mqtt')
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('mqtt library missing:', msg)
    sendMqttStatus(false)
    return
  }
  let connected = false
  mqttClient = mqtt.connect(CONFIG.broker)
  const topic = CONFIG.topicTemplate.replace('${hostname}', os.hostname().toLowerCase())
  const updateStatus = (ok: boolean): void => {
    if (ok !== connected) {
      connected = ok
      sendMqttStatus(ok)
    }
  }

  mqttClient.on('connect', () =>
    mqttClient!.subscribe(topic, (err: Error | null) => updateStatus(!err))
  )
  mqttClient.on('reconnect', () => updateStatus(false))
  mqttClient.on('offline', () => updateStatus(false))
  mqttClient.on('error', (err: Error) => {
    console.error('MQTT error', err)
    updateStatus(false)
  })
  mqttClient.on('close', () => updateStatus(false))

  mqttClient.on('message', (_: string, payload: Buffer) => {
    const msg = payload.toString()
    let incoming = false
    let active = false
    try {
      interface ActivityMessage {
        incomingcall?: unknown
        in_meeting?: unknown
        is_in_meeting?: unknown
      }
      const data = JSON.parse(msg) as ActivityMessage
      incoming = Boolean(data.incomingcall)
      active = Boolean(data.in_meeting || data.is_in_meeting)
    } catch {
      const low = msg.toLowerCase()
      incoming = low.includes('incomingcall')
      active = low.includes('in_meeting') || low.includes('is_in_meeting')
    }
    if (incoming || active) {
      bringTeamsFullScreen()
      win?.setAlwaysOnTop(true, 'screen-saver')
    } else {
      win?.setAlwaysOnTop(false)
    }
  })
}

/* ---------- finestra ---------- */
function createWindow(): void {
  win = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    autoHideMenuBar: true,
    fullscreen: true,
    kiosk: true,
    alwaysOnTop: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true
    }
  })

  win.on('ready-to-show', () => {
    win!.show()
  })
  win.setFullScreen(true)

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL'])
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else win.loadFile(path.join(__dirname, '../renderer/index.html'))

  win.webContents.on('did-finish-load', sendConfigToRenderer)
}

/* ---------- IPC ---------- */
ipcMain.handle('get-config', () => CONFIG)
ipcMain.handle('set-config', (_e, newCfg: Partial<Config>): { ok: boolean } => {
  CONFIG = { ...CONFIG, ...newCfg }
  if (saveConfig(CONFIG)) {
    setupMqttListener().catch(console.error)
    sendConfigToRenderer()
    return { ok: true }
  }
  return { ok: false }
})
ipcMain.handle('get-app-version', () => app.getVersion())

ipcMain.on('exit-kiosk', () => {
  if (win) {
    win.setKiosk(false)
    win.setFullScreen(false)
  }
})

ipcMain.on('close-app', () => {
  app.quit()
})

ipcMain.on('open-teams', () => {
  shell.openExternal('msteams://').catch((err) => {
    console.error('Failed to open Teams', err)
  })
})

ipcMain.on('disable-mqtt', (_e, disable: boolean) => {
  if (disable) {
    if (mqttClient) {
      mqttClient.end(true)
      mqttClient = undefined
      sendMqttStatus(false)
    }
  } else {
    setupMqttListener().catch(console.error)
  }
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  createWindow()
  setupMqttListener().catch(console.error)
  new AutoLaunch({ name: 'RoomDisplayApp' }).isEnabled().then((e) => {
    if (!e) new AutoLaunch({ name: 'RoomDisplayApp' }).enable()
  })
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
app.on('window-all-closed', () => {
  mqttClient?.end(true)
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
