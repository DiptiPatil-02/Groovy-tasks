import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const reset = '\x1b[0m';
const green = '\x1b[32m';
const cyan = '\x1b[36m';
const yellow = '\x1b[33m';
const bold = '\x1b[1m';
const magenta = '\x1b[35m';
const red = '\x1b[31m';
const gray = '\x1b[90m';

const csvPath = path.join(process.cwd(), 'telemetry.csv');

/**
 * Truncates text to a specific length for clean column formatting.
 */
function truncate(text, length) {
  if (!text) return ''.padEnd(length);
  const clean = text.replace(/\n/g, ' ');
  if (clean.length > length) {
    return (clean.slice(0, length - 3) + '...').padEnd(length);
  }
  return clean.padEnd(length);
}

/**
 * Parses telemetry.csv and renders a stunning live updating dashboard.
 */
function renderDashboard() {
  if (!fs.existsSync(csvPath)) {
    console.clear();
    console.log(`${yellow}⏳ Waiting for telemetry.csv to be created...${reset}`);
    console.log(`${gray}Run a benchmark or ask a query in your codebase explainer CLI to start logging!${reset}`);
    return;
  }

  try {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.trim().split('\n');
    
    if (lines.length <= 1) {
      console.clear();
      console.log(`${yellow}ℹ️ telemetry.csv created, but has no records yet...${reset}`);
      return;
    }

    const headers = lines[0].split(',');
    const rows = lines.slice(1).map(line => {
      // Parse CSV accounting for quoted queries with commas
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
      return matches.map(val => val.replace(/^"|"$/g, ''));
    });

    console.clear();
    console.log(`${cyan}%s${reset}`, '========================================================================================================');
    console.log(`${cyan}${bold}📊 LIVE PROMPT CACHING & TELEMETRY DASHBOARD (telemetry.csv)${reset}`);
    console.log(`${gray}Watching file live. Updates automatically on every API interaction!${reset}`);
    console.log(`${cyan}%s${reset}`, '========================================================================================================');

    // Print Table Headers
    const tableHeader = 
      'Query'.padEnd(25) + ' | ' +
      'Mode'.padEnd(10) + ' | ' +
      'Tokens (In / Cached / Out)'.padEnd(26) + ' | ' +
      'Latency'.padEnd(8) + ' | ' +
      'Cost'.padEnd(12) + ' | ' +
      'Savings %'.padEnd(9) + ' | ' +
      'Status';
    
    console.log(`${bold}${tableHeader}${reset}`);
    console.log(`${gray}--------------------------------------------------------------------------------------------------------${reset}`);

    // Cumulative stats
    let totalQueries = 0;
    let totalInput = 0;
    let totalCached = 0;
    let totalOutput = 0;
    let totalTime = 0;
    let totalActualCost = 0;
    let totalBaseCost = 0;

    // Print rows
    rows.forEach(row => {
      if (row.length < 12) return;
      
      const timestamp = row[0];
      const mode = row[1];
      const query = row[2];
      const inTok = parseInt(row[3]) || 0;
      const cachTok = parseInt(row[4]) || 0;
      const outTok = parseInt(row[5]) || 0;
      const latency = parseInt(row[6]) || 0;
      const actualCost = parseFloat(row[7]) || 0;
      const baseCost = parseFloat(row[8]) || 0;
      const savingsPercent = parseFloat(row[10]) || 0;
      const status = row[11];

      totalQueries++;
      totalInput += inTok;
      totalCached += cachTok;
      totalOutput += outTok;
      totalTime += latency;
      totalActualCost += actualCost;
      totalBaseCost += baseCost;

      // Color coding cache status
      let statusColor = reset;
      if (status.includes('Hot') || status.includes('Hit')) {
        statusColor = green;
      } else if (status.includes('Cold') || status.includes('Written')) {
        statusColor = yellow;
      }

      const tokenString = `${inTok} / ${green}${cachTok}${reset} / ${outTok}`.padEnd(35); // Adjust padding for ANSI color escape chars
      const costString = `$${actualCost.toFixed(6)}`;

      console.log(
        truncate(query, 25) + ' | ' +
        mode.padEnd(10) + ' | ' +
        tokenString + ' | ' +
        `${latency}ms`.padEnd(8) + ' | ' +
        costString.padEnd(12) + ' | ' +
        `${savingsPercent.toFixed(1)}%`.padEnd(9) + ' | ' +
        `${statusColor}${status}${reset}`
      );
    });

    const netSaved = Math.max(0, totalBaseCost - totalActualCost);
    const overallSavingsPercent = totalBaseCost > 0 ? (netSaved / totalBaseCost) * 100 : 0;

    // Render Cumulative Summary Card
    console.log(`${gray}--------------------------------------------------------------------------------------------------------${reset}`);
    console.log(`\n👑 ${bold}${cyan}CUMULATIVE PERFORMANCE SUMMARY:${reset}`);
    console.log(`${gray}--------------------------------------------------------------------------------------------------------${reset}`);
    console.log(`  📂 Total Queries Run:      ${bold}${cyan}${totalQueries}${reset}`);
    console.log(`  ⏱️ Average Latency:       ${bold}${yellow}${(totalTime / (totalQueries || 1)).toFixed(0)}ms${reset}`);
    console.log(`  🪙 Transmitted Tokens:    Input: ${totalInput} | ${green}Cached Reads: ${totalCached}${reset} | Output: ${totalOutput}`);
    console.log(`  💰 Overall Money Spent:    ${red}$${totalActualCost.toFixed(6)} USD${reset} (Base Rate without cache: $${totalBaseCost.toFixed(6)} USD)`);
    console.log(`  🎉 ${bold}${green}NET CENTS SAVED:          $${netSaved.toFixed(6)} USD Saved (${overallSavingsPercent.toFixed(1)}% Cost Reduction)${reset}`);
    console.log(`${gray}--------------------------------------------------------------------------------------------------------${reset}`);
    console.log(`${gray}Press Ctrl+C to exit dashboard monitor.${reset}`);

  } catch (error) {
    console.error('Error rendering live dashboard:', error.message);
  }
}

// Watch telemetry.csv for any changes and redraw the screen instantly
fs.watch(process.cwd(), (eventType, filename) => {
  if (filename === 'telemetry.csv') {
    renderDashboard();
  }
});

// Run initial render
renderDashboard();
