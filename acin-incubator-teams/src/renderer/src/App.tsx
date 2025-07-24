import { useEffect, useState } from 'react'
import { ROOMS } from './roomData'
import { usePing } from './usePing'
import ControlPanel from './components/ControlPanel'
import bgVideo from './assets/background.mp4'
import teamsIcon from './assets/teams.svg'
import touchIcon from './assets/touch.svg'
import alertIcon from './assets/alert.svg'
import './index.css'

export default function App(): React.JSX.Element {
  const [roomName, setRoomName] = useState(() => {
    const saved = localStorage.getItem('lastRoom')
    return saved || 'Incubator Future'
  })
  const [broker, setBroker] = useState('10.107.188.153')
  const [topicTemplate, setTopicTemplate] = useState('teams/${hostname}')
  const [mqttOk, setMqttOk] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)
  const roomInfo = ROOMS[roomName] || { id: 'unknown' }

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    localStorage.setItem('lastRoom', roomName)
  }, [roomName])

  useEffect(() => {
    if (!window.api) {
      console.warn('window.api is undefined')
      return
    }
    window.api.getConfig().then((cfg) => {
      if (cfg.broker) setBroker(String(cfg.broker))
      if (cfg.room) setRoomName(String(cfg.room))
      if (cfg.topicTemplate) setTopicTemplate(String(cfg.topicTemplate))
      if (!localStorage.getItem('lastRoom') && cfg.room) {
        setRoomName(String(cfg.room))
      }
    })
    window.api.onConfig((cfg) => {
      if (cfg.broker) setBroker(String(cfg.broker))
      if (cfg.room) setRoomName(String(cfg.room))
      if (cfg.topicTemplate) setTopicTemplate(String(cfg.topicTemplate))
    })
    window.api.onMqttStatus(setMqttOk)
  }, [])

  const online = usePing(broker.replace(/^mqtts?:\/\//, '').split(':')[0])

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = now
    .toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    .toUpperCase()

  return (
    <div className="relative w-screen h-screen overflow-hidden text-white font-sans select-none">
      <div className="absolute top-0 right-0 w-10 h-10 z-20" onClick={() => setShowPanel(true)} />
      {showPanel && (
        <ControlPanel
          onClose={() => setShowPanel(false)}
          setBroker={setBroker}
          setRoom={setRoomName}
          setTopicTemplate={setTopicTemplate}
          setShowAlerts={setShowAlerts}
          broker={broker}
          room={roomName}
          topicTemplate={topicTemplate}
          showAlerts={showAlerts}
        />
      )}
      <video
        src={bgVideo}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-purple-700/70 mix-blend-multiply" />
      <div className="relative z-10 flex flex-col justify-between w-full h-full p-12">
        <div>
          <h1 className="text-4xl font-light text-shadow-md">{roomName}</h1>
          <div className="mt-4 text-[192px] leading-none font-bold tracking-tight text-shadow-lg">
            {timeStr}
          </div>
          <div className="text-2xl mt-2 tracking-widest text-shadow-lg">{dateStr}</div>
          {showAlerts && (!online || !mqttOk) && (
            <div className="mt-6 inline-flex items-center space-x-3  bg-black/20 backdrop-blur-md px-4 py-2 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.25)]">
              <img src={alertIcon} alt="alert" className="w-6 h-6" />
            </div>
          )}
        </div>

        <div className="absolute right-12 top-1/2 -translate-y-1/2 w-[380px] bg-black/20 backdrop-blur-md rounded-2xl p-6 flex flex-col space-y-4 shadow-[0_0_50px_rgba(0,0,0,0.3)]">
          <h2 className="text-2xl font-medium">Call or add</h2>
          <div className="text-lg font-mono tracking-wide bg-gray-100/10 px-3 py-2 rounded-md drop-shadow-[0_0_20px_rgba(0,0,0,0.25)]">
            {roomInfo.id}
          </div>
          <img
            src={teamsIcon}
            alt="Teams"
            className="absolute right-6 top-2 w-10 h-10 opacity-90 cursor-pointer"
            onClick={() => window.api?.openTeams?.() ?? (window.location.href = 'msteams://')}
          />
          <button
            onClick={() => window.api?.openTeams?.() ?? (window.location.href = 'msteams://')}
            className="px-3 py-2 rounded text-white"
            style={{ backgroundColor: '#4f42b5' }}
          >
            Open Teams
          </button>
        </div>

        <div className="flex items-center space-x-3 text-sm opacity-80">
          <img src={touchIcon} alt="touch" className="w-6 h-6" />
          <span>This is a touchscreen.</span>
        </div>
      </div>
    </div>
  )
}
