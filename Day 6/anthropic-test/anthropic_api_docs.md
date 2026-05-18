# Anthropic API Documentation

# Authentication
To authenticate with the Anthropic API, you must include an API key in your request headers. All API requests must be made over HTTPS. The API key is passed using the `x-api-key` header. 

You must also specify the API version using the `anthropic-version` header to ensure compatibility.

## Required Headers
* `x-api-key`: Your unique API key.
* `anthropic-version`: The API version (e.g., 2023-06-01).
* `content-type`: application/json

## Models
Anthropic provides several state-of-the-art models designed for different use cases, offering trade-offs between intelligence, speed, and cost:

* **Claude 3.5 Sonnet**: The most advanced model, delivering top-tier intelligence, speed, and cost-effectiveness. Ideal for complex coding, logical reasoning, and nuanced text generation.
* **Claude 3 Opus**: A highly capable model designed for highly complex tasks, advanced problem-solving, and in-depth analysis.
* **Claude 3 Sonnet**: A balanced model offering a strong mix of performance and speed, suitable for most enterprise workloads.
* **Claude 3 Haiku**: The fastest and most compact model, perfect for tasks requiring near-instant responsiveness, simple queries, and high-volume operations.

## Rate Limits
Anthropic enforces rate limits to ensure stability and fair usage across the platform. These limits are determined by your account's usage tier, which is based on your total spent and pre-funded balance. 

Rate limits are measured across three primary metrics:
1. **Requests Per Minute (RPM)**: The maximum number of individual API requests allowed in one minute.
2. **Tokens Per Minute (TPM)**: The maximum number of combined input and output tokens that can be processed in one minute.
3. **Tokens Per Day (TPD)**: The total number of tokens allowed per day.

**Handling Rate Limits:**
If your application exceeds any of these limits, the API will respond with a `429 Too Many Requests` error. It is highly recommended to implement retry logic with exponential backoff in your code to handle these errors gracefully. As your application grows, you can increase your rate limits by upgrading your account tier through adding credits.
