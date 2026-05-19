const fs = require('fs');
const path = require('path');
const { ChromaClient, CloudClient } = require('chromadb');

class VectorStore {
  constructor() {
    this.chunks = []; // In-memory array of { id, text, page, vector } (keeps local fallback in sync)
    
    const apiKey = process.env.CHROMA_API_KEY;
    const tenant = process.env.CHROMA_TENANT || "default_tenant";
    const database = process.env.CHROMA_DATABASE || "default_database";
    this.collectionName = process.env.CHROMA_COLLECTION || "smart_doc_qa";
    
    this.useChroma = false;
    this.collection = null;
    this.hasLoggedConnection = false;

    // Connect to Chroma Cloud or Local ChromaDB based on API Key presence
    if (apiKey && apiKey.trim() !== '' && apiKey !== 'your_chroma_api_key_here') {
      this.isCloud = true;
      this.chromaClient = new CloudClient({
        tenant: tenant,
        database: database,
        apiKey: apiKey,
        cloudHost: process.env.CHROMA_HOST || "api.trychroma.com",
        cloudPort: 443
      });
    } else {
      this.isCloud = false;
      this.chromaClient = new ChromaClient({ 
        path: process.env.CHROMA_URL || "http://localhost:8000",
        database: database
      });
    }
  }

  /**
   * Checks the connection to ChromaDB.
   * Connects and prepares the collection if the database is running.
   * @returns {Promise<Boolean>} True if ChromaDB is available and ready, false otherwise.
   */
  async checkChroma() {
    try {
      await this.chromaClient.heartbeat();
      
      // If we got here, ChromaDB is available. Let's get/create the collection.
      if (!this.collection) {
        this.collection = await this.chromaClient.getOrCreateCollection({
          name: this.collectionName
        });
      }
      
      if (!this.useChroma || !this.hasLoggedConnection) {
        if (this.isCloud) {
          console.log(`[ChromaDB] Successfully connected to Chroma Cloud! (Tenant: ${process.env.CHROMA_TENANT || 'default_tenant'}, Database: ${process.env.CHROMA_DATABASE || 'default_database'})`);
        } else {
          console.log(`[ChromaDB] Successfully connected to local server at ${process.env.CHROMA_URL || 'http://localhost:8000'}`);
        }
        this.useChroma = true;
        this.hasLoggedConnection = true;
      }
      return true;
    } catch (e) {
      if (this.useChroma || !this.hasLoggedConnection) {
        console.warn(`[ChromaDB] Server offline or unreachable. Falling back to local store. Error: ${e.message}`);
        this.useChroma = false;
        this.hasLoggedConnection = true;
      }
      this.collection = null;
      return false;
    }
  }

  /**
   * Adds a chunk to the store.
   * @param {Object} chunk { text, page, vector }
   */
  async addChunk(chunk) {
    const id = `chunk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newChunk = {
      id,
      text: chunk.text,
      page: chunk.page,
      vector: chunk.vector
    };
    
    // Always add to memory array (for fallback and synchronous counts)
    this.chunks.push(newChunk);

    if (await this.checkChroma()) {
      try {
        await this.collection.add({
          ids: [id],
          embeddings: [chunk.vector],
          metadatas: [{ page: chunk.page }],
          documents: [chunk.text]
        });
      } catch (err) {
        console.error("[ChromaDB] Failed to add chunk. Relying on local backup:", err.message);
      }
    }
  }

  /**
   * Clears all chunks from both in-memory store and ChromaDB.
   */
  async clear() {
    this.chunks = [];
    if (await this.checkChroma()) {
      try {
        await this.chromaClient.deleteCollection({ name: this.collectionName });
        this.collection = await this.chromaClient.getOrCreateCollection({
          name: this.collectionName
        });
        console.log("[ChromaDB] Collection cleared.");
      } catch (err) {
        console.error("[ChromaDB] Failed to clear collection:", err.message);
      }
    }
  }

  /**
   * Mathematical dot product of two high-dimensional vectors: A . B
   * @param {Array<Number>} vecA 
   * @param {Array<Number>} vecB 
   * @returns {Number}
   */
  static dotProduct(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error(`Vector dimensions must match! VecA: ${vecA.length}, VecB: ${vecB.length}`);
    }
    let product = 0;
    for (let i = 0; i < vecA.length; i++) {
      product += vecA[i] * vecB[i];
    }
    return product;
  }

  /**
   * Mathematical magnitude (Euclidean norm) of a vector: ||A||
   * @param {Array<Number>} vector 
   * @returns {Number}
   */
  static magnitude(vector) {
    let sumSquares = 0;
    for (let i = 0; i < vector.length; i++) {
      sumSquares += vector[i] * vector[i];
    }
    return Math.sqrt(sumSquares);
  }

  /**
   * Calculates the cosine similarity score between a query vector and a chunk vector.
   * Cosine Similarity = (A . B) / (||A|| * ||B||)
   * @param {Array<Number>} queryVec 
   * @param {Array<Number>} chunkVec 
   * @returns {Number} Similarity score between -1 and 1
   */
  static cosineSimilarity(queryVec, chunkVec) {
    const dot = VectorStore.dotProduct(queryVec, chunkVec);
    const magA = VectorStore.magnitude(queryVec);
    const magB = VectorStore.magnitude(chunkVec);

    if (magA === 0 || magB === 0) {
      return 0; // Prevent division by zero
    }
    return dot / (magA * magB);
  }

  /**
   * Queries the database for the top k matching chunks based on similarity.
   * @param {Array<Number>} queryVector 
   * @param {Number} k Top matching count
   * @returns {Promise<Array<Object>>} List of top k matched chunks sorted by similarity descending
   */
  async search(queryVector, k = 3) {
    if (await this.checkChroma()) {
      try {
        const queryResults = await this.collection.query({
          queryEmbeddings: [queryVector],
          nResults: k
        });

        const scoredChunks = [];
        if (queryResults && queryResults.documents && queryResults.documents[0]) {
          for (let i = 0; i < queryResults.documents[0].length; i++) {
            const doc = queryResults.documents[0][i];
            const metadata = queryResults.metadatas[0][i] || {};
            const distance = queryResults.distances && queryResults.distances[0] ? queryResults.distances[0][i] : 0;
            // Chroma returns distances (e.g., L2 or cosine distance).
            // Cosine similarity can be estimated as 1 - distance (if using cosine metric)
            const similarity = 1 - (distance || 0);

            scoredChunks.push({
              id: queryResults.ids[0][i],
              text: doc,
              page: metadata.page || 1,
              similarity: similarity
            });
          }
        }
        
        // Sort descending by similarity score
        scoredChunks.sort((a, b) => b.similarity - a.similarity);
        return scoredChunks;
      } catch (err) {
        console.error("[ChromaDB] Query failed, falling back to local cosine similarity search:", err.message);
      }
    }

    // Local in-memory fallback search
    if (this.chunks.length === 0) {
      return [];
    }

    const scoredChunks = this.chunks.map(chunk => {
      const score = VectorStore.cosineSimilarity(queryVector, chunk.vector);
      return {
        id: chunk.id,
        text: chunk.text,
        page: chunk.page,
        similarity: score
      };
    });

    scoredChunks.sort((a, b) => b.similarity - a.similarity);
    return scoredChunks.slice(0, k);
  }

  /**
   * Persists the in-memory chunks backup to a local JSON file.
   * @param {String} filePath 
   */
  save(filePath) {
    if (this.useChroma) {
      console.log("[ChromaDB] Data successfully stored in ChromaDB database. Skipping local JSON file save.");
      return;
    }
    const data = JSON.stringify(this.chunks, null, 2);
    fs.writeFileSync(filePath, data, 'utf8');
  }

  /**
   * Loads the vector store from a local JSON file and populates ChromaDB if empty.
   * @param {String} filePath 
   */
  async load(filePath) {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      this.chunks = JSON.parse(data);
      console.log(`[Local Store] Loaded ${this.chunks.length} chunks from JSON file.`);
      
      // If ChromaDB is running, populate it so it's fully synchronized
      if (await this.checkChroma()) {
        try {
          const count = await this.collection.count();
          if (count === 0 && this.chunks.length > 0) {
            console.log(`[ChromaDB] Synchronizing database with ${this.chunks.length} chunks from local backup...`);
            
            const ids = [];
            const embeddings = [];
            const metadatas = [];
            const documents = [];

            this.chunks.forEach(chunk => {
              ids.push(chunk.id);
              embeddings.push(chunk.vector);
              metadatas.push({ page: chunk.page });
              documents.push(chunk.text);
            });

            // ChromaDB add in batch
            const batchSize = 100;
            for (let i = 0; i < ids.length; i += batchSize) {
              await this.collection.add({
                ids: ids.slice(i, i + batchSize),
                embeddings: embeddings.slice(i, i + batchSize),
                metadatas: metadatas.slice(i, i + batchSize),
                documents: documents.slice(i, i + batchSize)
              });
            }
            console.log(`[ChromaDB] Synchronization complete.`);
          }
        } catch (err) {
          console.error("[ChromaDB] Sync during load failed:", err.message);
        }
      }
    }
  }

  /**
   * Helper function to split page text into overlapping chunks.
   * @param {Array<Object>} pages [{ page: 1, text: "..." }]
   * @param {Number} chunkSize Character count of chunks (~800)
   * @param {Number} overlap Character overlap count (~150)
   * @returns {Array<Object>} Array of raw chunk details [{ text, page }]
   */
  static chunkDocument(pages, chunkSize = 800, overlap = 150) {
    const rawChunks = [];

    for (const pageObj of pages) {
      const text = pageObj.text.replace(/\s+/g, ' '); // Clean up excess whitespaces
      const page = pageObj.page;

      if (!text || text.trim() === '') {
        continue;
      }

      if (text.length <= chunkSize) {
        rawChunks.push({ text: text.trim(), page });
        continue;
      }

      let startIndex = 0;
      while (startIndex < text.length) {
        let endIndex = startIndex + chunkSize;
        let chunkText = text.slice(startIndex, endIndex);

        if (endIndex < text.length) {
          const lastSpace = chunkText.lastIndexOf(' ');
          if (lastSpace > chunkSize * 0.7) {
            endIndex = startIndex + lastSpace;
            chunkText = text.slice(startIndex, endIndex);
          }
        }

        if (chunkText.trim() !== '') {
          rawChunks.push({
            text: chunkText.trim(),
            page
          });
        }

        startIndex += (chunkSize - overlap);

        if (chunkSize <= overlap) {
          break;
        }
      }
    }

    return rawChunks;
  }
}

module.exports = VectorStore;
