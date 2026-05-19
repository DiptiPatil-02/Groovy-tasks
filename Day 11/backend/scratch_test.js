const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testModel(modelName) {
  const apiKey = process.env.GEMINI_API_KEY;
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    console.log(`Testing model: ${modelName}...`);
    const embedModel = genAI.getGenerativeModel({ model: modelName });
    const embedResult = await embedModel.embedContent("Hello world");
    const values = embedResult.embedding.values;
    console.log(`  Success for ${modelName}! Dimensions:`, values.length);
    return true;
  } catch (err) {
    console.error(`  Failed for ${modelName}:`, err.message);
    return false;
  }
}

async function test() {
  await testModel("text-embedding-004");
  await testModel("embedding-001");
  await testModel("gemini-embedding-2");
}

test();
