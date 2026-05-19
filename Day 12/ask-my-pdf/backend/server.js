import express from 'express';
import cors from 'cors';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { documentStore } from './lib/store.js';
import { fixedSizeChunking, slidingWindowChunking, semanticChunking, hierarchicalChunking } from './lib/chunking.js';
import { getEmbeddings, cosineSimilarity } from './lib/embeddings.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Configure Multer for in-memory file uploads
const upload = multer({ storage: multer.memoryStorage() });

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy",
});

// PDF processing endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const pdfBuffer = req.file.buffer;
    const pdfData = await pdfParse(pdfBuffer);
    const text = pdfData.text;

    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Could not extract text from PDF' });
    }

    // Apply the 4 chunking strategies
    const fixedChunks = fixedSizeChunking(text);
    const slidingChunks = slidingWindowChunking(text);
    const semanticChunks = semanticChunking(text);
    const hierarchicalChunks = hierarchicalChunking(text);

    // Fetch embeddings for all chunks in parallel
    const [fixedEmbeddings, slidingEmbeddings, semanticEmbeddings, hierarchicalEmbeddings] = await Promise.all([
      getEmbeddings(fixedChunks.map(c => c.text)),
      getEmbeddings(slidingChunks.map(c => c.text)),
      getEmbeddings(semanticChunks.map(c => c.text)),
      getEmbeddings(hierarchicalChunks.map(c => c.text)),
    ]);

    const docId = Date.now().toString();

    documentStore.set(docId, {
      id: docId,
      filename: req.file.originalname,
      strategies: {
        fixed: { chunks: fixedChunks, embeddings: fixedEmbeddings },
        sliding: { chunks: slidingChunks, embeddings: slidingEmbeddings },
        semantic: { chunks: semanticChunks, embeddings: semanticEmbeddings },
        hierarchical: { chunks: hierarchicalChunks, embeddings: hierarchicalEmbeddings },
      }
    });

    res.json({
      success: true,
      docId,
      stats: {
        fixed: fixedChunks.length,
        sliding: slidingChunks.length,
        semantic: semanticChunks.length,
        hierarchical: hierarchicalChunks.length
      }
    });

  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: error.message || 'Error processing PDF' });
  }
});

// Helper: extract the suggested retryDelay (in ms) from a Gemini API error
function getRetryDelayMs(error, defaultDelay) {
  try {
    const parsed = typeof error.message === 'string' ? JSON.parse(error.message) : null;
    const retryInfo = parsed?.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
    if (retryInfo?.retryDelay) {
      // retryDelay is like "12s" or "12.3s"
      const seconds = parseFloat(retryInfo.retryDelay);
      if (!isNaN(seconds)) return Math.ceil(seconds * 1000) + 500; // add 500ms buffer
    }
  } catch (_) { /* ignore parse errors */ }
  return defaultDelay;
}

// Helper function to query Gemini with retry logic that respects the API's suggested retry delay
async function generateContentWithRetry(prompt, retries = 3, defaultDelay = 15000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response;
    } catch (error) {
      const errStatus = error.status;
      const errMsg = error.message || '';
      const isTransient = errStatus === 503 || errStatus === 429 ||
        errMsg.includes('503') || errMsg.includes('429') ||
        errMsg.toLowerCase().includes('unavailable') ||
        errMsg.toLowerCase().includes('resource_exhausted');

      if (isTransient && i < retries - 1) {
        const waitMs = getRetryDelayMs(error, defaultDelay * (i + 1));
        console.warn(`Gemini generation failed (attempt ${i + 1}/${retries}). Retrying in ${waitMs}ms...`, errMsg);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }
      throw error;
    }
  }
}

// Query endpoint
app.post('/api/query', async (req, res) => {
  try {
    const { docId, question } = req.body;

    if (!docId || !question) {
      return res.status(400).json({ error: 'Missing docId or question' });
    }

    const doc = documentStore.get(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Embed the user's question
    const [questionEmbedding] = await getEmbeddings([question]);
    if (!questionEmbedding || questionEmbedding.length === 0) {
      return res.status(500).json({ error: 'Failed to embed question' });
    }

    // Helper to fetch top 3 matching chunks
    const getTopChunks = (strategyName) => {
      const data = doc.strategies[strategyName];
      const scores = data.chunks.map((chunk, idx) => ({
        chunk,
        score: cosineSimilarity(questionEmbedding, data.embeddings[idx])
      }));
      scores.sort((a, b) => b.score - a.score);
      return scores.slice(0, 2);
    };

    const strategies = ['fixed', 'sliding', 'semantic', 'hierarchical'];

    // Run all 4 strategy queries in parallel for maximum speed
    const settled = await Promise.allSettled(
      strategies.map(async (strategy) => {
        const topChunks = getTopChunks(strategy);
        const contextText = topChunks.map(c => c.chunk.text).join('\n\n---\n\n');
        const prompt = `Answer the question using only the context below. If the answer is not in the context, say "I cannot answer this based on the provided document."\n\nContext:\n${contextText}\n\nQuestion: ${question}\n\nAnswer:`;

        const response = await generateContentWithRetry(prompt);
        if (!response || !response.text) throw new Error('Empty response from Gemini model');
        return { strategy, answer: response.text, chunks: topChunks };
      })
    );

    const results = {};
    settled.forEach((result, i) => {
      const strategy = strategies[i];
      if (result.status === 'fulfilled') {
        results[strategy] = { answer: result.value.answer, chunks: result.value.chunks };
      } else {
        console.error(`Gemini Generation Error (${strategy}):`, result.reason);
        results[strategy] = { answer: `Error generating response: ${result.reason?.message}`, chunks: getTopChunks(strategy) };
      }
    });

    res.json({ results });

  } catch (error) {
    console.error('Query Error:', error);
    res.status(500).json({ error: error.message || 'Error processing query' });
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
