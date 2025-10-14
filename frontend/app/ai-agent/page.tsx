"use client"

import type React from "react"
// NO LONGER NEEDED: import { useChat } from "@ai-sdk/react"
// NO LONGER NEEDED: import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Bot, User, MapPin, Calendar, Thermometer, Menu, X } from "lucide-react"
import { useState, useRef, useEffect } from "react" // Added useRef and useEffect

// Define a simpler, consistent message structure for the UI
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string // All text goes here, no 'parts' array needed
}

export default function AIAgentPage() {
  const [input, setInput] = useState("")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<'idle' | 'in_progress'>('idle')
  
  // Ref for auto-scrolling the chat area
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-scroll logic
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [messages])

  const streamChatResponse = async (history: Message[]) => {
    setStatus('in_progress')
    
    // Convert current history (including new user message) to the format expected by the API route
    const bodyMessages = history.map(m => ({
        role: m.role,
        content: m.content
    }))

    try {
      const response = await fetch('/api/ocean-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: bodyMessages }),
      })

      if (!response.ok || !response.body) {
        throw new Error(`API returned status ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let aiResponse = ''
      
      // Create a temporary ID for the streaming message
      const assistantId = Date.now().toString() + '-ai'
      
      // Add the empty assistant message to the state
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

      // Read the stream
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        aiResponse += chunk

        // Update the last message in state with the new chunk
        setMessages((prev) => 
          prev.map(m => m.id === assistantId ? { ...m, content: aiResponse } : m)
        )
      }
    } catch (error) {
      console.error("Streaming chat failed:", error)
      const errorMessage: Message = { id: Date.now().toString(), role: 'assistant', content: `Error: Failed to fetch AI response. Please check server logs. (${error.message})` }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setStatus('idle')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || status === 'in_progress') return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: text };
    
    // Update state first with the user message
    setMessages((prev) => {
        const newHistory = [...prev, userMessage];
        // Initiate the streaming process with the new full history
        streamChatResponse(newHistory); 
        return newHistory;
    });

    setInput("");
  }

  const suggestedQuestions = [
    "What data is available from the Indian Ocean Argo buoys?",
    "Show me temperature trends in the Arabian Sea",
    "What are the current buoy locations near India?",
    "Explain the seasonal patterns in ocean temperature",
    "How does the monsoon affect ocean conditions?",
    "What depth measurements are available?",
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Data Sources Info (Sidebar) */}
          <div className={`lg:col-span-1 space-y-4 ${isSidebarOpen ? "block" : "hidden lg:block"}`}>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden mb-4"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              {isSidebarOpen ? "Hide Menu" : "Show Menu"}
            </Button>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="w-5 h-5" />
                  Data Sources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Badge variant="secondary" className="w-full justify-start">
                    <Calendar className="w-3 h-3 mr-1" />
                    NOAA Argo 2019
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Temperature, salinity, and depth profiles from autonomous floats
                  </p>
                </div>
                <div className="space-y-2">
                  <Badge variant="secondary" className="w-full justify-start">
                    <Thermometer className="w-3 h-3 mr-1" />
                    INCOIS Network
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Real-time buoy observations around Indian sub-continent
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {suggestedQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left h-auto p-2 text-xs whitespace-normal break-words"
                      onClick={() => setInput(question)}
                      disabled={status === 'in_progress'}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Ocean Data Assistant
                </CardTitle>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center py-8">
                        <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">Welcome to OceanFront AI</h3>
                        <p className="text-muted-foreground mb-4">
                          I can help you understand and analyze oceanographic data from the Indian Ocean region.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Ask me about temperature patterns, buoy locations, seasonal trends, or any other ocean data
                          questions.
                        </p>
                      </div>
                    )}

                    {messages.map((message) => (
                      <div key={message.id} className="flex gap-3">
                        <div className="flex-shrink-0">
                          {message.role === "user" ? (
                            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                              <User className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                              <Bot className="w-4 h-4 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="bg-card border rounded-lg p-3">
                            {/* RENDER MESSAGE.CONTENT DIRECTLY */}
                            <div className="prose prose-sm max-w-none">
                              {message.content.split("\n").map((line, lineIndex) => (
                                <p key={lineIndex} className="mb-2 last:mb-0">
                                  {line}
                                </p>
                              ))}
                            </div>
                            
                            {/* Fallback for empty message during streaming */}
                            {message.role === 'assistant' && message.content.length === 0 && status === 'in_progress' && (
                                <span className="text-sm text-muted-foreground italic">...</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Loading indicator */}
                    {status === "in_progress" && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <Bot className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="bg-card border rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                              <span className="text-sm text-muted-foreground">Analyzing ocean data...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="border-t p-4">
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about ocean data, buoy locations, temperature trends..."
                      disabled={status === "in_progress"}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={status === "in_progress" || !input.trim()}>
                      Send
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}