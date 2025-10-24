<script setup lang="ts">
import type { RoomInfo } from '../types'
import Logo from '../assets/SaubolLogo.svg'

defineProps<{
  room: RoomInfo
  transcriptionActive?: boolean
}>()
</script>

<template>
  <header class="px-8 py-6">
    <div class="flex items-center justify-between">
      <div class="flex-1 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="flex items-center justify-center">
            <img :src="Logo" alt="Saubol" class="w-15 h-15" />
          </div>
          <div>
            <h1 class="text-lg font-semibold text-neutral-900">Saubol AI</h1>
            <p class="text-sm text-[#717182]">AI-ассистент врача</p>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <slot name="actions"></slot>
        </div>
      </div>
    </div>
  </header>
</template>