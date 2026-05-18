# Smart Doc Q&A — Premium Multi-AI Assistant

A full-stack, state-of-the-art document analysis and chat system. Upload a PDF document, extract its text page-by-page, converse with your AI agent strictly about its contents, extract page citations, and review a live cost telemetry panel showing token usage and monetary expense.

---

## 🛠️ Tech Stack & Features

- **Frontend**: React + Vite (configured with an integrated API proxy)
- **Backend**: Node.js + Express
- **PDF Parser**: `pdf-parse` utilizing a custom, coordinate-based page rendering interceptor to maintain 1-based page mappings.
- **AI Engine (Dual Provider)**: 
  - **Google Gemini API**: Uses **Gemini 1.5 Flash** if `GEMINI_API_KEY` is configured (highly accurate, extremely fast, massive context).
  - **Anthropic Claude API**: Uses **Claude 3.5 Sonnet** if `ANTHROPIC_API_KEY` is configured.
- **Cost Telemetry**: Custom, real-time input/output token cost calculator tailored specifically to the active provider.
- **Design Language**: Premium Obsidian-dark glassmorphism, responsive grid layout, high-end hover micro-animations, Outfit typography, and JetBrains Mono monospace readouts.

---

## 📂 Project Architecture

```
d:\Groovy Technoweb\Day 10/
├── backend/
│   ├── .env               # Server & API key variables (git-ignored)
│   ├── .env.example       # Example variables template
│   ├── package.json       # Node server dependencies
│   └── server.js          # Express app, PDF extraction, & Multi-AI integration
├── frontend/
│   ├── index.html         # HTML root and web font injections
│   ├── package.json       # React / Vite project configuration
│   ├── vite.config.js     # Dev server & reverse proxy configurations
│   └── src/
│       ├── main.jsx       # React entry mount script
│       ├── App.jsx        # Root component (uploads, states, and telemetry trackers)
│       └── App.css        # Premium styling sheet
└── README.md              # Installation & setup guide (this file)
```

---

## 🚀 Getting Started

Follow these steps to run both the frontend and backend local servers.

### Prerequisites
- [Node.js](https://nodejs.org/) installed (v18 or higher is recommended)
- A valid **Google Gemini API Key** OR an **Anthropic Claude API Key**

### 1. Project Configuration
1. Open the file [backend/.env](file:///d:/Groovy%20Technoweb/Day%2010/backend/.env) and populate the key you have:
   ```env
   PORT=5000
   
   # Option A: Paste your Gemini API key here
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Option B: Paste your Anthropic API key here
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

2. Open a terminal in the project root directory (`d:\Groovy Technoweb\Day 10`).
3. Run the master setup command to install all dependencies for both directories:
   ```bash
   npm run install:all
   ```

### 2. Launch Concurrently
From the project root directory (`d:\Groovy Technoweb\Day 10`), simply run:
```bash
npm run dev
```

Both the **Express Server** (port 5000) and the **Vite React Server** (port 3000) will spin up concurrently! Standard out logs from both processes will print cleanly in the same window, color-coded by process. Open your browser to **`http://localhost:3000`** to start using the app.

---

## 📑 API Reference

### 1. `POST /upload`
Uploads a single PDF file, extracts text page-by-page, and stores it in-memory on the server.
- **Request Format**: Multipart form data with a single field named `file` containing a `.pdf` file.
- **Response JSON**:
  ```json
  {
    "message": "PDF uploaded and parsed successfully!",
    "fileName": "document.pdf",
    "totalPageCount": 5,
    "provider": "Gemini 1.5 Flash", // or "Claude 3.5 Sonnet" depending on active key
    "pages": [
      { "page": 1, "charCount": 1824 },
      { "page": 2, "charCount": 2150 }
    ]
  }
  ```

### 2. `POST /ask`
Queries the AI model about the uploaded PDF. Returns response text, page citations, and request telemetry.
- **Request JSON**:
  ```json
  {
    "question": "What are the core stages of SDLC?"
  }
  ```
- **Response JSON**:
  ```json
  {
    "answer": "According to page 3, the Software Development Life Cycle (SDLC) consists of planning, analysis...",
    "citations": ["page 3"],
    "provider": "Gemini 1.5 Flash",
    "usage": {
      "input_tokens": 1420,
      "output_tokens": 185,
      "cost_estimate": 0.000162
    }
  }
  ```

---

## ⚡ Cost Telemetry Logic
Costs are calculated per query using official, active billing rates:

### 🟢 Google Gemini 1.5 Flash
- **Input Tokens**: $0.075 per 1,000,000 tokens ($0.000000075 per token)
- **Output Tokens**: $0.30 per 1,000,000 tokens ($0.00000030 per token)
$$\text{Estimated Cost (USD)} = (\text{Input Tokens} \times 0.000000075) + (\text{Output Tokens} \times 0.00000030)$$

### 🔵 Anthropic Claude 3.5 Sonnet
- **Input Tokens**: $3.00 per 1,000,000 tokens ($0.000003 per token)
- **Output Tokens**: $15.00 per 1,000,000 tokens ($0.000015 per token)
$$\text{Estimated Cost (USD)} = (\text{Input Tokens} \times 0.000003) + (\text{Output Tokens} \times 0.000015)$$

These metrics are aggregated in-state on the frontend, showing session and individual query expense readouts.

---

## 🎯 Verification Scenarios

1. **Verify Strict Context**:
   - Ask a question *not* mentioned in the document (e.g. "What is the capital of Spain?"). The AI will reply: `"Not found in document."`
2. **Verify Citations**:
   - Ask a question that resides on specific pages. Check that the AI cites the page (e.g. "according to page 4...") and that the frontend extracts `["page 4"]` into the citation highlight tags.
3. **Verify Cost Estimation**:
   - Inspect the telemetry cards in the sidebar and chat feeds after asking questions. The dollar figures should increase instantly and accurately in real-time, matching Gemini's highly economical rates!
