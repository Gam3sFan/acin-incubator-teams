import { useState } from 'react'
import { ROOMS } from '../roomData'

interface Props {
  onClose: () => void
  setBroker: (b: string) => void
  setRoom: (r: string) => void
  broker: string
  room: string
}

export default function ControlPanel({ onClose, setBroker, setRoom, broker, room }: Props): React.JSX.Element {
  const [localBroker, setLocalBroker] = useState(broker)
  const [localRoom, setLocalRoom] = useState(room)

  function save(): void {
    localStorage.setItem('broker', localBroker)
    localStorage.setItem('roomName', localRoom)
    setBroker(localBroker)
    setRoom(localRoom)
    onClose()
  }

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
      <div className="bg-white text-black p-6 rounded-xl space-y-4 w-96 shadow-lg">
        <div>
          <label className="block text-sm font-medium">Broker</label>
          <input value={localBroker} onChange={(e) => setLocalBroker(e.target.value)} className="w-full mt-1 p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium">Room</label>
          <select value={localRoom} onChange={(e) => setLocalRoom(e.target.value)} className="w-full mt-1 p-2 border rounded">
            {Object.keys(ROOMS).map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
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
