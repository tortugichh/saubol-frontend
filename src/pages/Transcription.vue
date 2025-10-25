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

import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

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

const downloadProtocol = () => {
  if (!protocol.value) {
    console.warn('No protocol available to download')
    return
  }

  try {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: "Медицинский протокол",
            heading: HeadingLevel.TITLE,
          }),
          
          // Patient info
          
          new Paragraph({
            children: [
              new TextRun({ text: `ФИО пациента: ${patientName.value || 'Не указано'}`, bold: true }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `ИИН пациента: ${patientIin.value || 'Не указано'}`, bold: true }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Дата: ${new Date().toLocaleDateString('ru-RU')}`, bold: true }),
            ],
          }),
          
          // Empty line
          new Paragraph({ text: "" }),
          
          // Protocol content
          new Paragraph({
            children: [
              new TextRun({ 
                text: protocol.value.protocol || protocol.value.content || 'Нет доступного содержания'
              }),
            ],
          }),
        ],
      }],
    })

    Packer.toBlob(doc).then(blob => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `protocol_${patientName.value || 'patient'}_${new Date().toISOString().split('T')[0]}.docx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    })
    
  } catch (error) {
    console.error('Error generating DOCX:', error)
    alert('Ошибка при создании DOCX файла')
  }
}
</script>

<template>
  <div class="box-border flex flex-col min-h-screen" style="background: linear-gradient(141.429deg,#ECFDF5 0%,#FFFFFF 50%,#F0FDFA 100%)">
    <Header :room="roomInfo" :transcription-active="transcriptionActive">
      <template #actions>
        <button
          @click="isParticipantsModalOpen = true"
          class="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 lg:px-4 py-1 sm:py-2 rounded-md bg-blue-500 text-white shadow-sm hover:bg-blue-600 text-xs sm:text-sm"
        >
          <span class="hidden sm:inline">Participants</span>
          <span class="sm:hidden">List</span>
          <span>({{ participants.length }})</span>
        </button>
        <button
          @click="handleBack"
          class="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm"
        >
          <span>←</span>
          <span class="hidden sm:inline">Back to Rooms</span>
          <span class="sm:hidden">Back</span>
        </button>
      </template>
    </Header>

    <main class="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6" style="background-image: linear-gradient(137.553deg, rgb(236, 253, 245) 0%, rgb(255, 255, 255) 50%, rgb(240, 253, 250) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <!-- Left Card -->
        <section class="bg-white border border-[rgba(0,0,0,0.05)] rounded-[16px] overflow-hidden flex flex-col">
          <div class="border-b border-[rgba(0,0,0,0.05)] box-border content-stretch flex flex-col items-start pb-1 pt-3 sm:pt-4 px-4 sm:px-6 relative w-full">
            <div class="content-stretch flex h-8 sm:h-9 items-center justify-between relative shrink-0 w-full">
              <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div class="flex items-center gap-2 sm:gap-3">
                  <p class="font-medium leading-6 text-sm sm:text-base lg:text-lg text-neutral-950 tracking-[-0.4395px] whitespace-nowrap">Диалог</p>
                  <div v-if="micState === 'recording'" class="flex gap-2 items-center">
                    <div class="bg-red-500 opacity-50 rounded-full size-2">
                      <div class="bg-clip-padding border-0 border-transparent border-solid box-border size-2 rounded-full" />
                    </div>
                    <p class="font-normal leading-4 text-[#717182] text-xs whitespace-nowrap">Запись</p>
                  </div>
                  <div v-else-if="micState === 'paused'" class="flex gap-2 items-center">
                    <div class="relative size-3">
                      <img alt="" class="block max-w-none size-full" src="/src/assets/pause.svg" />
                    </div>
                    <p class="font-normal leading-4 text-[#717182] text-xs whitespace-nowrap">Пауза</p>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2 sm:gap-3 min-w-0">
                <MicButton :is-recording="isRecording" :is-connected="isConnected" :state="micState" :show-stop="isRecording || isPaused" @toggle="toggleRecording" @stop="handleStop" />
                <div class="shrink-0">
                  <p class="font-normal leading-5 text-[#717182] text-xs sm:text-sm whitespace-nowrap">{{ formattedTimer }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="flex-1 p-4 sm:p-6 overflow-y-auto min-h-0">
            <div v-if="messages.length === 0" class="flex-1 flex items-center justify-center p-4 sm:p-8 h-full w-full">
              <div class="text-center text-gray-400">
                <img src="/src/assets/transcription.svg" alt="transcription" class="mx-auto mb-3 sm:mb-4 w-12 h-15 sm:w-16 sm:h-20" />
                <div class="text-xs sm:text-sm">Транскрипция появится здесь</div>
              </div>
            </div>
            <div v-else class="space-y-2 sm:space-y-3">
              <ChatMessage v-for="message in messages" :key="message.id" :message="message" />
            </div>
            </div>
        </section>

        <!-- Right Card -->
        <aside class="bg-white border border-[rgba(0,0,0,0.05)] rounded-[16px] overflow-hidden flex flex-col min-h-0">
          <div class="border-b border-[rgba(0,0,0,0.05)] box-border content-stretch flex flex-col min-h-[50px] sm:h-[60px] items-start pb-1 pl-4 sm:pl-6 pt-3 sm:pt-4 relative shrink-0 w-full">
            <h3 class="font-medium leading-6 sm:leading-7 text-sm sm:text-base lg:text-lg text-neutral-950 tracking-[-0.4395px]">Протокол</h3>
          </div>
          <div class="box-border content-stretch flex flex-col gap-4 sm:gap-5 items-start pb-0 pt-4 sm:pt-6 px-4 sm:px-6 relative flex-1 min-h-0">
            <div class="gap-3 sm:gap-4 grid grid-cols-1 sm:grid-cols-2 w-full">
              <div class="relative">
                <div class="mb-2">
                  <label class="font-normal leading-5 text-[#717182] text-xs sm:text-sm tracking-[-0.1504px]">ФИО пациента</label>
                </div>
                <input
                  v-model="patientName"
                  class="bg-white border border-[rgba(0,0,0,0.05)] border-solid h-9 sm:h-10 w-full rounded-[10px] box-border flex items-center px-3 py-0 text-xs sm:text-sm"
                  placeholder="Введите ФИО"
                  :disabled="!protocol"
                />
              </div>
              <div class="relative">
                <div class="mb-2">
                  <label class="font-normal leading-5 text-[#717182] text-xs sm:text-sm tracking-[-0.1504px]">ИИН пациента</label>
                </div>
                <input
                  v-model="patientIin"
                  class="bg-white border border-[rgba(0,0,0,0.05)] border-solid h-9 sm:h-10 w-full rounded-[10px] box-border flex items-center px-3 py-0 text-xs sm:text-sm"
                  placeholder="Введите ИИН"
                  :disabled="!protocol"
                />
              </div>
            </div>
            <div class="content-stretch flex flex-col gap-2 sm:gap-3 flex-1 min-h-0 w-full">
              <div class="content-stretch flex items-center justify-between relative shrink-0 w-full">
                <label class="font-normal leading-5 text-[#717182] text-xs sm:text-sm tracking-[-0.1504px]">Детали</label>
              </div>
              <div class="bg-white flex-1 min-h-[150px] sm:min-h-[200px] relative rounded-[14px] box-border content-stretch flex items-start overflow-clip px-3 sm:px-4 py-3 relative rounded-[inherit]">
                <!-- Loading state -->
                <div v-if="isLoadingProtocol" class="flex items-center justify-center h-full text-gray-400 w-full">
                  <div class="text-center">
                    <div class="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
                    <div class="text-xs sm:text-sm">Генерируется протокол...</div>
                  </div>
                </div>
                <!-- Protocol content -->
                <div v-else-if="protocol" class="font-normal leading-relaxed text-xs sm:text-sm text-gray-900 tracking-[-0.1504px] overflow-y-auto w-full break-words">
                  {{ protocol.protocol || protocol.content || 'Содержание протокола...' }}
                </div>
                <!-- Default state -->
                <div v-else class="bg-slate-50 content-stretch flex flex-col gap-3 sm:gap-4 h-full items-center justify-center relative w-full">
                  <div class="relative shrink-0 size-12 sm:size-16">
                    <img src="/src/assets/document.svg" alt="Document icon"/>
                  </div>
                  <div class="text-center">
                    <p class="font-normal leading-5 text-[#717182] text-xs sm:text-sm text-center tracking-[-0.1504px] max-w-60">Автоматически создается после записи</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="border-t border-[rgba(0,0,0,0.05)] border-solid box-border content-stretch flex flex-col gap-3 items-start pb-0 pt-4 px-0 relative shrink-0 w-full">
              <div class="h-9 sm:h-10 relative shrink-0 w-full">
                <div class="bg-clip-padding border-0 border-transparent border-solid box-border content-stretch flex gap-2 sm:gap-3 h-9 sm:h-10 items-start relative w-full">
                  <button 
                  @click="downloadProtocol"
                  :disabled="!protocol"
                  class="basis-0 bg-white border border-[rgba(0,0,0,0.05)] border-solid grow h-9 sm:h-10 min-h-px min-w-px relative rounded-[10px] shrink-0 box-border content-stretch flex items-center justify-center gap-2 flex-1">
                    <svg class="size-3 sm:size-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <p class="font-normal leading-6 text-xs sm:text-sm lg:text-base text-neutral-950 tracking-[-0.3125px] whitespace-nowrap">Скачать</p>
                  </button>
                  <button 
                  class="basis-0 bg-slate-100 grow h-9 sm:h-10 min-h-px min-w-px relative rounded-[10px] shrink-0 box-border content-stretch flex items-center justify-center gap-2 flex-1">
                    <svg class="size-3 sm:size-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"/>
                    </svg>
                    <p class="font-normal leading-6 text-xs sm:text-sm lg:text-base text-[#90a1b9] tracking-[-0.3125px] whitespace-nowrap">Сохранить</p>
                  </button>
                </div>
              </div>
              <button class="bg-white border border-[rgba(0,0,0,0.05)] border-solid h-9 sm:h-10 relative rounded-[10px] shrink-0 w-full box-border content-stretch flex gap-2 items-center justify-center px-4 py-1 relative">
                <p class="font-normal leading-5 relative shrink-0 text-[#717182] text-xs sm:text-sm tracking-[-0.1504px] whitespace-nowrap">Новая запись</p>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </main>

    <!-- Participants Modal -->
    <div
      v-if="isParticipantsModalOpen"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="isParticipantsModalOpen = false"
    >
      <div class="bg-white rounded-lg shadow-lg max-w-xs sm:max-w-md w-full max-h-80 sm:max-h-96 overflow-y-auto">
        <div class="p-4 sm:p-6">
          <div class="flex justify-between items-center mb-3 sm:mb-4">
            <h3 class="text-sm sm:text-base lg:text-lg font-semibold text-gray-800">
              Participants ({{ participants.length }})
            </h3>
            <button
              @click="isParticipantsModalOpen = false"
              class="text-gray-500 hover:text-gray-700 text-lg sm:text-xl"
            >
              ×
            </button>
          </div>
          <ul class="space-y-2">
            <li
              v-for="participant in participants"
              :key="participant.identity"
              class="flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <span class="text-gray-700 font-medium text-sm sm:text-base truncate mr-2">{{ participant.identity }}</span>
              <span v-if="participant.isSpeaking" class="text-red-500 text-base sm:text-lg flex-shrink-0">🎤</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>