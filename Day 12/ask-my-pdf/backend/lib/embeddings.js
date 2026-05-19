import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy",
});

// Helper function to call embedContent with 429 quota retry logic
async function embedContentWithRetry(batch, retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: batch,
      });
      return response;
    } catch (error) {
      const errStatus = error.status;
      const errMsg = error.message || "";
      const isRateLimit = errStatus === 429 || errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('exhausted');
      
      if (isRateLimit && i < retries - 1) {
        let waitTime = delay;
        // Parse wait time from error message like "Please retry in 22.95s."
        const match = errMsg.match(/retry in ([\d.]+)s/i);
        if (match && match[1]) {
          waitTime = Math.ceil(parseFloat(match[1]) * 1000) + 1500; // Add 1.5s buffer
        }
        console.warn(`[Quota Exceeded] Embedding rate limit hit. Waiting ${waitTime / 1000} seconds before retrying batch (attempt ${i + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
}

export async function getEmbeddings(texts) {
  if (!texts || !texts.length) return [];
  
  const embeddings = [];
  const batchSize = 30; // Using smaller batch size to avoid hitting token limits per request
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    try {
      const response = await embedContentWithRetry(batch);
      const batchEmbeds = response.embeddings?.map(e => e.values) || [];
      embeddings.push(...batchEmbeds);
    } catch (e) {
      console.error("Embedding generation failed after retries:", e);
      // Fallback with empty arrays if the batch failed completely
      embeddings.push(...Array(batch.length).fill([]));
    }
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return embeddings;
}

export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
