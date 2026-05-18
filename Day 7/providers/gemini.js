import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Cost per 1M tokens for gemini-1.5-flash (for prompts up to 128k)
const PRICING = {
  input: 0.075, // $0.075 per 1M input tokens
  output: 0.300, // $0.30 per 1M output tokens
};

export async function run(prompt) {
  const startTime = Date.now();
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    const duration = Date.now() - startTime;
    const usage = response.usageMetadata;
    
    // Calculate cost in dollars
    const promptTokens = usage?.promptTokenCount || 0;
    const completionTokens = usage?.candidatesTokenCount || 0;
    const totalTokens = usage?.totalTokenCount || 0;

    const cost = (promptTokens / 1_000_000) * PRICING.input + 
                 (completionTokens / 1_000_000) * PRICING.output;

    return {
      text: response.text(),
      usage: {
        promptTokens,
        completionTokens,
        totalTokens
      },
      duration,
      cost
    };
  } catch (error) {
    throw new Error(`Gemini Error: ${error.message}`);
  }
}
