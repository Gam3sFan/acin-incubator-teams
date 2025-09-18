import { useState, useEffect } from 'react'
import { ROOMS } from '../roomData'

interface Props {
  onClose: () => void
  setBroker: (b: string) => void
  setRoom: (r: string) => void
  setTopicTemplate: (t: string) => void
  setBackgroundVideoEnabled: (enabled: boolean) => void
  broker: string
  room: string
  topicTemplate: string
  backgroundVideoEnabled: boolean
}

export default function ControlPanel({
  onClose,
  setBroker,
  setRoom,
  setTopicTemplate,
  setBackgroundVideoEnabled,
  broker,
  room,
  topicTemplate,
  backgroundVideoEnabled
}: Props): React.JSX.Element {
  const [localBroker, setLocalBroker] = useState(broker)
  const [localRoom, setLocalRoom] = useState(room)
  const [localTopic, setLocalTopic] = useState(topicTemplate)
  const [localVideoEnabled, setLocalVideoEnabled] = useState(backgroundVideoEnabled)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [mqttEnabled, setMqttEnabled] = useState(true)
  const [mqttToggleError, setMqttToggleError] = useState<string | null>(null)
  const [appVersion, setAppVersion] = useState<string>('1.0.0')

  useEffect(() => {
    setRoom(localRoom)
  }, [localRoom])

  useEffect(() => {
    if (window.api?.getAppVersion) {
      window.api.getAppVersion().then(setAppVersion)
    }
  }, [])

  useEffect(() => {
    setLocalVideoEnabled(backgroundVideoEnabled)
  }, [backgroundVideoEnabled])

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
          setBackgroundVideoEnabled(localVideoEnabled)
          localStorage.setItem('lastRoom', localRoom)
          localStorage.setItem('backgroundVideoEnabled', localVideoEnabled ? '1' : '0')
          onClose()
        } else {
          setError('Failed to save config')
        }
      } else {
        setBroker(localBroker)
        setRoom(localRoom)
        setTopicTemplate(localTopic)
        setBackgroundVideoEnabled(localVideoEnabled)
        localStorage.setItem('lastRoom', localRoom)
        localStorage.setItem('backgroundVideoEnabled', localVideoEnabled ? '1' : '0')
        onClose()
      }
    } catch (err) {
      setError('Failed to save config')
      console.error('Failed to save config', err)
    } finally {
      setSaving(false)
    }
  }

  function handleToggleMqtt() {
    setMqttToggleError(null)
    try {
      const nextEnabled = !mqttEnabled
      if (window.api?.disableMqtt) {
        window.api.disableMqtt(!nextEnabled)
      }
      setMqttEnabled(nextEnabled)
    } catch (e) {
      setMqttToggleError('Errore nel cambio stato MQTT')
    }
  }

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
      <div className="bg-white text-black p-6 rounded-xl space-y-4 w-96 shadow-lg">
        {error && <div className="bg-red-100 text-red-700 p-2 rounded text-sm">{error}</div>}
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
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Video di sfondo</label>
          <button
            onClick={() => setLocalVideoEnabled((v) => !v)}
            className={`px-3 py-1 rounded ${localVideoEnabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}
          >
            {localVideoEnabled ? 'Attivo' : 'Disattivo'}
          </button>
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
        <div className="flex justify-end pt-2">
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
