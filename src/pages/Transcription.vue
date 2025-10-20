<script setup lang="ts">
import { onMounted } from 'vue'
import Header from '../components/Header.vue'
import ChatMessage from '../components/ChatMessage.vue'
import MicButton from '../components/MicButton.vue'
import { useTranscription } from '../composables/useTranscription'
import type { RoomInfo } from '../types'

const props = defineProps<{
  room: RoomInfo
}>()

const emit = defineEmits<{
  back: []
}>()

const {
  isConnected,
  isRecording,
  messages,
  transcriptionActive,
  connectToRoom,
  startRecording,
  stopRecording,
  disconnect
} = useTranscription()

const toggleRecording = async () => {
  if (isRecording.value) {
    await stopRecording()
  } else {
    await startRecording()
  }
}

const handleBack = async () => {
  await disconnect()
  emit('back')
}

onMounted(() => {
  connectToRoom(props.room.name, props.room.participantName)
})
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-50">
    <Header :room="room" :transcription-active="transcriptionActive">
      <template #actions>
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
        v-for="(message, index) in messages"
        :key="index"
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
  </div>
</template>