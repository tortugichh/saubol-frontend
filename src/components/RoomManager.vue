<script setup lang="ts">
import { ref } from 'vue'

const newRoomName = ref('')
const isCreating = ref(false)
const error = ref('')

const joinRoomName = ref('')
const participantName = ref('')
const isJoining = ref(false)

const backendUrl = (import.meta.env.VITE_BACKEND_URL as string) || 'http://localhost:8000'

// Emit events to parent component
const emit = defineEmits<{
  roomCreated: [roomName: string]
  roomJoined: [roomName: string, participantName: string]
}>()

const createRoom = async () => {
  if (!newRoomName.value.trim()) return

  isCreating.value = true
  error.value = ''

  try {
    const response = await fetch(`${backendUrl}/api/create-room?room_name=${encodeURIComponent(newRoomName.value.trim())}`, {
      method: 'POST'
    })

    if (!response.ok) {
      throw new Error(`Failed to create room: ${response.status}`)
    }

    emit('roomCreated', newRoomName.value.trim())
    newRoomName.value = ''
  } catch (err: any) {
    error.value = err.message || 'Failed to create room'
  } finally {
    isCreating.value = false
  }
}

const joinRoom = async () => {
    if (!joinRoomName.value.trim() || !participantName.value.trim()) return

    isJoining.value = true
    error.value = ''

    try{
        //Check if room exists
        const response = await fetch(`${backendUrl}/api/check-room?room_name=${encodeURIComponent(joinRoomName.value.trim())}`)
        
        if(!response.ok){
          throw new Error(`Failed to verify room existence: ${response.status}`)
        }

        const data = await response.json()
        if(!data.exists){
          throw new Error('Room does not exist')
        }

        // Emit event to parent component
        emit('roomJoined', joinRoomName.value.trim(), participantName.value.trim())
        joinRoomName.value = ''
        participantName.value = ''
    } catch (err: any) {
        error.value = err.message || 'Failed to join room'
    } finally {
        isJoining.value = false
    }
}
</script>


<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
      <h1 class="text-2xl font-bold text-center text-gray-900 mb-8">
        Speech-to-Text Rooms
      </h1>

      <!-- Join Existing Room Section -->
        <div class="mb-8">
        <h2 class="text-lg font-semibold text-gray-700 mb-4">Join Existing Room</h2>
        <div class="space-y-4">
            <input
            v-model="joinRoomName"
            type="text"
            placeholder="Enter room name"
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            @keyup.enter="joinRoom"
            />
            <input
            v-model="participantName"
            type="text"
            placeholder="Enter your name"
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            @keyup.enter="joinRoom"
            />
            <button
            @click="joinRoom"
            :disabled="!joinRoomName.trim() || !participantName.trim() || isJoining"
            class="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
            {{ isJoining ? 'Joining...' : 'Join Room' }}
            </button>
        </div>
        </div>


      <!-- Create Room Section -->
      <div class="mb-8">
        <h2 class="text-lg font-semibold text-gray-700 mb-4">Create New Room</h2>
        <div class="space-y-4">
          <input
            v-model="newRoomName"
            type="text"
            placeholder="Enter room name"
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @keyup.enter="createRoom"
          />
          <button
            @click="createRoom"
            :disabled="!newRoomName.trim() || isCreating"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isCreating ? 'Creating...' : 'Create Room' }}
          </button>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
        {{ error }}
      </div>
    </div>
  </div>
</template>

