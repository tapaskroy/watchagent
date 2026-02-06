const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function testKey() {
  console.log('Testing Anthropic API Key...\n');

  const modelsToTry = [
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
    'claude-2.1',
    'claude-2.0',
    'claude-instant-1.2',
  ];

  for (const model of modelsToTry) {
    try {
      console.log(`Trying ${model}...`);
      const response = await anthropic.messages.create({
        model: model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      console.log(`✅ ${model} WORKS!\n`);
      return model; // Return the first working model
    } catch (error) {
      console.log(`❌ ${model} failed: ${error.message}\n`);
    }
  }

  console.log('\n⚠️  No working models found. Your API key may not have access to Claude models.');
  console.log('Please check: https://console.anthropic.com/');
}

testKey();
