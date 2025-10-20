<script setup lang="ts">
import { ref } from 'vue'
import { useRoom } from '../composables/useRoom'

const newRoomName = ref('')
const createParticipantName = ref('')
const joinRoomName = ref('')
const joinParticipantName = ref('')

const { isCreating, isJoining, error, createRoom, joinRoom } = useRoom()

const emit = defineEmits<{
  roomCreated: [roomName: string, participantName: string]
  roomJoined: [roomName: string, participantName: string]
}>()

const createRoomHandler = async () => {
  if (!newRoomName.value.trim() || !createParticipantName.value.trim()) return

  try {
    await createRoom(newRoomName.value.trim())
    emit('roomCreated', newRoomName.value.trim(), createParticipantName.value.trim())
    newRoomName.value = ''
    createParticipantName.value = ''
  } catch (err) {
    // Error handled in composable
  }
}

const joinRoomHandler = async () => {
  if (!joinRoomName.value.trim() || !joinParticipantName.value.trim()) return

  try {
    await joinRoom(joinRoomName.value.trim(), joinParticipantName.value.trim())
    emit('roomJoined', joinRoomName.value.trim(), joinParticipantName.value.trim())
    joinRoomName.value = ''
    joinParticipantName.value = ''
  } catch (err) {
    // Error handled in composable
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
            @keyup.enter="joinRoomHandler"
          />
          <input
            v-model="joinParticipantName"
            type="text"
            placeholder="Enter your name"
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            @keyup.enter="joinRoomHandler"
          />
          <button
            @click="joinRoomHandler"
            :disabled="!joinRoomName.trim() || !joinParticipantName.trim() || isJoining"
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
            @keyup.enter="createRoomHandler"
          />
          <input
            v-model="createParticipantName"
            type="text"
            placeholder="Enter your name"
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @keyup.enter="createRoomHandler"
          />
          <button
            @click="createRoomHandler"
            :disabled="!newRoomName.trim() || !createParticipantName.trim() || isCreating"
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