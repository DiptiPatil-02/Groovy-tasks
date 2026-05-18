const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdf = require('pdf-parse');
const { Anthropic } = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

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

/**
 * Custom page-by-page parser helper using pdf-parse.
 * Intercepts text items page-by-page and extracts them.
 */
async function parsePdfPageByPage(dataBuffer) {
  const pages = [];

  // Custom page rendering function called by pdf-parse for each page
  function customPageRenderer(pageData) {
    return pageData.getTextContent({ normalizeWhitespace: true })
      .then(function (textContent) {
        let lastY;
        let text = '';

        for (let item of textContent.items) {
          if (item && typeof item.str === 'string') {
            // Basic coordinate checking to capture line breaks
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

        // Push to pages list
        pages.push({
          page: pageData.pageIndex + 1,
          text: text.trim()
        });

        return text;
      });
  }

  // Execute pdf-parse
  const parseResult = await pdf(dataBuffer, {
    pagerender: customPageRenderer
  });

  // Sort pages to ensure proper page order (pageIndex is 0-based, we use 1-based page)
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
 * Parses model's response for references to "page X" or "pages X, Y" and structures them.
 */
function extractCitations(text) {
  if (!text) return [];

  // Match instances like "page 1", "page 3", "Page 2", "pages 5"
  const regex = /[Pp]age[s]?\s*(\d+)/g;
  const citations = new Set();
  let match;

  while ((match = regex.exec(text)) !== null) {
    citations.add(`page ${match[1]}`);
  }

  // Sort citations numerically
  return Array.from(citations).sort((a, b) => {
    const numA = parseInt(a.replace('page ', ''));
    const numB = parseInt(b.replace('page ', ''));
    return numA - numB;
  });
}

/**
 * Cost calculation helper based on Claude 3.5 Sonnet pricing:
 * Input: $3.00 per Million tokens ($0.000003 per token)
 * Output: $15.00 per Million tokens ($0.000015 per token)
 */
function calculateSonnetCost(inputTokens, outputTokens) {
  const INPUT_COST_RATE = 3.00 / 1000000;
  const OUTPUT_COST_RATE = 15.00 / 1000000;

  const inputCost = inputTokens * INPUT_COST_RATE;
  const outputCost = outputTokens * OUTPUT_COST_RATE;

  return Number((inputCost + outputCost).toFixed(6));
}

/**
 * Cost calculation helper based on Google Gemini 1.5 Pro pricing:
 * Input: $1.25 per Million tokens ($0.00000125 per token)
 * Output: $5.00 per Million tokens ($0.000005 per token)
 */
function calculateGeminiCost(inputTokens, outputTokens) {
  const INPUT_COST_RATE = 1.25 / 1000000;
  const OUTPUT_COST_RATE = 5.00 / 1000000;

  const inputCost = inputTokens * INPUT_COST_RATE;
  const outputCost = outputTokens * OUTPUT_COST_RATE;

  return Number((inputCost + outputCost).toFixed(6));
}

// ==========================================
// API Endpoints
// ==========================================

/**
 * POST /upload
 * Receives PDF file, parses page-by-page, and stores it in memory.
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

    // Parse the PDF page-by-page
    const parsedData = await parsePdfPageByPage(req.file.buffer);

    // Save parsed data to backend global memory variable
    activeDocument = {
      fileName: req.file.originalname,
      fileSize: req.file.size,
      pages: parsedData.pages,
      totalPageCount: parsedData.numPages
    };

    console.log(`Successfully parsed ${parsedData.numPages} pages for "${req.file.originalname}".`);

    // Detect which API key is actively configured in the backend environment
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const activeProvider = (geminiApiKey && geminiApiKey !== 'AIzaSyCd35nUHbgyNaW1RWuCheuq_saMrOaM4qk') ? 'Gemini 1.5 Flash' : 'Claude 3.5 Sonnet';

    res.json({
      message: 'PDF uploaded and parsed successfully!',
      fileName: req.file.originalname,
      totalPageCount: parsedData.numPages,
      provider: activeProvider,
      // Send sample page length to UI to verify layout
      pages: parsedData.pages.map(p => ({
        page: p.page,
        charCount: p.text.length
      }))
    });

  } catch (error) {
    console.error('Error during PDF parsing:', error);
    res.status(500).json({ error: 'Failed to parse PDF document: ' + error.message });
  }
});

/**
 * POST /ask
 * Answers questions about the uploaded PDF using either Gemini 1.5 Flash or Anthropic's Claude.
 */
app.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || question.trim() === '') {
      return res.status(400).json({ error: 'Question is required.' });
    }

    if (!activeDocument) {
      return res.status(400).json({ error: 'No PDF document has been uploaded yet. Please upload a document first.' });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    const hasGemini = geminiApiKey && geminiApiKey !== 'your_gemini_api_key_here';
    const hasAnthropic = anthropicApiKey && anthropicApiKey !== 'your_anthropic_api_key_here';

    if (!hasGemini && !hasAnthropic) {
      return res.status(500).json({
        error: 'No active AI API key found. Please configure either GEMINI_API_KEY or ANTHROPIC_API_KEY in backend/.env'
      });
    }

    console.log(`Processing question: "${question}" on document: "${activeDocument.fileName}"`);

    // Format all page-wise extracted text into standard structured prompt
    const documentContext = activeDocument.pages
      .map(p => `--- Page ${p.page} ---\n${p.text}`)
      .join('\n\n');

    // System prompt instructions
    const systemPrompt = `You are a document Q&A assistant.
Answer ONLY using provided document context.
Always include page numbers in answers.
If answer is not in document, say "Not found in document".`;

    const userContent = `Document:
${documentContext}

Question:
${question}`;

    let answerText = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let costEstimate = 0.0;
    let providerName = '';

    // Route dynamically based on configured credentials
    if (hasGemini) {
      console.log('Using Google Gemini 1.5 Pro for document reasoning...');
      providerName = 'Gemini 1.5 Pro';

      const genAI = new GoogleGenerativeAI(geminiApiKey);

      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: systemPrompt,
      });

      const result = await model.generateContent(userContent);
      const response = await result.response;
      answerText = response.text();

      // Extract token usage
      const usage = response.usageMetadata;
      inputTokens = usage ? usage.promptTokenCount : 0;
      outputTokens = usage ? usage.candidatesTokenCount : 0;
      costEstimate = calculateGeminiCost(inputTokens, outputTokens);

    } else {
      console.log('Using Anthropic Claude 3.5 Sonnet for document reasoning...');
      providerName = 'Claude 3.5 Sonnet';

      // Initialize Anthropic client
      const anthropic = new Anthropic({ apiKey: anthropicApiKey });

      // Call Anthropic Messages API
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userContent
          }
        ]
      });

      // Extract tokens and content
      answerText = response.content[0].text;
      inputTokens = response.usage.input_tokens;
      outputTokens = response.usage.output_tokens;
      costEstimate = calculateSonnetCost(inputTokens, outputTokens);
    }

    // Parse citations and build response payload
    const citations = extractCitations(answerText);
    console.log(`Response generated via ${providerName}. Tokens used: Input=${inputTokens}, Output=${outputTokens}. Cost: $${costEstimate}`);

    // Return the response following the exact requested JSON format
    res.json({
      answer: answerText,
      citations: citations,
      provider: providerName,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_estimate: costEstimate
      }
    });

  } catch (error) {
    console.error('Error during Q&A processing:', error);
    res.status(500).json({ error: 'Failed to process question: ' + error.message });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`Smart Doc Q&A Backend listening at http://localhost:${PORT}`);
});
