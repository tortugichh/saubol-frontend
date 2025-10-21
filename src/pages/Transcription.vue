<script setup lang="ts">
import { onMounted, computed, ref, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Header from '../components/Header.vue'
import ChatMessage from '../components/ChatMessage.vue'
import MicButton from '../components/MicButton.vue'
import { useTranscription } from '../composables/useTranscription'
import { useRoom } from '../composables/useRoom'
import type { Room, LocalParticipant } from 'livekit-client'
import type { Message } from '../types'

const router = useRouter()
const route = useRoute()
const { room, disconnect } = useRoom()

const {
  isRecording,
  messages: transcriptionMessages,
  transcriptionActive,
  startRecording,
  stopRecording,
  connectToRoom,
} = useTranscription()

// Combined messages array for transcription and received chat messages
const messages = ref<Message[]>([])

const isParticipantsModalOpen = ref(false)

// Create a room info object for the header
const roomInfo = computed(() => ({
  name: room.value ? room.value.name : 'Unknown Room',
  participantName: room.value ? (room.value.localParticipant as LocalParticipant).identity : 'Unknown User',
}))

const isConnected = computed(() => !!room.value)

const participants = ref<any[]>([])

const toggleRecording = async () => {
  if (isRecording.value) {
    await stopRecording()
  } else {
    await startRecording()
  }
}

const handleBack = async () => {
  await disconnect()
  router.push({ name: 'RoomCreator' })
}

const updateParticipants = () => {
  if (room.value) {
    const r = room.value as Room
    participants.value = [
      r.localParticipant,
      ...Array.from(r.remoteParticipants.values())
    ]
  }
}

// Handle incoming data (chat messages from other participants)
// ...existing code...
const handleDataReceived = (payload: Uint8Array, participant: any) => {
  const raw = new TextDecoder().decode(payload)
  let data: any = null
  try { data = JSON.parse(raw) } catch { data = null }

  const sender = participant?.identity || 'unknown'
  console.log('Received data:', data)
  if (data && (data.source === 'agent' || data.type === 'transcription')) {
    messages.value.push({
      id: data.id || Date.now().toString(),
      type: 'transcription',
      text: data.text ?? raw,
      from: data.agent ?? sender,
      timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
    })
    return
  }

  // legacy meet.livekit.io format { message: "..." }
  if (data && data.message) {
    messages.value.push({
      id: data.id || Date.now().toString(),
      type: 'chat',
      text: data.message,
      from: data.from || sender,
      timestamp: data.timestamp || Date.now(),
    })
    return
  }

  // fallback — plain text or unknown JSON
  messages.value.push({
    id: Date.now().toString(),
    type: 'chat',
    text: data ? JSON.stringify(data) : raw,
    from: sender,
    timestamp: Date.now(),
  })
}

onMounted(async () => {
  if(route.query.roomName && route.query.participantName && !room.value) {
    try{
      console.log('Connecting to room:', route.query.roomName, 'as', route.query.participantName)
      await connectToRoom(route.query.roomName as string, route.query.participantName as string)
      console.log('Connected to room via query parameters')
    } catch (error) {
      console.error('Failed to connect to room via query parameters:', error)
      router.push({ name: 'RoomCreator' })
      return
    }
  }


  if (!room.value) {
    router.push({ name: 'RoomCreator' })
    return
  }

  // Update participants list
  updateParticipants()

  // Listen for participant changes
  room.value.on('participantConnected', updateParticipants)
  room.value.on('participantDisconnected', updateParticipants)
  room.value.on('trackSubscribed', updateParticipants)

  // Listen for incoming chat messages
  room.value.on('dataReceived', handleDataReceived)

  // Sync transcription messages
  messages.value = transcriptionMessages.value.map(m => ({
    id: m.id,
    type: 'transcription' as const,
    text: m.text,
    timestamp: m.timestamp,
  }))
})

onUnmounted(() => {
  if (room.value) {
    room.value.off('participantConnected', updateParticipants)
    room.value.off('participantDisconnected', updateParticipants)
    room.value.off('trackSubscribed', updateParticipants)
    room.value.off('dataReceived', handleDataReceived)
  }
})
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-50">
    <Header :room="roomInfo" :transcription-active="transcriptionActive">
      <template #actions>
        <button
          @click="isParticipantsModalOpen = true"
          class="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
        >
           Participants ({{ participants.length }})
        </button>
        <button
          @click="handleBack"
          class="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          ← Back to Rooms
        </button>
      </template>
    </Header>

    <!-- Chat Area -->
    <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      <ChatMessage
        v-for="message in messages"
        :key="message.id"
        :message="message"
      />
    </div>

    <!-- Input Area -->
    <div class="bg-white border-t border-gray-200 px-6 py-4">
      <div class="flex items-center justify-center">
        <MicButton
          :is-recording="isRecording"
          :is-connected="isConnected"
          @toggle="toggleRecording"
        />
      </div>
      <p class="text-center text-sm text-gray-600 mt-2">
        {{ !isConnected ? 'Connecting...' : (transcriptionActive ? (isRecording ? 'Recording... Click to stop' : 'Agent joined — click microphone to start recording') : 'Waiting for transcription agent...') }}
      </p>
    </div>

    <!-- Participants Modal -->
    <div
      v-if="isParticipantsModalOpen"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="isParticipantsModalOpen = false"
    >
      <div class="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-96 overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-800">
              Participants ({{ participants.length }})
            </h3>
            <button
              @click="isParticipantsModalOpen = false"
              class="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>
          <ul class="space-y-2">
            <li
              v-for="participant in participants"
              :key="participant.identity"
              class="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <span class="text-gray-700 font-medium">{{ participant.identity }}</span>
              <span v-if="participant.isSpeaking" class="text-red-500 text-lg">🎤</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>