<script setup lang="ts">
import { ref } from 'vue'
import RoomCreator from './pages/RoomCreator.vue'
import Transcription from './pages/Transcription.vue'
import type { RoomInfo } from './types'

const currentRoom = ref<RoomInfo | null>(null)

const handleRoomCreated = (roomName: string, participantName: string) => {
  currentRoom.value = { 
    name: roomName, 
    participantName: participantName 
  }
}

const handleRoomJoined = (roomName: string, participantName: string) => {
  currentRoom.value = { 
    name: roomName, 
    participantName: participantName 
  }
}

const handleBack = () => {
  currentRoom.value = null
}
</script>

<template>
  <div>
    <RoomCreator 
      v-if="!currentRoom" 
      @room-created="handleRoomCreated" 
      @room-joined="handleRoomJoined"
    />
    <Transcription 
      v-else 
      :room="currentRoom" 
      @back="handleBack" 
    />
  </div>
</template>