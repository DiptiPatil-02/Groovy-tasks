import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Table from 'cli-table3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define available providers
const providers = {
  openai: () => import('./providers/openai.js'),
  gemini: () => import('./providers/gemini.js'),
  anthropic: () => import('./providers/anthropic.js'),
};

async function runSinglePrompt(providerName, prompt) {
  if (!providers[providerName]) {
    console.error(`Error: Provider '${providerName}' is not supported.`);
    console.error(`Supported providers: ${Object.keys(providers).join(', ')}`);
    process.exit(1);
  }

  try {
    const providerModule = await providers[providerName]();
    console.log(`Running prompt with ${providerName}...`);
    
    const result = await providerModule.run(prompt);
    
    console.log('\n--- Result ---');
    console.log(result.text);
    console.log('--------------');
    
    console.log(`\nMetrics:`);
    console.log(`- Duration: ${result.duration}ms`);
    console.log(`- Tokens: ${result.usage.totalTokens} (Prompt: ${result.usage.promptTokens}, Completion: ${result.usage.completionTokens})`);
    console.log(`- Est. Cost: $${result.cost.toFixed(6)}`);
  } catch (error) {
    console.error(`\nFailed to run prompt: ${error.message}`);
  }
}

async function runBenchmark() {
  console.log('Starting Benchmark Mode...');
  
  const promptsPath = path.join(__dirname, 'prompts.json');
  if (!fs.existsSync(promptsPath)) {
    console.error(`Error: prompts.json not found in ${__dirname}`);
    process.exit(1);
  }

  const prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));
  console.log(`Loaded ${prompts.length} prompts for benchmarking.\n`);

  const results = [];
  const metrics = {
    openai: { totalTime: 0, totalCost: 0, successes: 0, failures: 0 },
    gemini: { totalTime: 0, totalCost: 0, successes: 0, failures: 0 },
    anthropic: { totalTime: 0, totalCost: 0, successes: 0, failures: 0 }
  };

  // Pre-load all provider modules
  const providerModules = {
    openai: await providers.openai(),
    gemini: await providers.gemini(),
    anthropic: await providers.anthropic()
  };

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    console.log(`[${i + 1}/${prompts.length}] Processing prompt...`);
    
    const promptResult = { prompt };

    for (const [providerName, providerModule] of Object.entries(providerModules)) {
      try {
        const result = await providerModule.run(prompt);
        promptResult[providerName] = result.text;
        
        metrics[providerName].totalTime += result.duration;
        metrics[providerName].totalCost += result.cost;
        metrics[providerName].successes++;
      } catch (error) {
        promptResult[providerName] = `ERROR: ${error.message}`;
        metrics[providerName].failures++;
        console.error(`  - ${providerName} failed: ${error.message}`);
      }
    }
    
    results.push(promptResult);
  }

  // Save results to file
  const resultsPath = path.join(__dirname, 'results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nBenchmark complete! Results saved to ${resultsPath}\n`);

  // Generate and print Summary Table
  const table = new Table({
    head: ['Provider', 'Avg Response Quality', 'Avg Speed (ms)', 'Total Cost ($)', 'Success Rate'],
    colWidths: [15, 25, 18, 18, 15]
  });

  for (const providerName of Object.keys(metrics)) {
    const stat = metrics[providerName];
    const totalRuns = stat.successes + stat.failures;
    const avgSpeed = stat.successes > 0 ? (stat.totalTime / stat.successes).toFixed(0) : 'N/A';
    const successRate = totalRuns > 0 ? `${((stat.successes / totalRuns) * 100).toFixed(1)}%` : '0%';
    
    table.push([
      providerName,
      'N/A (Manual Review)',
      avgSpeed,
      `$${stat.totalCost.toFixed(6)}`,
      successRate
    ]);
  }

  console.log(table.toString());
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node cli.js --provider <provider_name> "your prompt"');
    console.log('  node cli.js --benchmark');
    process.exit(1);
  }

  const isBenchmark = args.includes('--benchmark');

  if (isBenchmark) {
    await runBenchmark();
  } else {
    const providerIndex = args.indexOf('--provider');
    if (providerIndex === -1 || providerIndex + 1 >= args.length) {
      console.error('Error: Please specify a provider using --provider <name>');
      process.exit(1);
    }
    
    const providerName = args[providerIndex + 1].toLowerCase();
    
    // The prompt should be the next argument after provider name, or just find the first arg that doesn't start with -- and isn't the provider name
    let prompt = '';
    for (let i = 0; i < args.length; i++) {
      if (args[i] !== '--provider' && args[i] !== providerName && !args[i].startsWith('--')) {
        prompt = args[i];
        break;
      }
    }

    if (!prompt) {
      console.error('Error: Please provide a prompt.');
      process.exit(1);
    }

    await runSinglePrompt(providerName, prompt);
  }
}

main().catch(error => {
  console.error('Fatal Error:', error);
  process.exit(1);
});
