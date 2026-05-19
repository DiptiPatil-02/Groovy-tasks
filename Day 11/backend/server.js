const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const { Anthropic } = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const VectorStore = require('./vectorStore');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend communications
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Multer in-memory storage configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB file limit
});

// In-memory document storage representing the currently active PDF context
let activeDocument = null;

// Initialize the active local Vector Database
const activeVectorStore = new VectorStore();

/**
 * Custom page-by-page parser helper using pdf-parse.
 */
async function parsePdfPageByPage(dataBuffer) {
  const pages = [];

  function customPageRenderer(pageData) {
    return pageData.getTextContent({ normalizeWhitespace: true })
      .then(function (textContent) {
        let lastY;
        let text = '';

        for (let item of textContent.items) {
          if (item && typeof item.str === 'string') {
            if (item.transform && item.transform[5] !== undefined) {
              if (lastY === undefined || lastY === item.transform[5]) {
                text += item.str;
              } else {
                text += '\n' + item.str;
              }
              lastY = item.transform[5];
            } else {
              text += item.str + ' ';
            }
          }
        }

        pages.push({
          page: pageData.pageIndex + 1,
          text: text.trim()
        });

        return text;
      });
  }

  const parseResult = await pdf(dataBuffer, {
    pagerender: customPageRenderer
  });

  pages.sort((a, b) => a.page - b.page);

  return {
    info: parseResult.info,
    metadata: parseResult.metadata,
    numPages: parseResult.numpages,
    pages: pages
  };
}

/**
 * Citation extraction helper.
 * Parses response text for page numbers.
 */
function extractCitations(text) {
  if (!text) return [];

  const regex = /[Pp]age[s]?\s*(\d+)/g;
  const citations = new Set();
  let match;

  while ((match = regex.exec(text)) !== null) {
    citations.add(`page ${match[1]}`);
  }

  return Array.from(citations).sort((a, b) => {
    const numA = parseInt(a.replace('page ', ''));
    const numB = parseInt(b.replace('page ', ''));
    return numA - numB;
  });
}

/**
 * Cost calculation helper based on Claude 3.5 Sonnet pricing:
 * Input: $3.00/1M tokens, Output: $15.00/1M tokens
 */
function calculateSonnetCost(inputTokens, outputTokens) {
  const INPUT_COST_RATE = 3.00 / 1000000;
  const OUTPUT_COST_RATE = 15.00 / 1000000;
  return Number(((inputTokens * INPUT_COST_RATE) + (outputTokens * OUTPUT_COST_RATE)).toFixed(6));
}

/**
 * Cost calculation helper based on Google Gemini 2.5 Flash pricing:
 * Input: $0.075/1M tokens, Output: $0.30/1M tokens
 */
function calculateGeminiCost(inputTokens, outputTokens) {
  const INPUT_COST_RATE = 0.075 / 1000000;
  const OUTPUT_COST_RATE = 0.30 / 1000000;
  return Number(((inputTokens * INPUT_COST_RATE) + (outputTokens * OUTPUT_COST_RATE)).toFixed(6));
}

/**
 * Generates a mock vector of 768 floats as a fallback mechanism.
 * Uses a deterministic hash based on text content so that similarity works.
 */
function generateMockVector(text) {
  const vec = [];
  const dim = 3072;
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  for (let i = 0; i < dim; i++) {
    const seed = Math.sin(hash + i) * 10000;
    vec.push(seed - Math.floor(seed));
  }
  return vec;
}

// ==========================================
// API Endpoints
// ==========================================

/**
 * POST /upload
 * Receives PDF file, parses it page-by-page, chunks it, embeds them, and saves to local Vector Store.
 */
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please upload a PDF file.' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Unsupported file type. Please upload a valid PDF file.' });
    }

    console.log(`Received file: ${req.file.originalname} (${req.file.size} bytes). Parsing...`);

    // 1. Parse text page-by-page
    const parsedData = await parsePdfPageByPage(req.file.buffer);

    // Save full document info to in-memory activeDocument
    activeDocument = {
      fileName: req.file.originalname,
      fileSize: req.file.size,
      pages: parsedData.pages,
      totalPageCount: parsedData.numPages
    };

    console.log(`Successfully parsed ${parsedData.numPages} pages.`);

    // 2. Perform page-aware chunking
    const chunks = VectorStore.chunkDocument(parsedData.pages);
    console.log(`Document split into ${chunks.length} overlapping chunks. Generating embeddings...`);

    // Wipe previous chunks from vector store database
    await activeVectorStore.clear();

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const hasGemini = geminiApiKey && geminiApiKey.trim() !== '' && geminiApiKey.trim() !== 'your_gemini_api_key_here';

    // 3. Generate embedding vectors in parallel batches (10 at a time) for speed and safety
    if (hasGemini) {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });

      const batchSize = 10;
      console.log(`Generating embeddings in parallel batches of ${batchSize} to maximize speed...`);

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const promises = batch.map(async (chunk, index) => {
          const chunkIndex = i + index;
          try {
            const embedResult = await embedModel.embedContent(chunk.text);
            return {
              text: chunk.text,
              page: chunk.page,
              vector: embedResult.embedding.values
            };
          } catch (err) {
            console.error(`Failed to generate embedding for chunk ${chunkIndex}:`, err.message);
            const mockVec = generateMockVector(chunk.text);
            return {
              text: chunk.text,
              page: chunk.page,
              vector: mockVec
            };
          }
        });

        const results = await Promise.all(promises);
        for (const res of results) {
          await activeVectorStore.addChunk(res);
        }
        console.log(`Processed embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);
      }
    } else {
      console.log('No active Gemini key found for embeddings. Falling back to mock vectors...');
      // Fallback: Generate mock vectors for local demonstration
      for (const chunk of chunks) {
        const mockVec = generateMockVector(chunk.text);
        await activeVectorStore.addChunk({
          text: chunk.text,
          page: chunk.page,
          vector: mockVec
        });
      }
    }

    // Persist chunks and vectors to local vector_store.json file
    const dbPath = path.join(__dirname, 'vector_store.json');
    activeVectorStore.save(dbPath);
    console.log(`Successfully indexed and persisted ${activeVectorStore.chunks.length} chunks inside vector_store.json.`);

    const activeProvider = hasGemini ? 'Gemini 2.5 Flash' : 'Claude 3.5 Sonnet';

    res.json({
      message: 'PDF uploaded, chunked, and embedded successfully!',
      fileName: req.file.originalname,
      totalPageCount: parsedData.numPages,
      provider: activeProvider,
      chunkCount: activeVectorStore.chunks.length,
      pages: parsedData.pages.map(p => ({
        page: p.page,
        charCount: p.text.length
      }))
    });

  } catch (error) {
    console.error('Error during PDF parsing and indexing:', error);
    res.status(500).json({ error: 'Failed to process document: ' + error.message });
  }
});

/**
 * POST /ask
 * Dynamic RAG endpoint: embeds question, queries top 3 matches, answers using retrieved chunks,
 * and reports both RAG costs and Full-Doc comparative telemetry.
 */
app.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || question.trim() === '') {
      return res.status(400).json({ error: 'Question is required.' });
    }

    if (!activeDocument || activeVectorStore.chunks.length === 0) {
      return res.status(400).json({ error: 'No active document vector context has been loaded yet.' });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    const hasGemini = geminiApiKey && geminiApiKey.trim() !== '' && geminiApiKey.trim() !== 'your_gemini_api_key_here';
    const hasAnthropic = anthropicApiKey && anthropicApiKey.trim() !== '' && anthropicApiKey.trim() !== 'your_anthropic_api_key_here';

    if (!hasGemini && !hasAnthropic) {
      return res.status(500).json({
        error: 'No active AI API key found. Please configure either GEMINI_API_KEY or ANTHROPIC_API_KEY in backend/.env'
      });
    }

    console.log(`RAG Query: "${question}" on document: "${activeDocument.fileName}"`);

    // 1. Generate an embedding vector for the question
    let questionVector;
    if (hasGemini) {
      try {
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
        const embedResult = await embedModel.embedContent(question);
        questionVector = embedResult.embedding.values;
      } catch (err) {
        console.error('Failed to embed question, using mock vector fallback:', err.message);
        questionVector = generateMockVector(question);
      }
    } else {
      questionVector = generateMockVector(question);
    }

    // 2. Query the Local Vector Database to retrieve top 3 closest chunks via cosine similarity search
    const topMatches = await activeVectorStore.search(questionVector, 3);
    console.log(`Retrieved top ${topMatches.length} matching chunks:`, topMatches.map(m => `Page ${m.page} (${(m.similarity*100).toFixed(1)}%)`));

    // 3. Stitch only these top 3 retrieved chunks into the context prompt
    const ragContext = topMatches
      .map((match, idx) => `[Retrieved Chunk #${idx+1} | Source Page: ${match.page} | Similarity: ${(match.similarity*100).toFixed(1)}%]:\n${match.text}`)
      .join('\n\n');

    const systemPrompt = `You are a RAG (Retrieval-Augmented Generation) document Q&A assistant.
Answer the user's question ONLY using the provided retrieved context snippets.
Always cite the source page numbers explicitly in your answer.
If the retrieved context does not contain the answer, say "Not found in retrieved context".`;

    const userContent = `Retrieved Document Chunks:
${ragContext}

Question:
${question}`;

    let answerText = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let costEstimate = 0.0;
    let providerName = '';

    // 4. Send context-constrained prompt to selected LLM
    if (hasGemini) {
      providerName = 'Gemini 2.5 Flash';
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: systemPrompt,
      });

      const result = await model.generateContent(userContent);
      const response = await result.response;
      answerText = response.text();

      const usage = response.usageMetadata;
      inputTokens = usage ? usage.promptTokenCount : 0;
      outputTokens = usage ? usage.candidatesTokenCount : 0;
      costEstimate = calculateGeminiCost(inputTokens, outputTokens);

    } else {
      providerName = 'Claude 3.5 Sonnet';
      const anthropic = new Anthropic({ apiKey: anthropicApiKey });

      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }]
      });

      answerText = response.content[0].text;
      inputTokens = response.usage.input_tokens;
      outputTokens = response.usage.output_tokens;
      costEstimate = calculateSonnetCost(inputTokens, outputTokens);
    }

    // 5. CALCULATE COMPARATIVE DUAL TELEMETRY: Full-Doc vs. RAG Cost Savings
    // Compile full document text length to calculate Full-Doc prompt footprint
    const fullDocContext = activeDocument.pages
      .map(p => `--- Page ${p.page} ---\n${p.text}`)
      .join('\n\n');
    
    const fullDocPromptLength = systemPrompt.length + fullDocContext.length + question.length;
    
    // Convert character length to estimated tokens (standard ratio: 1 token ≈ 4 characters)
    const fullDocTokensEstimate = Math.ceil(fullDocPromptLength / 4.0);

    // Compute cost estimate if we had sent the entire document context
    let fullDocCostEstimate = 0.0;
    if (hasGemini) {
      fullDocCostEstimate = calculateGeminiCost(fullDocTokensEstimate, outputTokens);
    } else {
      fullDocCostEstimate = calculateSonnetCost(fullDocTokensEstimate, outputTokens);
    }

    // Compute actual percentage savings
    // Safely fallback to 0 if fullDocCostEstimate is 0
    const savingsPercentage = fullDocCostEstimate > 0 
      ? Number((((fullDocCostEstimate - costEstimate) / fullDocCostEstimate) * 100).toFixed(2))
      : 0.0;

    // Parse citations
    const citations = extractCitations(answerText);

    console.log(`RAG Response generated successfully. RAG Cost: $${costEstimate} | Full-Doc Cost: $${fullDocCostEstimate} (Savings: ${savingsPercentage}%)`);

    // Return RAG upgrade response payload
    res.json({
      answer: answerText,
      citations: citations,
      provider: providerName,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_estimate: costEstimate
      },
      rag: {
        retrievedChunks: topMatches.map(m => ({
          text: m.text,
          page: m.page,
          similarity: Number(m.similarity.toFixed(4))
        })),
        fullDocCostEstimate: Number(fullDocCostEstimate.toFixed(6)),
        fullDocTokensEstimate: fullDocTokensEstimate,
        savingsPercentage: savingsPercentage
      }
    });

  } catch (error) {
    console.error('Error during Q&A processing:', error);
    res.status(500).json({ error: 'Failed to process question: ' + error.message });
  }
});

// Start listening
app.listen(PORT, async () => {
  console.log(`RAG-powered Q&A Backend listening at http://localhost:${PORT}`);
  // Load existing database backup at startup if it exists
  try {
    const dbPath = path.join(__dirname, 'vector_store.json');
    await activeVectorStore.load(dbPath);
  } catch (err) {
    console.error("Failed to load initial vector store backup:", err.message);
  }
});
