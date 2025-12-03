// frontend/app/api/ocean-chat/route.ts
import { Groq, ChatCompletionMessageParam } from "groq-sdk"
import { NextResponse } from "next/server"

// Ensure this route runs in the Node.js runtime so server-only APIs
// like `process.env` and the `groq-sdk` Node client are available.
export const runtime = 'nodejs'

// --- Lazy Client Initialization ---
// Initialize Groq client on first request, not at module load time.
// This ensures environment variables are fresh in dev mode.
let client: Groq | null = null;

function initializeGroqClient(): Groq {
  if (client) return client;

  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set. Cannot initialize Groq client.");
  }

  client = new Groq({
    apiKey: GROQ_API_KEY,
  });

  console.log("Groq client initialized successfully.");
  return client;
}

export async function POST(req: Request) {
  try {
    // 1. Initialize Groq client on first request
    let groqClient: Groq;
    try {
      groqClient = initializeGroqClient();
    } catch (initError: any) {
      console.error("FATAL ERROR: Groq client failed to initialize:", initError.message);
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        start(controller) {
          const message = "⚠️ Error: Invalid Groq API Key. Please check your GROQ_API_KEY in .env.local and ensure it's a valid, non-expired key from https://console.groq.com/keys";
          controller.enqueue(encoder.encode(message));
          controller.close();
        },
      });
      return new Response(readableStream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        status: 200,
      });
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
    const groqStream = await groqClient.chat.completions.create({
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
    
    // Check if it's an authentication error (invalid API key)
    if (error.status === 401 || error.message?.includes("Invalid API Key")) {
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        start(controller) {
          const message = "⚠️ Error: Invalid Groq API Key. Please check your GROQ_API_KEY in .env.local and ensure it's a valid, non-expired key from https://console.groq.com/keys";
          controller.enqueue(encoder.encode(message));
          controller.close();
        },
      });
      return new Response(readableStream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        status: 200 // Return 200 so streaming works, but with error message
      });
    }

    // For other errors, return a generic error stream
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      start(controller) {
        const message = `Error: Failed to fetch AI response. ${error.message || "Unknown error"}`;
        controller.enqueue(encoder.encode(message));
        controller.close();
      },
    });
    return new Response(readableStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      status: 200 // Return 200 so streaming works
    });
  }
}