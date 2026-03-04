/**
 * @file HypeManAgent.ts
 * @summary AI-powered viral content generator using Gemini Flash
 * @dependencies N/A
 */

import type { HypeRequest, HypeResponse, HypeContent, HypeTone } from '../types/hype';

/**
 * Gemini Flash API endpoint
 */
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * HypeManAgent - Generates viral social content for token launches
 */
export class HypeManAgent {
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
  }

  /**
   * Generate hype posts in all three tones
   */
  async generateHypePosts(request: HypeRequest): Promise<HypeResponse> {
    if (!this.apiKey) {
      return this.getFallbackResponse(request);
    }

    try {
      const prompt = this.buildPrompt(request);
      const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 1024 },
        }),
      });

      if (!response.ok) {
        console.error('Gemini API error:', response.status);
        return this.getFallbackResponse(request);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const posts = this.parseResponse(text, request);

      return { posts, generatedAt: Date.now() };
    } catch (error) {
      console.error('Hype generation failed:', error);
      return this.getFallbackResponse(request);
    }
  }

  /**
   * Build the AI prompt
   */
  private buildPrompt(request: HypeRequest): string {
    const desc = request.description || 'a new Solana token';
    return `Generate 3 different social media posts for a new Solana token launch.

Token: $${request.ticker}
Description: ${desc}
LP Lock: ${request.lockDays} days (Safe-Standard verified)

Create posts in these tones:
1. BULLISH: Excited, emoji-heavy, moon references, rocket energy
2. PROFESSIONAL: Clean, factual, emphasizes security and lock period
3. DEGEN: Memecoin culture, ape references, bold claims, fun

Each post must be under 280 characters (Twitter limit).
Include 2-3 relevant hashtags per post.

Format your response exactly like this:
---BULLISH---
[post text]
#hashtag1 #hashtag2
---PROFESSIONAL---
[post text]
#hashtag1 #hashtag2
---DEGEN---
[post text]
#hashtag1 #hashtag2`;
  }

  /**
   * Parse AI response into structured content
   */
  private parseResponse(text: string, request: HypeRequest): HypeContent[] {
    const tones: HypeTone[] = ['bullish', 'professional', 'degen'];
    const posts: HypeContent[] = [];

    for (const tone of tones) {
      const marker = `---${tone.toUpperCase()}---`;
      const nextMarker = tones[tones.indexOf(tone) + 1];
      const nextMarkerStr = nextMarker ? `---${nextMarker.toUpperCase()}---` : undefined;

      const startIdx = text.indexOf(marker);
      if (startIdx === -1) {
        posts.push(this.getFallbackPost(tone, request));
        continue;
      }

      const endIdx = nextMarkerStr ? text.indexOf(nextMarkerStr) : text.length;
      const section = text.slice(startIdx + marker.length, endIdx).trim();
      const lines = section.split('\n').filter((l) => l.trim());

      const hashtagLine = lines.find((l) => l.includes('#')) || '';
      const hashtags = hashtagLine.match(/#\w+/g) || ['#Solana', '#DeFi'];
      const message = lines.filter((l) => !l.startsWith('#')).join(' ').trim();

      posts.push({ tone, message: message || this.getFallbackPost(tone, request).message, hashtags });
    }

    return posts;
  }

  /**
   * Fallback response when API unavailable
   */
  private getFallbackResponse(request: HypeRequest): HypeResponse {
    return {
      posts: [
        this.getFallbackPost('bullish', request),
        this.getFallbackPost('professional', request),
        this.getFallbackPost('degen', request),
      ],
      generatedAt: Date.now(),
    };
  }

  /**
   * Fallback post for a specific tone
   */
  private getFallbackPost(tone: HypeTone, request: HypeRequest): HypeContent {
    const messages: Record<HypeTone, string> = {
      bullish: `$${request.ticker} just launched! ${request.lockDays} day LP lock. LFG! 🚀🔥`,
      professional: `$${request.ticker} launched with ${request.lockDays}-day LP lock via VECTERAI Safe-Standard.`,
      degen: `APE SZN! $${request.ticker} is live. ${request.lockDays} day lock. WAGMI 🦍`,
    };
    return { tone, message: messages[tone], hashtags: ['#Solana', '#VECTERAI'] };
  }
}

let hypeManInstance: HypeManAgent | null = null;

export function getHypeManAgent(): HypeManAgent {
  if (!hypeManInstance) {
    hypeManInstance = new HypeManAgent();
  }
  return hypeManInstance;
}
