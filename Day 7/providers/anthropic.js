import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Cost per 1M tokens for claude-3-haiku-20240307
const PRICING = {
  input: 0.25, // $0.25 per 1M input tokens
  output: 1.25, // $1.25 per 1M output tokens
};

export async function run(prompt) {
  const startTime = Date.now();
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const duration = Date.now() - startTime;
    const usage = response.usage;
    
    const promptTokens = usage.input_tokens || 0;
    const completionTokens = usage.output_tokens || 0;
    const totalTokens = promptTokens + completionTokens;

    // Calculate cost in dollars
    const cost = (promptTokens / 1_000_000) * PRICING.input + 
                 (completionTokens / 1_000_000) * PRICING.output;

    return {
      text: response.content[0].text,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens
      },
      duration,
      cost
    };
  } catch (error) {
    throw new Error(`Anthropic Error: ${error.message}`);
  }
}
