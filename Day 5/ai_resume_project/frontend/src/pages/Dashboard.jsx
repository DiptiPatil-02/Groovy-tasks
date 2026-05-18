import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const Dashboard = () => {
  const [resumes, setResumes] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resumeRes, interviewRes] = await Promise.all([
          api.get('/resumes'),
          api.get('/interviews')
        ]);
        setResumes(resumeRes.data);
        setInterviews(interviewRes.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const avgScore = resumes.length > 0 
    ? Math.round(resumes.reduce((acc, curr) => acc + curr.score, 0) / resumes.length) 
    : 0;

  if (loading) return (
    <div style={styles.loadingWrapper}>
      <div className="spinner"></div>
      <p>Synchronizing your intelligence...</p>
    </div>
  );

  return (
    <div className="animate-in" style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 className="text-gradient" style={styles.title}>Your Career Engine</h1>
          <p style={styles.subtitle}>Analyze, optimize, and dominate your next career move.</p>
        </div>
        <Link to="/resume-builder" className="btn-primary" style={styles.cta}>
          <span style={{ fontSize: '1.2rem' }}>+</span> New Analysis
        </Link>
      </header>

      {/* Stats Board */}
      <section style={styles.statsBoard}>
        <div className="glass" style={styles.statCard}>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Documents</span>
            <span style={styles.statValue}>{resumes.length}</span>
          </div>
          <div style={styles.statIcon}>📄</div>
        </div>
        <div className="glass" style={styles.statCard}>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Avg Score</span>
            <span style={styles.statValue}>{avgScore}%</span>
          </div>
          <div style={styles.statIcon}>📈</div>
        </div>
        <div className="glass" style={styles.statCard}>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Mock Sessions</span>
            <span style={styles.statValue}>{interviews.length}</span>
          </div>
          <div style={styles.statIcon}>🎯</div>
        </div>
      </section>

      <div style={styles.mainGrid}>
        {/* Resumes */}
        <section style={styles.gridColumn}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Recent Resumes</h3>
            <span style={styles.badge}>{resumes.length}</span>
          </div>
          <div style={styles.scrollList}>
            {resumes.length === 0 ? (
              <div className="glass" style={styles.emptyState}>
                No resumes analyzed yet.
              </div>
            ) : (
              resumes.map(resume => (
                <div key={resume._id} className="glass glass-hover" style={styles.itemCard}>
                  <div style={styles.itemHeader}>
                    <h4 style={styles.itemTitle}>{resume.fullName || resume.title}</h4>
                    <div style={styles.scoreBadge(resume.score)}>{resume.score}%</div>
                  </div>
                  <p style={styles.itemDesc}>{resume.title}</p>
                  <div style={styles.skillsList}>
                    {resume.skills.slice(0, 4).map(skill => (
                      <span key={skill} style={styles.skillTag}>{skill}</span>
                    ))}
                    {resume.skills.length > 4 && <span style={styles.skillTag}>+{resume.skills.length - 4}</span>}
                  </div>
                  <div style={styles.itemFooter}>
                    <Link to={`/resume-builder?id=${resume._id}`} style={styles.itemLink}>View Insights →</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Interviews */}
        <section style={styles.gridColumn}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Mock Interviews</h3>
            <span style={styles.badge}>{interviews.length}</span>
          </div>
          <div style={styles.scrollList}>
            {interviews.length === 0 ? (
              <div className="glass" style={styles.emptyState}>
                Practice makes perfect. Start one!
              </div>
            ) : (
              interviews.map(interview => (
                <div key={interview._id} className="glass glass-hover" style={styles.itemCard}>
                  <div style={styles.itemHeader}>
                    <h4 style={styles.itemTitle}>{interview.role}</h4>
                    <div style={styles.dateBadge}>{new Date(interview.createdAt).toLocaleDateString()}</div>
                  </div>
                  <p style={styles.itemDesc}>{interview.questions.length} AI-generated questions</p>
                  <div style={styles.itemFooter}>
                    <Link to={`/interview-prep?id=${interview._id}`} style={styles.itemLink}>Review Session →</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '120px 2rem 4rem',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  loadingWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: '1.5rem',
    color: 'var(--text-muted)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: '4rem',
  },
  title: {
    fontSize: '3.5rem',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1.1rem',
    color: 'var(--text-muted)',
  },
  cta: {
    padding: '1rem 2rem',
    borderRadius: '100px',
    textDecoration: 'none',
  },
  statsBoard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    marginBottom: '4rem',
  },
  statCard: {
    padding: '2rem',
    borderRadius: 'var(--radius-xl)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  statLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  statValue: {
    fontSize: '2.5rem',
    fontWeight: '800',
    color: 'white',
  },
  statIcon: {
    fontSize: '2rem',
    opacity: 0.8,
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '3rem',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    color: 'white',
  },
  badge: {
    background: 'rgba(255,255,255,0.05)',
    padding: '0.2rem 0.75rem',
    borderRadius: '100px',
    fontSize: '0.8rem',
    fontWeight: '700',
    color: 'var(--primary)',
    border: '1px solid var(--border-light)',
  },
  scrollList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  itemCard: {
    padding: '1.75rem',
    borderRadius: 'var(--radius-lg)',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  itemTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
  },
  itemDesc: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    marginBottom: '1rem',
  },
  scoreBadge: (score) => ({
    background: score > 75 ? 'rgba(16, 185, 129, 0.1)' : score > 50 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
    color: score > 75 ? 'var(--success)' : score > 50 ? 'var(--warning)' : 'var(--danger)',
    padding: '0.25rem 0.75rem',
    borderRadius: '100px',
    fontSize: '0.8rem',
    fontWeight: '800',
    border: '1px solid currentColor',
  }),
  dateBadge: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontWeight: '600',
  },
  skillsList: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    marginBottom: '1.5rem',
  },
  skillTag: {
    fontSize: '0.7rem',
    background: 'rgba(255,255,255,0.03)',
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
    color: 'var(--text-muted)',
    border: '1px solid var(--border-light)',
  },
  itemFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  itemLink: {
    color: 'var(--primary)',
    textDecoration: 'none',
    fontSize: '0.85rem',
    fontWeight: '700',
  },
  emptyState: {
    padding: '3rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
    borderRadius: 'var(--radius-lg)',
    border: '1px dashed var(--border-light)',
  }
};

export default Dashboard;
