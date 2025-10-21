<script setup lang="ts">
import type { Message } from '../types'

defineProps<{
  message: Message
}>()
</script>

<template>
  <div class="p-3 rounded-lg mb-2" :class="message.type === 'chat' ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-purple-50 border-l-4 border-purple-500'">
    <div class="flex justify-between text-sm text-gray-600 mb-1">
      <span v-if="message.from" class="font-semibold">{{ message.from }}</span>
      <span>{{ new Date(message.timestamp).toLocaleTimeString() }}</span>
    </div>
    <div class="text-base">{{ message.text }}</div>
  </div>
</template>