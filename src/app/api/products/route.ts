// src/app/api/products/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY || "",
  baseURL: "https://api.perplexity.ai",
});

export async function POST(request: Request) {
  try {
    const { items, budget } = await request.json();

    const messages = [
      {
        role: "system" as const,
        content: "You are a helpful shopping assistant. Provide the top 4-5 Amazon products for the given category and budget. Each product should have: - ASIN - Name - Short description - Price. **Strictly respond in valid JSON format and only with a JSON Object. NO OTHER TEX. Do NOT include triple backticks or code fences.**, e.g.: [{ \"asin\": \"B07XYZ1234\", \"name\": \"Sample Product\", \"description\": \"Short description here\", \"price\": 29.99 }, ...].",
      },
      {
        role: "user" as const,
        content: `I'm looking for products in the "${items}" category with a budget of ${budget}.`,
      },
    ];

    // Non-streaming request
    const response = await client.chat.completions.create({
      model: "llama-3.1-sonar-small-128k-online",
      messages: messages,
    });
    // 2. Get the raw text from the LLM
    const content = response.choices[0]?.message?.content || "";

    // 3. Remove code fences if they appear
    const sanitized = content.replace(/```(\w+)?/g, "").trim();

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
    console.error("Error calling Perplexity:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
