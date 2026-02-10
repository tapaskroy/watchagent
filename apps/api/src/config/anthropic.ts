import Anthropic from '@anthropic-ai/sdk';
import { env } from './env';
import { RECOMMENDATION_CONFIG } from '@watchagent/shared';

// Create Anthropic client
export const anthropic = new Anthropic({
  apiKey: env.externalApis.anthropicApiKey,
});

// Helper function to call Claude API
export async function callClaude(prompt: string, maxTokens: number = 4000) {
  console.log('\n========== RECOMMENDATION GENERATION - PROMPT TO CLAUDE ==========');
  console.log('Model:', RECOMMENDATION_CONFIG.LLM_MODEL);
  console.log('Max Tokens:', maxTokens);
  console.log('\nFULL PROMPT:');
  console.log(prompt);
  console.log('\nPROMPT LENGTH:', prompt.length, 'characters');
  console.log('===================================================================\n');

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

  const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

  console.log('\n========== RECOMMENDATION GENERATION - RESPONSE FROM CLAUDE ==========');
  console.log('Stop Reason:', response.stop_reason);
  console.log('Usage:', JSON.stringify(response.usage, null, 2));
  console.log('\nFULL RESPONSE:');
  console.log(responseText);
  console.log('\nRESPONSE LENGTH:', responseText.length, 'characters');
  console.log('======================================================================\n');

  return responseText;
}
