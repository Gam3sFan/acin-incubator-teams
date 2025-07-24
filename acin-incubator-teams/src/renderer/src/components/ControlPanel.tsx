import { useState, useEffect, useRef } from 'react'
import { ROOMS } from '../roomData'

interface Props {
  onClose: () => void
  setBroker: (b: string) => void
  setRoom: (r: string) => void
  setTopicTemplate: (t: string) => void
  setShowAlerts: (s: boolean) => void
  broker: string
  room: string
  topicTemplate: string
  showAlerts: boolean
}

export default function ControlPanel({
  onClose,
  setBroker,
  setRoom,
  setTopicTemplate,
  setShowAlerts,
  broker,
  room,
  topicTemplate,
  showAlerts
}: Props): React.JSX.Element {
  const [localBroker, setLocalBroker] = useState(broker)
  const [localRoom, setLocalRoom] = useState(room)
  const [localTopic, setLocalTopic] = useState(topicTemplate)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [micLevel, setMicLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [mqttEnabled, setMqttEnabled] = useState(false)
  const [mqttToggleError, setMqttToggleError] = useState<string | null>(null)
  const [appVersion, setAppVersion] = useState<string>('1.0.0')
  const videoRef = useRef<HTMLVideoElement>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((d) => setDevices(d))
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (videoRef.current && stream) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(videoRef.current as any).srcObject = stream
    }
  }, [stream])

  // Aggiorna la room immediatamente al cambio della select
  useEffect(() => {
    setRoom(localRoom)
  }, [localRoom])

  useEffect(() => {
    if (window.api?.getAppVersion) {
      window.api.getAppVersion().then(setAppVersion)
    }
  }, [])

  function stopTest(): void {
    stream?.getTracks().forEach((t) => t.stop())
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    analyserRef.current?.disconnect()
    setStream(null)
    setMicLevel(0)
  }

  async function startTest(): Promise<void> {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setStream(s)
      const audioCtx = new AudioContext()
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      audioCtx.createMediaStreamSource(s).connect(analyser)
      analyserRef.current = analyser
      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = (): void => {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        data.forEach((v) => {
          const d = v - 128
          sum += d * d
        })
        setMicLevel(Math.min(1, Math.sqrt(sum / data.length) / 50))
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch (err) {
      console.error('device test error', err)
    }
  }

  async function save(): Promise<void> {
    setSaving(true)
    setError(null)
    try {
      if (window.api?.setConfig) {
        const res = await window.api.setConfig({
          broker: localBroker,
          room: localRoom,
          topicTemplate: localTopic
        })
        if (res.ok) {
          setBroker(localBroker)
          setRoom(localRoom)
          setTopicTemplate(localTopic)
          localStorage.setItem('lastRoom', localRoom)
          onClose()
        } else {
          setError('Failed to save config')
        }
      } else {
        // Aggiorna comunque i valori globali/localStorage
        setBroker(localBroker)
        setRoom(localRoom)
        setTopicTemplate(localTopic)
        localStorage.setItem('lastRoom', localRoom)
        onClose()
      }
    } catch (err) {
      setError('Failed to save config')
      console.error('Failed to save config', err)
    } finally {
      setSaving(false)
    }
  }

  // Funzione per chiudere l'app con feedback
  function handleCloseApp() {
    try {
      if (window.api?.closeApp) {
        window.api.closeApp()
      } else {
        setError('Chiusura app non supportata in questo ambiente')
      }
    } catch (e) {
      setError('Errore nella chiusura dell\'app')
    }
  }

  // Funzione per abilitare/disabilitare MQTT
  function handleToggleMqtt() {
    setMqttToggleError(null)
    try {
      if (window.api?.disableMqtt) {
        window.api.disableMqtt(!mqttEnabled)
        setMqttEnabled((v) => !v)
      } else {
        setMqttEnabled((v) => !v)
      }
    } catch (e) {
      setMqttToggleError('Errore nel cambio stato MQTT')
    }
  }

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
      <div className="bg-white text-black p-6 rounded-xl space-y-4 w-96 shadow-lg">
        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded text-sm">{error}</div>
        )}
        <div>
          <label className="block text-sm font-medium">Broker</label>
          <input
            value={localBroker}
            onChange={(e) => setLocalBroker(e.target.value)}
            className="w-full mt-1 p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Topic Template</label>
          <input
            value={localTopic}
            onChange={(e) => setLocalTopic(e.target.value)}
            className="w-full mt-1 p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Room</label>
          <select
            value={localRoom}
            onChange={(e) => setLocalRoom(e.target.value)}
            className="w-full mt-1 p-2 border rounded"
          >
            {Object.keys(ROOMS).map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <h3 className="text-sm font-medium">Devices</h3>
          <ul className="max-h-24 overflow-auto text-xs mt-1 space-y-1">
            {devices.map((d) => (
              <li key={d.deviceId}>
                {d.kind}: {d.label || 'Unnamed'}
              </li>
            ))}
          </ul>
          {stream ? (
            <div className="mt-2 space-y-2">
              <video ref={videoRef} autoPlay muted className="w-full h-32 bg-black rounded" />
              <div className="h-2 bg-gray-300 rounded">
                <div
                  className="h-full bg-green-600 rounded"
                  style={{ width: `${Math.round(micLevel * 100)}%` }}
                />
              </div>
              <button onClick={stopTest} className="px-3 py-1 bg-gray-200 rounded w-full">
                Stop test
              </button>
            </div>
          ) : (
            <button onClick={startTest} className="mt-2 px-3 py-1 bg-gray-200 rounded w-full">
              Start webcam/mic test
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">MQTT</label>
          <button
            onClick={handleToggleMqtt}
            className={`px-3 py-1 rounded ${mqttEnabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}
          >
            {mqttEnabled ? 'Disattiva MQTT' : 'Attiva MQTT'}
          </button>
          {mqttToggleError && <span className="text-xs text-red-600">{mqttToggleError}</span>}
        </div>
        <div className="flex justify-between pt-2">
          <button
            onClick={handleCloseApp}
            className="px-3 py-1 bg-gray-200 rounded"
          >
            Close app
          </button>
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className="px-3 py-1 bg-gray-200 rounded"
          >
            {showAlerts ? 'Hide alerts' : 'Show alerts'}
          </button>
          <button
            onClick={save}
            className={`px-3 py-1 bg-blue-600 text-white rounded ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        <div className="text-xs text-gray-500 text-right pt-2">
          Versione app: {appVersion || '...'}
        </div>
      </div>
    </div>
  )
}
