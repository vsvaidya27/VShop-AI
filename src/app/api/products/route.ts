import { NextResponse } from "next/server";
import Exa from "exa-js";
import OpenAI from "openai";

// 1. Instantiate Exa & OpenAI clients
const exa = new Exa(process.env.EXA_API_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { items, lower, upper } = await request.json();

    // 2. Step 1: Retrieve with Exa
    // We'll search the web for "best Amazon products for <items> under <budget>"
    // You can tweak the query, e.g. add domain filters or advanced options
    const exaQuery = `best Amazon products for ${items} reasonably within price range from ${lower} to ${upper}`;
    const exaResult = await exa.searchAndContents(exaQuery, {
      type: "neural",
      useAutoprompt: true,
      numResults: 5,  // get top 5 relevant pages
      text: true,     // return text content
    });

    // 3. Step 2: Combine Exa results + user query, pass to OpenAI
    // We'll instruct the LLM to produce strictly valid JSON (no code fences).
    const systemPrompt = `
      You are a helpful shopping assistant. 
      You have access to these search results about Amazon products. 
      Provide the top 4-5 product recommendations for the given item(s) and budget. 
      Each product should have:
        - asin
        - name
        - short description
        - price
      Strictly respond in valid JSON format only (no code fences, disclaimers, etc.).
      Example final output:
      [
        {
          "asin": "B07XYZ1234",
          "name": "Sample Product",
          "description": "Short description",
          "price": 29.99
        },
        ...
      ]
    `;
    const userMessage = `
      User wants: "${items}" within a budget range of $${lower} to $${upper}.
      Here are the Exa search results:
      ${JSON.stringify(exaResult)}

      Please suggest the top 4-5 products in valid JSON format only.
    `;

    // 4. Call OpenAI Chat Completions
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    // 5. Extract the LLM's raw text
    const rawContent = response.choices?.[0]?.message?.content || "";
    // Remove code fences if any
    const sanitized = rawContent.replace(/```(\w+)?/g, "").trim();

    // 6. Parse the JSON
    let parsed;
    try {
      parsed = JSON.parse(sanitized);
      // Log the parsed response for debugging
      console.log("Parsed response:", parsed);

      // Ensure parsed is an array
      if (!Array.isArray(parsed)) {
        throw new Error("Parsed response is not an array");
      }
    } catch (err) {
      console.error("Error parsing LLM JSON:", err);
      return NextResponse.json({ error: "Invalid JSON from LLM" }, { status: 500 });
    }

    // Log the products before returning
    console.log("Products to return:", parsed);

    // 7. Return final JSON
    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("Error in /api/products route:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
