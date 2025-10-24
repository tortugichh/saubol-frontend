const backendUrl = (import.meta.env.VITE_BACKEND_URL as string) || 'http://localhost:8000'


export async function getToken(roomName: string, participantName: string) {
  const tokenResponse = await fetch(`${backendUrl}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      room_name: roomName,
      participant_name: participantName
    })
  })

  if (!tokenResponse.ok) {
    if (tokenResponse.status === 404) {
      throw new Error(`Room "${roomName}" does not exist. Please create it first.`)
    }
    throw new Error(`Failed to get token: ${tokenResponse.status}`)
  }

  return tokenResponse.json()
}

export async function startTranscriptionAPI(roomName: string) {
  const response = await fetch(`${backendUrl}/api/start-transcription?room_name=${encodeURIComponent(roomName)}`, {
    method: 'POST'
  })
  if (!response.ok) {
    throw new Error(`Failed to start transcription: ${response.status}`)
  }
  return response
}

export async function stopTranscriptionAPI(roomName: string) {
  const response = await fetch(`${backendUrl}/api/stop-transcription?room_name=${encodeURIComponent(roomName)}`, {
    method: 'POST'
  })
  if (!response.ok) {
    throw new Error(`Failed to stop transcription: ${response.status}`)
  }
  return response
}

export async function getProtocol(roomName: string) {
  const response = await fetch(`${backendUrl}/api/protocol?room_name=${encodeURIComponent(roomName)}`, {
    method: 'GET'
  })
  if (!response.ok) {
    throw new Error(`Failed to get protocol: ${response.status}`)
  }
  return response.json()
}



