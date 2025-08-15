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

// Calculate string similarity using Levenshtein distance
function calculateStringSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const maxLen = Math.max(len1, len2);
  return (maxLen - matrix[len1][len2]) / maxLen;
}

// Simple fallback card selection
function selectFallbackCard(cards: AIBotRequest["cards"]): AIBotResponse {
  const randomCard = cards[Math.floor(Math.random() * cards.length)];
  return {
    selectedCardId: randomCard.id,
    reasoning: `Fallback selection: ${randomCard.filename}`,
    confidence: 50,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: AIBotRequest = await request.json();
    const { situation, cards, botPersonality, difficulty } = body;

    // Log the cards being sent to AI for debugging
    console.log(
      "AI Bot Request - Cards:",
      cards.map((c) => ({ id: c.id, filename: c.filename }))
    );

    // Create a detailed prompt for the AI
    const prompt = `You are ${botPersonality.name}, an AI player in a meme battle game. Your personality: ${botPersonality.description}. Your style: ${botPersonality.style}.

Current situation: "${situation}"

You have these meme cards available:
${cards.map((card, index) => `${index + 1}. ${card.filename} (${card.alt}) - ID: ${card.id}`).join("\n")}

Your difficulty level is ${difficulty}, which affects your decision-making:
- Easy: Choose obvious, straightforward memes
- Medium: Balance humor and relevance
- Hard: Choose clever, unexpected, or meta memes

Analyze the situation and your available cards. Consider:
1. How well each meme fits the situation
2. The humor potential
3. Your personality and style
4. The difficulty level's influence on your choice

IMPORTANT: You must use the EXACT card ID (like "${cards[0]?.id || "example-id"}") in your response, NOT the number (1, 2, 3).

Respond with a JSON object containing:
- selectedCardId: The EXACT ID of the card you choose (use the ID field, not the number)
- reasoning: A brief explanation of why you chose this card
- confidence: A number from 0-100 indicating how confident you are in this choice

Example response format:
{
  "selectedCardId": "${cards[0]?.id || "example-id"}",
  "reasoning": "This meme perfectly captures the situation because...",
  "confidence": 85
}

Format your response as valid JSON only.`;

    // Add timeout to prevent long-running requests
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

    // Race between timeout and generation
    const result = (await Promise.race([generatePromise, timeoutPromise])) as {
      text: string;
    };

    console.log("AI Response received:", result.text);

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

      // Handle case where AI returns numbered selections (1, 2, 3) instead of actual card IDs
      let selectedCard = cards.find(
        (card) => card.id === aiResponse.selectedCardId
      );

      // If not found, try fuzzy matching for similar IDs (handles minor typos)
      if (!selectedCard) {
        selectedCard = cards.find((card) => {
          const similarity = calculateStringSimilarity(card.id, aiResponse.selectedCardId);
          return similarity > 0.8; // 80% similarity threshold
        });
        
        if (selectedCard) {
          console.log(
            `AI card ID "${aiResponse.selectedCardId}" fuzzy matched to "${selectedCard.id}"`
          );
          aiResponse.selectedCardId = selectedCard.id;
        }
      }

      // If still not found, try to interpret as index (AI might be using 1-based indexing)
      if (!selectedCard) {
        const cardIndex = parseInt(aiResponse.selectedCardId.toString()) - 1; // Convert to 0-based index
        if (cardIndex >= 0 && cardIndex < cards.length) {
          selectedCard = cards[cardIndex];
          // Update the AI response to use the actual card ID
          aiResponse.selectedCardId = selectedCard.id;
          console.log(
            `AI used index ${cardIndex + 1}, converted to card ID: ${selectedCard.id}`
          );
        }
      }

      // If still not found, throw error
      if (!selectedCard) {
        console.warn(
          `AI selected card ID "${aiResponse.selectedCardId}" which doesn't exist. Available cards:`,
          cards.map((c) => ({ id: c.id, filename: c.filename }))
        );
        throw new Error("AI selected a card that doesn't exist");
      }

      console.log(
        `AI successfully selected card: ${selectedCard.filename} (${selectedCard.id})`
      );
      return NextResponse.json(aiResponse);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw AI response:", result.text);

      // Try to extract any useful information from the AI response
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const partialResponse = JSON.parse(jsonMatch[0]);
          if (partialResponse.selectedCardId) {
            // Try to interpret as index if it's a number
            const cardIndex =
              parseInt(partialResponse.selectedCardId.toString()) - 1;
            if (cardIndex >= 0 && cardIndex < cards.length) {
              const selectedCard = cards[cardIndex];
              console.log(
                `Fallback: Using index ${cardIndex + 1} to select card: ${selectedCard.filename}`
              );
              return NextResponse.json({
                selectedCardId: selectedCard.id,
                reasoning: `Fallback: ${partialResponse.reasoning || "Selected based on AI preference"}`,
                confidence: partialResponse.confidence || 50,
              });
            }
          }
        }
      } catch (fallbackParseError) {
        console.error("Fallback parsing also failed:", fallbackParseError);
      }

      // Final fallback: select a random card
      const fallbackResponse = selectFallbackCard(cards);
      return NextResponse.json(fallbackResponse);
    }
  } catch (error) {
    console.error("AI bot decision error:", error);

    // Do not re-read request body here (body already consumed). Instead, return a generic fallback
    // Note: We can't access cards anymore, so reply with a structured error the caller can handle
    // Or better, include a minimal safe fallback by returning 503 with retry-after
    return NextResponse.json(
      {
        error:
          "AI temporarily unavailable due to rate limits. Please retry shortly.",
      },
      { status: 503, headers: { "Retry-After": "10" } }
    );
  }
}
