import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
dotenv.config();

/**
 * Sleeps for a specified amount of time.
 * @param {number} ms - Time in milliseconds
 * @returns {Promise<void>}
 */
export async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential backoff wrapper that retries a function on failure.
 * Retries up to 3 times for retryable errors (network, 429 rate limit, 5xx server).
 * Delay pattern: 1s -> 2s -> 4s.
 * 
 * @param {Function} fn - Async function to execute
 * @param {number} retries - Maximum number of retries
 * @param {number} initialDelay - Initial delay in ms
 * @returns {Promise<any>}
 */
export async function withRetry(fn, retries = 3, initialDelay = 1000) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;

      // Check for retryable conditions
      const isRateLimit = error.status === 429 || /429/.test(error.message);
      const isServerError = (error.status >= 500 && error.status < 600) || /5\d{2}/.test(error.message);
      const isNetworkError =
        error.message?.includes('fetch failed') ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNRESET';

      const isRetryable = isRateLimit || isServerError || isNetworkError;

      if (isRetryable && attempt <= retries) {
        const delay = initialDelay * Math.pow(2, attempt - 1); // 1s -> 2s -> 4s
        console.warn(`\n\x1b[33m⚠️ API Error: ${error.message || error}. Retrying in ${delay / 1000}s... (Attempt ${attempt}/${retries})\x1b[0m`);
        await sleep(delay);
      } else {
        // Not retryable or retry limit exceeded
        throw error;
      }
    }
  }
}

/**
 * Streams the response from the Gemini API live to the terminal.
 * Wraps execution inside the exponential backoff retry handler.
 * 
 * @param {string} prompt - User prompt
 * @returns {Promise<Object>} The final token usage metadata
 */
export async function streamResponse(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;

  return await withRetry(async () => {
    // Dynamically build the POST request payload
    const bodyPayload = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    };

    // If using a reasoning/thinking model (like Gemini 2.5 or 3.0), we disable the reasoning lag
    // by setting thinkingBudget to 0. This forces the model to respond and stream its final answer
    // instantly and gradually from the very first second (just like ChatGPT), rather than waiting
    // in silence for 10+ seconds of reasoning steps!
    if (modelName.includes('2.5') || modelName.includes('3.0')) {
      bodyPayload.generationConfig = {
        thinkingConfig: {
          thinkingBudget: 0
        }
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      let errJson;
      try {
        errJson = JSON.parse(errText);
      } catch (e) {}
      const status = response.status;
      const msg = errJson?.error?.message || errText || response.statusText;
      const err = new Error(msg);
      err.status = status;
      throw err;
    }

    // Print assistant prefix in cyan bold
    process.stdout.write('\x1b[36m\x1b[1mAI > \x1b[0m\x1b[36m');

    const decoder = new TextDecoder();
    let buffer = '';
    let usage = {
      promptTokenCount: 0,
      candidatesTokenCount: 0,
      totalTokenCount: 0
    };

    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep the last partial line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        
        const dataStr = trimmed.slice(6).trim();
        if (!dataStr) continue;

        try {
          const parsed = JSON.parse(dataStr);
          
          // Stream the text chunk live with a premium, gradual character-by-character "typing" effect
          const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textChunk) {
            for (const char of textChunk) {
              process.stdout.write(char);
              // Adding a tiny 4ms delay per character makes the streaming look incredibly smooth and organic
              await sleep(4);
            }
          }

          // Capture the usage stats
          if (parsed.usageMetadata) {
            usage = {
              promptTokenCount: parsed.usageMetadata.promptTokenCount || 0,
              candidatesTokenCount: parsed.usageMetadata.candidatesTokenCount || 0,
              totalTokenCount: parsed.usageMetadata.totalTokenCount || 0,
              thoughtsTokenCount: parsed.usageMetadata.thoughtsTokenCount || 0
            };
          }
        } catch (e) {
          // Ignore json parse errors for split lines
        }
      }
    }

    // Handle any leftover text in the buffer if it is a complete data line
    if (buffer) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith('data: ')) {
        const dataStr = trimmed.slice(6).trim();
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
              thoughtsTokenCount: parsed.usageMetadata.thoughtsTokenCount || 0
            };
          }
        } catch (e) {}
      }
    }

    // Reset styling and print trailing newline
    process.stdout.write('\x1b[0m\n');

    return usage;
  });
}

/**
 * Main application CLI loop that continuously asks the user for inputs
 * and streams responses while showing token metadata and estimated cost.
 */
async function main() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key_here')) {
    console.error('\n\x1b[31m\x1b[1m❌ Setup Error: GEMINI_API_KEY is not defined.\x1b[0m');
    console.error('Please configure your API key in a \x1b[1m.env\x1b[0m file inside the project directory:');
    console.error('  \x1b[90mGEMINI_API_KEY=your_actual_api_key\x1b[0m\n');
    process.exit(1);
  }

  // Create standard readline interface with promise support
  const rl = readline.createInterface({ input, output });

  // Graceful SIGINT (Ctrl+C) handling
  const sigintHandler = () => {
    console.log('\n\x1b[33m👋 Session terminated (Ctrl+C). Goodbye!\x1b[0m\n');
    rl.close();
    process.exit(0);
  };
  rl.on('SIGINT', sigintHandler);

  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  // Welcome Header
  console.log('\x1b[32m%s\x1b[0m', '==================================================');
  console.log('\x1b[32m\x1b[1m🤖 Gemini Production-Grade CLI Chatbot Active\x1b[0m');
  console.log('\x1b[32m%s\x1b[0m', '==================================================');
  console.log(`Model:   \x1b[1m\x1b[33m${modelName}\x1b[0m`);
  console.log('Pricing: \x1b[32mInput ($0.35/1M)\x1b[0m | \x1b[32mOutput ($1.05/1M)\x1b[0m');
  console.log('Actions: Type \x1b[31m"exit"\x1b[0m or \x1b[31m"quit"\x1b[0m to terminate the session.');
  console.log('\x1b[32m%s\x1b[0m', '==================================================\n');

  try {
    while (true) {
      try {
        // Ask prompt in magenta bold
        const prompt = await rl.question('\x1b[35m\x1b[1mYou > \x1b[0m');

        const trimmedPrompt = prompt.trim();

        if (!trimmedPrompt) {
          continue;
        }

        if (trimmedPrompt.toLowerCase() === 'exit' || trimmedPrompt.toLowerCase() === 'quit') {
          console.log('\n\x1b[33m👋 Goodbye! Exiting session...\x1b[0m\n');
          break;
        }

        // Live streaming and token statistics retrieval
        const usage = await streamResponse(trimmedPrompt);

        // Retrieve dynamic token values
        const promptTokens = usage.promptTokenCount || 0;
        const candidatesTokens = usage.candidatesTokenCount || 0;
        const thoughtsTokens = usage.thoughtsTokenCount || 0;
        const totalTokens = usage.totalTokenCount || (promptTokens + candidatesTokens + thoughtsTokens);

        // Perform Gemini Flash costing calculations (incorporating thinking/reasoning output tokens)
        const promptCost = (promptTokens / 1000000) * 0.35;
        const billedOutputTokens = candidatesTokens + thoughtsTokens;
        const completionCost = (billedOutputTokens / 1000000) * 1.05;
        const totalCost = promptCost + completionCost;

        // Print clean bottom status bar
        console.log('\x1b[90m--------------------------------------------------\x1b[0m');
        console.log(`📊 \x1b[1mUsage Statistics\x1b[0m:`);
        console.log(`  - \x1b[36mPrompt Tokens:\x1b[0m      ${promptTokens}`);
        if (thoughtsTokens > 0) {
          console.log(`  - \x1b[36mThinking Tokens:\x1b[0m    ${thoughtsTokens} (Reasoning)`);
        }
        console.log(`  - \x1b[36mCompletion Tokens:\x1b[0m  ${candidatesTokens} (Answer)`);
        console.log(`  - \x1b[36mTotal Tokens:\x1b[0m       ${totalTokens}`);
        console.log(`  - \x1b[32mEstimated Cost:\x1b[0m     $${totalCost.toFixed(8)} USD`);
        console.log('\x1b[90m--------------------------------------------------\x1b[0m\n');

      } catch (error) {
        console.error('\n\x1b[31m\x1b[1m❌ Chat Error:\x1b[0m', error.message || error);
        console.log('\x1b[90m--------------------------------------------------\x1b[0m\n');
      }
    }
  } finally {
    rl.close();
  }
}

// Start CLI Application if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
