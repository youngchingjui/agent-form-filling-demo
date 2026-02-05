"use client"

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export type ReplaceResult = { success: boolean; replacedCount?: number; error?: string }

interface DiagramTools {
  getDiagram: () => any
  addNode?: (label: string) => { success: boolean; id?: string; error?: string }
  connectNodes?: (fromLabel: string, toLabel: string) => { success: boolean; error?: string }
  renameNode?: (oldLabel: string, newLabel: string) => { success: boolean; error?: string }
  deleteNode?: (label: string) => { success: boolean; error?: string }
}

interface FloatingVoiceButtonProps {
  // Returns the full plaintext document
  getText: () => string
  // Performs a search/replace and returns count of replacements
  replaceText: (find: string, replaceWith: string) => ReplaceResult
  // Optional diagram tools exposed to the agent
  diagramTools?: DiagramTools
  // When false, disable voice playback and request text-only responses (no audio streaming)
  voicePlayback?: boolean
}

// Minimal realtime voice client with tool-calls for editing page text and (optionally) a diagram.
export function FloatingVoiceButton({ getText, replaceText, diagramTools, voicePlayback = false }: FloatingVoiceButtonProps) {
  type AgentState = 'idle' | 'listening' | 'processing' | 'error'

  const [agentState, setAgentState] = useState<AgentState>('idle')
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const latestUserTranscriptRef = useRef<string>('')

  // Helper: send an event over the Realtime data channel
  const sendRealtimeEvent = useCallback((event: unknown) => {
    const dc = dcRef.current
    if (dc && dc.readyState === 'open') {
      dc.send(JSON.stringify(event))
    }
  }, [])

  const sendToolResult = useCallback((callId: string, result: unknown) => {
    sendRealtimeEvent({
      type: 'conversation.item.create',
      item: { type: 'function_call_output', call_id: callId, output: JSON.stringify(result ?? {}) }
    })
    sendRealtimeEvent({ type: 'response.create' })
  }, [sendRealtimeEvent])

  const executeToolCall = useCallback(async (toolName: string, args: any) => {
    try {
      if (toolName === 'get_document_text') {
        const text = getText()
        toast.info('Tool used: get_document_text')
        return { text }
      }
      if (toolName === 'replace_text') {
        const find = String(args?.find || '')
        const replaceWith = String(args?.replace || '')
        if (!find) {
          const error = 'Missing find snippet'
          toast.error('replace_text failed: ' + error)
          return { success: false, error }
        }
        const res = replaceText(find, replaceWith)
        if (res.success) {
          toast.success(`Replaced ${res.replacedCount ?? 0} occurrence(s)`) 
        } else {
          toast.error(res.error || 'replace_text failed')
        }
        return res
      }
      if (toolName === 'get_diagram' && diagramTools?.getDiagram) {
        const d = diagramTools.getDiagram()
        toast.info('Tool used: get_diagram')
        return { diagram: d }
      }
      if (toolName === 'add_node' && diagramTools?.addNode) {
        const label = String(args?.label || '')
        const res = diagramTools.addNode(label)
        if (!res.success) toast.error(res.error || 'add_node failed')
        else toast.success(`Added node: ${label}`)
        return res
      }
      if (toolName === 'connect_nodes' && diagramTools?.connectNodes) {
        const from = String(args?.from || '')
        const to = String(args?.to || '')
        const res = diagramTools.connectNodes(from, to)
        if (!res.success) toast.error(res.error || 'connect_nodes failed')
        else toast.success(`Connected ${from} → ${to}`)
        return res
      }
      if (toolName === 'rename_node' && diagramTools?.renameNode) {
        const oldLabel = String(args?.old_label || '')
        const newLabel = String(args?.new_label || '')
        const res = diagramTools.renameNode(oldLabel, newLabel)
        if (!res.success) toast.error(res.error || 'rename_node failed')
        else toast.success(`Renamed ${oldLabel} → ${newLabel}`)
        return res
      }
      if (toolName === 'delete_node' && diagramTools?.deleteNode) {
        const label = String(args?.label || '')
        const res = diagramTools.deleteNode(label)
        if (!res.success) toast.error(res.error || 'delete_node failed')
        else toast.success(`Deleted ${label}`)
        return res
      }
      // Unknown tool
      toast.warning(`Unknown tool: ${toolName}`)
      return { error: `Unhandled tool: ${toolName}` }
    } catch (e: any) {
      const msg = e?.message || 'Tool execution error'
      toast.error(msg)
      return { error: msg }
    }
  }, [getText, replaceText, diagramTools])

  const handleRealtimeEvent = useCallback((raw: string) => {
    try {
      const evt = JSON.parse(raw)
      const type: string = evt?.type || ''

      if (type === 'response.created') {
        setAgentState('processing')
      }

      if (type === 'input_audio_transcription.delta' && typeof evt?.delta === 'string') {
        latestUserTranscriptRef.current = (latestUserTranscriptRef.current + evt.delta).slice(-4000)
        setAgentState('listening')
      }

      if (type === 'response.done') {
        setAgentState('idle')
        const outputItems: any[] = evt?.response?.output || []
        const functionCalls = outputItems.filter((it: any) => it?.type === 'function_call')
        if (functionCalls.length > 0) {
          ;(async () => {
            for (const fc of functionCalls) {
              const name: string = fc?.name
              const callId: string = fc?.call_id
              let args: any = {}
              try { args = fc?.arguments ? JSON.parse(fc.arguments) : {} } catch { args = {} }
              const result = await executeToolCall(name, args)
              sendToolResult(callId, result)
            }
          })()
        }
      }

      if (type === 'input_audio_buffer.speech_started') setAgentState('listening')
    } catch {
      // ignore non-JSON
    }
  }, [executeToolCall, sendToolResult])

  const connect = useCallback(async () => {
    if (isRealtimeConnected || isConnecting) return
    try {
      setIsConnecting(true)
      const pc = new RTCPeerConnection()
      pcRef.current = pc

      // Only create/play remote audio when voice playback is enabled
      if (voicePlayback && !remoteAudioRef.current) {
        const el = document.createElement('audio')
        el.autoplay = true
        el.style.display = 'none'
        document.body.appendChild(el)
        remoteAudioRef.current = el
      }

      if (voicePlayback) {
        pc.ontrack = (e) => {
          if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0]
        }
      }

      const ms = await navigator.mediaDevices.getUserMedia({ audio: true })
      const [track] = ms.getAudioTracks()
      pc.addTrack(track, ms)

      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc
      dc.onmessage = (ev) => handleRealtimeEvent(ev.data)

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const browserLanguage = navigator.language || navigator.languages?.[0] || 'en'
      const languageCode = browserLanguage.split('-')[0]

      const res = await fetch('/api/realtime/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
          'X-User-Language': languageCode,
          'X-Session-Mode': 'writer',
          'X-Output-Modalities': voicePlayback ? 'audio' : 'text'
        },
        body: offer.sdp || ''
      })

      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || 'Failed to create realtime session')
      }

      const answerSdp = await res.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

      setIsRealtimeConnected(true)
      setAgentState('idle')

      // Provide a short system note so the model knows there is editable text and diagram (if present)
      const preview = getText().slice(0, 400)
      const guidance = voicePlayback
        ? 'Speak your responses naturally.'
        : 'Do not speak aloud. Prefer calling tools. Keep any textual replies extremely brief.'

      const items: any[] = [
        { type: 'input_text', text: 'You can edit the on-page document using replace_text. Ask clarifying questions when needed.' },
        { type: 'input_text', text: `Document preview (first 400 chars):\n${preview}` },
      ]

      if (diagramTools?.getDiagram) {
        const d = diagramTools.getDiagram()
        const nodeList = Array.isArray(d?.nodes) ? d.nodes.map((n: any) => n.label).join(', ') : ''
        items.push({ type: 'input_text', text: 'You can also edit a diagram using these tools: get_diagram, add_node(label), connect_nodes(from, to), rename_node(old_label, new_label), delete_node(label).' })
        items.push({ type: 'input_text', text: `Current diagram nodes: ${nodeList}` })
      }

      items.push({ type: 'input_text', text: guidance })

      sendRealtimeEvent({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'system',
          content: items
        }
      })
      sendRealtimeEvent({ type: 'response.create' })
    } catch (e: any) {
      toast.error(e?.message || 'Realtime connection error')
      try { pcRef.current?.close() } catch {}
      pcRef.current = null
      setIsRealtimeConnected(false)
      setAgentState('error')
    } finally {
      setIsConnecting(false)
    }
  }, [getText, handleRealtimeEvent, isRealtimeConnected, isConnecting, sendRealtimeEvent, voicePlayback, diagramTools])

  const disconnect = useCallback(() => {
    try { pcRef.current?.close() } catch {}
    pcRef.current = null
    setIsRealtimeConnected(false)
    setAgentState('idle')
  }, [])

  useEffect(() => {
    return () => {
      try { pcRef.current?.close() } catch {}
      pcRef.current = null
    }
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={() => (isRealtimeConnected ? disconnect() : connect())}
        disabled={isConnecting}
        size="lg"
        className={cn(
          'h-14 w-14 rounded-full shadow-lg',
          isRealtimeConnected ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary/90'
        )}
        aria-label={isRealtimeConnected ? 'Stop voice agent' : 'Start voice agent'}
        title={isRealtimeConnected ? 'Stop voice agent' : 'Start voice agent'}
      >
        {isConnecting ? (
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        ) : isRealtimeConnected ? (
          <Mic className="h-6 w-6 text-white" />
        ) : (
          <MicOff className="h-6 w-6 text-white" />
        )}
      </Button>
    </div>
  )
}

