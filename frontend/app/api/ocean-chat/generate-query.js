import { NextResponse } from "next/server";

export async function POST(req) {
  const { prompt } = await req.json();

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "mixtral-8x7b",
      messages: [
        { role: "system", content: "You are an AI data analyst that translates natural language into SQL queries for oceanographic Parquet data." },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = await response.json();
  return NextResponse.json({ result: data.choices[0].message.content });
}