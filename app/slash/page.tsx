"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FloatingVoiceButton } from '@/components/floating-voice-button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const initialParagraphs = [
  "On a quiet morning, the city stirred with the soft hum of possibility. Sunlight threaded through the windows, laying thin gold ribbons across the desk where a blank page waited for the first line.",
  "Writers say that stories begin before the first sentence, with a feeling that refuses to leave. This page holds that feeling now—an invitation to shape a thought into something that breathes."
]

export default function SlashPage() {
  const [text, setText] = useState<string>(initialParagraphs.join('\n\n'))
  const [voicePlayback, setVoicePlayback] = useState<boolean>(false)
  const [highlightedLines, setHighlightedLines] = useState<Set<number>>(new Set())
  const clearTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current)
    }
  }, [])

  const api = useMemo(() => ({
    getText: () => text,
    replaceText: (find: string, replaceWith: string) => {
      if (!find) return { success: false, error: 'Find snippet cannot be empty' }

      // Locate all occurrences before replacing, so we can map them to line indices
      const indices: number[] = []
      let pos = text.indexOf(find)
      while (pos !== -1) {
        indices.push(pos)
        pos = text.indexOf(find, pos + find.length)
      }

      let count = 0
      const replaced = text.replaceAll(find, () => {
        count += 1
        return replaceWith
      })

      if (count === 0) return { success: false, error: 'Snippet not found', replacedCount: 0 }

      // Compute line starts to map string offsets -> line indices
      const lineStarts: number[] = [0]
      for (let i = 0; i < text.length; i++) {
        if (text[i] === '\n') lineStarts.push(i + 1)
      }

      const toLineIndex = (charIndex: number) => {
        // binary search over lineStarts
        let lo = 0, hi = lineStarts.length - 1
        while (lo <= hi) {
          const mid = (lo + hi) >> 1
          if (lineStarts[mid] <= charIndex) lo = mid + 1
          else hi = mid - 1
        }
        return Math.max(0, lo - 1)
      }

      const changedLineIdxs = new Set<number>()
      const newlineCountInFind = find.split('\n').length - 1
      for (const idx of indices) {
        const startLine = toLineIndex(idx)
        changedLineIdxs.add(startLine)
        // If the snippet spans multiple lines, highlight the subsequent lines, too
        for (let n = 1; n <= newlineCountInFind; n++) {
          changedLineIdxs.add(startLine + n)
        }
      }

      setText(replaced)
      setHighlightedLines(changedLineIdxs)

      // Clear highlight after ~2.5s
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current)
      clearTimerRef.current = window.setTimeout(() => {
        setHighlightedLines(new Set())
      }, 2500)

      return { success: true, replacedCount: count }
    }
  }), [text])

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <div className="mx-auto max-w-2xl rounded-lg bg-white p-8 text-base leading-7 text-black shadow-sm">
          <div className="prose prose-neutral max-w-none">
            {text.split('\n').map((line, idx) => (
              <p
                key={idx}
                className={cn('whitespace-pre-wrap rounded-sm', highlightedLines.has(idx) && 'flash-highlight')}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      </main>

      {/* Small floating control to toggle voice playback */}
      <div className="fixed bottom-24 right-4 z-50 flex items-center gap-2 rounded-md bg-background/80 p-2 shadow-md backdrop-blur">
        <Label htmlFor="voice-playback" className="text-xs">Voice playback</Label>
        <Checkbox
          id="voice-playback"
          checked={voicePlayback}
          onCheckedChange={(v) => setVoicePlayback(Boolean(v))}
          aria-label="Toggle agent voice playback"
        />
      </div>

      <FloatingVoiceButton getText={api.getText} replaceText={api.replaceText} voicePlayback={voicePlayback} />
    </div>
  )
}

