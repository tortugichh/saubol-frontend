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
  <div class="flex items-center justify-end gap-3 h-[36px] w-full">
    <!-- Start Recording -->
    <button
      v-if="visualState === 'idle'"
      @click="$emit('toggle')"
      :disabled="!props.isConnected"
      :class="[
        btnClass,
        'flex justify-center items-center p-2 gap-2 bg-gradient-to-r from-[#009966] to-[#009689] text-white'
      ]"
    >
      <img :src="MicroIcon" alt="mic" class="w-4 h-4" />
      <span>Начать запись</span>
    </button>

    <!-- Pause / Resume -->
    <button
      v-else-if="visualState === 'recording'"
      @click="$emit('toggle')"
      :class="[
        btnClass,
        'w-[78px] flex bg-white border border-gray-200 text-gray-900 gap-2 items-center justify-center'
      ]"
    >
      <img :src="PauseIcon" alt="pause" class="w-2 h-2" />
      <span>Пауза</span>
    </button>

    <!-- Continue -->
    <button
      v-else-if="visualState === 'paused'"
      @click="$emit('toggle')"
      :class="[
        btnClass,
        'flex-1 bg-gradient-to-r from-[#009966] to-[#009689] text-white h-[36px] w-full gap-2 flex items-center justify-center'
      ]"
    >
      <img :src="ResumeIcon" alt="continue" class="w-2 h-2" />
      <span>Продолжить</span>
    </button>

    <!-- Stop button -->
    <button
      v-if="props.showStop && (visualState === 'recording' || visualState === 'paused')"
      @click="$emit('stop')"
      :class="[
        btnClass,
        'w-[78px] h-[36px] gap-2 flex items-center justify-center bg-slate-900 text-white'
      ]"
    >
      <img :src="StopIcon" alt="stop" class="w-2 h-2" />
      <span>Стоп</span>
    </button>
  </div>
</template>
