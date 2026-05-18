// Task 3: CLI multi-turn chatbot (Gemini API, History maintained, under 50 lines)
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const readline = require("readline");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function startChatbot() {
    console.log("Gemini Chatbot initialized! Type your message (or 'exit' to quit):");
    
    // Initialize the model and start a chat session (Gemini SDK maintains history automatically)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const chat = model.startChat({ history: [] });

    function promptUser() {
        rl.question("\nYou: ", async (userInput) => {
            if (userInput.toLowerCase() === "exit" || userInput.toLowerCase() === "quit") {
                rl.close();
                return;
            }

            try {
                // Send message to the chat session
                const result = await chat.sendMessage(userInput);
                console.log(`\nGemini: ${result.response.text()}`);
            } catch (error) {
                console.error("Error:", error.message);
            }

            promptUser(); // Loop back for next input
        });
    }

    promptUser();
}

startChatbot();
