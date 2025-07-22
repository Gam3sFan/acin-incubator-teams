import { useEffect, useState } from 'react'
import { ROOMS } from './roomData'
import { usePing } from './usePing'
import bgVideo from './assets/background.mp4'
import teamsIcon from './assets/teams.svg'
import touchIcon from './assets/touch.svg'
import './index.css'

export default function App(): React.JSX.Element {
  const [roomName] = useState(() => localStorage.getItem('roomName') || 'Incubator Future')
  const roomInfo = ROOMS[roomName] || { id: 'unknown' }

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const online = usePing()

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = now
    .toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    .toUpperCase()

  return (
    <div className="relative w-screen h-screen overflow-hidden text-white font-sans select-none">
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
          {!online && (
            <div className="mt-6 inline-flex items-center space-x-3 bg-yellow-500/20 px-4 py-2 rounded-full backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.25)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5 text-yellow-400"
              >
                <path d="M12 2.25c-.91 0-1.71.5-2.11 1.24L1.9 17.35c-.8 1.46.26 3.15 1.9 3.15h16.2c1.64 0 2.7-1.69 1.9-3.15L14.11 3.49A2.25 2.25 0 0012 2.25zm-.75 6a.75.75 0 011.5 0v5.25a.75.75 0 01-1.5 0V8.25zm.75 9.75a1.125 1.125 0 110-2.25 1.125 1.125 0 010 2.25z" />
              </svg>
              <span className="font-medium">Network Issue</span>
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
            className="absolute right-6 top-2 w-10 h-10 opacity-90"
          />
        </div>

        <div className="flex items-center space-x-3 text-sm opacity-80">
          <img src={touchIcon} alt="touch" className="w-6 h-6" />
          <span>This is a touchscreen</span>
        </div>
      </div>
    </div>
  )
}
