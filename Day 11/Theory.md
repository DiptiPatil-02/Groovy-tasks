# Embeddings & Cosine Similarity (Simple Notes)

## Embeddings (Simple Meaning)

Embeddings are a way to convert words or sentences into numbers so that a computer can understand their meaning.

### Example

* "dog" → [0.2, 0.5, 0.1]
* "puppy" → [0.21, 0.48, 0.09]

Even though the words are different, the numbers are similar because the meaning is similar.

### Why we use embeddings

* To understand meaning of text
* To find similar sentences
* Used in AI chatbots
* Used in search engines
* Used in RAG systems

---

## Cosine Similarity (Simple Meaning)

Cosine similarity is a method to check how similar two vectors (numbers) are.

It tells us how close the meaning of two sentences is.

### Easy idea

* If score is high → meanings are similar
* If score is low → meanings are different

### Score meaning

* 1 → exactly same meaning
* 0 → not similar
* -1 → opposite meaning

---

## Example

Sentence 1: "I love coding"
Sentence 2: "I enjoy programming"

Even though words are different, meaning is similar → so cosine similarity is high.

---

## Why it is important in AI

* Helps search similar documents
* Used in vector databases
* Used in RAG (Retrieval Augmented Generation)
* Helps AI understand meaning instead of exact words

---

## Simple Summary

* Embeddings = text converted into numbers
* Cosine similarity = checks how similar those numbers are
