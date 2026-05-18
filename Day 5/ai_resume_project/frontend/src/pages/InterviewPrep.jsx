import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';

const InterviewPrep = () => {
  const location = useLocation();
  const resumeData = location.state?.resumeData;
  
  const [questions, setQuestions] = useState(resumeData?.interviewQuestions || []);
  const [activeCategory, setActiveCategory] = useState('Technical');
  const [language, setLanguage] = useState('JavaScript');
  const [loading, setLoading] = useState(false);
  const [showAnswers, setShowAnswers] = useState({});

  const categories = ['Technical', 'Behavioral', 'Educational', 'Resume Related'];

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const payload = resumeData ? { resumeData } : { language };
      const { data } = await api.post('/interviews/generate', payload);
      setQuestions(data.questions);
    } catch (err) {
      alert('Failed to generate interview questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resumeData && questions.length === 0) {
      fetchQuestions();
    }
  }, [resumeData]);

  const toggleAnswer = (index) => {
    setShowAnswers(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="animate-in" style={styles.container}>
      <header style={styles.header}>
        <h1 className="text-gradient" style={styles.title}>AI Mock Interview</h1>
        <p style={styles.subtitle}>
          {resumeData ? `Interviewing based on: ${resumeData.title}` : 'Prepare for your dream role with realistic AI scenarios.'}
        </p>
      </header>

      {!resumeData && (
        <div className="glass" style={styles.setupCard}>
          <div className="input-group">
            <label>Select Language / Technology</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option>JavaScript</option>
              <option>Python</option>
              <option>Java</option>
              <option>C++</option>
              <option>React</option>
              <option>Node.js</option>
              <option>SQL</option>
              <option>MongoDB</option>
              <option>Docker</option>
              <option>AWS</option>
            </select>
          </div>
          <button onClick={fetchQuestions} className="btn-primary" style={styles.startBtn} disabled={loading}>
            {loading ? 'Initializing AI Interviewer...' : 'Start Session'}
          </button>
        </div>
      )}

      <div style={styles.tabBar}>
        {categories.map(cat => (
          <button 
            key={cat} 
            onClick={() => setActiveCategory(cat)}
            style={{
              ...styles.tabBtn,
              ...(activeCategory === cat ? styles.activeTab : {})
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={styles.questionList}>
        {loading && <div style={styles.loading}>AI is studying your profile...</div>}
        
        {!loading && (questions.filter(q => 
          q.category?.trim().toLowerCase() === activeCategory.toLowerCase()
        )).map((q, i) => (
          <div key={i} className="glass animate-in" style={styles.qCard}>
            <div style={styles.qHeader}>
              <span style={styles.category}>{q.category}</span>
              <span style={styles.qNum}>Question {i + 1}</span>
            </div>
            <h3 style={styles.questionText}>{q.question}</h3>
            
            <div style={styles.qActions}>
              <button onClick={() => toggleAnswer(i)} style={styles.toggleBtn}>
                {showAnswers[i] ? 'Hide Suggested Answer' : 'Show Suggested Answer'}
              </button>
            </div>

            {showAnswers[i] && (
              <div style={styles.answerBox} className="animate-in">
                <p>{q.suggestedAnswer}</p>
              </div>
            )}
          </div>
        ))}

        {!loading && questions.filter(q => 
          q.category?.trim().toLowerCase() === activeCategory.toLowerCase()
        ).length === 0 && (
          <div style={styles.loading}>No questions generated for this category yet.</div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '140px 2rem 4rem', maxWidth: '900px', margin: '0 auto' },
  header: { textAlign: 'center', marginBottom: '4rem' },
  title: { fontSize: '3rem', fontWeight: '800' },
  subtitle: { color: 'var(--text-muted)', fontSize: '1.1rem', marginTop: '1rem' },

  setupCard: { padding: '3rem', borderRadius: '2rem', marginBottom: '4rem', display: 'flex', gap: '2rem', alignItems: 'flex-end' },
  startBtn: { height: '56px', padding: '0 3rem' },

  tabBar: { display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '4rem', flexWrap: 'wrap' },
  tabBtn: { padding: '0.8rem 1.5rem', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: 'var(--text-muted)', fontWeight: '600', transition: 'all 0.3s ease' },
  activeTab: { background: 'var(--primary)', color: 'white', border: '1px solid var(--primary)', boxShadow: '0 10px 20px var(--primary-glow)' },

  questionList: { display: 'flex', flexDirection: 'column', gap: '2rem' },
  loading: { textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', fontSize: '1.2rem' },
  
  qCard: { padding: '2.5rem', borderRadius: '2rem' },
  qHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' },
  category: { background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '0.3rem 0.8rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '700' },
  qNum: { color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' },
  questionText: { fontSize: '1.5rem', fontWeight: '800', lineHeight: '1.4', marginBottom: '2rem' },
  
  qActions: { display: 'flex', justifyContent: 'flex-end' },
  toggleBtn: { background: 'none', color: 'var(--primary)', fontWeight: '700', fontSize: '0.9rem' },
  
  answerBox: { 
    marginTop: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', 
    borderRadius: '1.25rem', border: '1px solid var(--border-light)', color: 'var(--text-muted)', lineHeight: '1.6' 
  }
};

export default InterviewPrep;
