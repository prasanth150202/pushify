import { json } from "@remix-run/node";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // keep your key in env
});

export async function action({ request }) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { prompt } = await request.json();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 80,
    });

    const suggestion = completion.choices[0].message.content.trim();
    return json({ suggestion });
  } catch (err) {
    console.error("AI Error:", err);
    return json({ error: "AI request failed" }, { status: 500 });
  }
}