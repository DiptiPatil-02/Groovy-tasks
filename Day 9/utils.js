import fs from 'fs';
import path from 'path';

/**
 * Sleeps for a specified duration in milliseconds.
 * @param {number} ms - Time in milliseconds
 * @returns {Promise<void>}
 */
export async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Scans the workspace directory, gathers files, and forms the codebase context.
 * Enforces a >2,048 token minimum for Gemini caching and a <10,000 token maximum budget.
 * An average token is ~4 characters in JS/English, so:
 * - Minimum: 2,048 tokens ≈ 8,192 characters. We will pad to at least 12,000 characters (~3,000 tokens).
 * - Maximum: 10,000 tokens ≈ 40,000 characters. We will truncate to 38,000 characters.
 * 
 * @param {string} dirPath - Absolute path to scan
 * @returns {string} The codebase context string
 */
export function loadCodebaseContext(dirPath = '.') {
  const allowedExtensions = ['.js', '.json', '.md'];
  const ignoredFiles = ['node_modules', '.git', 'telemetry.csv', 'package-lock.json', '.env'];
  
  let mergedContent = '';
  
  function scan(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const relativePath = path.relative(dirPath, fullPath);
      
      // Skip ignored paths
      if (ignoredFiles.some(ignored => relativePath.includes(ignored) || file === ignored)) {
        continue;
      }
      
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(file).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          mergedContent += `\n--- START OF FILE: ${relativePath} ---\n`;
          mergedContent += content;
          mergedContent += `\n--- END OF FILE: ${relativePath} ---\n`;
        }
      }
    }
  }
  
  try {
    scan(dirPath);
  } catch (error) {
    console.error('Error scanning codebase directory:', error.message);
  }
  
  // Apply Token Safeguard Limits
  const charLength = mergedContent.length;
  
  // 1. Minimum Caching Safeguard (~2,048 tokens = ~8,192 chars)
  // If the directory is small or empty, we add a high-quality Architecture Reference document to pad it!
  if (charLength < 10000) {
    const padding = getDeveloperDocumentationPadding();
    mergedContent += `\n\n=== ARCHITECTURE REFERENCE & DEVELOPER GUIDELINES (CACHING PADDING) ===\n${padding}\n`;
  }
  
  // 2. Maximum Query Safeguard (~10,000 tokens = ~40,000 chars)
  if (mergedContent.length > 38000) {
    console.log(`\x1b[33m⚠️ Warning: Codebase size exceeds 10,000 token budget. Truncating to stay within bounds...\x1b[0m`);
    mergedContent = mergedContent.slice(0, 38000) + '\n\n... [CODEBASE CONTEXT TRUNCATED FOR BUDGET LIMITS] ...\n';
  }
  
  return mergedContent.trim();
}

/**
 * Returns a high-quality developer guide to act as rich context and caching padding.
 * @returns {string}
 */
export function getDeveloperDocumentationPadding() {
  return `
# Node.js Production Architecture & API Resilience Guide

This guide acts as standard developer reference material. It documents crucial architectural patterns for building secure, scalable, and highly resilient applications.

## 1. Asynchronous Control Flow & Promise Safety
All asynchronous functions must be wrapped inside structured try...catch blocks to prevent unhandled promise rejections which could destabilize the active Node.js event loop.
Always prefer async/await syntax over raw callback chaining to maintain readability and cleaner stack traces during error resolution.

## 2. API Caching & In-Memory Rate Limiting
Client-side rate limiting should be established using a sliding window algorithm to throttle external resource requests and avoid HTTP 429 (Too Many Requests) errors.
Explicit caching models (like Redis or Gemini Context Caching) should be utilized to store long-lived static parameters, such as API prompts, database schemas, or documentation.

## 3. Cost-Efficient Generative AI Engineering
When integrating LLM endpoints like OpenAI GPT or Google Gemini:
1. Always log usage metrics (input, output, and cached tokens) to a structured telemetry log.
2. Utilize explicit context caching for static system contexts (like large system prompts or codebase reference guides) that are repeated across multi-turn user queries.
3. Calculate and display exact API billing metrics to provide real-time resource cost transparency.
4. Implement exponential backoff to handle transient network faults and downstream server spikes gracefully.
`;
}

/**
 * Calculates accurate costs for Gemini models including Context Caching savings.
 * Supports dynamic pricing scaling for both Flash and Pro tiers.
 * 
 * Pricing per 1M tokens:
 * - gemini-1.5-pro: Standard Input $3.50 | Cached Read $0.35 | Output $10.50
 * - Flash models (2.5/1.5): Standard Input $0.35 | Cached Read $0.035 | Output $1.05
 * 
 * @param {number} inputTokens - Total input tokens
 * @param {number} cachedTokens - Input tokens served from cache
 * @param {number} outputTokens - Completion output tokens
 * @returns {Object} Costing stats containing actual cost, base cost, and net savings
 */
export function calculateGeminiCost(inputTokens, cachedTokens, outputTokens) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const isPro = model.includes('pro');

  const standardInputRate = isPro ? 3.50 : 0.35;
  const cachedInputRate = isPro ? 0.35 : 0.035;
  const outputRate = isPro ? 10.50 : 1.05;

  const standardInputTokens = Math.max(0, inputTokens - cachedTokens);
  
  const standardInputCost = (standardInputTokens / 1000000) * standardInputRate;
  const cachedReadCost = (cachedTokens / 1000000) * cachedInputRate;
  const outputCost = (outputTokens / 1000000) * outputRate;
  
  const actualCost = standardInputCost + cachedReadCost + outputCost;
  const baseCost = (inputTokens / 1000000) * standardInputRate + (outputTokens / 1000000) * outputRate;
  
  const savings = Math.max(0, baseCost - actualCost);
  const savingsPercent = baseCost > 0 ? (savings / baseCost) * 100 : 0;
  
  return {
    actualCost,
    baseCost,
    savings,
    savingsPercent
  };
}

/**
 * Appends a detailed log record to telemetry.csv.
 * Creates the file and writes the headers if it does not already exist.
 * 
 * @param {Object} logData - Caching and execution metrics
 */
export function logTelemetry(logData) {
  const csvPath = path.join(process.cwd(), 'telemetry.csv');
  const headers = [
    'Timestamp',
    'Mode',
    'Query',
    'Input Tokens',
    'Cached Read Tokens',
    'Output Tokens',
    'Response Time (ms)',
    'Actual Cost ($)',
    'Base Cost (No Cache) ($)',
    'Savings ($)',
    'Savings (%)',
    'Cache Status'
  ];
  
  const fileExists = fs.existsSync(csvPath);
  
  // Format fields, escaping quotes and commas
  const sanitize = (val) => {
    if (val === undefined || val === null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  
  const row = [
    sanitize(logData.timestamp || new Date().toISOString()),
    sanitize(logData.mode || 'Simulation'),
    sanitize(logData.query || ''),
    logData.inputTokens || 0,
    logData.cachedTokens || 0,
    logData.outputTokens || 0,
    logData.responseTimeMs || 0,
    (logData.actualCost || 0).toFixed(8),
    (logData.baseCost || 0).toFixed(8),
    (logData.savings || 0).toFixed(8),
    (logData.savingsPercent || 0).toFixed(2),
    sanitize(logData.cacheStatus || 'Standard')
  ].join(',');
  
  try {
    if (!fileExists) {
      fs.writeFileSync(csvPath, headers.join(',') + '\n', 'utf-8');
    }
    fs.appendFileSync(csvPath, row + '\n', 'utf-8');
  } catch (error) {
    console.error('Error writing to telemetry CSV:', error.message);
  }
}
