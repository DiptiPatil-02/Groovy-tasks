"""
Python Asynchronous Programming Demo

To run this file:
1. Open your terminal in the "Day 8" directory.
2. Type: python demo_async.py
"""

import asyncio
import time

# Defining an async function (Coroutine) in Python using `async def`.
# This function simulates an API query that takes 1.5 seconds.
async def fetch_from_api(resource_name, delay_seconds):
    # asyncio.sleep is a non-blocking wait. It suspends this function and
    # returns control to the event loop so other tasks can run in the meantime.
    await asyncio.sleep(delay_seconds)
    return {"data": f"Result of {resource_name}"}

async def main():
    print("==================================================")
    print("Python asyncio Concurrency Demonstration")
    print("==================================================")

    # --- SCENARIO 1: SEQUENTIAL EXECUTION ---
    print("\n[1] Running Tasks SEQUENTIALLY:")
    start_time = time.time()

    # We await the first API task to complete before starting the second.
    # Total expected delay: 1.5s + 1.5s = ~3.0 seconds total.
    user = await fetch_from_api("User Profile", 1.5)
    print("  - Successfully fetched:", user["data"])

    orders = await fetch_from_api("User Orders", 1.5)
    print("  - Successfully fetched:", orders["data"])

    sequential_duration = time.time() - start_time
    print(f"Sequential execution took: {sequential_duration:.2f} seconds\n")


    # --- SCENARIO 2: CONCURRENT EXECUTION ---
    print("[2] Running Tasks CONCURRENTLY (Parallel):")
    start_parallel_time = time.time()

    # In Python, we trigger concurrency by packaging the coroutines.
    # We do NOT await them separately. We run them concurrently using `asyncio.gather()`.
    # Both start running in the background event loop at the exact same time!
    task1 = fetch_from_api("User Profile (Parallel)", 1.5)
    task2 = fetch_from_api("User Orders (Parallel)", 1.5)

    # asyncio.gather executes both tasks concurrently and waits for both to complete.
    # Total expected time: Only ~1.5 seconds total!
    res1, res2 = await asyncio.gather(task1, task2)
    print("  - Successfully fetched (Parallel):", res1["data"])
    print("  - Successfully fetched (Parallel):", res2["data"])

    parallel_duration = time.time() - start_parallel_time
    print(f"Parallel execution took: {parallel_duration:.2f} seconds")
    print("==================================================\n")

# In Python, async functions cannot be run directly like standard functions.
# We must start the asyncio event loop and run our entrypoint `main` function through it.
if __name__ == "__main__":
    asyncio.run(main())
