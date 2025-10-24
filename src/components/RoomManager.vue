<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useRoom } from '../composables/useRoom'
import { getToken } from '../services/api'


const router = useRouter()

// Demo mode state
const newRoomName = ref('')
const createParticipantName = ref('')
const joinRoomName = ref('')
const joinParticipantName = ref('')

// Custom mode state
const url = ref('wss://speech-to-text-ku1s8e7i.livekit.cloud')
const token = ref('')

// Tab state
const activeTab = ref<'demo' | 'custom'>('custom')

const { isCreating, isJoining, isConnecting, error, joinRoom, joinWithToken } = useRoom()


const emit = defineEmits<{
  roomCreated: [roomName: string, participantName: string]
  roomJoined: [roomName: string, participantName: string]
  tokenConnected: []
}>()

// Custom connection handler
const connectWithToken = async () => {
  if (!url.value.trim() || !token.value.trim()) {
    console.log('URL and Token are required')
    return
  }

  try {
    console.log('Connecting with token...')
    const connectedRoom = await joinWithToken(url.value.trim(), token.value.trim())
    console.log('Connected successfully, room:', connectedRoom)
    
    // Navigate to transcription page on successful connection
    await router.push('/transcription')
    console.log('Navigation to Transcription complete')
  } catch (err) {
    console.error('Connection failed:', err)
    // Error handled in composable
  }
}

const createRoomHandler = async () => {
  if (!newRoomName.value.trim() || !createParticipantName.value.trim()) return

  const roomName = newRoomName.value.trim()
  const participantName = createParticipantName.value.trim()

  try {
    const tokenResp = await getToken(roomName, participantName)
    const token = (tokenResp as any).token ?? (tokenResp as unknown as string)

    await joinRoom(roomName, participantName, token)
    emit('roomCreated', roomName, participantName)

    newRoomName.value = ''
    createParticipantName.value = ''

    await router.push({ name: 'Transcription', query: { roomName, participantName } })
    console.log('Navigation to Transcription complete')

  } catch (err) {
    console.error('Demo create failed:', err)
  }
}

const joinRoomHandler = async () => {
  if (!joinRoomName.value.trim() || !joinParticipantName.value.trim()) return

  const roomName = joinRoomName.value.trim()
  const participantName = joinParticipantName.value.trim()

  try {
    const tokenResp = await getToken(roomName, participantName)
    const token = (tokenResp as any).token ?? (tokenResp as unknown as string)

    await joinRoom(roomName, participantName, token)
    emit('roomJoined', roomName, participantName)
    
    joinRoomName.value = ''
    joinParticipantName.value = ''

    await router.push({ name: 'Transcription', query: { roomName, participantName } })
    console.log('Navigation to Transcription complete')

  } catch (err) {
    console.error('Demo join failed:', err)
  }
}


</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
      <h1 class="text-2xl font-bold text-center text-gray-900 mb-8">
        Saubol | Speech-to-Text Rooms
      </h1>
      <!-- Tab Navigation -->
      <div class="flex rounded-lg overflow-hidden mb-6 border border-gray-300">
        <button
          @click="activeTab = 'demo'"
          :class="[
            'flex-1 py-2 px-4 text-sm font-medium transition-colors',
            activeTab === 'demo'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          ]"
        >
          Demo
        </button>
        <button
          @click="activeTab = 'custom'"
          :class="[
            'flex-1 py-2 px-4 text-sm font-medium transition-colors',
            activeTab === 'custom'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          ]"
        >
          Custom
        </button>
      </div>

      <!-- Demo Tab Content -->
      <div v-if="activeTab === 'demo'" class="space-y-6">
        <!-- Join Existing Room Section -->
        <div class="mb-8">
          <h2 class="text-lg font-semibold text-gray-700 mb-4">Join Existing Room</h2>
          <div class="space-y-4">
            <input
              v-model="joinRoomName"
              type="text"
              placeholder="Enter room name"
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              @keyup.enter="joinRoomHandler"
            />
            <input
              v-model="joinParticipantName"
              type="text"
              placeholder="Enter your name"
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              @keyup.enter="joinRoomHandler"
            />
            <button
              @click="joinRoomHandler"
              :disabled="!joinRoomName.trim() || !joinParticipantName.trim() || isJoining"
              class="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isJoining ? 'Joining...' : 'Join Room' }}
            </button>
          </div>
        </div>

        <!-- Create Room Section -->
        <div class="mb-8">
          <h2 class="text-lg font-semibold text-gray-700 mb-4">Create New Room</h2>
          <div class="space-y-4">
            <input
              v-model="newRoomName"
              type="text"
              placeholder="Enter room name"
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @keyup.enter="createRoomHandler"
            />
            <input
              v-model="createParticipantName"
              type="text"
              placeholder="Enter your name"
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @keyup.enter="createRoomHandler"
            />
            <button
              @click="createRoomHandler"
              :disabled="!newRoomName.trim() || !createParticipantName.trim() || isCreating"
              class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isCreating ? 'Creating...' : 'Create Room' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Custom Tab Content -->
      <div v-else class="space-y-6">
        <p class="text-gray-600 text-sm">
          Connect LiveKit Meet with a custom server.
        </p>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              LiveKit Server URL
            </label>
            <input
              v-model="url"
              type="text"
              placeholder="livekit url"
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Token
            </label>
            <textarea
              v-model="token"
              rows="4"
              placeholder="Paste the token generated by the LiveKit CLI"
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            ></textarea>
          </div>

          

          <button
            @click="connectWithToken"
            :disabled="!url.trim() || !token.trim() || isConnecting"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isConnecting ? 'Connecting...' : 'Connect' }}
          </button>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
        {{ error }}
      </div>
    </div>
  </div>
</template>

