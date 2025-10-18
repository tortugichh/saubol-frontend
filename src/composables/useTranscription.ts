import { ref } from 'vue'
import { Room, RoomEvent, LocalAudioTrack, Participant } from 'livekit-client'

// Reactive state for transcription app
const roomRef = ref<Room | null>(null)
const isRecording = ref(false)
const isConnected = ref(false)
const error = ref('')
const messages = ref<Array<{text: string, timestamp: string, isUser: boolean}>>([])
const participants = ref<Participant[]>([])
const backendUrl = (import.meta.env.VITE_BACKEND_URL as string) || 'http://localhost:8000'

export function useTranscription() {
  const connectToRoom = async (roomName: string, participantName: string) => {
    try {
      error.value = ''

      // Get token from backend
      const tokenResponse = await fetch(`${backendUrl}/api/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_name: roomName,
          participant_name: participantName
        })
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to get token')
      }

      const tokenData = await tokenResponse.json()

      // Create and connect room
      const room = new Room()
      await room.connect(tokenData.url, tokenData.token)
      roomRef.value = room

      isConnected.value = true
      participants.value = [
        room.localParticipant,
        ...Array.from(room.remoteParticipants.values())
    ]


    //Participant joining room
      room.on(RoomEvent.ParticipantConnected, (participant) => {
        participants.value.push(participant)
        messages.value.push({
            text: `${participant.identity} joined the room.`,
            timestamp: new Date().toLocaleTimeString(),
            isUser: false
        })
      })

    //Participant leaving room
      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        participants.value = participants.value.filter(p => p.sid !== participant.sid)
        messages.value.push({
            text: `${participant.identity} left the room.`,
            timestamp: new Date().toLocaleTimeString(),
            isUser: false
        })
      })


      // Listen for transcription data from backend agent
      room.on(RoomEvent.DataReceived, (payload) => {
        const text = new TextDecoder().decode(payload)
        messages.value.push({
          text: text,
          timestamp: new Date().toLocaleTimeString(),
          isUser: false
        })
      })



      // Start transcription service
      await fetch(`${backendUrl}/api/start-transcription?room_name=${roomName}`, {
        method: 'POST'
      })

      // Add welcome message
      messages.value.push({
        text: "Connected!",
        timestamp: new Date().toLocaleTimeString(),
        isUser: false
      })

    } catch (err: any) {
      error.value = err.message || 'Connection failed'
      console.error('Connection error:', err)
    }
  }

  const startRecording = async () => {
    if (!roomRef.value) return

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      })

      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        throw new Error('No audio track available')
      }

      const audioTrack = audioTracks[0]
      if (!audioTrack) {
        throw new Error('Audio track is undefined')
      }

      const localAudioTrack = new LocalAudioTrack(audioTrack)

      // Publish to room
      await roomRef.value.localParticipant.publishTrack(localAudioTrack)

      isRecording.value = true
      messages.value.push({
        text: "Recording started - speak to see transcriptions!",
        timestamp: new Date().toLocaleTimeString(),
        isUser: true
      })

    } catch (err: any) {
      error.value = err.message || 'Failed to start recording'
      console.error('Recording error:', err)
    }
  }

  const stopRecording = async () => {
    if (!roomRef.value) return

    try {
      // Stop all audio tracks
      roomRef.value.localParticipant.audioTrackPublications.forEach((publication) => {
        publication.track?.stop()
      })

      isRecording.value = false
      messages.value.push({
        text: "Recording stopped.",
        timestamp: new Date().toLocaleTimeString(),
        isUser: true
      })

    } catch (err: any) {
      console.error('Stop recording error:', err)
    }
  }

  const disconnect = async () => {
    if (roomRef.value) {
        roomRef.value.removeAllListeners()
        await roomRef.value.disconnect()
        roomRef.value = null
        isConnected.value = false
        isRecording.value = false
        messages.value.splice(0)
    }
  }

  return {
    // State
    isConnected,
    isRecording,
    error,
    messages,
    participants,
    // Methods
    connectToRoom,
    startRecording,
    stopRecording,
    disconnect
  }
}