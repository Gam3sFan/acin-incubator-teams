export type RoomInfo = {
  id: string
  isTouchscreen: boolean
}

export const ROOMS: Record<string, RoomInfo> = {
  'Incubator Future': { id: 'ACIN.Future', isTouchscreen: true },
  'Incubator Energy': { id: 'ACIN.IncubatorEnergy', isTouchscreen: true },
  'Incubator Research': { id: 'ACIN.Research', isTouchscreen: true },
  'Collaborate': { id: 'ACIN.Collaborate', isTouchscreen: false },
  'Experience': { id: 'ACIN.Experience', isTouchscreen: false },
  'Envision': { id: 'ACIN.Envision', isTouchscreen: false },
  'Insight': { id: 'ACIN.Insight', isTouchscreen: false }
}
