'use client'

import React from "react"

import { useState, useRef, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Mic, MicOff, Volume2, VolumeX, Loader2, Bot, User, Sparkles, Send, Keyboard } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useFormStore } from '@/lib/form-store'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  isProcessing?: boolean
}

type AgentState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error'

export function VoiceAgent() {
  const [agentState, setAgentState] = useState<AgentState>('idle')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your certification assistant. I can help you fill out the product certification form. Click the microphone to start a realtime voice call, or type your question.",
      timestamp: new Date(),
    },
  ])
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [textInput, setTextInput] = useState('')
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice')

  // Realtime API connection state
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [isConnectingRealtime, setIsConnectingRealtime] = useState(false)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { formData, setFormData } = useFormStore()

  // Accumulators for realtime text output
  const responseBufferRef = useRef<Map<string, string>>(new Map())
  const utteringResponseRef = useRef<string | null>(null)
  const latestUserTranscriptRef = useRef<string>('')

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle user message - send to reasoning agent (typed input path)
  const handleUserMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setAgentState('processing')

    // Add a processing message
    const processingId = (Date.now() + 1).toString()
    setMessages((prev) => [
      ...prev,
      {
        id: processingId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isProcessing: true,
      },
    ])

    try {
      // Call the reasoning agent API
      const response = await fetch('/api/reasoning-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          currentFormData: formData,
          conversationHistory: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response from agent')
      }

      const data = await response.json()

      // Update form data if the agent extracted information
      if (data.formUpdates && Object.keys(data.formUpdates).length > 0) {
        setFormData(data.formUpdates)
      }

      // Update the processing message with the actual response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === processingId
            ? { ...msg, content: data.response, isProcessing: false }
            : msg
        )
      )

      // Speak the response if audio is enabled and we're NOT in realtime mode
      if (isAudioEnabled && data.response && !isRealtimeConnected) {
        speakResponse(data.response)
      } else {
        setAgentState('idle')
      }
    } catch (err) {
      console.error('Error calling reasoning agent:', err)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === processingId
            ? {
              ...msg,
              content: "I'm sorry, I encountered an error processing your request. Please try again.",
              isProcessing: false,
            }
            : msg
        )
      )
      setAgentState('idle')
    }
  }

  // Speak the response using browser TTS (non-realtime typed path)
  const speakResponse = (text: string) => {
    if (typeof window === 'undefined' || !(window as any).speechSynthesis) return

    setAgentState('speaking')

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    // Try to use a natural-sounding voice
    const voices = (window as any).speechSynthesis.getVoices()
    const preferredVoice = voices.find(
      (v: SpeechSynthesisVoice) => v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Natural')
    )
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    utterance.onend = () => {
      setAgentState('idle')
    }

    utterance.onerror = () => {
      setAgentState('idle')
    }

    synthesisRef.current = utterance
    ;(window as any).speechSynthesis.speak(utterance)
  }

  // Parse events from the Realtime data channel and surface transcripts + responses
  const handleRealtimeEvent = useCallback((raw: string) => {
    try {
      const evt = JSON.parse(raw)
      const type: string = evt?.type || ''

      // Heuristic: detect when the model thinks / processes
      if (type.includes('response') && type.includes('started')) {
        setAgentState('processing')
        // Create a placeholder assistant message
        const id = evt?.response?.id || evt?.id || String(Date.now())
        responseBufferRef.current.set(id, '')
        setMessages(prev => [...prev, { id, role: 'assistant', content: '', timestamp: new Date(), isProcessing: true }])
      }

      // Streamed assistant text
      if (type.includes('response.output_text.delta') && typeof evt?.delta === 'string') {
        const id: string = evt?.response?.id || evt?.id || 'default'
        const prev = responseBufferRef.current.get(id) || ''
        const next = prev + evt.delta
        responseBufferRef.current.set(id, next)
        setMessages(prev => prev.map(m => m.id === id ? { ...m, content: next } : m))
      }

      // Assistant text done
      if (type.includes('response.completed')) {
        const id: string = evt?.response?.id || evt?.id || 'default'
        const finalText = responseBufferRef.current.get(id) || ''
        setMessages(prev => prev.map(m => m.id === id ? { ...m, content: finalText, isProcessing: false } : m))
        responseBufferRef.current.delete(id)
        setAgentState('idle')
      }

      // User transcript (partial)
      if ((type.includes('transcript.delta') || type.includes('input_audio_transcription.delta')) && typeof evt?.delta === 'string') {
        setTranscript(prev => (prev + evt.delta).slice(-4000))
        latestUserTranscriptRef.current = (latestUserTranscriptRef.current + evt.delta).slice(-4000)
        setAgentState('listening')
      }

      // User transcript completed
      if ((type.includes('transcript.completed') || type.includes('input_audio_transcription.completed'))) {
        const text: string = evt?.transcript || latestUserTranscriptRef.current
        if (text) {
          const userMsg: Message = { id: String(Date.now()), role: 'user', content: text, timestamp: new Date() }
          setMessages(prev => [...prev, userMsg])
        }
        latestUserTranscriptRef.current = ''
        setTranscript('')
        // After user finishes talking, model may respond; keep state as processing/listening handled above
      }

      // Optional: detect VAD events to update UI
      if (type.includes('input_audio_buffer.speech_started')) {
        setAgentState('listening')
      }
      if (type.includes('input_audio_buffer.speech_stopped')) {
        // Transition handled when response arrives
      }
    } catch (err) {
      // Some messages might be non-JSON; ignore gracefully
      // console.debug('Non-JSON realtime message', raw)
    }
  }, [setMessages])

  // Realtime API: Connect via WebRTC (no Agents SDK)
  const connectRealtime = useCallback(async () => {
    if (isRealtimeConnected || isConnectingRealtime) return

    try {
      setIsConnectingRealtime(true)
      setError(null)

      const pc = new RTCPeerConnection()
      pcRef.current = pc

      // Create or reuse a hidden audio element to play remote audio
      if (!remoteAudioRef.current) {
        const el = document.createElement('audio')
        el.autoplay = true
        el.style.display = 'none'
        document.body.appendChild(el)
        remoteAudioRef.current = el
      }

      pc.ontrack = (e) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = e.streams[0]
        }
      }

      // Capture microphone
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = ms
      const [track] = ms.getAudioTracks()
      pc.addTrack(track, ms)

      // Data channel for events
      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc
      dc.onmessage = (ev) => handleRealtimeEvent(ev.data)

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const res = await fetch('/api/realtime/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp || '',
      })

      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || 'Failed to create realtime session')
      }

      const answerSdp = await res.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

      setIsRealtimeConnected(true)
      setAgentState('idle')
    } catch (e: any) {
      console.error('Realtime connection error:', e)
      setError(e?.message || 'Failed to connect to realtime API')
      // Cleanup partially created objects
      try { pcRef.current?.close() } catch { }
      pcRef.current = null
      setIsRealtimeConnected(false)
      setAgentState('error')
    } finally {
      setIsConnectingRealtime(false)
    }
  }, [isRealtimeConnected, isConnectingRealtime, handleRealtimeEvent])

  // Disconnect realtime session
  const disconnectRealtime = useCallback(() => {
    try { pcRef.current?.close() } catch { }
    try { localStreamRef.current?.getTracks().forEach(t => t.stop()) } catch { }
    pcRef.current = null
    localStreamRef.current = null
    dcRef.current = null
    setIsRealtimeConnected(false)
    setTranscript('')
    setAgentState('idle')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { pcRef.current?.close() } catch { }
      try { localStreamRef.current?.getTracks().forEach(t => t.stop()) } catch { }
      pcRef.current = null
      localStreamRef.current = null
    }
  }, [])

  // Toggle audio output for browser TTS (does not affect realtime remote audio)
  const toggleAudio = () => {
    if (agentState === 'speaking') {
      ;(window as any).speechSynthesis?.cancel()
      setAgentState('idle')
    }
    setIsAudioEnabled(!isAudioEnabled)
  }

  // Handle text form submission
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!textInput.trim() || agentState === 'processing') return
    handleUserMessage(textInput.trim())
    setTextInput('')
  }

  // The mic button now starts/stops the realtime call
  const onMicClick = () => {
    if (isRealtimeConnected) {
      disconnectRealtime()
    } else if (!isConnectingRealtime) {
      connectRealtime()
    }
  }

  // Get state-specific styles and content
  const getStateDisplay = () => {
    if (isRealtimeConnected) {
      return {
        color: 'bg-green-600',
        pulseColor: 'bg-green-500',
        text: agentState === 'listening' ? 'Listening…' : agentState === 'processing' ? 'Thinking…' : 'Connected',
        icon: <Mic className="h-6 w-6 text-white" />,
      }
    }

    switch (agentState) {
      case 'speaking':
        return {
          color: 'bg-accent',
          pulseColor: 'bg-accent/70',
          text: 'Speaking…',
          icon: <Volume2 className="h-6 w-6 text-white" />,
        }
      case 'error':
        return {
          color: 'bg-destructive',
          pulseColor: 'bg-destructive/70',
          text: 'Error',
          icon: <MicOff className="h-6 w-6 text-white" />,
        }
      default:
        return {
          color: 'bg-muted',
          pulseColor: 'bg-muted/70',
          text: 'Ready',
          icon: <Mic className="h-5 w-5 text-primary" />,
        }
    }
  }

  const stateDisplay = getStateDisplay()

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Voice Assistant
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn(
              'transition-colors',
              isRealtimeConnected && 'border-green-600 text-green-600',
              !isRealtimeConnected && agentState === 'speaking' && 'border-accent text-accent',
            )}>
              {isRealtimeConnected ? 'Realtime Connected' : stateDisplay.text}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleAudio}
              className="h-8 w-8"
              title="Toggle browser TTS for typed replies"
            >
              {isAudioEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setInputMode(inputMode === 'voice' ? 'text' : 'voice')}
              className="h-8 w-8"
              title={inputMode === 'voice' ? 'Switch to text input' : 'Switch to voice input'}
            >
              {inputMode === 'voice' ? (
                <Keyboard className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        {/* Hidden audio element for remote stream */}
        <audio ref={remoteAudioRef} autoPlay className="hidden" />

        {/* Messages Area */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' && 'flex-row-reverse'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-4 py-2',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {message.isProcessing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Processing...</span>
                    </div>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Transcript Preview (interim from realtime) */}
        {transcript && (
          <div className="rounded-lg border border-dashed p-3">
            <p className="text-sm text-muted-foreground italic">{transcript}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Input Controls */}
        {inputMode === 'voice' ? (
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="relative">
              {/* Pulse animation */}
              {isRealtimeConnected && (agentState === 'listening' || agentState === 'processing') && (
                <div
                  className={cn(
                    'absolute inset-0 rounded-full animate-ping opacity-75',
                    stateDisplay.pulseColor
                  )}
                />
              )}
              <Button
                onClick={onMicClick}
                disabled={isConnectingRealtime}
                size="lg"
                className={cn(
                  'relative h-16 w-16 rounded-full transition-all',
                  isRealtimeConnected ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary/90'
                )}
                title={isRealtimeConnected ? 'Click to end voice call' : 'Click to start voice call'}
              >
                {isRealtimeConnected ? <Mic className="h-6 w-6 text-white" /> : stateDisplay.icon}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {isRealtimeConnected
                ? agentState === 'listening'
                  ? 'Listening…'
                  : agentState === 'processing'
                    ? 'Processing…'
                    : 'Connected — click to hang up'
                : isConnectingRealtime
                  ? 'Connecting to realtime…'
                  : 'Click the mic to start a realtime voice call'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleTextSubmit} className="flex gap-2 pt-2">
            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your message..."
              disabled={agentState === 'processing'}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!textInput.trim() || agentState === 'processing'}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

