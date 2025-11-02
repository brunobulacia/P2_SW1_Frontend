"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Bot, User, X, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

import { useSocket } from "@/socket/useSocket";


export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatInterfaceProps {
  messages: Message[]
  onSendMessage: (message: string) => void
  onSendAssistantMessage: (message: string) => void
  onDiagramGenerated?: (diagram: any) => void
  diagramId?: string
  isLoading?: boolean
  placeholder?: string
  className?: string
}

export function ChatInterface({
  messages,
  onSendMessage,
  onSendAssistantMessage,
  onDiagramGenerated,
  diagramId,
  isLoading = false,
  placeholder = "Inserta un mensaje...",
  className,
}: ChatInterfaceProps) {

  const socket = useSocket()

  const [input, setInput] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  // Configurar listeners de socket una sola vez
  useEffect(() => {
    if (!socket) return

    const handleDiagramGenerated = (data: { success: boolean; diagram?: any; message?: string; error?: string }) => {
      setIsGenerating(false) // Desactivar estado de carga
      if (data.success) {
        onSendAssistantMessage(`${data.message}`)
        if (data.diagram && onDiagramGenerated) {
          onDiagramGenerated(data.diagram)
        }
      } else {
        onSendAssistantMessage(`❌ ${data.error || 'Error al generar el diagrama'}`)
      }
    }

    const handleAgentGenerated = (data: { text: string }) => {
      setIsGenerating(false) // Desactivar estado de carga
      onSendAssistantMessage(data.text) // Renderizar respuesta del agente
    }

    socket.on("diagram-generated", handleDiagramGenerated)
    socket.on("agent-generated", handleAgentGenerated)

    // Cleanup
    return () => {
      socket.off("diagram-generated", handleDiagramGenerated)
      socket.off("agent-generated", handleAgentGenerated)
    }
  }, [socket, onSendAssistantMessage, onDiagramGenerated])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading && !isGenerating) {
      const userMessage = input.trim()
      onSendMessage(userMessage) // Renderizar mensaje del usuario
      setInput("")
      setIsGenerating(true) // Activar estado de carga
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }

      // Detectar si es un comando para generar diagrama
      const isDiagramCommand = userMessage.toLowerCase().includes('genera') || 
                              userMessage.toLowerCase().includes('crea') || 
                              userMessage.toLowerCase().includes('diagrama') ||
                              userMessage.toLowerCase().includes('clases') ||
                              userMessage.toLowerCase().includes('uml')

      if (isDiagramCommand && diagramId) {
        // Generar diagrama
        socket?.emit("generate-diagram", { prompt: userMessage, diagramId })
      } else {
        // Chat normal
        socket?.emit("generate-agent", { prompt: userMessage })
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize textarea
    e.target.style.height = "auto"
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <>
      <div className={cn("fixed bottom-8 right-4 z-50", className)}>
        {isOpen && (
          <div className="w-[350px] h-[450px] bg-background border border-border rounded-lg shadow-2xl flex flex-col mb-4 animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card rounded-t-lg">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold text-card-foreground">Migrator Chat</h2>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
                <span className="sr-only">Cerrar chat</span>
              </Button>
            </div>

            {/* Messages Area */}
            <ScrollArea ref={scrollAreaRef} className="flex-1 px-3 py-4 overflow-auto">
              <div className="space-y-4 min-h-0">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <Bot className="w-10 h-10 text-muted-foreground mb-3" />
                    <h3 className="text-sm font-medium text-foreground mb-1">Comienza una conversación</h3>
                    <p className="text-xs text-muted-foreground px-4">Haz preguntas sobre tu diagrama.</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn("flex gap-2 items-start", message.role === "user" && "flex-row-reverse")}
                    >
                      <div
                        className={cn(
                          "w-7 h-7 shrink-0 flex items-center justify-center rounded-full",
                          message.role === "assistant" && "bg-blue-100 text-blue-900 border border-blue-200",
                          message.role === "user" && "bg-green-500 text-white",
                        )}
                      >
                        {message.role === "assistant" ? (
                          <Bot className="w-3.5 h-3.5" />
                        ) : (
                          <User className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className={cn("flex flex-col gap-1 max-w-[75%] min-w-0", message.role === "user" && "items-end")}>
                        <div
                          className={cn(
                            "rounded-2xl px-3 py-2 text-xs leading-relaxed max-w-full overflow-hidden",
                            message.role === "assistant" && "bg-blue-100 text-blue-900 border border-blue-200",
                            message.role === "user" && "bg-green-500 text-white",
                          )}
                        >
                          <p className="whitespace-pre-wrap text-pretty break-words overflow-wrap-anywhere max-w-full">{message.content}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground px-2">{formatTime(message.timestamp)}</span>
                      </div>
                    </div>
                  ))
                )}

                {(isLoading || isGenerating) && (
                  <div className="flex gap-2 items-start">
                    <div className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="rounded-2xl px-3 py-2 bg-blue-100 text-blue-900 border border-blue-200">
                        <div className="flex gap-1 items-center">
                          <span className="w-1.5 h-1.5 bg-blue-700 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 bg-blue-700 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 bg-blue-700 rounded-full animate-bounce" />
                          <span className="text-xs ml-2 text-blue-700">
                            {isGenerating ? 'Generando respuesta...' : 'Cargando...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-border bg-card px-3 py-3 rounded-b-lg">
              <form onSubmit={handleSubmit}>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 relative">
                    <Textarea
                      ref={textareaRef}
                      value={input}
                      onChange={handleTextareaChange}
                      onKeyDown={handleKeyDown}
                      placeholder={placeholder}
                      disabled={isLoading || isGenerating}
                      className="min-h-[44px] max-h-[120px] resize-none text-xs leading-relaxed"
                      rows={1}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!input.trim() || isLoading || isGenerating}
                    className="h-[44px] w-[44px] shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="sr-only">Enviar mensaje</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        <Button size="icon" className="h-14 w-14 rounded-full shadow-lg" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
          <span className="sr-only">{isOpen ? "Cerrar chat" : "Abrir chat"}</span>
        </Button>
      </div>
    </>
  )
}
