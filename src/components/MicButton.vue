<script setup lang="ts">

defineProps<{
  isRecording: boolean
  isConnected: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()
</script>

<template>
  <button
    @click="emit('toggle')"
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
</template>