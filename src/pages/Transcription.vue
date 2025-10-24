<script setup lang="ts">
import { onMounted, computed, ref, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Header from '../components/Header.vue'
import ChatMessage from '../components/ChatMessage.vue'
import MicButton from '../components/MicButton.vue'
import { useTranscription } from '../composables/useTranscription'
import { useRoom } from '../composables/useRoom'
import { getProtocol } from '../services/api'
import type { Room, LocalParticipant } from 'livekit-client'
import type { Message } from '../types'

const router = useRouter()
const route = useRoute()
const { room, disconnect } = useRoom()

const {
  isRecording,
  messages: transcriptionMessages,
  transcriptionActive,
  startRecording,
  stopRecording,
  connectToRoom,
} = useTranscription()

// Combined messages array for transcription and received chat messages
const messages = ref<Message[]>([])

const isParticipantsModalOpen = ref(false)

// Protocol state
const protocol = ref<any>(null)
const isLoadingProtocol = ref(false)

// Computed properties for protocol fields to handle v-model binding
const patientName = computed({
  get: () => protocol.value?.patient_name || '',
  set: (value) => {
    if (protocol.value) {
      protocol.value.patient_name = value
    }
  }
})

const patientIin = computed({
  get: () => protocol.value?.patient_iin || '',
  set: (value) => {
    if (protocol.value) {
      protocol.value.patient_iin = value
    }
  }
})

// Function to fetch protocol with polling
const fetchProtocolWithPolling = async (sanitizedRoomName: string, maxAttempts: number = 30, delayMs: number = 2000) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const protocolData = await getProtocol(sanitizedRoomName)
      return protocolData
    } catch (error: any) {
      // If it's a 404, keep trying; otherwise, fail immediately
      if (error.message?.includes('404') || error.message?.includes('Protocol not found')) {
        if (attempt < maxAttempts) {
          console.log(`Protocol not ready yet (attempt ${attempt}/${maxAttempts}), waiting...`)
          await new Promise(resolve => setTimeout(resolve, delayMs))
          continue
        } else {
          throw new Error(`Protocol still not found after ${maxAttempts} attempts`)
        }
      } else {
        // For other errors (network, server errors), fail immediately
        throw error
      }
    }
  }
}

// pause state: true when recording is paused (not disconnected)
const isPaused = ref(false)

// Timer for recording (seconds) and helpers
const elapsedSeconds = ref(0)
const timerInterval = ref<number | null>(null)
const hasStarted = ref(false)

const resetTimer = () => { elapsedSeconds.value = 0 }
const startTimer = () => {
  if (timerInterval.value != null) return
  timerInterval.value = window.setInterval(() => { elapsedSeconds.value += 1 }, 1000)
}
const stopTimer = () => {
  if (timerInterval.value != null) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}
const formatTwo = (v: number) => String(v).padStart(2, '0')
const formattedTimer = computed(() => {
  const m = Math.floor(elapsedSeconds.value / 60)
  const s = elapsedSeconds.value % 60
  return `${formatTwo(m)}:${formatTwo(s)}`
})

// Create a room info object for the header
const roomInfo = computed(() => ({
  name: room.value ? room.value.name : 'Unknown Room',
  participantName: room.value ? (room.value.localParticipant as LocalParticipant).identity : 'Unknown User',
}))

const isConnected = computed(() => !!room.value)

const micState = computed<'idle' | 'recording' | 'paused'>(() => {
  if (isPaused.value) return 'paused'
  if (isRecording.value) return 'recording'
  return 'idle'
})

const participants = ref<any[]>([])

const waitForProtocolAsync = (roomName: string, checkInterval = 15000) => {
  return new Promise<any>((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const protocolData = await getProtocol(roomName)
        clearInterval(interval)
        resolve(protocolData)
      } catch (err: any) {
        // if still not ready (404), keep polling indefinitely
        if (err.message?.includes('404') || err.message?.includes('Protocol not found')) {
          return // continue polling
        }

        // network or server error → fail immediately
        clearInterval(interval)
        reject(err)
      }
    }, checkInterval)
  })
}

const normalizeText = (t: any) => {
  if (t == null) return ''
  if (typeof t !== 'string') return String(t)
  const s = t.trim()
  // if it's a JSON-like string, try to parse and extract a human text field
  if (s.startsWith('{')) {
    try {
      const p = JSON.parse(s)
      return p?.text ?? p?.message ?? (typeof p === 'string' ? p : JSON.stringify(p))
    } catch {
      return t
    }
  }
  return t


}

const toggleRecording = async () => {
  if (isRecording.value && !isPaused.value) {
    // pausing active recording
    isPaused.value = true
    stopTimer()
    await stopRecording()
  } else if (isPaused.value) {
    // resuming paused recording
    isPaused.value = false
    startTimer()
    await startRecording()
  } else {
    // starting recording for the first time
    await startRecording()
    if (!hasStarted.value) {
      resetTimer()
      hasStarted.value = true
    }
    startTimer()
  }
}

// Note: pause and explicit stop session UI removed; leave toggleRecording and disconnect available

const handleBack = async () => {
  await disconnect()
  router.push({ name: 'RoomCreator' })
}

const handleStop = async () => {
  try {
    // ensure recording is stopped
    if (isRecording.value) {
      await stopRecording()
    }

    // Fetch protocol after stopping recording
    if (room.value) {
      isLoadingProtocol.value = true
      const sanitizedRoomName = room.value.name.replace(/[:\/\\]/g, '')

      const fetchProtocol = async () => {
        isLoadingProtocol.value = true
        try {
          const protocolData = await waitForProtocolAsync(sanitizedRoomName)
          protocol.value = protocolData
          console.log('Protocol fetched:', protocolData)
        } catch (protocolErr) {
          console.error('Error fetching protocol after polling:', protocolErr)
          // Could show a user-friendly message here
        } finally {
          isLoadingProtocol.value = false
        }
      }
      await disconnect()
      await fetchProtocol()
      

    }

    // reset timer/state
    isPaused.value = false
    stopTimer()
    resetTimer()
    hasStarted.value = false
  } catch (err) {
    console.error('Error stopping session:', err)
  }
}

const updateParticipants = () => {
  if (room.value) {
    const r = room.value as Room
    participants.value = [
      r.localParticipant,
      ...Array.from(r.remoteParticipants.values())
    ]
  }
}

// Handle incoming data (chat messages from other participants)
const handleDataReceived = (payload: Uint8Array, participant: any) => {
  const raw = new TextDecoder().decode(payload)
  console.log('DATA RECEIVED raw:', raw)
  let data: any = null
  try { data = JSON.parse(raw) } catch { data = null }

  const sender = participant?.identity || 'unknown'
  console.log('Received data:', data)
  if (data && (data.source === 'agent' || data.type === 'transcription')) {
    messages.value.push({
      id: data.id || Date.now().toString(),
      type: 'transcription',
      text: normalizeText(data.text ?? data.message ?? raw),
      from: data.from ?? sender,
      timestamp: data.timestamp || Date.now(),
    })
    return
  }

  if (data && data.message) {
    messages.value.push({
      id: data.id || Date.now().toString(),
      type: 'chat',
      text: normalizeText(data.message),
      from: data.from || sender,
      timestamp: data.timestamp || Date.now(),
    })
    return
  }

  // fallback, plain text or unknown JSON
  messages.value.push({
    id: Date.now().toString(),
    type: 'chat',
    text: normalizeText(data ? JSON.stringify(data) : raw),
    from: sender,
    timestamp: data.timestamp || Date.now(),
  })
}

onMounted(async () => {
  if(route.query.roomName && route.query.participantName && !room.value) {
    try{
      console.log('Connecting to room:', route.query.roomName, 'as', route.query.participantName)
      await connectToRoom(route.query.roomName as string, route.query.participantName as string)
      console.log('Connected to room via query parameters')
    } catch (error) {
      console.error('Failed to connect to room via query parameters:', error)
      router.push({ name: 'RoomCreator' })
      return
    }
  }


  if (!room.value) {
    router.push({ name: 'RoomCreator' })
    return
  }

  // Update participants list
  updateParticipants()

  // Listen for participant changes
  room.value.on('participantConnected', updateParticipants)
  room.value.on('participantDisconnected', updateParticipants)
  room.value.on('trackSubscribed', updateParticipants)

  // Listen for incoming chat messages
  room.value.on('dataReceived', handleDataReceived)

  // Sync transcription messages
  messages.value = transcriptionMessages.value.map(m => ({
    id: m.id,
    type: 'transcription' as const,
    text: normalizeText(m.text),
    timestamp: m.timestamp,
  }))
})

onUnmounted(() => {
  if (room.value) {
    room.value.off('participantConnected', updateParticipants)
    room.value.off('participantDisconnected', updateParticipants)
    room.value.off('trackSubscribed', updateParticipants)
    room.value.off('dataReceived', handleDataReceived)
  }
})
</script>

<template>
  <div class="box-border flex flex-col min-h-screen" style="background: linear-gradient(141.429deg,#ECFDF5 0%,#FFFFFF 50%,#F0FDFA 100%)">
    <Header :room="roomInfo" :transcription-active="transcriptionActive">
      <template #actions>
        <button
          @click="isParticipantsModalOpen = true"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-500 text-white shadow-sm hover:bg-blue-600"
        >
          Participants ({{ participants.length }})
        </button>
        <button
          @click="handleBack"
          class="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          ← Back to Rooms
        </button>
      </template>
    </Header>

    <main class="flex-1 px-8 py-6" style="background-image: linear-gradient(137.553deg, rgb(236, 253, 245) 0%, rgb(255, 255, 255) 50%, rgb(240, 253, 250) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)">
      <div class="grid grid-cols-2 gap-8 h-[calc(100vh-160px)]">
        <!-- Left Card -->
        <section class="bg-white border border-[rgba(0,0,0,0.05)] rounded-2xl overflow-hidden flex flex-col">
          <div class="border-b border-[rgba(0,0,0,0.05)] box-border content-stretch flex flex-col h-[69px] items-start left-px pb-px pt-[16px] px-[24px] relative w-full">
            <div class="content-stretch flex h-[36px] items-center justify-between relative shrink-0 w-full">
              <div class="h-[24px] relative shrink-0 w-[122px]">
                <div class="bg-clip-padding border-0 border-transparent border-solid box-border content-stretch flex gap-[12px] h-[24px] items-center relative w-[122px]">
                  <div class="h-[24px] relative shrink-0 w-[54.953px]">
                    <p class="absolute font-normal leading-[24px] left-0 not-italic text-[16px] text-neutral-950 text-nowrap top-[-0.5px] tracking-[-0.3125px] whitespace-pre">Диалог</p>
                  </div>
                  <div class="basis-0 grow h-[16px] min-h-px min-w-px relative shrink-0">
                    <div v-if="micState === 'recording'" class="bg-clip-padding border-0 border-transparent border-solid box-border content-stretch flex gap-[8px] h-[16px] items-center relative w-full">
                      <div class="bg-red-500 opacity-50 relative rounded-full shrink-0 size-[8px]">
                        <div class="bg-clip-padding border-0 border-transparent border-solid box-border size-[8px] rounded-full" />
                      </div>
                      <div class="basis-0 grow h-[16px] min-h-px min-w-px relative shrink-0">
                        <p class="absolute font-normal leading-[16px] left-0 not-italic text-[#717182] text-[12px] text-nowrap top-px whitespace-pre">Запись</p>
                      </div>
                    </div>
                    <div v-else-if="micState === 'paused'" class="bg-clip-padding border-0 border-transparent border-solid box-border content-stretch flex gap-[8px] h-[16px] items-center relative w-full">
                      <div class="relative shrink-0 size-[12px]">
                        <img alt="" class="block max-w-none size-full" src="/src/assets/pause.svg" />
                      </div>
                      <div class="basis-0 grow h-[16px] min-h-px min-w-px relative shrink-0">
                        <p class="absolute font-normal leading-[16px] left-0 not-italic text-[#717182] text-[12px] text-nowrap top-px whitespace-pre">Пауза</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="h-[36px] relative shrink-0 w-[271.594px]">
                <div class="bg-clip-padding border-0 border-transparent border-solid box-border content-stretch flex gap-[12px] h-[36px] items-center relative w-[271.594px]">
                  <MicButton :is-recording="isRecording" :is-connected="isConnected" :state="micState" :show-stop="isRecording || isPaused" @toggle="toggleRecording" @stop="handleStop" />
                  <div class="h-[20px] relative shrink-0 w-[42.148px]">
                    <p class="absolute font-normal leading-[20px] left-0 not-italic text-[#717182] text-[14px] text-nowrap top-[0.5px] whitespace-pre">{{ formattedTimer }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex-1 p-6 overflow-y-auto">
            <div v-if="messages.length === 0" class="flex-1 flex items-center justify-center p-8 h-full w-full">
              <div class="text-center text-gray-400">
                <img src="/src/assets/transcription.svg" alt="transcription" class="mx-auto mb-4 w-16 h-20" />
                <div class="text-sm">Транскрипция появится здесь</div>
              </div>
            </div>
            <div v-else class="space-y-3">
              <ChatMessage v-for="message in messages" :key="message.id" :message="message" />
            </div>
            </div>
        </section>

        <!-- Right Card -->
        <aside class="bg-white border border-[rgba(0,0,0,0.05)] rounded-2xl overflow-hidden flex flex-col">
          <div class="border-b border-[rgba(0,0,0,0.05)] box-border content-stretch flex flex-col h-[60px] items-start pb-px pl-[24px] pr-[397.727px] pt-[16px] relative shrink-0 w-full">
            <h3 class="font-medium leading-[27px] not-italic text-[18px] text-neutral-950 text-nowrap top-[0.5px] tracking-[-0.4395px]">Протокол</h3>
          </div>
          <div class="box-border content-stretch flex flex-col gap-[20px] h-[809px] items-start pb-0 pt-[24px] px-[24px] relative shrink-0 w-full">
            <div class="gap-[16px] grid grid-cols-[repeat(2,_minmax(0px,_1fr))] grid-rows-[repeat(1,_minmax(0px,_1fr))] h-[64px] relative shrink-0 w-full">
              <div class="relative shrink-0">
                <div class="absolute content-stretch flex h-[16.5px] items-start left-0 top-[4.5px] w-[99.852px]">
                  <label class="font-normal leading-[20px] not-italic relative shrink-0 text-[#717182] text-[14px] text-nowrap tracking-[-0.1504px] whitespace-pre">ФИО пациента</label>
                </div>
                <input
                  v-model="patientName"
                  class="absolute bg-white border border-[rgba(0,0,0,0.05)] border-solid h-[40px] left-0 rounded-[10px] top-[24px] w-[220.25px] box-border content-stretch flex h-[40px] items-center overflow-clip px-[12px] py-0 relative rounded-[inherit] w-[220.25px]"
                  placeholder="Введите ФИО"
                  :disabled="!protocol"
                />
              </div>
              <div class="relative shrink-0">
                <div class="absolute content-stretch flex h-[16.5px] items-start left-0 top-[4.5px] w-[98.344px]">
                  <label class="font-normal leading-[20px] not-italic relative shrink-0 text-[#717182] text-[14px] text-nowrap tracking-[-0.1504px] whitespace-pre">ИИН пациента</label>
                </div>
                <input
                  v-model="patientIin"
                  class="absolute bg-white border border-[rgba(0,0,0,0.05)] border-solid h-[40px] left-0 rounded-[10px] top-[24px] w-[220.25px] box-border content-stretch flex h-[40px] items-center overflow-clip px-[12px] py-0 relative rounded-[inherit] w-[220.25px]"
                  placeholder="Введите ИИН"
                  :disabled="!protocol"
                />
              </div>
            </div>
            <div class="content-stretch flex flex-col gap-[8px] h-[548px] items-start relative shrink-0 w-full">
              <div class="content-stretch flex h-[20px] items-center justify-between relative shrink-0 w-full">
                <label class="font-normal leading-[20px] not-italic relative shrink-0 text-[#717182] text-[14px] text-nowrap top-[0.5px] tracking-[-0.1504px] whitespace-pre">Детали</label>
              </div>
              <div class="bg-white border border-[rgba(0,0,0,0.05)] border-solid h-[520px] relative rounded-[14px] shrink-0 w-full box-border content-stretch flex h-[520px] items-start overflow-clip px-[16px] py-[12px] relative rounded-[inherit] w-full">
                <!-- Loading state -->
                <div v-if="isLoadingProtocol" class="flex items-center justify-center h-full text-gray-400 w-full">
                  <div class="text-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
                    <div>Генерируется протокол...</div>
                  </div>
                </div>
                <!-- Protocol content -->
                <div v-else-if="protocol" class="font-normal leading-[22.75px] not-italic relative shrink-0 text-[14px] text-gray-900 text-nowrap tracking-[-0.1504px] whitespace-pre">
                  {{ protocol.protocol || protocol.content || 'Содержание протокола...' }}
                </div>
                <!-- Default state -->
                <div v-else class="bg-slate-50 content-stretch flex flex-col gap-[16px] h-full items-center justify-center relative w-full">
                  <div class="relative shrink-0 size-[64px]">
                    <svg class="block max-w-none size-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m2 0a2 2 0 012 2v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4a2 2 0 012-2h12z"/>
                    </svg>
                  </div>
                  <div class="h-[20px] relative shrink-0 w-[271.469px]">
                    <p class="absolute font-normal leading-[20px] left-[136px] not-italic text-[#717182] text-[14px] text-center text-nowrap top-[0.5px] tracking-[-0.1504px] translate-x-[-50%] whitespace-pre">Автоматически создается после записи</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="border-t border-[rgba(0,0,0,0.05)] border-solid box-border content-stretch flex flex-col gap-[12px] h-[109px] items-start pb-0 pt-[17px] px-0 relative shrink-0 w-full">
              <div class="h-[40px] relative shrink-0 w-full">
                <div class="bg-clip-padding border-0 border-transparent border-solid box-border content-stretch flex gap-[12px] h-[40px] items-start relative w-full">
                  <button class="basis-0 bg-white border border-[rgba(0,0,0,0.05)] border-solid grow h-[40px] min-h-px min-w-px relative rounded-[10px] shrink-0 box-border content-stretch flex h-[40px] items-center justify-center relative w-full">
                    <div class="absolute left-[68.98px] size-[16px] top-[12px]">
                      <svg class="block max-w-none size-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                    </div>
                    <p class="absolute font-normal leading-[24px] left-[92.98px] not-italic text-[16px] text-neutral-950 text-nowrap top-[7.5px] tracking-[-0.3125px] whitespace-pre">Скачать</p>
                  </button>
                  <button class="basis-0 bg-slate-100 grow h-[40px] min-h-px min-w-px relative rounded-[10px] shrink-0 box-border content-stretch flex h-[40px] items-center justify-center relative w-full">
                    <div class="absolute left-[58.06px] size-[16px] top-[12px]">
                      <svg class="block max-w-none size-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"/>
                      </svg>
                    </div>
                    <p class="absolute font-normal leading-[24px] left-[82.06px] not-italic text-[#90a1b9] text-[16px] text-nowrap top-[7.5px] tracking-[-0.3125px] whitespace-pre">Сохранить</p>
                  </button>
                </div>
              </div>
              <button class="bg-white border border-[rgba(0,0,0,0.05)] border-solid h-[40px] relative rounded-[10px] shrink-0 w-full box-border content-stretch flex gap-[8px] h-[40px] items-center justify-center px-[17px] py-px relative w-full">
                <p class="font-normal leading-[20px] not-italic relative shrink-0 text-[#717182] text-[14px] text-nowrap tracking-[-0.1504px] whitespace-pre">Новая запись</p>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </main>

    <!-- Participants Modal -->
    <div
      v-if="isParticipantsModalOpen"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="isParticipantsModalOpen = false"
    >
      <div class="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-96 overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-800">
              Participants ({{ participants.length }})
            </h3>
            <button
              @click="isParticipantsModalOpen = false"
              class="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>
          <ul class="space-y-2">
            <li
              v-for="participant in participants"
              :key="participant.identity"
              class="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <span class="text-gray-700 font-medium">{{ participant.identity }}</span>
              <span v-if="participant.isSpeaking" class="text-red-500 text-lg">🎤</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>