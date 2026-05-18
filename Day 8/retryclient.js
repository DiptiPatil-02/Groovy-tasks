// Simple Resilient API Client - Error Handling, Retry, Exponential Backoff, and Rate Limiting

// Helper function to pause execution for a given time
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 1. Rate Limiter (Simulating Client-side Throttling)
class RateLimiter {
    constructor(limit, windowMs) {
        this.limit = limit; // Max requests allowed
        this.windowMs = windowMs; // Time window in milliseconds
        this.requests = []; // Timestamps of requests made
    }

    async checkLimit() {
        const now = Date.now();

        // Filter out timestamps that are older than our time window
        this.requests = this.requests.filter(
            (time) => now - time < this.windowMs
        );

        // If we reached the limit, wait for the oldest request in the list to expire
        if (this.requests.length >= this.limit) {
            // Add a +50ms safety buffer to ensure we wake up AFTER the request has fully expired
            const waitTime = this.windowMs - (now - this.requests[0]) + 50;
            console.log(`⛔ Rate limit reached! Waiting ${Math.round(waitTime)}ms...`);
            
            await sleep(waitTime);
            
            // Re-check after waiting
            return this.checkLimit();
        }

        // Add the current request time to our active list
        this.requests.push(Date.now());
    }
}

// 2. Simulated API Call (Simulating 50% Success Rate)
async function fakeApiCall() {
    await sleep(200); // Simulate API latency
    const isSuccessful = Math.random() > 0.5;

    if (isSuccessful) {
        return "Success Data ✅";
    } else {
        throw new Error("Server Error (500) ❌");
    }
}

// 3. Retry Wrapper with Exponential Backoff
async function fetchWithRetry(clientId, rateLimiter, maxRetries = 3) {
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            attempt++;

            // Check client-side rate limit before making API request
            await rateLimiter.checkLimit();

            console.log(`🚀 Client ${clientId}: Attempt ${attempt}/${maxRetries}...`);
            
            // Execute simulated API call
            const result = await fakeApiCall();

            console.log(`✅ Client ${clientId}: Success! (${result})`);
            return result; // Exit function and return result on success

        } catch (error) {
            console.log(`❌ Client ${clientId}: Failed on attempt ${attempt} (${error.message})`);

            // If we ran out of retries, throw the error to fail completely
            if (attempt >= maxRetries) {
                console.log(`💀 Client ${clientId}: All retries failed.`);
                throw error;
            }

            // Calculate Exponential Backoff delay: 1s -> 2s -> 4s
            const delay = Math.pow(2, attempt - 1) * 1000;
            console.log(`⏳ Client ${clientId}: Retrying in ${delay}ms...`);
            
            await sleep(delay);
        }
    }
}

// 4. Run the Concurrency Demo
async function runDemo() {
    const rateLimiter = new RateLimiter(2, 4000); // Allow 2 requests per 4 seconds
    console.log("🔥 Starting simple resilient API demo...\n");

    try {
        // Start each client with a tiny 100ms stagger delay so they check the rate limiter in order
        const taskA = fetchWithRetry("A", rateLimiter);
        await sleep(100);
        const taskB = fetchWithRetry("B", rateLimiter);
        await sleep(100);
        const taskC = fetchWithRetry("C", rateLimiter);
        await sleep(100);
        const taskD = fetchWithRetry("D", rateLimiter);

        // Wait for all 4 clients to complete their lifecycles
        await Promise.all([taskA, taskB, taskC, taskD]);
        
        console.log("\n🏁 Demo completed successfully!");
    } catch (err) {
        console.log(`\n🏁 Demo completed. Some clients failed: ${err.message}`);
    }
}

runDemo();