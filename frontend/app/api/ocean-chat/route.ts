// frontend/app/api/ocean-chat/route.ts
import { Groq, ChatCompletionMessageParam } from "groq-sdk"
import { NextResponse } from "next/server"

// --- Client Initialization (Must be outside POST) ---
const GROQ_API_KEY = process.env.GROQ_API_KEY

console.log("GROQ_API_KEY status:", GROQ_API_KEY ? "LOADED" : "MISSING/UNDEFINED")

let client: Groq;

try {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set. Cannot initialize Groq client.")
  }
  client = new Groq({
    apiKey: GROQ_API_KEY,
  })
  console.log("Groq client initialized successfully.")
} catch (e: any) {
  console.error("FATAL ERROR: Groq client failed to initialize:", e.message)
}
// ----------------------------------------------------


export async function POST(req: Request) {
  try {
    // 1. Check client initialization status before proceeding
    if (!client) {
      console.error("Attempt to call POST handler with uninitialized Groq client.")
      return NextResponse.json(
        { parts: [{ type: "text", text: "Error: AI client not configured. Check server logs for API key errors." }] },
        { status: 500 }
      )
    }
    
    const { messages } = await req.json()

    // 2. Input Validation
    if (!messages || !Array.isArray(messages)) {
        return NextResponse.json(
            { parts: [{ type: "text", text: "Bad Request: Invalid message format." }] },
            { status: 400 }
        )
    }

    // 3. Map messages to Groq's expected format (safely casted for TypeScript)
    const chatHistory = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content || m.text || "",
    })) as ChatCompletionMessageParam[]

    // 4. Request the streaming response from Groq
    const groqStream = await client.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: "You are OceanFront AI, an oceanographic assistant specialized in Indian Ocean data." },
        ...chatHistory,
      ],
      stream: true, // IMPORTANT: Request a stream
    })

    // 5. Create a Native Web Stream (ReadableStream) to handle the Groq stream
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of groqStream) {
          // Extract the content from the stream chunk
          const text = chunk.choices[0]?.delta?.content || "";
          
          // Encode the text and enqueue it to the response stream
          controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    // 6. Return the stream using the standard Web Response object
    return new Response(readableStream, {
      headers: { 
        // Use text/plain for a simple text stream (consumed by fetch on client)
        'Content-Type': 'text/plain; charset=utf-8', 
      },
      status: 200
    });

  } catch (error: any) {
    console.error("Critical Error in /api/ocean-chat route:", error)
    
    // Return a standard JSON error as a fallback
    return NextResponse.json(
      { parts: [{ type: "text", text: "Error: Failed to fetch AI response." }] },
      { status: 500 }
    )
  }
}