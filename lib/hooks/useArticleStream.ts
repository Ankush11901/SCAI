'use client'

import { useState, useCallback, useRef } from 'react'

export interface StreamEvent {
  type: 'status' | 'component' | 'image' | 'progress' | 'complete' | 'error'
  id?: string
  status?: string
  content?: string
  prompt?: string
  url?: string
  html?: string
  wordCount?: number
  percentage?: number
  phase?: string
  message?: string
  error?: string
}

export interface GenerationState {
  isGenerating: boolean
  progress: number
  currentPhase: string
  streamedContent: string
  finalHtml: string | null
  images: Map<string, { status: string; url?: string; prompt?: string }>
  error: string | null
  wordCount: number
}

const initialState: GenerationState = {
  isGenerating: false,
  progress: 0,
  currentPhase: '',
  streamedContent: '',
  finalHtml: null,
  images: new Map(),
  error: null,
  wordCount: 0,
}

export function useArticleStream() {
  const [state, setState] = useState<GenerationState>(initialState)
  const abortControllerRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setState((prev) => ({ ...prev, isGenerating: false }))
  }, [])

  const generate = useCallback(
    async (
      articleType: string,
      topic: string,
      variation: string = 'question',
      enabledComponents?: string[]
    ) => {
      // Reset state
      setState({
        ...initialState,
        isGenerating: true,
        currentPhase: 'Initializing...',
      })

      // Create abort controller
      abortControllerRef.current = new AbortController()

      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            articleType,
            topic,
            variation,
            enabledComponents,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Generation failed')
        }

        if (!response.body) {
          throw new Error('No response body')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              const eventType = line.slice(7)
              continue
            }

            if (line.startsWith('data: ')) {
              try {
                const data: StreamEvent = JSON.parse(line.slice(6))
                handleStreamEvent(data, setState)
              } catch (e) {
                console.error('Failed to parse event data:', e)
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          setState((prev) => ({
            ...prev,
            isGenerating: false,
            currentPhase: 'Cancelled',
          }))
        } else {
          setState((prev) => ({
            ...prev,
            isGenerating: false,
            error: error instanceof Error ? error.message : 'Generation failed',
          }))
        }
      } finally {
        abortControllerRef.current = null
        setState((prev) => ({ ...prev, isGenerating: false }))
      }
    },
    []
  )

  return {
    ...state,
    generate,
    stopGeneration,
    reset,
  }
}

function handleStreamEvent(
  event: StreamEvent,
  setState: React.Dispatch<React.SetStateAction<GenerationState>>
) {
  switch (event.type) {
    case 'status':
      setState((prev) => ({
        ...prev,
        currentPhase: event.message || event.phase || '',
      }))
      break

    case 'component':
      if (event.status === 'streaming' || event.status === 'complete') {
        setState((prev) => ({
          ...prev,
          streamedContent: event.content || prev.streamedContent,
          currentPhase: event.status === 'complete' ? 'Component complete' : 'Streaming content...',
        }))
      }
      break

    case 'image':
      setState((prev) => {
        const newImages = new Map(prev.images)
        newImages.set(event.id || 'unknown', {
          status: event.status || 'pending',
          url: event.url,
          prompt: event.prompt,
        })
        return {
          ...prev,
          images: newImages,
          currentPhase:
            event.status === 'generating'
              ? 'Generating image...'
              : event.status === 'complete'
              ? 'Image complete'
              : prev.currentPhase,
        }
      })
      break

    case 'progress':
      setState((prev) => ({
        ...prev,
        progress: event.percentage || prev.progress,
      }))
      break

    case 'complete':
      setState((prev) => ({
        ...prev,
        isGenerating: false,
        finalHtml: event.html || null,
        wordCount: event.wordCount || 0,
        currentPhase: 'Complete',
        progress: 100,
      }))
      break

    case 'error':
      setState((prev) => ({
        ...prev,
        isGenerating: false,
        error: event.error || 'Unknown error',
        currentPhase: 'Error',
      }))
      break
  }
}

