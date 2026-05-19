1. Fixed-size chunking
Idea: Split text into equal-sized pieces.

Example:
If chunk size = 200 characters:

Chunk 1: first 200 chars
Chunk 2: next 200 chars
Chunk 3: next 200 chars
What you learn:
Simple but may break sentences
Fast and easy


2. Sliding window chunking
Idea: Chunks overlap to preserve context.

Example:
Chunk size = 200, overlap = 50

Chunk 1: 1–200
Chunk 2: 151–350
Chunk 3: 301–500
What you learn:
Better context retention
Avoids losing meaning at boundaries



3. Semantic chunking
Idea:Split based on meaning, not size.

Example:
Paragraph 1 = one idea
Paragraph 2 = another idea
How it works:
Uses sentences / embeddings / similarity
Groups related sentences together
What you learn:
Best for RAG quality
More complex but accurate retrieval



4. Hierarchical chunking
Idea:Chunk at multiple levels.

Example:

Document → Sections → Paragraphs → Sentences
What you learn:
Useful for large documents
Helps retrieve both big context and small details
What you actually need to submit

