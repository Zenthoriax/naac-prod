import React, { useEffect, useState } from 'react';

const Login = () => {
  const [errorCode, setErrorCode] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'domain_lockdown') {
      setErrorCode("SECURITY_VIOLATION: Access restricted to active @jainuniversity.ac.in faculty only.");
    }
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
      minHeight: '100vh', backgroundColor: '#0a0a0a', color: '#eaeaea', fontFamily: 'monospace'
    }}>
      <div style={{
        border: '1px solid #333', padding: '3rem', borderRadius: '8px', 
        backgroundColor: '#111', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.5)', maxWidth: '400px', width: '100%', textAlign: 'center'
      }}>
        <h1 style={{ color: '#00ffcc', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>JAIN SSR Verifier</h1>
        <h3 style={{ color: '#888', fontWeight: 'normal', margin: '0 0 2rem 0' }}>Lead DVV Auditor System</h3>

        <div style={{ height: '2px', backgroundColor: '#333', margin: '2rem 0' }} />

        {errorCode && (
          <div style={{
             backgroundColor: 'rgba(255, 0, 0, 0.1)', color: '#ff4444', 
             padding: '1rem', borderLeft: '4px solid #ff4444', marginBottom: '2rem',
             fontSize: '0.85rem', textAlign: 'left'
          }}>
            <strong>[DOMAIN GUARD BLOCKED]</strong><br/>
            {errorCode}
          </div>
        )}

        <button 
          onClick={() => window.location.href = '/auth/google'}
          style={{
            backgroundColor: '#00ffcc', color: '#000', border: 'none', padding: '1rem 2rem',
            fontSize: '1rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer',
            width: '100%', textTransform: 'uppercase', transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#00ccaa'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#00ffcc'}
        >
          Secure Gateway Login
        </button>

          <p style={{ color: '#888', marginBottom: '2rem', lineHeight: '1.6' }}>
            Authorized Access Only. System powered by <strong>Groq Llama-3.3</strong>.<br />
            <span style={{ fontSize: '0.8rem', color: '#555' }}>V3.1 Architecture: Built for High-Concurrency / Free-Tier Resilience</span>
          </p>

          <div style={{ backgroundColor: '#1a1a1a', padding: '1rem', borderRadius: '4px', borderLeft: '3px solid #ffaa00', display: 'inline-block' }}>
             <p style={{ color: '#ffaa00', margin: 0, fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
               Notice: Use College Mail ID
             </p>
             <p style={{ color: '#aaa', margin: '0.5rem 0 0 0', fontSize: '0.8rem' }}>
               Access is strictly restricted to <code style={{color: '#fff'}}>@jainuniversity.ac.in</code> domains.
             </p>
          </div>
      </div>
    </div>
  );
};

export default Login;
