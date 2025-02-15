// src/app/api/products/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server";

// Replace this with your real API key or environment variable
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: Request) {
  try {
    const { items, budget } = await request.json();

    const messages = [
      {
        role: "system" as const,
        content: "You are a helpful shopping assistant. Provide the top 4-5 Amazon products for the given item and budget. Each product should have: - ASIN - Name - Short description - Price. **Strictly respond in valid JSON format and only with a JSON Object. NO OTHER TEX. Do NOT include triple backticks or code fences.**, e.g.: [{ \"asin\": \"B07XYZ1234\", \"name\": \"Product\", \"description\": \"Short description here\", \"price\": 29.99 }, ...].",
      },
      {
        role: "user" as const,
        content: `I'm looking for "${items}" with a budget of ${budget}.`,
      },
    ];

    // 1. Call your hosted LLM endpoint (e.g., OpenAI)
    const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: messages,
      }),
    });

    const jsonData = await openAiRes.json();
    const rawMessage = jsonData.choices?.[0]?.message?.content ?? "";

    // 3. Remove code fences if they appear
    const sanitized = rawMessage.replace(/```(\w+)?/g, "").trim();

    // 4. Parse the LLM's JSON
    let parsed;
    try {
      parsed = JSON.parse(sanitized);
    } catch (err) {
      console.error("Error parsing LLM JSON:", err);
      return NextResponse.json(
        { error: "Invalid JSON from LLM" },
        { status: 500 }
      );
    }

    // 5. Return the parsed object/array directly
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Error calling OpenAI:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
