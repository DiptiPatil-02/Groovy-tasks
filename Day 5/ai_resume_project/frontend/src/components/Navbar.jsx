import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={styles.navWrapper}>
      <div className="glass" style={styles.navInner}>
        <Link to="/" style={styles.logo}>
          <div style={styles.logoIcon}>
            <div style={styles.logoCircle}></div>
          </div>
          <span style={styles.logoText}>PREP<span style={{ color: 'var(--primary)' }}>AI</span></span>
        </Link>
        
        <div style={styles.links}>
          {user ? (
            <>
              <Link to="/dashboard" style={styles.link}>Overview</Link>
              <Link to="/resume-builder" style={styles.link}>Resume Audit</Link>
              <Link to="/interview-prep" style={styles.link}>Mock Prep</Link>
              <div style={styles.divider}></div>
              <div style={styles.userSection}>
                <div style={styles.profileInfo}>
                  <div style={styles.avatar}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={styles.userName}>{user.name}</span>
                </div>
                <button onClick={handleLogout} style={styles.logoutBtn}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" style={styles.loginLink}>Sign In</Link>
              <Link to="/register" style={styles.signupBtn}>Create Account</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

const styles = {
  navWrapper: {
    position: 'fixed',
    top: '1.5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '95%',
    maxWidth: '1200px',
    zIndex: 1000,
  },
  navInner: {
    padding: '0.6rem 2.5rem',
    borderRadius: '100px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(15, 23, 42, 0.8)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    textDecoration: 'none',
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
  },
  logoCircle: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: '3px solid white',
    opacity: 0.9,
  },
  logoText: {
    color: 'white',
    fontWeight: '900',
    fontSize: '1.4rem',
    letterSpacing: '-1.5px',
    textTransform: 'uppercase',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '2.5rem',
  },
  link: {
    color: 'var(--text-muted)',
    textDecoration: 'none',
    fontWeight: '700',
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    transition: 'var(--transition)',
    position: 'relative',
    padding: '0.5rem 0',
  },
  divider: {
    width: '1px',
    height: '24px',
    background: 'var(--border-light)',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  profileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'rgba(255, 255, 255, 0.03)',
    padding: '0.4rem 1rem 0.4rem 0.4rem',
    borderRadius: '100px',
    border: '1px solid var(--border-light)',
  },
  avatar: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    fontWeight: '800',
  },
  userName: {
    color: 'white',
    fontSize: '0.85rem',
    fontWeight: '700',
  },
  logoutBtn: {
    background: 'rgba(244, 63, 94, 0.1)',
    color: 'var(--accent)',
    padding: '0.6rem',
    borderRadius: '12px',
    border: '1px solid rgba(244, 63, 94, 0.2)',
    transition: 'var(--transition)',
  },
  loginLink: {
    color: 'white',
    textDecoration: 'none',
    fontWeight: '700',
    fontSize: '0.9rem',
  },
  signupBtn: {
    background: 'white',
    color: 'var(--bg-deep)',
    padding: '0.7rem 1.8rem',
    borderRadius: '100px',
    textDecoration: 'none',
    fontWeight: '800',
    fontSize: '0.85rem',
    transition: 'var(--transition)',
  }
};

export default Navbar;

