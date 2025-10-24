<script setup lang="ts">
import type { RoomInfo } from '../types'
import Logo from '../assets/SaubolLogo.svg'

defineProps<{
  room: RoomInfo
  transcriptionActive?: boolean
}>()
</script>

<template>
  <header class="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
    <div class="flex items-center justify-between">
      <div class="flex-1 flex items-center justify-between">
        <div class="flex items-center gap-3 sm:gap-4">
          <div class="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12">
            <img :src="Logo" alt="Saubol" class="w-10 h-10 sm:w-8 sm:h-8" />
          </div>
          <div class="hidden sm:block">
            <h1 class="text-sm sm:text-base font-normal text-neutral-950 leading-6 tracking-[-0.3125px]">Saubol AI</h1>
            <p class="text-xs sm:text-sm text-[#717182] leading-5 tracking-[-0.1504px]">AI-ассистент врача</p>
          </div>
        </div>

        <div class="flex items-center space-x-2 sm:space-x-3">
          <slot name="actions"></slot>
        </div>
      </div>
    </div>
  </header>
</template>