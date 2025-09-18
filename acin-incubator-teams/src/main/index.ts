import { app, BrowserWindow, ipcMain, shell } from 'electron'
import type { WebContents } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'fs'
import ini from 'ini'
import AutoLaunch from 'auto-launch'
import os from 'os'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

let mqtt: typeof import('mqtt') | undefined

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = !app.isPackaged

let win: BrowserWindow | null = null

function getRendererContents(): WebContents | null {
  if (!win || win.isDestroyed()) return null
  const contents = win.webContents
  if (contents.isDestroyed()) return null
  return contents
}

/* ---------- CONFIG ---------- */

const cfgDir = path.join(app.getPath('userData'))
const cfgPath = path.join(cfgDir, 'config.ini')

interface Config {
  room: string
  broker: string
  topicTemplate: string
  mqttUsername?: string
  mqttPassword?: string
  [key: string]: unknown
}

const defaultCfg: Config = {
  room: 'Incubator Future',
  broker: 'mqtt://10.107.188.153:1883',
  topicTemplate: 'teams-status/${hostnameUpper}',
  mqttUsername: 'user',
  mqttPassword: 'user'
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
  getRendererContents()?.send('mqtt-status', ok)
}

function sendConfigToRenderer(): void {
  getRendererContents()?.send('config', CONFIG)
}

function sendMqttTopic(payload: { topic: string | null; hostname: string }): void {
  getRendererContents()?.send('mqtt-topic', payload)
}

let currentMqttTopic: string | null = null
let currentMqttHostname = ''

function emitMqttTopic(topic: string | null, hostname: string): void {
  if (currentMqttTopic === topic && currentMqttHostname === hostname) return

  currentMqttTopic = topic
  currentMqttHostname = hostname

  sendMqttTopic({ topic, hostname })
}

function sendIncomingCall(active: boolean): void {
  getRendererContents()?.send('incoming-call', active)
}

let incomingCallActive = false

function emitIncomingCall(active: boolean): void {
  if (incomingCallActive === active) return

  incomingCallActive = active

  sendIncomingCall(active)
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
    emitIncomingCall(false)
    emitMqttTopic(null, os.hostname().toLowerCase())

    return
  }

  let connected = false
  const rawHostname = os.hostname()
  const hostnameLower = rawHostname.toLowerCase()
  const hostnameUpper = rawHostname.toUpperCase()
  const topicTemplate =
    typeof CONFIG.topicTemplate === 'string' && CONFIG.topicTemplate.length > 0
      ? CONFIG.topicTemplate
      : defaultCfg.topicTemplate
  let topic = topicTemplate
    .replace(/\${hostnameUpper}/g, hostnameUpper)
    .replace(/\${hostnameLower}/g, hostnameLower)
    .replace(/\${hostname}/g, hostnameLower)

  topic = topic
    .split(hostnameUpper)
    .join(hostnameLower)
    .split(rawHostname)
    .join(hostnameLower)

  console.info(`[MQTT] Hostname: ${hostnameLower} subscribing to ${topic} on ${CONFIG.broker}`)
  emitMqttTopic(topic, hostnameLower)
  const username =
    (typeof CONFIG.mqttUsername === 'string' && CONFIG.mqttUsername.trim().length > 0
      ? CONFIG.mqttUsername
      : defaultCfg.mqttUsername) ?? 'user'
  const password =
    (typeof CONFIG.mqttPassword === 'string' && CONFIG.mqttPassword.trim().length > 0
      ? CONFIG.mqttPassword
      : defaultCfg.mqttPassword) ?? 'user'

  mqttClient = mqtt.connect(CONFIG.broker, { username, password })
  emitIncomingCall(false)

  const updateStatus = (ok: boolean): void => {
    if (ok !== connected) {
      connected = ok
      sendMqttStatus(ok)
    }
    if (!ok) {
      emitIncomingCall(false)
      emitMqttTopic(null, hostnameLower)
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

    try {
      interface ActivityMessage {
        incomingcall?: unknown
        in_meeting?: unknown
        is_in_meeting?: unknown
      }

      const data = JSON.parse(msg) as ActivityMessage

      incoming = Boolean(data.incomingcall)

    } catch {
      const low = msg.toLowerCase()

      incoming = low.includes('incomingcall')

    }

    emitIncomingCall(incoming)

  })
}

/* ---------- finestra ---------- */

function createWindow(): void {
  win = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: true,
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

  win.on('closed', () => {
    win = null
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
      emitIncomingCall(false)
    }
    emitMqttTopic(null, os.hostname().toLowerCase())
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

  new AutoLaunch({ name: 'RoomDisplayApp' }).isEnabled().then((enabled) => {
    if (!enabled) new AutoLaunch({ name: 'RoomDisplayApp' }).enable()
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
