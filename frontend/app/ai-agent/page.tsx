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
import ReactMarkdown from 'react-markdown'

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
  // Ref to prevent duplicate streaming requests
  const isStreamingRef = useRef(false)

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
    // Prevent duplicate streaming requests
    if (isStreamingRef.current) return;
    isStreamingRef.current = true;
    
    setStatus('in_progress')
    
    // Convert current history (including new user message) to the format expected by the API route
    const bodyMessages = history.map(m => ({
        role: m.role,
        content: m.content
    }))

    // Create a temporary ID for the streaming message BEFORE starting the stream
    const assistantId = Date.now().toString() + '-ai'
    
    // Add the empty assistant message to the state ONCE
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

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
      isStreamingRef.current = false;
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || status === 'in_progress') return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: text };
    
    // Add user message to the messages list
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    // Then initiate the streaming process with the updated history
    streamChatResponse(newMessages); 
    
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
                          <div className="bg-card border rounded-lg p-3 overflow-x-auto">
                            {/* RENDER MARKDOWN CONTENT */}
                            <div className="prose prose-sm dark:prose-invert max-w-none
                              prose-headings:mt-4 prose-headings:mb-2
                              prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
                              prose-p:my-1 prose-p:text-sm
                              prose-ul:my-1 prose-ul:pl-4 prose-li:my-0.5
                              prose-ol:my-1 prose-ol:pl-4
                              prose-code:bg-slate-700 prose-code:text-orange-300 prose-code:px-1 prose-code:rounded
                              prose-pre:bg-slate-800 prose-pre:text-slate-100 prose-pre:p-2 prose-pre:rounded prose-pre:overflow-x-auto
                              prose-table:border-collapse prose-table:w-full prose-table:text-xs
                              prose-thead:bg-slate-700 prose-th:border prose-th:p-2 prose-th:text-left
                              prose-td:border prose-td:p-2
                              prose-a:text-blue-400 prose-a:underline
                              prose-strong:font-bold prose-strong:text-slate-100
                              prose-em:italic prose-em:text-slate-300
                              prose-hr:my-2 prose-hr:border-slate-600
                            ">
                              <ReactMarkdown
                                components={{
                                  table: ({node, ...props}) => (
                                    <table className="w-full border-collapse text-xs my-2" {...props} />
                                  ),
                                  thead: ({node, ...props}) => (
                                    <thead className="bg-slate-700" {...props} />
                                  ),
                                  th: ({node, ...props}) => (
                                    <th className="border border-slate-600 p-2 text-left text-slate-100 font-semibold" {...props} />
                                  ),
                                  td: ({node, ...props}) => (
                                    <td className="border border-slate-600 p-2" {...props} />
                                  ),
                                  tr: ({node, ...props}) => (
                                    <tr className="hover:bg-slate-750" {...props} />
                                  ),
                                  code: ({node, inline, ...props}) => 
                                    inline ? (
                                      <code className="bg-slate-700 text-orange-300 px-1.5 py-0.5 rounded text-xs" {...props} />
                                    ) : (
                                      <code className="block bg-slate-800 text-slate-100 p-2 rounded overflow-x-auto text-xs" {...props} />
                                    ),
                                  pre: ({node, ...props}) => (
                                    <pre className="bg-slate-800 text-slate-100 p-2 rounded overflow-x-auto my-2 text-xs" {...props} />
                                  ),
                                  h1: ({node, ...props}) => <h1 className="text-lg font-bold mt-3 mb-2" {...props} />,
                                  h2: ({node, ...props}) => <h2 className="text-base font-bold mt-3 mb-1.5" {...props} />,
                                  h3: ({node, ...props}) => <h3 className="text-sm font-semibold mt-2 mb-1" {...props} />,
                                  ul: ({node, ...props}) => <ul className="list-disc list-inside my-1 space-y-0.5" {...props} />,
                                  ol: ({node, ...props}) => <ol className="list-decimal list-inside my-1 space-y-0.5" {...props} />,
                                  li: ({node, ...props}) => <li className="text-sm" {...props} />,
                                  p: ({node, ...props}) => <p className="text-sm my-1" {...props} />,
                                  a: ({node, ...props}) => <a className="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noopener noreferrer" {...props} />,
                                  hr: ({node, ...props}) => <hr className="my-2 border-slate-600" {...props} />,
                                  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-slate-600 pl-3 italic text-slate-300 my-2 text-sm" {...props} />,
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
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