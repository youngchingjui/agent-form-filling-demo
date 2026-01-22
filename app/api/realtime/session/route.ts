export const maxDuration = 30

// Next.js App Router route handler to proxy WebRTC SDP offers to OpenAI Realtime API
// This avoids using the Agents SDK and connects directly to the REST endpoints.
export async function POST(req: Request) {
  try {
    const sdpOffer = await req.text()

    if (!sdpOffer) {
      return new Response('Missing SDP in request body', { status: 400 })
    }

    // Get user's language and session mode from headers
    const userLanguage = req.headers.get('X-User-Language') || 'en'
    const sessionMode = (req.headers.get('X-Session-Mode') || 'certification').toLowerCase()

    const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime'
    const voice = process.env.OPENAI_REALTIME_VOICE || 'coral'

    // Tools exposed to the Realtime model. The client will execute these and
    // return function_call_output events with results.
    const formTools = [
      {
        type: 'function',
        name: 'update_form_field',
        description:
          'Update a single form field with a validated value. Use when the user clearly provided a value. Prefer grouped updates by calling this multiple times before you respond.',
        parameters: {
          type: 'object',
          properties: {
            field: {
              type: 'string',
              description:
                'The field name to update (e.g., companyName, productName, productModel, voltage, certificationTypes, targetMarkets, urgency)'
            },
            value: {
              description:
                'The value to set. Strings, booleans, or arrays of strings (for multi-select fields).',
              oneOf: [
                { type: 'string' },
                { type: 'boolean' },
                { type: 'array', items: { type: 'string' } }
              ]
            }
          },
          required: ['field', 'value']
        }
      },
      {
        type: 'function',
        name: 'get_latest_form_data',
        description:
          'Read-only helper that returns the most recent form data the user has entered. Call before writing to avoid overwriting newer UI changes.',
        parameters: { type: 'object', properties: {} }
      },
      {
        type: 'function',
        name: 'get_form_schema',
        description:
          'Returns the form schema and constraints. Use this to validate and normalize values (e.g., dates as YYYY-MM-DD, allowed enums).',
        parameters: {
          type: 'object',
          properties: {
            fields: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional subset of fields to return.'
            }
          }
        }
      }
    ] as const

    const writerTools = [
      {
        type: 'function',
        name: 'get_document_text',
        description:
          'Returns the full plaintext content of the current page document. Use before editing so you can decide what to change.',
        parameters: { type: 'object', properties: {} }
      },
      {
        type: 'function',
        name: 'replace_text',
        description:
          'Search for a snippet of text in the document and replace it with new text. Keep snippets short but unique. If the snippet is ambiguous, ask the user to clarify.',
        parameters: {
          type: 'object',
          properties: {
            find: { type: 'string', description: 'Exact snippet to find (case-sensitive). Use a short, unique phrase from the document.' },
            replace: { type: 'string', description: 'Replacement text.' }
          },
          required: ['find', 'replace']
        }
      }
    ] as const

    const certificationInstructions = `You are a helpful AI assistant specializing in product certification.

Follow these tool-calling rules strictly:
- Access & context: You may read the latest form data and schema at any time via tools.
- When to write: Only write when a value is unambiguous and validated; otherwise ask a short clarifying question. Confirm before changing fields that already have values or are sensitive (e.g., contact info).
- How to write: Normalize units/dates to match the schema. Group multiple field updates from one user answer. After writing, check which required fields remain and move forward.
- Conflicts: If the user likely changed the UI meanwhile, refresh the latest data and ask which value to keep.
- Observability: Summarize field names you updated; do not reveal raw sensitive values in your spoken/text response.`

    const writerInstructions = `You are a concise writing assistant that edits the visible page text in real time.

Tools:
- Use get_document_text to read the current content when needed.
- Use replace_text to make precise edits. Choose short, unique snippets to avoid unintended changes.
- Ask brief clarifying questions if a requested edit is ambiguous or the snippet is not found.`

    const isWriter = sessionMode === 'writer' || sessionMode === 'slash'

    const sessionConfig = JSON.stringify({
      type: 'realtime',
      model,
      audio: { output: { voice } },
      instructions: `${isWriter ? writerInstructions : certificationInstructions}

CRITICAL LANGUAGE RULE: The user's browser detected language is "${userLanguage}". You MUST respond in ${userLanguage} at all times.
- If the user speaks in ${userLanguage}, respond in ${userLanguage}.
- If the user switches to another language, respond in that same language.
- NEVER respond in a different language than what the user is currently speaking.
- Always match the user's language exactly.`,
      tool_choice: 'auto',
      tools: isWriter ? writerTools : formTools
    })

    const fd = new FormData()
    fd.set('sdp', sdpOffer)
    fd.set('session', sessionConfig)

    const r = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: fd
    })

    const text = await r.text()

    if (!r.ok) {
      console.error('OpenAI Realtime API error:', r.status, text)
      return new Response(text || 'Upstream error', { status: r.status })
    }

    return new Response(text, {
      headers: { 'Content-Type': 'application/sdp' },
      status: 200
    })
  } catch (err) {
    console.error('Realtime session error:', err)
    return new Response('Failed to create realtime session', { status: 500 })
  }
}

