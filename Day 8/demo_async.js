/**
 * Node.js Asynchronous Programming Demo
 * 
 * To run this file:
 * 1. Open your terminal in the "Day 8" directory.
 * 2. Type: node demo_async.js
 */

// A simple helper function that simulates a database or API query.
// It returns a promise that resolves with the data after a specified time.
const fetchFromAPI = (resourceName, delayMs) => {
  return new Promise((resolve) => {
    // setTimeout is asynchronous. Node will run other code while this timer ticks.
    setTimeout(() => {
      resolve({ data: `Result of ${resourceName}` });
    }, delayMs);
  });
};

async function main() {
  console.log("==================================================");
  console.log("🤖 Node.js Async/Await Concurrency Demonstration");
  console.log("==================================================");

  // --- SCENARIO 1: SEQUENTIAL EXECUTION (Blocking Style) ---
  console.log("\n🐢 [1] Running Tasks SEQUENTIALLY:");
  const startTime = Date.now();

  // We await the first API call to finish before we even START the second call.
  // Total expected delay: 1.5 seconds + 1.5 seconds = ~3 seconds total.
  const user = await fetchFromAPI("User Profile", 1500);
  console.log("  - Successfully fetched:", user.data);

  const orders = await fetchFromAPI("User Orders", 1500);
  console.log("  - Successfully fetched:", orders.data);

  const sequentialDuration = (Date.now() - startTime) / 1000;
  console.log(`⏱️ Sequential execution took: ${sequentialDuration.toFixed(2)} seconds\n`);


  // --- SCENARIO 2: CONCURRENT EXECUTION (Parallel Style) ---
  console.log("⚡ [2] Running Tasks CONCURRENTLY (Parallel):");
  const startParallelTime = Date.now();

  // Instead of waiting, we trigger BOTH API calls instantly in the background.
  // promise1 and promise2 start running at the exact same time!
  const promise1 = fetchFromAPI("User Profile (Parallel)", 1500);
  const promise2 = fetchFromAPI("User Orders (Parallel)", 1500);

  // We use `Promise.all` to await both tasks to finish.
  // Since they run at the same time, the total expected time is equal to the SLOWEST task: ~1.5 seconds!
  const [res1, res2] = await Promise.all([promise1, promise2]);
  console.log("  - Successfully fetched (Parallel):", res1.data);
  console.log("  - Successfully fetched (Parallel):", res2.data);

  const parallelDuration = (Date.now() - startParallelTime) / 1000;
  console.log(`⚡ Parallel execution took: ${parallelDuration.toFixed(2)} seconds`);
  console.log("==================================================\n");
}

main();
