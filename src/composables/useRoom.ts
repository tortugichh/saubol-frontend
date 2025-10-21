import { ref } from 'vue'
import { createRoom as apiCreateRoom, checkRoomExists } from '../services/api'
import { Room } from 'livekit-client'
import { connectRoom } from '../services/livekit'

// Shared state - moved outside function to be truly global
const isCreating = ref(false)
const isJoining = ref(false)
const isConnecting = ref(false)
const error = ref('')
const room = ref<Room | null>(null)

export function useRoom() {

  const createRoom = async (roomName: string) => {
    if (!roomName.trim()) return

    isCreating.value = true
    error.value = ''

    try {
      await apiCreateRoom(roomName.trim())
      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to create room'
      throw err
    } finally {
      isCreating.value = false
    }
  }

  const joinRoom = async (roomName: string, participantName: string) => {
    if (!roomName.trim() || !participantName.trim()) return

    isJoining.value = true
    error.value = ''

    try {
      const roomExists = await checkRoomExists(roomName.trim())
      if (!roomExists.exists) {
        throw new Error('Room does not exist')
      }
      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to join room'
      throw err
    } finally {
      isJoining.value = false
    }
  }

  // Direct LiveKit connection with URL and token
  const joinWithToken = async (url: string, token: string) => {
    if (!url.trim() || !token.trim()) {
      error.value = 'URL and token are required'
      throw new Error('URL and token are required')
    }

    isConnecting.value = true
    error.value = ''

    try {
      const newRoom = new Room()
      await connectRoom(newRoom, url.trim(), token.trim())
      room.value = newRoom
      return newRoom
    } catch (err: any) {
      error.value = err.message || 'Failed to connect to room'
      throw err
    } finally {
      isConnecting.value = false
    }
  }

  const disconnect = async () => {
    if (room.value) {
      await room.value.disconnect()
      room.value = null
    }
  }

  return {
    isCreating,
    isJoining,
    isConnecting,
    error,
    room,
    createRoom,
    joinRoom,
    joinWithToken,
    disconnect
  }
}