import { useState, useEffect } from 'react';

export function ScrollToTopBtn() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const fn = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Volver al inicio"
      style={{
        position: 'fixed',
        bottom: 'clamp(1.2rem, 3vw, 2rem)',
        right: 'clamp(1.2rem, 3vw, 2rem)',
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--gold), var(--gold-l))',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--bg)',
        boxShadow: '0 4px 20px rgba(201,168,76,0.35)',
        zIndex: 500,
        animation: 'fadeIn 0.2s ease',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 8px 28px rgba(201,168,76,0.55)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(201,168,76,0.35)';
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15"/>
      </svg>
    </button>
  );
}
