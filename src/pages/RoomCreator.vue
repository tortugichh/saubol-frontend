<script setup lang="ts">
import RoomManager from '../components/RoomManager.vue'

const emit = defineEmits<{
  roomCreated: [roomName: string, participantName: string]
  roomJoined: [roomName: string, participantName: string]
}>()

const handleRoomCreated = (roomName: string, participantName: string) => {
  emit('roomCreated', roomName, participantName)
}

const handleRoomJoined = (roomName: string, participantName: string) => {
  emit('roomJoined', roomName, participantName)
}
</script>

<template>
  <RoomManager 
    @room-created="handleRoomCreated"
    @room-joined="handleRoomJoined"
  />
</template>