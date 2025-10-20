export interface Message {
  text: string
  timestamp: string
  isUser: boolean
}

export interface RoomInfo {
  name: string
  participantName: string
}