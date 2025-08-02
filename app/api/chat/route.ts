import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      prompt: `Generate a funny, relatable situation that would be perfect for a meme response. The situation should be:
      - Humorous and engaging
      - Relatable to a wide audience
      - Perfect for meme responses
      - Family-friendly
      - 1-2 sentences long
      - Something that would make people think "I need the perfect meme for this!"
      
      Examples of good situations:
      - "When you realize you've been pronouncing a word wrong your entire life"
      - "When your phone battery dies right before you need to show someone a funny video"
      - "When you're trying to be productive but your bed is calling your name"
      
      Generate one new situation:`,
    });

    return NextResponse.json({ situation: text.trim() });
  } catch (error) {
    console.error("Error generating situation:", error);
    return NextResponse.json(
      { error: "Failed to generate situation" },
      { status: 500 }
    );
  }
}
