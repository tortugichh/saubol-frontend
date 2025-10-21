export interface Message {
  id: string;
  type: 'transcription' | 'chat';
  text: string;
  from?: string; // For chat messages
  timestamp: number;
}

export interface RoomInfo {
  name: string
  participantName: string
}