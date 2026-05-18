import { OpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cost per 1M tokens for gpt-4o-mini
const PRICING = {
  input: 0.150, // $0.150 per 1M input tokens
  output: 0.600, // $0.600 per 1M output tokens
};

export async function run(prompt) {
  const startTime = Date.now();
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    const duration = Date.now() - startTime;
    const usage = response.usage;
    
    // Calculate cost in dollars
    const cost = (usage.prompt_tokens / 1_000_000) * PRICING.input + 
                 (usage.completion_tokens / 1_000_000) * PRICING.output;

    return {
      text: response.choices[0].message.content,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      },
      duration,
      cost
    };
  } catch (error) {
    throw new Error(`OpenAI Error: ${error.message}`);
  }
}
