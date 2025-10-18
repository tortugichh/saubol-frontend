<script setup lang="ts">
import { ref } from 'vue'
import RoomManager from './components/RoomManager.vue'
import { useTranscription } from './composables/useTranscription'

// Room management state
const currentRoom = ref<{ name: string; participantName: string } | null>(null)

// Use the transcription composable
const {
  isConnected,
  isRecording,
  messages,
  connectToRoom,
  startRecording,
  stopRecording,
  disconnect
} = useTranscription()

// Handle room creation
const handleRoomCreated = (roomName: string) => {
  currentRoom.value = { name: roomName, participantName: `user-${Date.now()}` }
  connectToRoom(roomName, currentRoom.value.participantName)
}

// Handle room joining
const handleRoomJoined = (roomName: string, participantName: string) => {
  currentRoom.value = { name: roomName, participantName }
  connectToRoom(roomName, participantName)
}

// Go back to room selection
const backToRooms = () => {
  disconnect()
  currentRoom.value = null
}

// Start/stop recording
const toggleRecording = async () => {
  if (isRecording.value) {
    await stopRecording()
  } else {
    await startRecording()
  }
}
</script>

<template>
  <!-- Room Manager View -->
  <RoomManager
    v-if="!currentRoom"
    @room-created="handleRoomCreated"
    @room-joined="handleRoomJoined"
  />

  <!-- Transcription View -->
  <div v-else class="flex flex-col h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold text-gray-900">Speech-to-Text</h1>
          <p class="text-sm text-gray-600">Room: {{ currentRoom.name }} | User: {{ currentRoom.participantName }}</p>
        </div>
        <button
          @click="backToRooms"
          class="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          ← Back to Rooms
        </button>
      </div>
    </header>

    <!-- Chat Area -->
    <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      <div
        v-for="(message, index) in messages"
        :key="index"
        :class="[
          'flex',
          message.isUser ? 'justify-end' : 'justify-start'
        ]"
      >
        <div
          :class="[
            'max-w-xs lg:max-w-md px-4 py-2 rounded-lg',
            message.isUser
              ? 'bg-blue-500 text-white'
              : 'bg-white border border-gray-200 text-gray-900'
          ]"
        >
          <p class="text-sm">{{ message.text }}</p>
          <p class="text-xs opacity-70 mt-1">{{ message.timestamp }}</p>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="bg-white border-t border-gray-200 px-6 py-4">
      <div class="flex items-center justify-center">
        <button
          @click="toggleRecording"
          :disabled="!isConnected"
          :class="[
            'w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200',
            isRecording
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-blue-500 hover:bg-blue-600',
            !isConnected ? 'opacity-50 cursor-not-allowed' : ''
          ]"
        >
          <svg
            v-if="!isRecording"
            class="w-8 h-8 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fill-rule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clip-rule="evenodd" />
          </svg>
          <svg
            v-else
            class="w-8 h-8 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      <p class="text-center text-sm text-gray-600 mt-2">
        {{ !isConnected ? 'Connecting...' : isRecording ? 'Recording... Click to stop' : 'Click microphone to start recording' }}
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar for chat area */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
