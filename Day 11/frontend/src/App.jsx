import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Send, 
  FileText, 
  Trash2, 
  Zap, 
  DollarSign, 
  Database, 
  HelpCircle, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  AlertTriangle,
  Layers,
  ChevronRight,
  TrendingDown
} from 'lucide-react';

export default function App() {
  // -------------------------------------------------------------
  // Application State
  // -------------------------------------------------------------
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeDoc, setActiveDoc] = useState(null); // { fileName, totalPageCount, provider, chunkCount }
  
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState([]); // [{ id, sender, text, citations, telemetry, rag }]
  
  // Cumulative RAG telemetry for the session
  const [sessionTelemetry, setSessionTelemetry] = useState({
    input_tokens: 0,
    output_tokens: 0,
    cost_estimate: 0.000000
  });

  // Cumulative Full-Document estimated telemetry
  const [fullDocTelemetry, setFullDocTelemetry] = useState({
    cost_estimate: 0.000000,
    tokens_estimate: 0
  });

  // Last request telemetry
  const [lastTelemetry, setLastTelemetry] = useState(null);

  // Last query's retrieved vector chunks
  const [lastRagDetail, setLastRagDetail] = useState(null); // { retrievedChunks: [], savingsPercentage }

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll chat history to the bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAsking]);

  // Clear messages & status after a short time
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // -------------------------------------------------------------
  // Event Handlers
  // -------------------------------------------------------------

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        setErrorMsg('Invalid file format. Please upload a PDF file.');
        return;
      }
      setFile(selectedFile);
      uploadPdf(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type !== 'application/pdf') {
        setErrorMsg('Invalid file format. Please upload a PDF file.');
        return;
      }
      setFile(droppedFile);
      uploadPdf(droppedFile);
    }
  };

  // Upload PDF file to the backend, chunk it, embed it, and save to vector db
  const uploadPdf = async (selectedFile) => {
    setIsUploading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload PDF document');
      }

      // Store parsed document and chunk counts in state
      setActiveDoc({
        fileName: data.fileName,
        totalPageCount: data.totalPageCount,
        provider: data.provider,
        chunkCount: data.chunkCount
      });

      setSuccessMsg(`"${data.fileName}" successfully indexed! Split into ${data.chunkCount} vector chunks.`);
      
      // Clear out previous chat history and telemetry when a new document is uploaded
      setChatHistory([]);
      setLastTelemetry(null);
      setLastRagDetail(null);
      setSessionTelemetry({
        input_tokens: 0,
        output_tokens: 0,
        cost_estimate: 0.000000
      });
      setFullDocTelemetry({
        cost_estimate: 0.000000,
        tokens_estimate: 0
      });

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while uploading the file.');
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Reset active file session
  const handleRemoveFile = () => {
    setFile(null);
    setActiveDoc(null);
    setChatHistory([]);
    setLastTelemetry(null);
    setLastRagDetail(null);
    setSuccessMsg('Session cleared. Upload a new document.');
  };

  // Ask the active AI provider a question utilizing RAG
  const handleAskQuestion = async (e) => {
    e.preventDefault();

    if (!question.trim() || isAsking || !activeDoc) return;

    const currentQuestion = question.trim();
    setQuestion('');
    setIsAsking(true);
    setErrorMsg('');

    // 1. Append the user message to history
    const userMsgId = `user-${Date.now()}`;
    const userMessage = {
      id: userMsgId,
      sender: 'user',
      text: currentQuestion
    };

    setChatHistory(prev => [...prev, userMessage]);

    try {
      // 2. Query the backend
      const response = await fetch('/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: currentQuestion }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process question.');
      }

      // 3. Update session RAG telemetry
      setSessionTelemetry(prev => ({
        input_tokens: prev.input_tokens + data.usage.input_tokens,
        output_tokens: prev.output_tokens + data.usage.output_tokens,
        cost_estimate: Number((prev.cost_estimate + data.usage.cost_estimate).toFixed(6))
      }));

      // Update Full-Doc estimated telemetry for comparison
      setFullDocTelemetry(prev => ({
        cost_estimate: Number((prev.cost_estimate + data.rag.fullDocCostEstimate).toFixed(6)),
        tokens_estimate: prev.tokens_estimate + data.rag.fullDocTokensEstimate
      }));

      // Store last request telemetry for individual display
      setLastTelemetry({
        input_tokens: data.usage.input_tokens,
        output_tokens: data.usage.output_tokens,
        cost_estimate: data.usage.cost_estimate
      });

      // Store the RAG chunks details for visualization panel
      setLastRagDetail({
        retrievedChunks: data.rag.retrievedChunks,
        savingsPercentage: data.rag.savingsPercentage
      });

      // 4. Append AI response to history
      const aiMsgId = `ai-${Date.now()}`;
      const aiMessage = {
        id: aiMsgId,
        sender: 'ai',
        text: data.answer,
        citations: data.citations,
        telemetry: data.usage,
        rag: data.rag
      };

      setChatHistory(prev => [...prev, aiMessage]);

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during query execution.');
      
      setChatHistory(prev => [...prev, {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: `⚠️ Error: Could not get response. ${err.message}`,
        citations: []
      }]);
    } finally {
      setIsAsking(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Calculate cumulative savings percentage
  const totalSavingsPercentage = fullDocTelemetry.cost_estimate > 0
    ? Number((((fullDocTelemetry.cost_estimate - sessionTelemetry.cost_estimate) / fullDocTelemetry.cost_estimate) * 100).toFixed(1))
    : 0.0;

  // -------------------------------------------------------------
  // Render JSX
  // -------------------------------------------------------------
  return (
    <div className="dashboard-container">
      {/* HEADER SECTION */}
      <header className="app-header glass-panel">
        <div className="brand-section">
          <div className="logo-glow">
            <Sparkles className="logo-icon" size={24} />
          </div>
          <div>
            <h1 className="brand-title">Smart Doc Q&A <span className="title-version">RAG v2</span></h1>
          </div>
        </div>
        <div className="api-status">
          <span className={`status-dot ${activeDoc ? 'active' : ''}`}></span>
          <span>{activeDoc ? 'Vector DB Ready' : 'Awaiting PDF'}</span>
        </div>
      </header>

      {/* ERROR / SUCCESS ALERTS */}
      {errorMsg && (
        <div className="glass-panel alert-danger">
          <AlertTriangle size={20} className="file-info-icon" style={{ color: 'var(--danger)' }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="glass-panel alert-success">
          <CheckCircle2 size={20} className="file-info-icon" style={{ color: 'var(--accent)' }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* WORKSPACE CONTENT GRID */}
      <main className="workspace-layout">
        
        {/* SIDEBAR PANEL */}
        <section className="sidebar-panel">
          
          {/* UPLOAD SECTION */}
          <div className="upload-card glass-panel">
            <h2 className="section-title">
              <Upload size={16} /> Document Ingestion
            </h2>
            
            {!activeDoc ? (
              <div 
                className={`upload-zone ${isUploading ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={36} className="loader-spin" />
                    <p className="upload-text">Creating Vector Embeddings...</p>
                    <span className="upload-hint">Running text chunking & gemini-embedding-2</span>
                  </>
                ) : (
                  <>
                    <Upload size={36} className="upload-icon" />
                    <p className="upload-text">Drag & drop PDF here</p>
                    <span className="upload-hint">or click to browse files</span>
                  </>
                )}
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf"
                  className="hidden-file-input"
                  disabled={isUploading}
                />
              </div>
            ) : (
              <div className="active-file-box">
                <FileText className="file-info-icon" size={24} />
                <div className="file-details">
                  <div className="file-name" title={activeDoc.fileName}>{activeDoc.fileName}</div>
                  <div className="file-pages">{activeDoc.totalPageCount} pages • {activeDoc.chunkCount} vectors indexed</div>
                </div>
                <button 
                  className="btn-remove-file" 
                  onClick={handleRemoveFile} 
                  title="Remove document"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>

          {/* TELEMETRY CARD */}
          <div className="telemetry-card glass-panel">
            <h2 className="section-title">
              <Database size={16} /> Cost Telemetry comparison
            </h2>
            
            <div className="telemetry-grid">
              
              {/* Cost Metric Box - RAG Actual */}
              <div className="metric-box cost-rag">
                <div className="metric-label">RAG Session Cost (Actual)</div>
                <div className="metric-value-container">
                  <div className="metric-value">
                    ${sessionTelemetry.cost_estimate.toFixed(6)}
                  </div>
                  <div className="metric-unit">USD</div>
                </div>
              </div>

              {/* Cost Metric Box - Full-Doc Estimate */}
              <div className="metric-box cost-fulldoc">
                <div className="metric-label">Full-Doc Cost (Estimated)</div>
                <div className="metric-value-container">
                  <div className="metric-value">
                    ${fullDocTelemetry.cost_estimate.toFixed(6)}
                  </div>
                  <div className="metric-unit">USD</div>
                </div>
              </div>

              {/* Savings Dashboard Indicator */}
              {fullDocTelemetry.cost_estimate > 0 && (
                <div className="savings-glowing-pill">
                  <TrendingDown size={14} className="savings-icon" />
                  <span><strong>{totalSavingsPercentage}%</strong> Cost Savings using RAG!</span>
                </div>
              )}

              {/* Token Counters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="metric-box-small">
                  <div className="metric-label-small">RAG Tokens</div>
                  <div className="metric-value-small">
                    {(sessionTelemetry.input_tokens + sessionTelemetry.output_tokens).toLocaleString()}
                  </div>
                </div>
                <div className="metric-box-small">
                  <div className="metric-label-small">Full-Doc Tokens</div>
                  <div className="metric-value-small">
                    {fullDocTelemetry.tokens_estimate.toLocaleString()}
                  </div>
                </div>
              </div>

            </div>

            {lastTelemetry ? (
              <div className="telemetry-meta">
                <div className="meta-row">
                  <span>Last query RAG cost:</span>
                  <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                    ${lastTelemetry.cost_estimate.toFixed(6)}
                  </span>
                </div>
                <div className="meta-row">
                  <span>Last tokens (In/Out):</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>
                    {lastTelemetry.input_tokens} / {lastTelemetry.output_tokens}
                  </span>
                </div>
              </div>
            ) : (
              <div className="telemetry-meta">
                <span style={{ fontStyle: 'italic', textAlign: 'center' }}>No query executed in this session</span>
              </div>
            )}
          </div>

          {/* VECTOR DATABASE RETRIEVAL PANEL */}
          {lastRagDetail && (
            <div className="retrieved-chunks-panel glass-panel">
              <h2 className="section-title">
                <Layers size={14} /> Vector Retrieval (Top 3 Chunks)
              </h2>
              <div className="chunks-list">
                {lastRagDetail.retrievedChunks.map((chunk, index) => (
                  <div key={index} className="chunk-item-card">
                    <div className="chunk-item-header">
                      <span className="chunk-pill-index">#{index + 1}</span>
                      <span className="chunk-pill-page">Page {chunk.page}</span>
                      <span className="chunk-pill-similarity">
                        Similarity: {(chunk.similarity * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="chunk-item-text">
                      "{chunk.text}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>

        {/* CHAT CONSOLE */}
        <section className="chat-console glass-panel">
          
          <div className="chat-header">
            <div className="chat-header-info">
              <h2 className="chat-title">RAG Conversation Console</h2>
              <span className="chat-subtitle">
                {activeDoc ? `Vector Database active for "${activeDoc.fileName}"` : 'Awaiting document vector indexing'}
              </span>
            </div>
            {activeDoc && (
              <span className="session-badge">
                {activeDoc.provider} (RAG)
              </span>
            )}
          </div>

          {/* CHAT WINDOW */}
          <div className="chat-messages-container">
            {chatHistory.length === 0 ? (
              <div className="welcome-overlay">
                <div className="welcome-icon-box">
                  <Sparkles size={48} />
                </div>
                <h3 className="welcome-title">Smart Doc Q&A v2 (RAG)</h3>
                <p className="welcome-desc">
                  Upload a PDF document to create semantic vector chunk embeddings.
                  The assistant will query your vector store and answer questions using only the top 3 matching chunks!
                </p>
                <div className="features-bullet">
                  <div className="bullet-item">
                    <span className="bullet-dot"></span>
                    <span>Local JSON Vector Store: Computes cosine similarity search in pure JavaScript</span>
                  </div>
                  <div className="bullet-item">
                    <span className="bullet-dot"></span>
                    <span>Gemini Embedding: Text vectorized using <strong>gemini-embedding-2</strong></span>
                  </div>
                  <div className="bullet-item">
                    <span className="bullet-dot"></span>
                    <span>Massive Cost Reductions: Sends only top 3 chunks instead of full document text!</span>
                  </div>
                </div>
              </div>
            ) : (
              chatHistory.map((msg) => (
                <div key={msg.id} className={`message-bubble ${msg.sender}`}>
                  <div className="avatar-wrapper">
                    {msg.sender === 'user' ? (
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>ME</span>
                    ) : (
                      <Sparkles className="avatar-icon" size={16} />
                    )}
                  </div>
                  <div className="message-content-wrapper">
                    <div className="message-content">
                      {msg.text}
                    </div>
                    
                    {/* Render citations */}
                    {msg.sender === 'ai' && msg.citations && msg.citations.length > 0 && (
                      <div className="citation-list">
                        {msg.citations.map((cite, index) => (
                          <span key={index} className="citation-tag">
                            <CheckCircle2 size={12} /> {cite}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Collapsible RAG Sources Panel */}
                    {msg.sender === 'ai' && msg.rag && msg.rag.retrievedChunks && (
                      <details className="rag-sources-collapsible">
                        <summary className="rag-sources-summary">
                          <Layers size={12} style={{ marginRight: '4px' }} />
                          <span>View Retrieved Sources ({msg.rag.retrievedChunks.length})</span>
                        </summary>
                        <div className="rag-sources-content">
                          {msg.rag.retrievedChunks.map((chunk, idx) => (
                            <div key={idx} className="rag-source-item">
                              <div className="rag-source-header">
                                <span className="rag-source-pill">#{idx + 1}</span>
                                <span className="rag-source-page">Page {chunk.page}</span>
                                <span className="rag-source-sim">Similarity: {(chunk.similarity * 100).toFixed(1)}%</span>
                              </div>
                              <p className="rag-source-text">"{chunk.text}"</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {/* Render RAG-specific match stats */}
                    {msg.sender === 'ai' && msg.rag && (
                      <div className="chat-telemetry-pill">
                        <span className="telemetry-item" style={{ color: 'var(--accent)' }}>
                          RAG Input: {msg.telemetry.input_tokens} t
                        </span>
                        <span>•</span>
                        <span className="telemetry-item" style={{ textDecoration: 'line-through' }}>
                          Full-Doc: {msg.rag.fullDocTokensEstimate} t
                        </span>
                        <span>•</span>
                        <span className="telemetry-item" style={{ color: 'var(--secondary)' }}>
                          Savings: {msg.rag.savingsPercentage}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {/* Show thinking indicator */}
            {isAsking && (
              <div className="message-bubble ai">
                <div className="avatar-wrapper">
                  <Loader2 className="avatar-icon loader-spin" size={16} />
                </div>
                <div className="message-content-wrapper">
                  <div className="thinking-box">
                    Searching Vector database & generating answer via {activeDoc?.provider || 'AI Assistant'}...
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* CHAT INPUT AREA */}
          <form className="chat-input-form" onSubmit={handleAskQuestion}>
            <div className="input-container">
              <input
                type="text"
                className="styled-text-input"
                placeholder={activeDoc ? "Ask a question about the document (queries vector store)..." : "Please upload a PDF document to begin..."}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={!activeDoc || isAsking}
              />
              <button
                type="submit"
                className="btn-send"
                disabled={!activeDoc || !question.trim() || isAsking}
              >
                <span>Ask RAG</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </form>

        </section>

      </main>
    </div>
  );
}
