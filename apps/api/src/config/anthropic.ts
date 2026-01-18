import Anthropic from '@anthropic-ai/sdk';
import { env } from './env';
import { RECOMMENDATION_CONFIG } from '@watchagent/shared';

// Create Anthropic client
export const anthropic = new Anthropic({
  apiKey: env.externalApis.anthropicApiKey,
});

// Helper function to call Claude API
export async function callClaude(prompt: string, maxTokens: number = 4000) {
  const response = await anthropic.messages.create({
    model: RECOMMENDATION_CONFIG.LLM_MODEL,
    max_tokens: maxTokens,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}
