# Cohere Reranker & Second-Pass Retrieval

Cohere reranker is used in RAG systems to improve retrieval quality.

Normally in RAG, vector databases retrieve chunks using similarity search. This step is called first-pass retrieval. Sometimes the retrieved chunks are not the most relevant, so answer quality becomes lower.

To solve this problem, a reranker is used.

After vector search retrieves chunks, Cohere reranker reads:
- the user query
- retrieved chunks

and then reorders the chunks based on relevance.

This process is called second-pass retrieval because retrieval happens in two steps.

First step:
Vector database retrieves matching chunks.

Second step:
Cohere reranker selects and ranks the best chunks.

Flow:

PDF → Chunking → Embeddings → Vector DB → Retrieved Chunks → Cohere Reranker → Best Chunks → LLM Answer

Benefits of reranker:
- improves relevance
- removes less useful chunks
- improves final answer quality
- gives better context to the LLM

Simple understanding:
- First-pass retrieval = vector similarity search
- Second-pass retrieval = reranking retrieved chunks
- Cohere reranker = tool used to rank chunks more accurately