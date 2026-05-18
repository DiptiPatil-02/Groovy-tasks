import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function list() {
    console.log("Listing models...");
    try {
        // Unfortunately, @google/generative-ai doesn't export a simple listModels method directly in all versions, 
        // but we can try making a direct fetch request.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();
        console.log(data.models.map(m => m.name).join('\n'));
    } catch(e) {
        console.error(e);
    }
}
list();
