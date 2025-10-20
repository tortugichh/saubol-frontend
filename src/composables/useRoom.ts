import { ref } from 'vue'
import { createRoom as apiCreateRoom, checkRoomExists } from '../services/api'

export function useRoom() {
  const isCreating = ref(false)
  const isJoining = ref(false)
  const error = ref('')

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

  return {
    isCreating,
    isJoining,
    error,
    createRoom,
    joinRoom
  }
}