import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    }
  };

  return (
    <div style={styles.page}>
      <div className="glass-card animate-fade-in" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.icon}>🔓</div>
          <h2 style={styles.title}>Welcome Back</h2>
          <p style={styles.subtitle}>Sign in to access your dashboard</p>
        </div>
        
        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email Address</label>
            <input 
              type="email" 
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary" style={styles.button}>
            Login to Account
          </button>
        </form>

        <div style={styles.footer}>
          Don't have an account? <Link to="/register" style={styles.link}>Create one now</Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 'calc(100vh - 120px)',
    padding: '2rem',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    padding: '3rem 2.5rem',
  },
  header: { textAlign: 'center', marginBottom: '2.5rem' },
  icon: { fontSize: '2.5rem', marginBottom: '1rem' },
  title: { fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem' },
  subtitle: { color: 'var(--text-muted)', fontSize: '1rem' },
  error: {
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--danger)',
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '2rem',
    fontSize: '0.9rem',
    textAlign: 'center',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  button: { width: '100%', height: '52px', fontSize: '1rem', marginTop: '1rem' },
  footer: { marginTop: '2rem', textAlign: 'center', fontSize: '0.95rem', color: 'var(--text-muted)' },
  link: { color: 'var(--primary)', textDecoration: 'none', fontWeight: '700' }
};

export default Login;
