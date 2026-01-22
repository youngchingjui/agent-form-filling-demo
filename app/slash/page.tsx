'use client'

import React, { useMemo, useState } from 'react'
import { FloatingVoiceButton } from '@/components/floating-voice-button'

const initialParagraphs = [
  "On a quiet morning, the city stirred with the soft hum of possibility. Sunlight threaded through the windows, laying thin gold ribbons across the desk where a blank page waited for the first line.",
  "Writers say that stories begin before the first sentence, with a feeling that refuses to leave. This page holds that feeling now—an invitation to shape a thought into something that breathes."
]

export default function SlashPage() {
  const [text, setText] = useState<string>(initialParagraphs.join('\n\n'))

  const api = useMemo(() => ({
    getText: () => text,
    replaceText: (find: string, replaceWith: string) => {
      if (!find) return { success: false, error: 'Find snippet cannot be empty' }
      let count = 0
      const replaced = text.replaceAll(find, () => {
        count += 1
        return replaceWith
      })
      if (count === 0) return { success: false, error: 'Snippet not found', replacedCount: 0 }
      setText(replaced)
      return { success: true, replacedCount: count }
    }
  }), [text])

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <div className="mx-auto max-w-2xl rounded-lg bg-white p-8 text-base leading-7 text-black shadow-sm">
          <div className="prose prose-neutral max-w-none">
            {text.split('\n').map((line, idx) => (
              <p key={idx} className="whitespace-pre-wrap">{line}</p>
            ))}
          </div>
        </div>
      </main>

      <FloatingVoiceButton getText={api.getText} replaceText={api.replaceText} />
    </div>
  )
}

