import { ref } from 'vue'
import { RoomEvent, LocalAudioTrack, Participant } from 'livekit-client'
import { getToken } from '../services/api'
import { useRoom } from './useRoom'
import type { Message } from '../types'

const isRecording = ref(false)
const isConnected = ref(false)
const error = ref('')
const messages = ref<Message[]>([])
const participants = ref<Participant[]>([])
const transcriptionActive = ref(false)

export function useTranscription() {
  const { joinWithToken, room: sharedRoom, disconnect: sharedDisconnect } = useRoom()

  const connectToRoom = async (roomName: string, participantName: string) => {
    try {
      error.value = ''

      const tokenData = await getToken(roomName, participantName)
      // use shared joinWithToken so useRoom.room is set
      await joinWithToken(tokenData.url, tokenData.token)

      const room = sharedRoom.value
      if (!room) {
        throw new Error('Failed to obtain shared room after join')
      }

      isConnected.value = true

      participants.value = [
        room.localParticipant,
        ...Array.from(room.remoteParticipants.values())
      ]

      room.on(RoomEvent.ParticipantConnected, (participant: Participant) => {
        participants.value.push(participant)
      })

      room.on(RoomEvent.ParticipantDisconnected, (participant: Participant) => {
        participants.value = participants.value.filter(p => p.sid !== participant.sid)
      })

      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        try {
          const text = new TextDecoder().decode(payload)

          if (!transcriptionActive.value) {
            transcriptionActive.value = true
            messages.value.push({
              id: Date.now().toString(),
              type: 'transcription',
              text: 'Transcription agent joined.',
              timestamp: Date.now(),
            })
          }

          messages.value.push({
            id: Date.now().toString(),
            type: 'transcription',
            text,
            timestamp: Date.now(),
          })
        } catch (e) {
          console.warn('Failed to decode message:', e)
        }
      })

      
    } catch (err: any) {
      error.value = err.message || 'Failed to connect to room'
      console.error('Connection error:', err)
      throw err
    }
  }

  const startRecording = async () => {
    const room = sharedRoom.value
    if (!room) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      const audioTrack = stream.getAudioTracks()[0]
      if (!audioTrack) throw new Error('No audio track available')

      const localAudioTrack = new LocalAudioTrack(audioTrack)
      await room.localParticipant.publishTrack(localAudioTrack)
      isRecording.value = true
    } catch (err: any) {
      error.value = err.message || 'Failed to start recording'
      console.error('Recording error:', err)
      throw err
    }
  }

  const stopRecording = async () => {
    const room = sharedRoom.value
    if (!room) return

    try {
      room.localParticipant.audioTrackPublications.forEach((publication) => {
        publication.track?.stop()
      })

      isRecording.value = false
      messages.value.push({
        id: Date.now().toString(),
        type: 'transcription',
        text: 'Recording stopped.',
        timestamp: Date.now(),
      })
    } catch (err: any) {
      console.error('Stop recording error:', err)
      throw err
    }
  }

  const disconnect = async () => {
    // delegate to shared disconnect so shared room is cleared
    await sharedDisconnect()
    isRecording.value = false
    isConnected.value = false
    messages.value.splice(0)
    participants.value.splice(0)
    transcriptionActive.value = false
  }

  return {
    isConnected,
    isRecording,
    error,
    messages,
    participants,
    transcriptionActive,
    connectToRoom,
    startRecording,
    stopRecording,
    disconnect
  }
}