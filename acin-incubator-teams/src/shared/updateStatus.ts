export type UpdateProgressPayload = {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

export type UpdateStatusPayload =
  | { status: 'idle'; version: string }
  | { status: 'checking' }
  | { status: 'update-available'; version: string; releaseDate?: string }
  | { status: 'update-not-available'; version: string; releaseDate?: string }
  | { status: 'download-progress'; progress: UpdateProgressPayload }
  | { status: 'update-downloaded'; version: string; releaseDate?: string }
  | { status: 'error'; message: string }
  | { status: 'disabled'; message: string }

