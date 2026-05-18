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
  AlertTriangle 
} from 'lucide-react';

export default function App() {
  // -------------------------------------------------------------
  // Application State
  // -------------------------------------------------------------
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeDoc, setActiveDoc] = useState(null); // { fileName, totalPageCount }
  
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState([]); // [{ id, sender, text, citations, telemetry }]
  
  // Cumulative telemetry for the session
  const [sessionTelemetry, setSessionTelemetry] = useState({
    input_tokens: 0,
    output_tokens: 0,
    cost_estimate: 0.000000
  });

  // Last request telemetry
  const [lastTelemetry, setLastTelemetry] = useState(null);

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

  // Triggered when file is chosen via file picker
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

  // Drag and drop handlers
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

  // Upload PDF file to the backend
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

      // Store parsed document info in state
      setActiveDoc({
        fileName: data.fileName,
        totalPageCount: data.totalPageCount,
        provider: data.provider
      });

      setSuccessMsg(`"${data.fileName}" successfully parsed! (${data.totalPageCount} pages)`);
      
      // Clear out previous chat history when a new document is uploaded
      setChatHistory([]);
      setLastTelemetry(null);

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
    setSuccessMsg('Session cleared. Upload a new document.');
  };

  // Ask Claude a question about the active document
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

      // 3. Update session telemetry
      setSessionTelemetry(prev => ({
        input_tokens: prev.input_tokens + data.usage.input_tokens,
        output_tokens: prev.output_tokens + data.usage.output_tokens,
        cost_estimate: Number((prev.cost_estimate + data.usage.cost_estimate).toFixed(6))
      }));

      // Store last request telemetry for individual display
      setLastTelemetry({
        input_tokens: data.usage.input_tokens,
        output_tokens: data.usage.output_tokens,
        cost_estimate: data.usage.cost_estimate
      });

      // 4. Append AI response to history
      const aiMsgId = `ai-${Date.now()}`;
      const aiMessage = {
        id: aiMsgId,
        sender: 'ai',
        text: data.answer,
        citations: data.citations,
        telemetry: data.usage
      };

      setChatHistory(prev => [...prev, aiMessage]);

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during query execution.');
      
      // Append error notification to chat
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

  // Helper to trigger clicking hidden input element
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

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
            <h1 className="brand-title">Smart Doc Q&A</h1>
          </div>
        </div>
        <div className="api-status">
          <span className={`status-dot ${activeDoc ? 'active' : ''}`}></span>
          <span>{activeDoc ? 'Document Active' : 'Ready'}</span>
        </div>
      </header>

      {/* ERROR / SUCCESS ALERTS */}
      {errorMsg && (
        <div className="glass-panel" style={{
          padding: '1rem',
          marginBottom: '1rem',
          borderColor: 'var(--danger)',
          background: 'rgba(239, 68, 68, 0.08)',
          color: '#fca5a5',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <AlertTriangle size={20} className="file-info-icon" style={{ color: 'var(--danger)' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="glass-panel" style={{
          padding: '1rem',
          marginBottom: '1rem',
          borderColor: 'var(--accent)',
          background: 'rgba(20, 184, 166, 0.08)',
          color: '#99f6e4',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <CheckCircle2 size={20} className="file-info-icon" style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{successMsg}</span>
        </div>
      )}

      {/* WORKSPACE CONTENT GRID */}
      <main className="workspace-layout">
        
        {/* SIDEBAR PANEL */}
        <section className="sidebar-panel">
          
          {/* UPLOAD SECTION */}
          <div className="upload-card glass-panel">
            <h2 className="section-title">
              <Upload size={16} /> Document Upload
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
                    <p className="upload-text">Extracting document pages...</p>
                    <span className="upload-hint">Performing character mapping</span>
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
                  <div className="file-pages">{activeDoc.totalPageCount} pages indexed</div>
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
              <Database size={16} /> Cost Telemetry
            </h2>
            
            <div className="telemetry-grid">
              
              {/* Cost Metric Box */}
              <div className="metric-box cost">
                <div className="metric-label">Session Cost</div>
                <div className="metric-value-container">
                  <div className="metric-value">
                    ${sessionTelemetry.cost_estimate.toFixed(6)}
                  </div>
                  <div className="metric-unit">USD</div>
                </div>
              </div>

              {/* Input Tokens Box */}
              <div className="metric-box">
                <div className="metric-label">Input Tokens</div>
                <div className="metric-value-container">
                  <div className="metric-value">
                    {sessionTelemetry.input_tokens.toLocaleString()}
                  </div>
                  <div className="metric-unit">tokens</div>
                </div>
              </div>

              {/* Output Tokens Box */}
              <div className="metric-box">
                <div className="metric-label">Output Tokens</div>
                <div className="metric-value-container">
                  <div className="metric-value">
                    {sessionTelemetry.output_tokens.toLocaleString()}
                  </div>
                  <div className="metric-unit">tokens</div>
                </div>
              </div>

            </div>

            {/* Micro-Details telemetry footer */}
            {lastTelemetry ? (
              <div className="telemetry-meta">
                <div className="meta-row">
                  <span>Last query cost:</span>
                  <span style={{ color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>
                    ${lastTelemetry.cost_estimate.toFixed(6)}
                  </span>
                </div>
                <div className="meta-row">
                  <span>Last input / output:</span>
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

        </section>

        {/* CHAT CONSOLE */}
        <section className="chat-console glass-panel">
          
          <div className="chat-header">
            <div className="chat-header-info">
              <h2 className="chat-title">Conversation Console</h2>
              <span className="chat-subtitle">
                {activeDoc ? `Answering based strictly on "${activeDoc.fileName}"` : 'Awaiting document context'}
              </span>
            </div>
            {activeDoc && (
              <span className="session-badge">
                {activeDoc.provider || 'Claude 3.5 Sonnet'}
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
                <h3 className="welcome-title">Welcome to Smart Doc Q&A</h3>
                <p className="welcome-desc">
                  Upload a PDF document in the sidebar to load its page-by-page text context. 
                  Then, ask questions and receive strictly verified answers with precise page references.
                </p>
                <div className="features-bullet">
                  <div className="bullet-item">
                    <span className="bullet-dot"></span>
                    <span>Answers are generated <strong>exclusively</strong> from document context</span>
                  </div>
                  <div className="bullet-item">
                    <span className="bullet-dot"></span>
                    <span>Real-time page citation mapping</span>
                  </div>
                  <div className="bullet-item">
                    <span className="bullet-dot"></span>
                    <span>Live token-by-token API expense tracking</span>
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
                    
                    {/* Render citations if AI message has them */}
                    {msg.sender === 'ai' && msg.citations && msg.citations.length > 0 && (
                      <div className="citation-list">
                        {msg.citations.map((cite, index) => (
                          <span key={index} className="citation-tag">
                            <CheckCircle2 size={12} /> {cite}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Render query specific telemetry */}
                    {msg.sender === 'ai' && msg.telemetry && (
                      <div className="chat-telemetry-pill">
                        <span className="telemetry-item">
                          Input: {msg.telemetry.input_tokens} t
                        </span>
                        <span>•</span>
                        <span className="telemetry-item">
                          Output: {msg.telemetry.output_tokens} t
                        </span>
                        <span>•</span>
                        <span className="telemetry-item" style={{ color: 'var(--secondary)' }}>
                          Cost: ${msg.telemetry.cost_estimate.toFixed(6)}
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
                    Claude is scanning page context...
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
                placeholder={activeDoc ? "Ask a question about the document..." : "Please upload a PDF document to begin..."}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={!activeDoc || isAsking}
              />
              <button
                type="submit"
                className="btn-send"
                disabled={!activeDoc || !question.trim() || isAsking}
              >
                <span>Ask</span>
                <Send size={16} />
              </button>
            </div>
          </form>

        </section>

      </main>
    </div>
  );
}
