import { useState, useEffect, useRef } from 'react'
import { ROOMS } from '../roomData'

interface Props {
  onClose: () => void
  setBroker: (b: string) => void
  setRoom: (r: string) => void
  setTopicTemplate: (t: string) => void
  broker: string
  room: string
  topicTemplate: string
}

export default function ControlPanel({
  onClose,
  setBroker,
  setRoom,
  setTopicTemplate,
  broker,
  room,
  topicTemplate
}: Props): React.JSX.Element {
  const [localBroker, setLocalBroker] = useState(broker)
  const [localRoom, setLocalRoom] = useState(room)
  const [localTopic, setLocalTopic] = useState(topicTemplate)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [micLevel, setMicLevel] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number>()

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

  function save(): void {
    window.api
      .setConfig({ broker: localBroker, room: localRoom, topicTemplate: localTopic })
      .then((res) => {
        if (res.ok) {
          setBroker(localBroker)
          setRoom(localRoom)
          setTopicTemplate(localTopic)
          localStorage.setItem('lastRoom', localRoom)
          onClose()
        }
      })
  }

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
      <div className="bg-white text-black p-6 rounded-xl space-y-4 w-96 shadow-lg">
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
              <li key={d.deviceId}>{d.kind}: {d.label || 'Unnamed'}</li>
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
          )
        </div>
        <div className="flex justify-between pt-2">
          <button onClick={() => window.api.exitKiosk()} className="px-3 py-1 bg-gray-200 rounded">
            Exit kiosk
          </button>
          <button onClick={() => window.api.closeApp()} className="px-3 py-1 bg-gray-200 rounded">
            Close app
          </button>
          <button onClick={save} className="px-3 py-1 bg-blue-600 text-white rounded">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
