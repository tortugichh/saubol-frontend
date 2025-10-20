<script setup lang="ts">
import type { RoomInfo } from '../types'

defineProps<{
  room: RoomInfo
}>()
</script>

<template>
  <header class="bg-white border-b border-gray-200 px-6 py-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-gray-900">Speech-to-Text</h1>
        <p class="text-sm text-gray-600">Room name: {{ room.name }} | Room was created by: {{ room.participantName }}</p>
      </div>
      <slot name="actions"></slot>
    </div>
  </header>
</template>