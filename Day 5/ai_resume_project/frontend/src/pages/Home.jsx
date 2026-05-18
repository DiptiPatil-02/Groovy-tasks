import { Link } from 'react-router-dom';
import api from '../utils/api';

const Home = () => {
  return (
    <div className="animate-in" style={styles.container}>
      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroBadge}>✨ Powered by Next-Gen AI</div>
        <h1 style={styles.mainTitle}>
          Master Your <span className="text-gradient-primary">Career Path</span> with AI Intelligence
        </h1>
        <p style={styles.heroSub}>
          The all-in-one platform to analyze your resume, get professional coaching, and ace your next interview with personalized AI mock sessions.
        </p>
        <div style={styles.ctaGroup}>
          <Link to="/resume-builder" className="btn-primary" style={styles.mainCta}>
            Analyze Your Resume Now
          </Link>
          {localStorage.getItem('token') && (
            <button 
              onClick={async () => {
                if(window.confirm('Are you sure you want to reset all your data? This cannot be undone.')) {
                  try {
                    await api.delete('/auth/reset-data');
                    alert('Data reset successfully!');
                    window.location.reload();
                  } catch (err) {
                    alert('Failed to reset data.');
                  }
                }
              }} 
              className="btn-ghost" 
              style={{ ...styles.secCta, color: 'var(--danger)', borderColor: 'var(--danger)' }}
            >
              Reset All Data
            </button>
          )}
        </div>
      </section>

      {/* Features Grid */}
      <section style={styles.features}>
        <div className="glass" style={styles.featureCard}>
          <div style={styles.featureIcon}>🔍</div>
          <h3>AI Resume Audit</h3>
          <p>Get a deep-dive analysis of your resume with professional ATS scoring and actionable improvement tips.</p>
        </div>
        <div className="glass" style={styles.featureCard}>
          <div style={styles.featureIcon}>🎯</div>
          <h3>Personalized Coaching</h3>
          <p>Our AI learns from your specific experience to generate mock interviews that mirror real recruiter behavior.</p>
        </div>
        <div className="glass" style={styles.featureCard}>
          <div style={styles.featureIcon}>📈</div>
          <h3>Growth Tracking</h3>
          <p>Monitor your progress, save your interview sessions, and watch your readiness score climb over time.</p>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section style={styles.stats}>
        <div style={styles.statItem}>
          <span style={styles.statNum}>98%</span>
          <span style={styles.statLab}>ATS Accuracy</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statNum}>10k+</span>
          <span style={styles.statLab}>Users Coached</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statNum}>24/7</span>
          <span style={styles.statLab}>AI Availability</span>
        </div>
      </section>

    </div>
  );
};

const styles = {
  container: { padding: '160px 2rem 4rem', maxWidth: '1200px', margin: '0 auto' },
  hero: { textAlign: 'center', marginBottom: '8rem' },
  heroBadge: { 
    display: 'inline-block', padding: '0.5rem 1.25rem', background: 'rgba(99, 102, 241, 0.1)', 
    borderRadius: '100px', color: 'var(--primary)', fontWeight: '700', fontSize: '0.85rem', marginBottom: '2rem',
    border: '1px solid var(--primary-glow)'
  },
  mainTitle: { fontSize: '4.5rem', fontWeight: '900', letterSpacing: '-3px', lineHeight: '1.1', marginBottom: '2rem' },
  heroSub: { fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '700px', margin: '0 auto 3rem', lineHeight: '1.6' },
  ctaGroup: { display: 'flex', gap: '1.5rem', justifyContent: 'center' },
  mainCta: { padding: '1rem 2.5rem', fontSize: '1.1rem', textDecoration: 'none' },
  secCta: { padding: '1rem 2.5rem', fontSize: '1.1rem', textDecoration: 'none' },

  features: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '8rem' },
  featureCard: { padding: '3rem', borderRadius: '2.5rem', textAlign: 'center' },
  featureIcon: { fontSize: '3rem', marginBottom: '1.5rem' },

  stats: { 
    display: 'flex', justifyContent: 'space-around', gap: '2rem', marginBottom: '8rem', 
    padding: '4rem', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' 
  },
  statItem: { textAlign: 'center' },
  statNum: { fontSize: '3.5rem', fontWeight: '900', color: 'white', display: 'block' },
  statLab: { color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem', textTransform: 'uppercase' },

  finalCta: { textAlign: 'center' },
  finalCard: { padding: '5rem', borderRadius: '3rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05))' },
};

export default Home;
