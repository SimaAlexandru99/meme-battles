/**
 * Service for generating AI-powered meme battle situations
 */
export class SituationService {
  private static readonly API_ENDPOINT = "/api/chat";

  /**
   * Generate a new humorous situation for meme battles
   */
  static async generateSituation(signal?: AbortSignal): Promise<string> {
    const response = await fetch(this.API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.situation || typeof data.situation !== "string") {
      throw new Error("Invalid response format");
    }

    return data.situation.trim();
  }

  /**
   * Generate multiple situations at once (for pre-loading)
   */
  static async generateMultipleSituations(
    count: number,
    signal?: AbortSignal
  ): Promise<string[]> {
    const promises = Array.from({ length: count }, () =>
      this.generateSituation(signal)
    );

    try {
      return await Promise.all(promises);
    } catch (error) {
      // If some fail, return the successful ones
      const results = await Promise.allSettled(promises);
      const successful = results
        .filter(
          (result): result is PromiseFulfilledResult<string> =>
            result.status === "fulfilled"
        )
        .map((result) => result.value);

      if (successful.length === 0) {
        throw error;
      }

      return successful;
    }
  }

  /**
   * Validate that a situation meets quality standards
   */
  static validateSituation(situation: string): boolean {
    if (!situation || typeof situation !== "string") {
      return false;
    }

    const trimmed = situation.trim();

    // Basic quality checks
    return (
      trimmed.length > 10 && // Not too short
      trimmed.length < 500 && // Not too long
      !trimmed.includes("I'm sorry") && // Not an AI refusal
      !trimmed.includes("I cannot") && // Not an AI refusal
      trimmed.split(" ").length >= 5 // Has reasonable word count
    );
  }
}
