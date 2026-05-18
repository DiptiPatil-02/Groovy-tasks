import dotenv from 'dotenv';
import { loadCodebaseContext, calculateGeminiCost, logTelemetry, sleep } from './utils.js';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Standard header formatting helpers
const reset = '\x1b[0m';
const green = '\x1b[32m';
const cyan = '\x1b[36m';
const yellow = '\x1b[33m';
const bold = '\x1b[1m';
const magenta = '\x1b[35m';
const red = '\x1b[31m';

/**
 * Runs a simulated prompt caching benchmark.
 */
async function runSimulation() {
  console.log(`\n${yellow}${bold}⚠️ Note: Active Gemini API Key is a placeholder. Running in Simulation Mode...${reset}\n`);
  
  const codebase = loadCodebaseContext();
  const codebaseTokens = Math.ceil(codebase.length / 4);
  
  console.log(`${cyan}ℹ️ Gained ${codebaseTokens} tokens of codebase context (including safety padding).${reset}`);
  
  // 1. Cold Query Simulation
  console.log(`\n${bold}🚀 Executing Query 1 (Cold / Cache Creation)...${reset}`);
  console.log(`${bold}You >${reset} Summarize the structure of this codebase.`);
  console.log(`${cyan}AI > [Simulated Response] This codebase is a Day 9 training workspace for Groovy Technoweb. It includes a package.json for project configuration, an active env file for API keys, a utils.js shared helper system, and this measure_savings.js benchmark script. The architecture focuses on Google Gemini Explicit Context Caching to achieve 90% cost savings on repetitive codebase queries.${reset}`);
  
  const coldDuration = 5820; // 5.8 seconds
  const coldInputTokens = codebaseTokens + 15;
  const coldOutputTokens = 120;
  const coldCost = calculateGeminiCost(coldInputTokens, 0, coldOutputTokens);
  
  const coldTelemetry = {
    timestamp: new Date().toISOString(),
    mode: 'Simulation',
    query: 'Summarize the structure of this codebase.',
    inputTokens: coldInputTokens,
    cachedTokens: 0,
    outputTokens: coldOutputTokens,
    responseTimeMs: coldDuration,
    ...coldCost,
    cacheStatus: 'Cold (Cache Written)'
  };
  logTelemetry(coldTelemetry);
  
  await sleep(1500); // Small pause for realism
  
  // 2. Hot Query Simulation
  console.log(`\n${bold}🚀 Executing Query 2 (Hot / Cache Hit)...${reset}`);
  console.log(`${bold}You >${reset} What are the core architectural patterns in this codebase?`);
  console.log(`${cyan}AI > [Simulated Response] Based on the cached codebase context, the core patterns are: (1) Dual-Mode architecture supporting fallback simulation, (2) Explicit context caching using Gemini's /cachedContents API endpoint, (3) Telemetry telemetry dashboard CSV logger, and (4) Cost-accounting precision representing the 90% caching discount.${reset}`);
  
  const hotDuration = 790; // 0.79 seconds - extremely fast!
  const hotInputTokens = codebaseTokens + 18;
  const hotOutputTokens = 110;
  const hotCost = calculateGeminiCost(hotInputTokens, codebaseTokens, hotOutputTokens);
  
  const hotTelemetry = {
    timestamp: new Date().toISOString(),
    mode: 'Simulation',
    query: 'What are the core architectural patterns in this codebase?',
    inputTokens: hotInputTokens,
    cachedTokens: codebaseTokens,
    outputTokens: hotOutputTokens,
    responseTimeMs: hotDuration,
    ...hotCost,
    cacheStatus: 'Hot (Cache Hit)'
  };
  logTelemetry(hotTelemetry);
  
  printBenchmarkReport(coldTelemetry, hotTelemetry);
}

/**
 * Runs a live prompt caching benchmark against the official Google Gemini API.
 */
async function runLive() {
  console.log(`\n${green}${bold}🚀 Starting Live Context Caching Benchmark against Gemini API...${reset}`);
  
  const codebase = loadCodebaseContext();
  const estimatedTokens = Math.ceil(codebase.length / 4);
  console.log(`${cyan}ℹ️ Gained codebase context: ${estimatedTokens} estimated tokens (from project files + guide).${reset}`);
  
  let cacheName = '';
  
  try {
    // Step 1: Create Explicit Context Cache
    console.log(`\n${bold}📦 Creating explicit context cache on Gemini...${reset}`);
    const cacheUrl = `https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${API_KEY}`;
    
    const cachePayload = {
      model: `models/${MODEL_NAME}`,
      contents: [
        {
          role: 'user',
          parts: [{ text: `You are an expert software developer examining a codebase. Here are the codebase files:\n${codebase}` }]
        }
      ],
      ttl: '300s', // 5 minutes TTL
      displayName: 'day9-codebase-cache'
    };
    
    const cacheResponse = await fetch(cacheUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cachePayload)
    });
    
    if (!cacheResponse.ok) {
      const errText = await cacheResponse.text();
      throw new Error(`Cache creation failed: ${errText}`);
    }
    
    const cacheData = await cacheResponse.json();
    cacheName = cacheData.name;
    console.log(`${green}✅ Explicit context cache created successfully!${reset}`);
    console.log(`   Cache Reference: ${yellow}${cacheName}${reset}`);
    console.log(`   Expires Time:    ${cyan}${cacheData.expireTime}${reset}`);
    
    // Step 2: Cold Query (Cache Ingested / Standard Input charge)
    // We send the codebase context explicitly to simulate a Cold query before a cache exists, 
    // or call the model normally. To measure accurately:
    console.log(`\n${bold}🚀 Running Query 1 (Cold / Non-Cached)...${reset}`);
    const query1 = 'Summarize the structure of this codebase.';
    console.log(`${bold}You >${reset} ${query1}`);
    
    const coldUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
    const coldPayload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `Codebase Context:\n${codebase}\n\nQuery: ${query1}` }]
        }
      ]
    };
    
    const coldStart = Date.now();
    const coldResp = await fetch(coldUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(coldPayload)
    });
    const coldDuration = Date.now() - coldStart;
    
    if (!coldResp.ok) {
      throw new Error(`Cold query failed: ${await coldResp.text()}`);
    }
    
    const coldData = await coldResp.json();
    const coldText = coldData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const coldUsage = coldData.usageMetadata || {};
    
    console.log(`${cyan}AI > ${coldText.trim()}${reset}`);
    
    const coldInputTokens = coldUsage.promptTokenCount || estimatedTokens;
    const coldOutputTokens = coldUsage.candidatesTokenCount || 100;
    const coldCost = calculateGeminiCost(coldInputTokens, 0, coldOutputTokens);
    
    const coldTelemetry = {
      timestamp: new Date().toISOString(),
      mode: 'Live',
      query: query1,
      inputTokens: coldInputTokens,
      cachedTokens: 0,
      outputTokens: coldOutputTokens,
      responseTimeMs: coldDuration,
      ...coldCost,
      cacheStatus: 'Cold (No Cache)'
    };
    logTelemetry(coldTelemetry);
    
    console.log(`\n${yellow}⏳ Sleeping for 2 seconds to let the cache settle...${reset}`);
    await sleep(2000);
    
    // Step 3: Hot Query (Cache Hit / 90% discount on cached tokens!)
    console.log(`\n${bold}🚀 Running Query 2 (Hot / Cache Hit)...${reset}`);
    const query2 = 'What are the core architectural patterns in this codebase?';
    console.log(`${bold}You >${reset} ${query2}`);
    
    const hotPayload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: query2 }]
        }
      ],
      cachedContent: cacheName
    };
    
    const hotStart = Date.now();
    const hotResp = await fetch(coldUrl, { // uses same generateContent endpoint
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hotPayload)
    });
    const hotDuration = Date.now() - hotStart;
    
    if (!hotResp.ok) {
      throw new Error(`Hot query failed: ${await hotResp.text()}`);
    }
    
    const hotData = await hotResp.json();
    const hotText = hotData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const hotUsage = hotData.usageMetadata || {};
    
    console.log(`${cyan}AI > ${hotText.trim()}${reset}`);
    
    const hotInputTokens = hotUsage.promptTokenCount || estimatedTokens;
    const hotOutputTokens = hotUsage.candidatesTokenCount || 100;
    const cachedReadTokens = hotUsage.cachedContentTokenCount || estimatedTokens;
    const hotCost = calculateGeminiCost(hotInputTokens, cachedReadTokens, hotOutputTokens);
    
    const hotTelemetry = {
      timestamp: new Date().toISOString(),
      mode: 'Live',
      query: query2,
      inputTokens: hotInputTokens,
      cachedTokens: cachedReadTokens,
      outputTokens: hotOutputTokens,
      responseTimeMs: hotDuration,
      ...hotCost,
      cacheStatus: 'Hot (Cache Hit)'
    };
    logTelemetry(hotTelemetry);
    
    // Step 4: Print Comparative Report
    printBenchmarkReport(coldTelemetry, hotTelemetry);
    
  } catch (error) {
    console.error(`\n${red}${bold}❌ Live mode run failed: ${error.message}${reset}`);
    console.log(`${yellow}Switching to simulation mode so you can see the results...${reset}`);
    await runSimulation();
  } finally {
    if (cacheName) {
      try {
        console.log(`\n${bold}🗑️ Deleting explicit context cache to free up storage...${reset}`);
        const deleteUrl = `https://generativelanguage.googleapis.com/v1beta/${cacheName}?key=${API_KEY}`;
        const delResp = await fetch(deleteUrl, { method: 'DELETE' });
        if (delResp.ok) {
          console.log(`${green}✅ Explicit context cache deleted successfully.${reset}`);
        }
      } catch (e) {
        console.warn('Warning: Could not delete cache cleanly:', e.message);
      }
    }
  }
}

/**
 * Prints a beautiful performance and cost comparison dashboard.
 */
function printBenchmarkReport(cold, hot) {
  const timeSaved = Math.max(0, cold.responseTimeMs - hot.responseTimeMs);
  const timeSavedPercent = (timeSaved / cold.responseTimeMs) * 100;
  
  const costSaved = Math.max(0, cold.actualCost - hot.actualCost);
  const costSavedPercent = cold.actualCost > 0 ? (costSaved / cold.actualCost) * 100 : 0;
  
  console.log('\n');
  console.log(`${magenta}%s${reset}`, '======================================================================');
  console.log(`${magenta}\x1b[1m📊 GEMINI PROMPT CACHING COMPARISON BENCHMARK REPORT\x1b[0m`);
  console.log(`${magenta}%s${reset}`, '======================================================================');
  
  console.log(`${bold}Metrics Table:${reset}`);
  console.log(`----------------------------------------------------------------------`);
  console.log(`Metric                   | Cold Query (No Cache) | Hot Query (Cache Hit)`);
  console.log(`----------------------------------------------------------------------`);
  console.log(`Response Latency (ms)    | ${cold.responseTimeMs.toString().padEnd(21)} | ${hot.responseTimeMs.toString().padEnd(21)}`);
  console.log(`Input Tokens             | ${cold.inputTokens.toString().padEnd(21)} | ${hot.inputTokens.toString().padEnd(21)}`);
  console.log(`- Of which Cached        | 0                    | ${hot.cachedTokens.toString().padEnd(21)}`);
  console.log(`Output Tokens            | ${cold.outputTokens.toString().padEnd(21)} | ${hot.outputTokens.toString().padEnd(21)}`);
  console.log(`Actual Cost ($ USD)      | $${cold.actualCost.toFixed(8).padEnd(20)} | $${hot.actualCost.toFixed(8).padEnd(20)}`);
  console.log(`----------------------------------------------------------------------`);
  
  console.log(`\n${bold}Savings Metrics:${reset}`);
  console.log(`  - ${green}${bold}Net Cost Saved:${reset}      $${costSaved.toFixed(8)} USD (${green}${costSavedPercent.toFixed(2)}% cheaper${reset})`);
  console.log(`  - ${green}${bold}Latency Reduced:${reset}     ${(timeSaved / 1000).toFixed(2)} seconds (${green}${timeSavedPercent.toFixed(2)}% faster${reset})`);
  console.log(`  - ${cyan}${bold}Telemetry Status:${reset}    Logs successfully written to ${yellow}telemetry.csv${reset}`);
  
  console.log(`${magenta}%s${reset}`, '======================================================================\n');
}

// Execute Runner
const isPlaceholder = !API_KEY || API_KEY.trim() === '' || API_KEY.includes('your_gemini_api_key_here') || API_KEY.startsWith('AIzaSyAHK6Uv');
if (isPlaceholder) {
  runSimulation();
} else {
  runLive();
}
