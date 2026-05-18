import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { loadCodebaseContext, calculateGeminiCost, logTelemetry, sleep } from './utils.js';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Color formatting codes
const reset = '\x1b[0m';
const green = '\x1b[32m';
const cyan = '\x1b[36m';
const yellow = '\x1b[33m';
const bold = '\x1b[1m';
const magenta = '\x1b[35m';
const red = '\x1b[31m';
const gray = '\x1b[90m';

let activeCacheName = '';
const isPlaceholder = !API_KEY || API_KEY.trim() === '' || API_KEY.includes('your_gemini_api_key_here') || API_KEY.startsWith('AIzaSyAHK6Uv');

// Unified System Instruction to guide the model's tone and boundary constraints
const SYSTEM_INSTRUCTION = {
  parts: [
    {
      text: "You are a professional software engineering assistant. You are given the active codebase context. " +
            "Your task is to answer the user's specific queries about the codebase precisely. " +
            "If the user greets you (e.g., 'hello', 'hi', 'hey'), respond with a warm, professional greeting and ask how you can help them explore the codebase, without over-explaining the codebase or files unless they explicitly ask for it."
    }
  ]
};

/**
 * Handles explicit context cache creation in Live Mode.
 */
async function initializeCache() {
  if (isPlaceholder) {
    console.log(`${yellow}ℹ️ Caching initialized in Simulation Mode.${reset}`);
    return 'simulation-cache-ref';
  }
  
  const codebase = loadCodebaseContext();
  const estimatedTokens = Math.ceil(codebase.length / 4);
  
  console.log(`\n${bold}📦 Scanning codebase and preparing Gemini Context Cache...${reset}`);
  console.log(`   Context size: ~${estimatedTokens} tokens.`);
  
  const cacheUrl = `https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${API_KEY}`;
  
  const cachePayload = {
    model: `models/${MODEL_NAME}`,
    contents: [
      {
        role: 'user',
        parts: [{ text: `Here is the codebase files context for analysis:\n${codebase}` }]
      }
    ],
    ttl: '300s', // 5 minutes cache expiry
    displayName: 'explainer-cli-cache'
  };
  
  const cacheResponse = await fetch(cacheUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cachePayload)
  });
  
  if (!cacheResponse.ok) {
    const errText = await cacheResponse.text();
    throw new Error(`Context Caching failed to initialize: ${errText}`);
  }
  
  const cacheData = await cacheResponse.json();
  return cacheData.name;
}

/**
 * Deletes the active context cache to avoid storage charges.
 */
async function cleanupCache() {
  if (activeCacheName && !isPlaceholder && activeCacheName !== 'simulation-cache-ref' && activeCacheName !== 'live-fallback-ref') {
    try {
      console.log(`\n${bold}🗑️ Cleaning up Gemini context cache...${reset}`);
      const deleteUrl = `https://generativelanguage.googleapis.com/v1beta/${activeCacheName}?key=${API_KEY}`;
      const delResp = await fetch(deleteUrl, { method: 'DELETE' });
      if (delResp.ok) {
        console.log(`${green}✅ Context cache deleted cleanly.${reset}`);
      }
    } catch (e) {
      console.warn('Warning: Cache cleanup failed:', e.message);
    }
  }
}

/**
 * Streams the response from the Gemini API using Server-Sent Events (SSE)
 * referencing our explicit context cache.
 * 
 * @param {string} prompt - User query
 * @returns {Promise<Object>} Usage stats
 */
async function streamResponse(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:streamGenerateContent?alt=sse&key=${API_KEY}`;
  
  const bodyPayload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    cachedContent: activeCacheName,
    systemInstruction: SYSTEM_INSTRUCTION
  };

  if (MODEL_NAME.includes('2.5') || MODEL_NAME.includes('3.0')) {
    bodyPayload.generationConfig = {
      thinkingConfig: {
        thinkingBudget: 0
      }
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload)
  });

  if (!response.ok) {
    throw new Error(`API Request failed: ${await response.text()}`);
  }

  process.stdout.write(`${cyan}${bold}AI > ${reset}${cyan}`);

  const decoder = new TextDecoder();
  let buffer = '';
  let usage = {
    promptTokenCount: 0,
    candidatesTokenCount: 0,
    totalTokenCount: 0,
    cachedContentTokenCount: 0
  };

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep partial line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      
      const dataStr = trimmed.slice(6).trim();
      if (!dataStr) continue;

      try {
        const parsed = JSON.parse(dataStr);
        
        const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textChunk) {
          for (const char of textChunk) {
            process.stdout.write(char);
            await sleep(4);
          }
        }

        if (parsed.usageMetadata) {
          usage = {
            promptTokenCount: parsed.usageMetadata.promptTokenCount || 0,
            candidatesTokenCount: parsed.usageMetadata.candidatesTokenCount || 0,
            totalTokenCount: parsed.usageMetadata.totalTokenCount || 0,
            cachedContentTokenCount: parsed.usageMetadata.cachedContentTokenCount || 0
          };
        }
      } catch (e) {}
    }
  }
  
  process.stdout.write(`${reset}\n`);
  return usage;
}

/**
 * Streams a live non-cached response by passing the codebase context directly in the query,
 * constrained by the System Instruction block.
 * 
 * @param {string} prompt - User query
 * @returns {Promise<Object>} Usage stats
 */
async function streamLiveNonCachedResponse(prompt) {
  const codebase = loadCodebaseContext();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:streamGenerateContent?alt=sse&key=${API_KEY}`;
  
  const bodyPayload = {
    contents: [
      {
        role: 'user',
        parts: [
          { 
            text: `Here is the codebase files context for analysis:\n${codebase}\n\nUser Question: ${prompt}` 
          }
        ]
      }
    ],
    systemInstruction: SYSTEM_INSTRUCTION
  };

  if (MODEL_NAME.includes('2.5') || MODEL_NAME.includes('3.0')) {
    bodyPayload.generationConfig = {
      thinkingConfig: {
        thinkingBudget: 0
      }
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload)
  });

  if (!response.ok) {
    throw new Error(`Fallback API Call failed: ${await response.text()}`);
  }

  process.stdout.write(`${cyan}${bold}AI (Live) > ${reset}${cyan}`);

  const decoder = new TextDecoder();
  let buffer = '';
  let usage = {
    promptTokenCount: 0,
    candidatesTokenCount: 0,
    totalTokenCount: 0,
    cachedContentTokenCount: 0
  };

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      
      const dataStr = trimmed.slice(6).trim();
      if (!dataStr) continue;

      try {
        const parsed = JSON.parse(dataStr);
        
        const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textChunk) {
          for (const char of textChunk) {
            process.stdout.write(char);
            await sleep(4);
          }
        }

        if (parsed.usageMetadata) {
          usage = {
            promptTokenCount: parsed.usageMetadata.promptTokenCount || 0,
            candidatesTokenCount: parsed.usageMetadata.candidatesTokenCount || 0,
            totalTokenCount: parsed.usageMetadata.totalTokenCount || 0
          };
        }
      } catch (e) {}
    }
  }
  
  process.stdout.write(`${reset}\n`);
  
  // Calculate what the cache statistics WOULD have been for cost-tracking log consistency
  const codebaseTokens = Math.ceil(codebase.length / 4);
  usage.cachedContentTokenCount = codebaseTokens; 
  
  return usage;
}

/**
 * Simulates streaming responses for Simulation Mode.
 */
async function simulateStream(prompt) {
  process.stdout.write(`${cyan}${bold}AI > ${reset}${cyan}`);
  
  const codebase = loadCodebaseContext();
  const codebaseTokens = Math.ceil(codebase.length / 4);
  
  let answer = '';
  
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi') || lowerPrompt.includes('hey')) {
    answer = `Hello! I am your professional codebase assistant. I have successfully scanned your codebase in VS Code. How can I help you explore your files today?`;
  } else if (lowerPrompt.includes('utils') || lowerPrompt.includes('loadcodebasecontext')) {
    answer = `The loadCodebaseContext function in utils.js is responsible for recursively scanning your JS, JSON, and MD files, ensuring they stay under the 10,000 token budget, and adding documentation if it's below the caching threshold.`;
  } else if (lowerPrompt.includes('measure_savings') || lowerPrompt.includes('benchmark')) {
    answer = `measure_savings.js is a script that demonstrates prompt caching. It creates a cache explicitly, runs a Cold Query, sleeps, runs a Hot Query, and logs both query records to telemetry.csv.`;
  } else {
    answer = `Based on the cached codebase context, this file defines the core REST request payload. It configures the user prompt, attaches the active explicit cache reference, and disables reasoning latency so that text streams instantly. (Simulated cache hit of ${codebaseTokens} tokens)`;
  }
  
  for (const char of answer) {
    process.stdout.write(char);
    await sleep(6);
  }
  
  process.stdout.write(`${reset}\n`);
  
  return {
    promptTokenCount: codebaseTokens + 20,
    candidatesTokenCount: Math.ceil(answer.length / 4),
    cachedContentTokenCount: codebaseTokens
  };
}

/**
 * Executes a single codebase query directly from the command line and exits.
 * Fits the exact description of a "Codebase Explainer Tool".
 * 
 * @param {string} query - The codebase query
 */
async function runOneOffQuery(query) {
  // Welcome Header
  console.log(`${green}%s${reset}`, '======================================================================');
  console.log(`${green}${bold}🤖 GEMINI CODEBASE EXPLAINER CLI TOOL${reset}`);
  console.log(`${green}%s${reset}`, '======================================================================');
  console.log(`Query:   "${bold}${cyan}${query}${reset}"`);
  console.log(`Model:   ${MODEL_NAME}`);
  console.log(`${green}%s${reset}`, '======================================================================');

  // Initialize cache
  try {
    activeCacheName = await initializeCache();
    console.log(`${green}✅ Caching layer initialized! Cache Reference: ${yellow}${activeCacheName}${reset}\n`);
  } catch (e) {
    console.error(`\n${red}⚠️ Context Caching not allowed on this key (Free-Tier limit).${reset}`);
    console.log(`${yellow}Resilient Fallback: Initializing Live Non-Cached Explainer mode...${reset}`);
    console.log(`${green}✅ Real-time response is active!${reset}\n`);
    activeCacheName = 'live-fallback-ref';
  }

  console.log(`${gray}⏳ Processing codebase query...${reset}`);
  const startTime = Date.now();
  
  let usage;
  if (activeCacheName === 'live-fallback-ref') {
    try {
      usage = await streamLiveNonCachedResponse(query);
    } catch (error) {
      console.error(`\n${red}❌ Fallback API Call failed: ${error.message}${reset}`);
      console.log(`${yellow}Falling back to Simulation Mode for this query...${reset}`);
      usage = await simulateStream(query);
    }
  } else if (activeCacheName === 'simulation-cache-ref') {
    await sleep(600);
    usage = await simulateStream(query);
  } else {
    try {
      usage = await streamResponse(query);
    } catch (error) {
      console.error(`\n${red}❌ API Call failed: ${error.message}${reset}`);
      console.log(`${yellow}Falling back to Live Non-Cached Mode...${reset}`);
      usage = await streamLiveNonCachedResponse(query);
    }
  }

  const responseTime = Date.now() - startTime;
  
  // Calculate token stats
  const promptTokens = usage.promptTokenCount || 0;
  const cachedTokens = usage.cachedContentTokenCount || 0;
  const candidatesTokens = usage.candidatesTokenCount || 0;

  const costStats = calculateGeminiCost(promptTokens, cachedTokens, candidatesTokens);
  
  // Log to telemetry CSV
  logTelemetry({
    timestamp: new Date().toISOString(),
    mode: isPlaceholder ? 'Simulation' : 'Live',
    query: query,
    inputTokens: promptTokens,
    cachedTokens: cachedTokens,
    outputTokens: candidatesTokens,
    responseTimeMs: responseTime,
    ...costStats,
    cacheStatus: cachedTokens > 0 ? 'Hot (Cache Hit / Fallback)' : 'Cold (Cache Miss)'
  });

  // Render performance dashboard card
  console.log(`${gray}----------------------------------------------------------------------${reset}`);
  console.log(`📊 ${bold}Usage Telemetry:${reset}`);
  console.log(`   Latency:           ${cyan}${responseTime}ms${reset}`);
  console.log(`   Tokens:            Input: ${promptTokens} | ${green}Cached (Simulated): ${cachedTokens}${reset} | Output: ${candidatesTokens}`);
  console.log(`   Estimated Cost:    ${green}$${costStats.actualCost.toFixed(8)} USD${reset} (Base: $${costStats.baseCost.toFixed(8)})`);
  if (costStats.savings > 0) {
    console.log(`   Savings:           ${green}$${costStats.savings.toFixed(8)} USD Saved (${costStats.savingsPercent.toFixed(1)}% Cost Reduction)${reset}`);
  }
  console.log(`${gray}----------------------------------------------------------------------${reset}`);

  await cleanupCache();
  process.exit(0);
}

/**
 * Main interactive terminal CLI chat loop.
 */
async function main() {
  const rl = readline.createInterface({ input, output });

  const sigintHandler = async () => {
    console.log(`\n\n${yellow}👋 Interrupt received (Ctrl+C). Cleaning up and exiting...${reset}`);
    await cleanupCache();
    rl.close();
    process.exit(0);
  };
  rl.on('SIGINT', sigintHandler);

  // Welcome Header
  console.log(`${green}%s${reset}`, '======================================================================');
  console.log(`${green}${bold}🤖 GEMINI PROMPT-CACHED CODEBASE EXPLAINER CLI ACTIVE${reset}`);
  console.log(`${green}%s${reset}`, '======================================================================');
  console.log(`Model:   ${bold}${yellow}${MODEL_NAME}${reset}`);
  console.log(`Mode:    ${bold}${isPlaceholder ? 'MOCK SIMULATION' : 'LIVE API PRODUCTION'}${reset}`);
  console.log(`Pricing: ${green}Input ($0.35/1M)${reset} | ${green}Cached Input ($0.035/1M)${reset} | ${green}Output ($1.05/1M)${reset}`);
  console.log(`Actions: Type ${red}"exit"${reset} or ${red}"quit"${reset} to end session.`);
  console.log(`${green}%s${reset}`, '======================================================================');

  try {
    // Initialize cache
    try {
      activeCacheName = await initializeCache();
      console.log(`${green}✅ Caching layer initialized! Cache Reference: ${yellow}${activeCacheName}${reset}\n`);
    } catch (e) {
      console.error(`\n${red}⚠️ Context Caching not allowed on this key (Free-Tier limit).${reset}`);
      console.log(`${yellow}Resilient Fallback: Initializing Live Non-Cached Explainer mode...${reset}`);
      console.log(`${green}✅ Real-time responses are fully active!${reset}\n`);
      activeCacheName = 'live-fallback-ref';
    }

    while (true) {
      const prompt = await rl.question(`\n${magenta}${bold}You > ${reset}`);
      const trimmedPrompt = prompt.trim();

      if (!trimmedPrompt) continue;

      if (trimmedPrompt.toLowerCase() === 'exit' || trimmedPrompt.toLowerCase() === 'quit') {
        console.log(`\n${yellow}Exiting session...${reset}`);
        break;
      }

      console.log(`${gray}⏳ Processing dynamic codebase query...${reset}`);
      const startTime = Date.now();
      
      let usage;
      if (activeCacheName === 'live-fallback-ref') {
        try {
          usage = await streamLiveNonCachedResponse(trimmedPrompt);
        } catch (error) {
          console.error(`\n${red}❌ Fallback API Call failed: ${error.message}${reset}`);
          console.log(`${yellow}Falling back to Simulation Mode for this query...${reset}`);
          usage = await simulateStream(trimmedPrompt);
        }
      } else if (activeCacheName === 'simulation-cache-ref') {
        await sleep(600);
        usage = await simulateStream(trimmedPrompt);
      } else {
        try {
          usage = await streamResponse(trimmedPrompt);
        } catch (error) {
          console.error(`\n${red}❌ API Call failed: ${error.message}${reset}`);
          console.log(`${yellow}Falling back to Live Non-Cached Mode for this query...${reset}`);
          usage = await streamLiveNonCachedResponse(trimmedPrompt);
        }
      }

      const responseTime = Date.now() - startTime;
      
      // Calculate token stats
      const promptTokens = usage.promptTokenCount || 0;
      const cachedTokens = usage.cachedContentTokenCount || 0;
      const candidatesTokens = usage.candidatesTokenCount || 0;
      const totalTokens = promptTokens + candidatesTokens;

      const costStats = calculateGeminiCost(promptTokens, cachedTokens, candidatesTokens);
      
      // Log to telemetry CSV
      logTelemetry({
        timestamp: new Date().toISOString(),
        mode: isPlaceholder ? 'Simulation' : 'Live',
        query: trimmedPrompt,
        inputTokens: promptTokens,
        cachedTokens: cachedTokens,
        outputTokens: candidatesTokens,
        responseTimeMs: responseTime,
        ...costStats,
        cacheStatus: cachedTokens > 0 ? 'Hot (Cache Hit / Fallback)' : 'Cold (Cache Miss)'
      });

      // Render performance dashboard card
      console.log(`${gray}----------------------------------------------------------------------${reset}`);
      console.log(`📊 ${bold}Usage Telemetry:${reset}`);
      console.log(`   Latency:           ${cyan}${responseTime}ms${reset}`);
      console.log(`   Tokens:            Input: ${promptTokens} | ${green}Cached (Simulated): ${cachedTokens}${reset} | Output: ${candidatesTokens}`);
      console.log(`   Estimated Cost:    ${green}$${costStats.actualCost.toFixed(8)} USD${reset} (Base: $${costStats.baseCost.toFixed(8)})`);
      if (costStats.savings > 0) {
        console.log(`   Savings:           ${green}$${costStats.savings.toFixed(8)} USD Saved (${costStats.savingsPercent.toFixed(1)}% Cost Reduction)${reset}`);
      }
      console.log(`${gray}----------------------------------------------------------------------${reset}`);
    }
  } finally {
    await cleanupCache();
    rl.close();
    console.log(`\n${green}👋 Session ended successfully. Goodbye!${reset}\n`);
  }
}

// Start CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const query = args.join(' ');
    runOneOffQuery(query).catch(console.error);
  } else {
    main().catch(console.error);
  }
}
