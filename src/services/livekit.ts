import { Room } from 'livekit-client'

export function createLiveKitRoom(): Room {
  return new Room()
}

export async function connectRoom(room: Room, url: string, token: string) {
  await room.connect(url, token)
}

export async function disconnectRoom(room: Room) {
  await room.disconnect()
}

export const livekitUrl = import.meta.env.VITE_LIVEKIT_URL 
