<script setup lang="ts">
import { computed } from 'vue'
import type { Message } from '../types'

const props = defineProps<{
  message: Message
}>()

// determine role exactly: 'doctor' or 'patient' (case-insensitive)
const role = computed(() => (props.message.from || '').toString().trim().toLowerCase())
const isDoctor = computed(() => role.value === 'doctor' || role.value === 'врач')
const isPatient = computed(() => role.value === 'patient' || role.value === 'пациент')

const bubbleClass = computed(() => {
  if (props.message.type === 'transcription') return 'bg-[rgba(236,253,245,0.8)]' // light green
  if (isDoctor.value) return 'bg-[rgba(236,253,245,0.8)]' // light green
  if (isPatient.value) return 'bg-[rgba(232,244,255,0.8)]' // light blue
  return 'bg-white'
})

const labelColor = computed(() => {
  if (isDoctor.value || props.message.type === 'transcription') return 'text-[rgba(0,122,85,1)]' // green-ish for 'Врач'
  if (isPatient.value) return 'text-[rgba(20,85,170,1)]' // blue-ish for 'Пациент'
  return 'text-[rgba(0,0,0,0.6)]'
})

function toMillis(ts: any): number {
  if (ts == null) return Date.now()
  if (typeof ts === 'number') {
    return ts < 1e12 ? Math.floor(ts * 1000) : Math.floor(ts)
  }
  if (typeof ts === 'string') {
    if (/^\d+$/.test(ts)) {
      const n = parseInt(ts, 10)
      return n < 1e12 ? n * 1000 : n
    }
    const parsed = Date.parse(ts)
    return Number.isNaN(parsed) ? Date.now() : parsed
  }
  return Date.now()
}

const formattedTime = computed(() => {
  const ms = toMillis(props.message.timestamp)
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
})
</script>

<template>
  <div class="mb-2 sm:mb-3">
    <div :class="['p-2 sm:p-3 rounded-[14px] mb-1 sm:mb-2', bubbleClass]">
      <div class="flex items-center justify-between mb-1 sm:mb-2">
        <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div :class="['text-xs sm:text-sm font-medium truncate', labelColor]">
            {{ isDoctor ? 'Врач' : isPatient ? 'Пациент' : (props.message.from || '') }}:
          </div>
        </div>
        <div class="text-[10px] sm:text-xs text-[rgba(113,113,130,1)] flex-shrink-0 ml-2">{{ formattedTime}}</div>
      </div>

      <div class="text-xs sm:text-sm text-neutral-950 leading-relaxed break-words">{{ props.message.text }}</div>
    </div>
  </div>
</template>