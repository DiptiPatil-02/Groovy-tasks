const { ChromaClient, CloudClient } = require('chromadb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function inspect() {
  const host = process.env.CHROMA_URL || "http://localhost:8000";
  const cloudHost = process.env.CHROMA_HOST || "api.trychroma.com";
  const dbName = process.env.CHROMA_DATABASE || "default_database";
  const collectionName = process.env.CHROMA_COLLECTION || "smart_doc_qa";
  const apiKey = process.env.CHROMA_API_KEY;
  const tenant = process.env.CHROMA_TENANT || "default_tenant";

  let client;
  if (apiKey && apiKey.trim() !== '' && apiKey !== 'your_chroma_api_key_here') {
    client = new CloudClient({
      tenant: tenant,
      database: dbName,
      apiKey: apiKey,
      cloudHost: cloudHost,
      cloudPort: 443
    });
  } else {
    // Connect to the specified database inside local ChromaDB
    client = new ChromaClient({ 
      path: host,
      database: dbName
    });
  }
  
  try {
    const collections = await client.listCollections();
    console.log("=========================================");
    console.log(`   ACTIVE COLLECTIONS IN '${dbName}'`);
    console.log("=========================================");
    if (collections.length === 0) {
      console.log(`No collections found inside your database '${dbName}'.`);
      return;
    }
    collections.forEach(col => console.log(` - Name: ${col.name} (ID: ${col.id})`));

    const collection = await client.getCollection({ name: collectionName });
    const count = await collection.count();
    console.log("\n=========================================");
    console.log(`   DATA INSIDE '${collectionName}' (${count} chunks) `);
    console.log("=========================================");

    if (count === 0) {
      console.log("The collection is currently empty. Upload a PDF first!");
      return;
    }

    // Retrieve documents and metadata from ChromaDB
    const data = await collection.get();
    
    // Display the first 10 chunks as a snapshot
    const displayCount = Math.min(data.ids.length, 10);
    console.log(`Showing a snapshot of the first ${displayCount} stored chunks:\n`);

    for (let i = 0; i < displayCount; i++) {
      console.log(`-----------------------------------------`);
      console.log(`[Chunk ID] : ${data.ids[i]}`);
      console.log(`[Page Num] : ${data.metadatas[i] ? data.metadatas[i].page : 'N/A'}`);
      console.log(`[Content]  : "${data.documents[i].substring(0, 200)}..."`);
    }

    if (data.ids.length > 10) {
      console.log(`\n... and ${data.ids.length - 10} more chunks stored in database.`);
    }
    console.log("=========================================");
  } catch (err) {
    console.error(`\n[Error] Unable to inspect database '${dbName}' on server ${client instanceof CloudClient ? cloudHost : host}.`);
    console.error(`Please check your settings in backend/.env:`);
    console.error(`  CHROMA_DATABASE=${dbName}`);
    console.error(`  CHROMA_COLLECTION=${collectionName}\n`);
    console.error(`Details:`, err.message);
  }
}

inspect();
