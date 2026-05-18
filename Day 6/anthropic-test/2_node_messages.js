// Task 2: Repeat in Node SDK (Gemini API)
require("dotenv").config(); // Load environment variables from .env file
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini client using the API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function main() {
    console.log("Making request using Node SDK (Gemini)...");
    try {
        // Get the generative model
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Generate content
        const result = await model.generateContent("Hello from Node SDK!");

        // Extract and print the response text
        console.log("Response:", result.response.text());
    } catch (error) {
        console.error("Error:", error.message);
    }
}

main();
