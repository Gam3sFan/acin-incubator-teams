import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'fs'
import ini from 'ini'
import AutoLaunch from 'auto-launch'
import { spawn } from 'child_process'
import robot from 'robotjs'
import os from 'os'
let mqtt: typeof import('mqtt') | undefined

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
  broker: 'mqtt://127.0.0.1:1883',
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
    try {
      const data = JSON.parse(payload.toString())
      if (data.in_meeting) {
        bringTeamsFullScreen()
        win?.setAlwaysOnTop(true, 'screen-saver')
      } else {
        win?.setAlwaysOnTop(false)
      }
    } catch (e) {
      console.error('MQTT message parse error', e)
    }
  })
}

/* ---------- finestra ---------- */
function createWindow(): void {
  win = new BrowserWindow({
    fullscreen: true,
    kiosk: true,
    autoHideMenuBar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true
    }
  })
  win.setFullScreen(true)
  if (isDev && process.env['ELECTRON_RENDERER_URL']) win.loadURL(process.env['ELECTRON_RENDERER_URL'])
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

app.whenReady().then(() => {
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
  app.quit()
})
