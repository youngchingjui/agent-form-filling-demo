export const maxDuration = 30

// Next.js App Router route handler to proxy WebRTC SDP offers to OpenAI Realtime API
// This avoids using the Agents SDK and connects directly to the REST endpoints.
export async function POST(req: Request) {
  try {
    const sdpOffer = await req.text()

    if (!sdpOffer) {
      return new Response('Missing SDP in request body', { status: 400 })
    }

    // Get user's language from header
    const userLanguage = req.headers.get('X-User-Language') || 'en'

    const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime'
    const voice = process.env.OPENAI_REALTIME_VOICE || 'coral'

    const sessionConfig = JSON.stringify({
      type: 'realtime',
      model,
      audio: { output: { voice } },
      instructions: `You are a helpful AI assistant specializing in product certification. 
        
CRITICAL LANGUAGE RULE: The user's browser detected language is "${userLanguage}". You MUST respond in ${userLanguage} at all times. 
- If the user speaks in ${userLanguage}, respond in ${userLanguage}.
- If the user switches to another language, respond in that same language.
- NEVER respond in a different language than what the user is currently speaking.
- Always match the user's language exactly.`,
    })

    const fd = new FormData()
    fd.set('sdp', sdpOffer)
    fd.set('session', sessionConfig)

    const r = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: fd,
    })

    const text = await r.text()

    if (!r.ok) {
      console.error('OpenAI Realtime API error:', r.status, text)
      return new Response(text || 'Upstream error', { status: r.status })
    }

    return new Response(text, {
      headers: { 'Content-Type': 'application/sdp' },
      status: 200,
    })
  } catch (err) {
    console.error('Realtime session error:', err)
    return new Response('Failed to create realtime session', { status: 500 })
  }
}
