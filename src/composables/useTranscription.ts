import { ref } from 'vue'
import { Room, RoomEvent, LocalAudioTrack, Participant } from 'livekit-client'
import { getToken } from '../services/api'
import { createLiveKitRoom, connectRoom } from '../services/livekit'
import type { Message } from '../types'

const roomRef = ref<Room | null>(null)
const isRecording = ref(false)
const isConnected = ref(false)
const error = ref('')
const messages = ref<Message[]>([])
const participants = ref<Participant[]>([])
const transcriptionActive = ref(false)


export function useTranscription() {
  const connectToRoom = async (roomName: string, participantName: string) => {
    try {
      error.value = ''
      
      const tokenData = await getToken(roomName, participantName)

      const room: Room = createLiveKitRoom()
      await connectRoom(room, tokenData.url, tokenData.token)
      
      roomRef.value = room
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

      room.on(RoomEvent.DataReceived, (payload) => {
        try {
          const text = new TextDecoder().decode(payload)

          if(!transcriptionActive.value){
            transcriptionActive.value = true
            messages.value.push({
              text: "Transcription agent joined.",
              timestamp: new Date().toLocaleTimeString(),
              isUser: false
            })
          }

          messages.value.push({
            text: text,
            timestamp: new Date().toLocaleTimeString(),
            isUser: false
          })
          
        } catch (e) {
          console.warn('Failed to decode message:', e)
        }
      })

      messages.value.push({
        text: `Connected, waiting for transc agent to join.`,
        timestamp: new Date().toLocaleTimeString(),
        isUser: false
      })

    } catch (err: any) {
      error.value = err.message || 'Failed to connect to room'
      console.error('Connection error:', err)
    }
  }

  const startRecording = async () => {
    if (!roomRef.value) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      const audioTrack = stream.getAudioTracks()[0]
      if (!audioTrack) {
        throw new Error('No audio track available')
      }
      const localAudioTrack = new LocalAudioTrack(audioTrack)
      
      await roomRef.value.localParticipant.publishTrack(localAudioTrack)
      isRecording.value = true
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