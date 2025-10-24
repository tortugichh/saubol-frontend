<script setup lang="ts">
import { computed } from 'vue'

import MicroIcon from '../assets/micro.svg'
import PauseIcon from '../assets/pause.svg'
import StopIcon from '../assets/stop.svg'
import ResumeIcon from '../assets/resume.svg'

const props = defineProps<{
  isRecording: boolean
  isConnected: boolean
  state?: 'idle' | 'recording' | 'paused'
  showStop?: boolean
}>()

const emit = defineEmits<{
  toggle: []
  stop: []
}>()

const visualState = computed(() => {
  if (!props.isConnected) return 'idle'
  return props.state || 'idle'
})

const btnClass = computed(() => {
  if (!props.isConnected) return 'opacity-50 cursor-not-allowed'
  return 'inline-flex items-center gap-2 py-2 rounded-[10px] text-sm font-normal transition-all duration-150'
})
</script>

<template>
  <div class="flex items-center justify-end gap-2 sm:gap-3 h-8 sm:h-9 w-full">
    <!-- Start Recording -->
    <button
      v-if="visualState === 'idle'"
      @click="$emit('toggle')"
      :disabled="!props.isConnected"
      :class="[
        btnClass,
        'flex justify-center items-center px-3 sm:px-4 py-2 gap-1 sm:gap-2 bg-gradient-to-r from-[#009966] to-[#009689] text-white text-xs sm:text-sm flex-1 min-w-0'
      ]"
    >
      <img :src="MicroIcon" alt="mic" class="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
      <span class="hidden sm:inline">Начать запись</span>
      <span class="sm:hidden">Запись</span>
    </button>

    <!-- Pause / Resume -->
    <button
      v-else-if="visualState === 'recording'"
      @click="$emit('toggle')"
      :class="[
        btnClass,
        'w-16 sm:w-20 flex bg-white border border-gray-200 text-gray-900 gap-1 sm:gap-2 items-center justify-center text-xs sm:text-sm'
      ]"
    >
      <img :src="PauseIcon" alt="pause" class="w-2 h-2 flex-shrink-0" />
      <span>Пауза</span>
    </button>

    <!-- Continue -->
    <button
      v-else-if="visualState === 'paused'"
      @click="$emit('toggle')"
      :class="[
        btnClass,
        'flex-1 bg-gradient-to-r from-[#009966] to-[#009689] text-white h-8 sm:h-9 w-full gap-1 sm:gap-2 flex items-center justify-center text-xs sm:text-sm min-w-0'
      ]"
    >
      <img :src="ResumeIcon" alt="continue" class="w-2 h-2 flex-shrink-0" />
      <span class="hidden sm:inline">Продолжить</span>
      <span class="sm:hidden">Далее</span>
    </button>

    <!-- Stop button -->
    <button
      v-if="props.showStop && (visualState === 'recording' || visualState === 'paused')"
      @click="$emit('stop')"
      :class="[
        btnClass,
        'w-16 sm:w-20 h-8 sm:h-9 gap-1 sm:gap-2 flex items-center justify-center bg-slate-900 text-white text-xs sm:text-sm'
      ]"
    >
      <img :src="StopIcon" alt="stop" class="w-2 h-2 flex-shrink-0" />
      <span>Стоп</span>
    </button>
  </div>
</template>
