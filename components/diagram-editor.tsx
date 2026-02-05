"use client"

import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type DiagramNode = {
  id: string
  label: string
  x: number
  y: number
}

export type DiagramEdge = {
  id: string
  from: string // node id
  to: string   // node id
}

export type Diagram = {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
}

export interface DiagramEditorApi {
  getDiagram: () => Diagram
  addNode: (label: string) => { success: boolean; id?: string; error?: string }
  connectNodes: (fromLabel: string, toLabel: string) => { success: boolean; error?: string }
  renameNode: (oldLabel: string, newLabel: string) => { success: boolean; error?: string }
  deleteNode: (label: string) => { success: boolean; error?: string }
}

interface DiagramEditorProps {
  value?: Diagram
  defaultValue?: Diagram
  className?: string
  onChange?: (d: Diagram) => void
}

const DEFAULT_DIAGRAM: Diagram = {
  nodes: [
    { id: 'n1', label: 'User', x: 80, y: 120 },
    { id: 'n2', label: 'App', x: 280, y: 120 },
    { id: 'n3', label: 'Database', x: 480, y: 220 },
  ],
  edges: [
    { id: 'e1', from: 'n1', to: 'n2' },
    { id: 'e2', from: 'n2', to: 'n3' },
  ],
}

// Simple diagram editor with draggable nodes and straight-line edges.
export function DiagramEditor({ value, defaultValue, className, onChange }: DiagramEditorProps) {
  const [internal, setInternal] = useState<Diagram>(defaultValue ?? DEFAULT_DIAGRAM)
  const diagram = value ?? internal

  const containerRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null)

  const notify = useCallback((next: Diagram) => {
    if (value) onChange?.(next)
    else setInternal(next)
  }, [onChange, value])

  // Basic pointer drag for nodes
  const onPointerDown = useCallback((e: React.PointerEvent, id: string) => {
    const el = e.currentTarget as HTMLDivElement
    const rect = el.getBoundingClientRect()
    draggingRef.current = { id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return
    const container = containerRef.current
    if (!container) return
    const crect = container.getBoundingClientRect()
    const x = e.clientX - crect.left - draggingRef.current.offsetX
    const y = e.clientY - crect.top - draggingRef.current.offsetY

    notify({
      ...diagram,
      nodes: diagram.nodes.map(n => n.id === draggingRef.current!.id ? { ...n, x: Math.max(0, Math.min(crect.width - 120, x)), y: Math.max(0, Math.min(crect.height - 48, y)) } : n)
    })
  }, [diagram, notify])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (draggingRef.current) {
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch {}
    }
    draggingRef.current = null
  }, [])

  return (
    <div className={cn('space-y-3', className)}>
      <Card ref={containerRef} className="relative h-[420px] w-full overflow-hidden">
        {/* SVG edges */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {diagram.edges.map(e => {
            const a = diagram.nodes.find(n => n.id === e.from)
            const b = diagram.nodes.find(n => n.id === e.to)
            if (!a || !b) return null
            const x1 = a.x + 60
            const y1 = a.y + 24
            const x2 = b.x + 60
            const y2 = b.y + 24
            return (
              <g key={e.id}>
                <defs>
                  <marker id={`arrow-${e.id}`} markerWidth="8" markerHeight="8" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                    <path d="M0,0 L0,6 L9,3 z" fill="currentColor" />
                  </marker>
                </defs>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" className="text-muted-foreground" strokeWidth={1.5} markerEnd={`url(#arrow-${e.id})`} />
              </g>
            )
          })}
        </svg>

        {/* Nodes */}
        {diagram.nodes.map(n => (
          <div
            key={n.id}
            className="absolute w-[120px] cursor-grab select-none rounded-md border bg-card p-2 text-center shadow-sm active:cursor-grabbing"
            style={{ left: n.x, top: n.y }}
            onPointerDown={(e) => onPointerDown(e, n.id)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <div className="truncate text-sm font-medium">{n.label}</div>
          </div>
        ))}
      </Card>
    </div>
  )
}

export function useDiagramApi(initial?: Diagram) {
  const [diagram, setDiagram] = useState<Diagram>(initial ?? DEFAULT_DIAGRAM)
  const getDiagram = useCallback(() => diagram, [diagram])
  const addNode = useCallback((label: string) => {
    const trimmed = label?.trim()
    if (!trimmed) return { success: false, error: 'Label cannot be empty' }
    const exists = diagram.nodes.some(n => n.label.toLowerCase() === trimmed.toLowerCase())
    if (exists) return { success: false, error: 'A node with that label already exists' }
    const id = `n${Date.now()}`
    const next: Diagram = { ...diagram, nodes: [...diagram.nodes, { id, label: trimmed, x: 120 + Math.random() * 360, y: 80 + Math.random() * 220 }] }
    setDiagram(next)
    return { success: true, id }
  }, [diagram])
  const connectNodes = useCallback((fromLabel: string, toLabel: string) => {
    const a = diagram.nodes.find(n => n.label.toLowerCase() === String(fromLabel).toLowerCase())
    const b = diagram.nodes.find(n => n.label.toLowerCase() === String(toLabel).toLowerCase())
    if (!a || !b) return { success: false, error: 'One or both nodes not found' }
    const dup = diagram.edges.some(e => e.from === a.id && e.to === b.id)
    if (dup) return { success: false, error: 'Edge already exists' }
    const next: Diagram = { ...diagram, edges: [...diagram.edges, { id: `e${Date.now()}`, from: a.id, to: b.id }] }
    setDiagram(next)
    return { success: true }
  }, [diagram])
  const renameNode = useCallback((oldLabel: string, newLabel: string) => {
    const a = diagram.nodes.find(n => n.label.toLowerCase() === String(oldLabel).toLowerCase())
    if (!a) return { success: false, error: 'Node not found' }
    const conflict = diagram.nodes.some(n => n.id !== a.id && n.label.toLowerCase() === String(newLabel).toLowerCase())
    if (conflict) return { success: false, error: 'Another node already has that label' }
    const next: Diagram = { ...diagram, nodes: diagram.nodes.map(n => n.id === a.id ? { ...n, label: String(newLabel) } : n) }
    setDiagram(next)
    return { success: true }
  }, [diagram])
  const deleteNode = useCallback((label: string) => {
    const a = diagram.nodes.find(n => n.label.toLowerCase() === String(label).toLowerCase())
    if (!a) return { success: false, error: 'Node not found' }
    const next: Diagram = { nodes: diagram.nodes.filter(n => n.id !== a.id), edges: diagram.edges.filter(e => e.from !== a.id && e.to !== a.id) }
    setDiagram(next)
    return { success: true }
  }, [diagram])

  const api: DiagramEditorApi = useMemo(() => ({ getDiagram, addNode, connectNodes, renameNode, deleteNode }), [getDiagram, addNode, connectNodes, renameNode, deleteNode])
  return { diagram, setDiagram, api }
}

