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
import SpeechRecognition from 'speech-recognition'

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
      content: "Hello! I'm your certification assistant. I can help you fill out the product certification form. Just click the microphone and tell me about your product, company, or ask any questions about the certification process.",
      timestamp: new Date(),
    },
  ])
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [textInput, setTextInput] = useState('')
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice')
  
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { formData, setFormData } = useFormStore()

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize speech recognition
  const initSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in your browser. Please use Chrome or Edge.')
      return null
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      if (finalTranscript) {
        setTranscript('')
        handleUserMessage(finalTranscript)
      } else {
        setTranscript(interimTranscript)
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      if (event.error !== 'no-speech') {
        setError(`Speech recognition error: ${event.error}`)
      }
      setAgentState('idle')
    }

    recognition.onend = () => {
      if (agentState === 'listening') {
        setAgentState('idle')
      }
    }

    return recognition
  }, [agentState])

  // Handle user message - send to reasoning agent
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

      // Speak the response if audio is enabled
      if (isAudioEnabled && data.response) {
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

  // Speak the response using TTS
  const speakResponse = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    setAgentState('speaking')
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    // Try to use a natural-sounding voice
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(
      (v) => v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Natural')
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
    window.speechSynthesis.speak(utterance)
  }

  // Toggle listening state
  const toggleListening = () => {
    if (agentState === 'listening') {
      recognitionRef.current?.stop()
      setAgentState('idle')
      setTranscript('')
    } else if (agentState === 'idle') {
      // Stop any ongoing speech
      window.speechSynthesis?.cancel()
      
      if (!recognitionRef.current) {
        recognitionRef.current = initSpeechRecognition()
      }
      
      if (recognitionRef.current) {
        recognitionRef.current.start()
        setAgentState('listening')
        setError(null)
      }
    }
  }

  // Toggle audio output
  const toggleAudio = () => {
    if (agentState === 'speaking') {
      window.speechSynthesis?.cancel()
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

  // Get state-specific styles and content
  const getStateDisplay = () => {
    switch (agentState) {
      case 'listening':
        return {
          color: 'bg-red-500',
          pulseColor: 'bg-red-400',
          text: 'Listening...',
          icon: <Mic className="h-6 w-6 text-white" />,
        }
      case 'processing':
        return {
          color: 'bg-primary',
          pulseColor: 'bg-primary/70',
          text: 'Thinking...',
          icon: <Loader2 className="h-6 w-6 text-white animate-spin" />,
        }
      case 'speaking':
        return {
          color: 'bg-accent',
          pulseColor: 'bg-accent/70',
          text: 'Speaking...',
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
              agentState === 'listening' && 'border-red-500 text-red-500',
              agentState === 'processing' && 'border-primary text-primary',
              agentState === 'speaking' && 'border-accent text-accent',
            )}>
              {stateDisplay.text}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleAudio}
              className="h-8 w-8"
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

        {/* Transcript Preview */}
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
              {(agentState === 'listening' || agentState === 'speaking') && (
                <div
                  className={cn(
                    'absolute inset-0 rounded-full animate-ping opacity-75',
                    stateDisplay.pulseColor
                  )}
                />
              )}
              <Button
                onClick={toggleListening}
                disabled={agentState === 'processing' || agentState === 'speaking'}
                size="lg"
                className={cn(
                  'relative h-16 w-16 rounded-full transition-all',
                  agentState === 'listening' && 'bg-red-500 hover:bg-red-600',
                  agentState === 'idle' && 'bg-primary hover:bg-primary/90'
                )}
              >
                {stateDisplay.icon}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {agentState === 'listening'
                ? 'Click to stop'
                : agentState === 'processing'
                ? 'Processing your request...'
                : agentState === 'speaking'
                ? 'Speaking...'
                : 'Click to start speaking'}
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
