import { NextRequest, NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

interface AIBotRequest {
  situation: string;
  cards: Array<{
    id: string;
    filename: string;
    url: string;
    alt: string;
  }>;
  botPersonality: {
    id: string;
    name: string;
    description: string;
    style: string;
  };
  difficulty: "easy" | "medium" | "hard";
}

interface AIBotResponse {
  selectedCardId: string;
  reasoning: string;
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: AIBotRequest = await request.json();
    const { situation, cards, botPersonality, difficulty } = body;

    // Create a detailed prompt for the AI
    const prompt = `You are ${botPersonality.name}, an AI player in a meme battle game. Your personality: ${botPersonality.description}. Your style: ${botPersonality.style}.

Current situation: "${situation}"

You have these meme cards available:
${cards.map((card, index) => `${index + 1}. ${card.filename} (${card.alt})`).join("\n")}

Your difficulty level is ${difficulty}, which affects your decision-making:
- Easy: Choose obvious, straightforward memes
- Medium: Balance humor and relevance
- Hard: Choose clever, unexpected, or meta memes

Analyze the situation and your available cards. Consider:
1. How well each meme fits the situation
2. The humor potential
3. Your personality and style
4. The difficulty level's influence on your choice

Respond with a JSON object containing:
- selectedCardId: The ID of the card you choose
- reasoning: A brief explanation of why you chose this card
- confidence: A number from 0-100 indicating how confident you are in this choice

Format your response as valid JSON only.`;

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("AI decision timeout")), 15000); // 15 second timeout
    });

    const generatePromise = generateText({
      model: google("gemini-2.5-flash"),
      prompt,
      experimental_telemetry: {
        isEnabled: true,
        recordInputs: true,
        recordOutputs: true,
      },
    });

    const result = (await Promise.race([generatePromise, timeoutPromise])) as {
      text: string;
    };

    // Parse the AI response
    let aiResponse: AIBotResponse;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }

      aiResponse = JSON.parse(jsonMatch[0]);

      // Validate the response
      if (
        !aiResponse.selectedCardId ||
        !aiResponse.reasoning ||
        typeof aiResponse.confidence !== "number"
      ) {
        throw new Error("Invalid AI response structure");
      }

      // Ensure the selected card exists in the available cards
      const selectedCard = cards.find(
        (card) => card.id === aiResponse.selectedCardId
      );
      if (!selectedCard) {
        throw new Error("AI selected a card that doesn't exist");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw AI response:", result.text);

      // Fallback: select a random card
      const randomCard = cards[Math.floor(Math.random() * cards.length)];
      aiResponse = {
        selectedCardId: randomCard.id,
        reasoning: `Fallback selection: ${randomCard.filename}`,
        confidence: 50,
      };
    }

    return NextResponse.json(aiResponse);
  } catch (error) {
    console.error("AI bot decision error:", error);
    return NextResponse.json(
      { error: "Failed to make AI decision" },
      { status: 500 }
    );
  }
}
