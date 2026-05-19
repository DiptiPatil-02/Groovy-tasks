import { useState } from "react";
import { UploadCloud, FileText, Loader2, Search, ArrowRight, BookOpen, Layers, AlignLeft, ListTree } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BACKEND_URL = "http://localhost:5000";

export default function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [docId, setDocId] = useState(null);
  const [stats, setStats] = useState(null);

  const [question, setQuestion] = useState("");
  const [querying, setQuerying] = useState(false);
  const [results, setResults] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/upload`, { 
        method: "POST", 
        body: formData 
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDocId(data.docId);
      setStats(data.stats);
    } catch (err) {
      alert(err.message || "Failed to upload");
    } finally {
      setUploading(false);
    }
  };

  const handleQuery = async (e) => {
    e.preventDefault();
    if (!docId || !question) return;

    setQuerying(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId, question }),
      });
      const data = await res.json();
      if (data.error) {
        if (data.error === "Document not found") {
          setDocId(null);
          setStats(null);
          setResults(null);
        }
        throw new Error(data.error);
      }
      setResults(data.results);
    } catch (err) {
      alert(err.message || "Failed to query");
    } finally {
      setQuerying(false);
    }
  };

  const getStrategyIcon = (key) => {
    switch(key) {
      case 'fixed': return <BookOpen className="w-5 h-5 text-blue-400" />;
      case 'sliding': return <Layers className="w-5 h-5 text-purple-400" />;
      case 'semantic': return <AlignLeft className="w-5 h-5 text-emerald-400" />;
      case 'hierarchical': return <ListTree className="w-5 h-5 text-orange-400" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-20">
        
        {/* Header */}
        <header className="text-center mb-16 space-y-4">
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-4 border border-indigo-500/20"
          >
            <Search className="w-8 h-8 text-indigo-400" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400"
          >
            Ask My PDF
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.1 }} 
            className="text-slate-400 max-w-2xl mx-auto text-lg"
          >
            Compare 4 different chunking strategies and see how they affect RAG retrieval performance.
          </motion.p>
        </header>

        {/* State 1: Upload */}
        <AnimatePresence mode="wait">
          {!docId && (
            <motion.div 
              key="upload" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="max-w-xl mx-auto"
            >
              <form onSubmit={handleUpload} className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
                <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 transition-colors rounded-2xl p-10 text-center relative group">
                  <input 
                    type="file" 
                    accept="application/pdf" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    required 
                  />
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-slate-800 rounded-full group-hover:scale-110 transition-transform duration-300">
                      <UploadCloud className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-slate-200">
                        {file ? file.name : "Drop your PDF here"}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {file ? "Ready to upload" : "or click to browse"}
                      </p>
                    </div>
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  disabled={!file || uploading} 
                  className="w-full mt-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_40px_-10px_rgba(99,102,241,0.4)]"
                >
                  {uploading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Processing & Chunking...</>
                  ) : (
                    <><FileText className="w-5 h-5" /> Analyze Document</>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* State 2: Query */}
          {docId && (
            <motion.div 
              key="query" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="space-y-12"
            >
              
              <div className="max-w-3xl mx-auto">
                <form onSubmit={handleQuery} className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                  <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl">
                    <input 
                      type="text" 
                      value={question} 
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask any question about the document..." 
                      className="w-full bg-transparent text-slate-100 placeholder-slate-500 px-6 py-4 outline-none text-lg"
                      required
                    />
                    <button 
                      type="submit" 
                      disabled={querying} 
                      className="bg-indigo-500 hover:bg-indigo-400 text-white p-4 rounded-xl transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {querying ? <Loader2 className="w-6 h-6 animate-spin" /> : <ArrowRight className="w-6 h-6" />}
                    </button>
                  </div>
                </form>
                
                {stats && (
                  <div className="flex justify-center gap-6 mt-6 text-sm text-slate-400">
                    <span className="flex items-center gap-2"><BookOpen className="w-4 h-4"/> Fixed: {stats.fixed}</span>
                    <span className="flex items-center gap-2"><Layers className="w-4 h-4"/> Sliding: {stats.sliding}</span>
                    <span className="flex items-center gap-2"><AlignLeft className="w-4 h-4"/> Semantic: {stats.semantic}</span>
                    <span className="flex items-center gap-2"><ListTree className="w-4 h-4"/> Hierarchical: {stats.hierarchical}</span>
                  </div>
                )}
              </div>

              {/* Results Grid */}
              {results && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-8">
                  {Object.entries(results).map(([strategy, data], i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ delay: i * 0.1 }}
                      key={strategy} 
                      className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl overflow-hidden flex flex-col"
                    >
                      <div className="bg-slate-800/50 border-b border-slate-800 p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStrategyIcon(strategy)}
                          <h3 className="text-lg font-semibold capitalize text-slate-200">{strategy} Chunking</h3>
                        </div>
                      </div>
                      
                      <div className="p-6 flex-grow">
                        <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap">
                          {data.answer}
                        </div>
                      </div>
                      
                      <div className="p-6 bg-slate-950/50 border-t border-slate-800">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Top Retrieved Context</h4>
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                          {data.chunks.map((c, idx) => (
                            <div 
                              key={idx} 
                              className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-sm text-slate-400 hover:border-slate-700 transition-colors"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-mono text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded">Rank #{idx + 1}</span>
                                <span className="text-xs text-slate-500">Score: {c.score.toFixed(3)}</span>
                              </div>
                              <p className="line-clamp-3 hover:line-clamp-none transition-all">{c.chunk.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
