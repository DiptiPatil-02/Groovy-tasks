require("dotenv").config();

const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

async function main() {
    try {
        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 100,
            messages: [
                {
                    role: "user",
                    content: "Hello Claude"
                }
            ]
        });

        console.log(response.content);

    } catch (error) {
        console.error(error);
    }
}

main();