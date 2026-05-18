import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const ResumeAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert('Please select a file');

    setLoading(true);
    const formData = new FormData();
    formData.append('resume', file);

    try {
      const { data } = await api.post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(data);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to analyze resume. Make sure it is a valid PDF.';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const startInterview = () => {
    navigate('/interview-prep', { state: { resumeData: result } });
  };

  return (
    <div className="animate-in" style={styles.container}>
      <header style={styles.header}>
        <h1 className="text-gradient" style={styles.title}>AI Resume Intelligence</h1>
        <p style={styles.subtitle}>Upload your resume for deep AI analysis and specialized interview coaching.</p>
      </header>

      <div style={styles.mainContent}>
        {!result ? (
          <div className="glass" style={styles.uploadCard}>
            <div style={styles.uploadArea}>
              <div style={styles.icon}>📄</div>
              <h3 style={styles.uploadTitle}>Drop your resume here</h3>
              <p style={styles.uploadSub}>Supports PDF format only</p>
              <input type="file" accept=".pdf" onChange={handleFileChange} style={styles.fileInput} id="resume-upload" />
              <label htmlFor="resume-upload" className="btn-primary" style={styles.uploadBtn}>
                {file ? file.name : 'Select PDF File'}
              </label>
            </div>
            {file && (
              <button onClick={handleUpload} className="btn-primary" style={styles.analyzeBtn} disabled={loading}>
                {loading ? 'Analyzing with AI...' : '🚀 Start Analysis'}
              </button>
            )}
          </div>
        ) : (
          <div className="animate-in" style={styles.resultsContainer}>
            <div className="glass" style={styles.fullWidthCard}>
              <div style={styles.actionCardContent}>
                <div style={styles.profileHeader}>
                  <h3 style={styles.actionTitle}>{result.fullName || 'Professional Profile'}</h3>
                </div>
                
                <div style={styles.divider}></div>

                <div style={styles.skillsSection}>
                  <h4 style={styles.secTitle}>Key Skills Detected</h4>
                  <div style={styles.skillsGridCentered}>
                    {result.skills.map((skill, i) => (
                      <span key={i} style={styles.skillBadge}>{skill}</span>
                    ))}
                  </div>
                </div>

                <div style={styles.divider}></div>

                <div style={styles.actionButtons}>
                  <button onClick={startInterview} className="btn-primary" style={styles.interviewBtn}>
                    🎯 Start Mock Interview Based on Resume
                  </button>
                  <button onClick={() => setResult(null)} style={styles.resetBtn}>Upload Different Resume</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '140px 2rem 4rem', maxWidth: '1200px', margin: '0 auto' },
  header: { textAlign: 'center', marginBottom: '4rem' },
  title: { fontSize: '3.5rem', fontWeight: '800', marginBottom: '1rem' },
  subtitle: { color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto' },

  mainContent: { display: 'flex', justifyContent: 'center' },
  uploadCard: { 
    width: '100%', maxWidth: '600px', padding: '4rem', borderRadius: '2.5rem', 
    textAlign: 'center', border: '2px dashed var(--border-light)', background: 'rgba(255,255,255,0.02)' 
  },
  uploadArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' },
  icon: { fontSize: '4rem', opacity: 0.8 },
  uploadTitle: { fontSize: '1.5rem', fontWeight: '800' },
  uploadSub: { color: 'var(--text-muted)' },
  fileInput: { display: 'none' },
  uploadBtn: { cursor: 'pointer', padding: '0.8rem 2rem' },
  analyzeBtn: { width: '100%', marginTop: '3rem', height: '56px' },

  resultsContainer: { width: '100%', display: 'flex', flexDirection: 'column', gap: '3rem' },
  fullWidthCard: { padding: '4rem', borderRadius: '2rem', width: '100%', maxWidth: '900px', margin: '0 auto' },
  actionCardContent: { display: 'flex', flexDirection: 'column' },
  profileHeader: { textAlign: 'center', marginBottom: '1rem' },
  actionButtons: { display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' },
  actionTitle: { fontSize: '3rem', fontWeight: '900', marginBottom: '0.5rem', color: 'white', textAlign: 'center' },
  profileEmail: { color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '1rem' },
  summaryText: { color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '2rem' },
  skillsSection: { textAlign: 'center' },
  skillsGridCentered: { display: 'flex', flexWrap: 'wrap', gap: '0.8rem', justifyContent: 'center', marginBottom: '1rem' },
  skillBadge: { background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '0.5rem 1.2rem', borderRadius: '100px', fontSize: '0.9rem', fontWeight: '700' },
  
  interviewBtn: { height: '60px', fontSize: '1rem' },
  resetBtn: { marginTop: '1.5rem', background: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' },

  detailsSection: { padding: '4rem', borderRadius: '2rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)' },
  detailsTitle: { fontSize: '2rem', fontWeight: '800', marginBottom: '1.5rem', textAlign: 'center' },
  detailsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem' },
  detailBlock: { display: 'flex', flexDirection: 'column', gap: '2rem' },
  detailItem: { paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-light)' },

  questionsSection: { padding: '4rem', borderRadius: '2rem', marginBottom: '3rem' },
  questionsDesc: { textAlign: 'center', color: 'var(--text-muted)', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 2rem' },
  tabBar: { display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem', flexWrap: 'wrap' },
  tabBtn: { padding: '0.8rem 1.5rem', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: 'var(--text-muted)', fontWeight: '600', transition: 'all 0.3s ease' },
  activeTab: { background: 'var(--primary)', color: 'white', border: '1px solid var(--primary)', boxShadow: '0 10px 20px var(--primary-glow)' },
  categoryContent: { marginTop: '1rem' },
  emptyMsg: { textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontStyle: 'italic' },
  qaList: { display: 'flex', flexDirection: 'column', gap: '2rem' },
  qaItem: { padding: '2rem', borderRadius: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)' },
  qHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' },
  qBadge: { fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase' },
  categoryTag: { fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '100px', color: 'var(--primary)' },
  questionText: { fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem', lineHeight: '1.4' },
  answerBox: { padding: '1.5rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.03)', borderLeft: '4px solid var(--primary)' },
};

export default ResumeAnalyzer;
