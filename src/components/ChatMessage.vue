<script setup lang="ts">
import type { Message } from '../types'

defineProps<{
  message: Message
}>()
</script>

<template>
  <div
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
</template>