<script setup lang="ts">
import type { RoomInfo } from '../types'

defineProps<{
  room: RoomInfo
  transcriptionActive?: boolean
}>()
</script>

<template>
  <header class="bg-white border-b border-gray-200 px-6 py-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-gray-900">Saubol</h1>
        <p class="text-sm text-gray-600">Room: {{ room.name }} | Your username: {{ room.participantName }}</p>
      </div>

      <div class="flex items-center space-x-4">
        <div v-if="transcriptionActive" class="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm">
          Agent: Joined
        </div>
        <div v-else class="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm">
          Waiting for agent
        </div>

        <slot name="actions"></slot>
      </div>
    </div>
  </header>
</template>