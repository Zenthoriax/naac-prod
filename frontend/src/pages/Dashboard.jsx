import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { authService } from '../services/authService';
import apiClient from '../services/authService';

const Dashboard = () => {
  const [history, setHistory] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadState, setUploadState] = useState('idle'); // idle, scanning, result, error
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    // 1. Fetch Auth Session using JWT
    const authToast = toast.loading("Authenticating secure session...");
    
    authService.getCurrentUser()
      .then(userData => {
          // Normalize: backend may return display_name (DB) or displayName (JWT)
          const displayName = userData?.display_name || userData?.displayName || userData?.email || 'User';
          const normalizedUser = { ...userData, display_name: displayName };
          toast.update(authToast, { render: `Access Granted: ${displayName}`, type: "success", isLoading: false, autoClose: 1000 });
          setUser(normalizedUser);
          fetchHistory();
      })
      .catch((e) => {
          console.error("Dashboard Session Error:", e);
          toast.update(authToast, { render: "Identity verification failed.", type: "error", isLoading: false, autoClose: 3000 });
          setTimeout(() => window.location.href = '/login', 2000);
      });
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await apiClient.get('/api/audit/history');
      if (res.data.history) {
        setHistory(res.data.history);
      }
    } catch (e) {
      toast.error("Failed to sync Neon Postgres telemetry.");
      console.error("Failed to fetch history", e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadState('scanning');
    setLastResult(null);
    
    const scanId = toast.loading("Connecting to Free-Tier Groq Engine...");

    const formData = new FormData();
    formData.append('document', file);
    formData.append('claimContext', 'Faculty Dashboard Upload');

    try {
        const response = await apiClient.post('/api/audit', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        const data = response.data;
        
        // Failsafe: If VITE_API_BASE is missing on Render, POST requests return an empty string or index.html instead of JSON.
        if (typeof data === 'string') {
             throw new Error("Configuration Error: Frontend is missing VITE_API_BASE. If you already set it in Render, you MUST click 'Manual Deploy -> Clear Build Cache & Deploy' because Vite bakes in environment variables at build-time.");
        }
        
        const result = data?.result || {};
        
        toast.update(scanId, { render: `Forensic analysis complete. Risk Score: ${result?.risk_score ?? 'N/A'}`, type: "success", isLoading: false, autoClose: 4000 });
        setLastResult(result);
        setUploadState('result');
        // Refresh telemetry
        fetchHistory();

    } catch (err) {
        console.error(err);
        const errorMsg = err.response?.data?.error || err.message;
        toast.update(scanId, { render: errorMsg, type: "error", isLoading: false, autoClose: 5000 });
        setLastResult({ error: errorMsg });
        setUploadState('error');
    }
  };

  if (loading) return null; // Using Suspense fallback instead

  return (
    <div style={{ backgroundColor: '#0a0a0a', color: '#eaeaea', minHeight: '100vh', padding: '2rem', fontFamily: 'monospace' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ color: '#00ffcc', margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>JAIN Faculty Hub</h1>
          <p style={{ color: '#888', margin: '0.5rem 0 0 0' }}>Authorized Assessor: {user?.display_name || user?.email || 'User'} ({user?.email})</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => window.location.href = '/docs'}
            style={{ backgroundColor: 'transparent', color: '#00ccff', border: '1px solid #00ccff', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'monospace', textTransform: 'uppercase' }}
          >
            Documentation
          </button>
          <button 
            onClick={() => authService.logout()}
            style={{ backgroundColor: 'transparent', color: '#ff4444', border: '1px solid #ff4444', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'monospace', textTransform: 'uppercase' }}
          >
            Terminate Session
          </button>
        </div>
      </header>

      {/* Forensic Upload Zone */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ 
          border: uploadState === 'scanning' ? '1px solid #00ffcc' : '1px dashed #444', 
          backgroundColor: '#111', 
          padding: '2rem', 
          textAlign: 'center',
          borderRadius: '4px',
          boxShadow: uploadState === 'scanning' ? '0 0 15px rgba(0, 255, 204, 0.1)' : 'none',
          transition: 'all 0.3s'
        }}>
            {uploadState === 'idle' && (
               <div>
                   <h3 style={{ color: '#fff', margin: '0 0 1rem 0' }}>Initiate New Forensic Audit</h3>
                   <input 
                      type="file" 
                      id="audit-upload" 
                      accept=".pdf,.txt" 
                      style={{ display: 'none' }} 
                      onChange={handleFileUpload}
                   />
                   <label htmlFor="audit-upload" style={{
                       backgroundColor: '#00ffcc', color: '#000', padding: '0.75rem 2rem', 
                       cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '4px'
                   }}>
                       Select Document
                   </label>
                   <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#666' }}>PDF or TXT formats supported. Powered by Groq Llama-3.3.</p>
               </div>
            )}
            
            {uploadState === 'scanning' && (
                <div style={{ color: '#00ffcc', animation: 'pulse 1.5s infinite' }}>
                    <h3 style={{ margin: 0 }}>SCANNING... PLEASE STAND BY</h3>
                    <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.5rem' }}>Forensic extraction and arithmetic cross-referencing in progress.</p>
                </div>
            )}

            {uploadState === 'result' && lastResult && (
                <div style={{ 
                    textAlign: 'left', 
                    borderLeft: lastResult.verdict === 'GENUINE' ? '4px solid #00ffcc' : lastResult.verdict === 'NON-COMPLIANT' || lastResult.verdict === 'FAKE' ? '4px solid #ff4444' : '4px solid #ffaa00', 
                    backgroundColor: '#1a1a1a', 
                    padding: '1.5rem',
                    boxShadow: lastResult.verdict === 'NON-COMPLIANT' || lastResult.verdict === 'FAKE' ? '0 0 20px rgba(255, 68, 68, 0.2)' : 'none'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ 
                            color: lastResult.verdict === 'GENUINE' ? '#00ffcc' : lastResult.verdict === 'NON-COMPLIANT' || lastResult.verdict === 'FAKE' ? '#ff4444' : '#ffaa00', 
                            margin: 0,
                            textShadow: lastResult.verdict === 'NON-COMPLIANT' || lastResult.verdict === 'FAKE' ? '0 0 10px rgba(255, 68, 68, 0.5)' : 'none'
                        }}>
                            {lastResult.verdict === 'FAKE' ? 'CRITICAL NAAC REJECTION - FAKE EVIDENCE DETECTED' : lastResult.verdict}
                        </h2>
                        <span style={{ backgroundColor: '#333', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                            RISK SCORE: <span style={{ color: lastResult.risk_score > 50 ? '#ff4444' : lastResult.risk_score > 20 ? '#ffaa00' : '#00ffcc' }}>{lastResult.risk_score}/100</span>
                        </span>
                    </div>
                    
                    <h4 style={{ color: '#aaa', margin: '0 0 0.5rem 0', textTransform: 'uppercase', fontSize: '0.85rem' }}>Auditor Assessment:</h4>
                    <p style={{ color: '#ccc', lineHeight: '1.6', marginTop: 0 }}>{lastResult.reasoning}</p>
                    
                    {lastResult.naac_action_required && (
                        <div style={{ marginTop: '1rem', backgroundColor: '#0a0a0a', borderLeft: '3px solid #00ccff', padding: '1rem' }}>
                            <strong style={{ color: '#00ccff', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.85rem' }}>Action Required:</strong>
                            <span style={{ color: '#eaeaea' }}>{lastResult.naac_action_required}</span>
                        </div>
                    )}
                    
                    {lastResult.audit_findings && lastResult.audit_findings.length > 0 && (
                       <div style={{ marginTop: '1.5rem' }}>
                           <h4 style={{ color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Primary Forensic Indicators:</h4>
                           {lastResult.audit_findings.map((f, i) => (
                               <div key={i} style={{ 
                                   backgroundColor: '#0a0a0a', 
                                   padding: '1rem', 
                                   marginBottom: '0.75rem', 
                                   borderLeft: `3px solid ${f.severity === 'CRITICAL' ? '#ff4444' : f.severity === 'WARNING' ? '#ffaa00' : '#444'}` 
                               }}>
                                   <div style={{ marginBottom: '0.25rem' }}>
                                       <strong style={{ color: f.severity === 'CRITICAL' ? '#ff4444' : f.severity === 'WARNING' ? '#ffaa00' : '#888' }}>[{f.severity}]</strong>
                                       <span style={{ marginLeft: '0.5rem', color: '#eaeaea' }}>{f.reasoning}</span>
                                   </div>
                                   {f.evidence_location && (
                                       <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
                                           <strong>Location: </strong> Page {f.evidence_location.page || 'N/A'}, {f.evidence_location.line || 'Unknown'}
                                       </div>
                                   )}
                               </div>
                           ))}
                       </div>
                    )}
                    
                    <button onClick={() => setUploadState('idle')} style={{ marginTop: '1.5rem', backgroundColor: 'transparent', border: '1px solid #444', color: '#fff', padding: '0.5rem 1rem', cursor: 'pointer' }}>Acknowledge & Clear</button>
                </div>
            )}

            {uploadState === 'error' && (
                <div style={{ color: '#ff4444' }}>
                    <h3 style={{ margin: '0 0 1rem 0' }}>AUDIT FAILED</h3>
                    <p>{lastResult?.error || "An unknown extraction error occurred."}</p>
                    <button onClick={() => setUploadState('idle')} style={{ marginTop: '1rem', backgroundColor: '#ff4444', border: 'none', color: '#000', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 'bold' }}>Reset</button>
                </div>
            )}
        </div>
      </section>

      <section>
        <h2 style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>Personal Audit Telemetry</h2>
        <div style={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '4px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #333' }}>
              <tr>
                <th style={{ padding: '1rem' }}>Audit ID</th>
                <th style={{ padding: '1rem' }}>Target Document / URL</th>
                <th style={{ padding: '1rem' }}>Verdict</th>
                <th style={{ padding: '1rem' }}>Risk Score</th>
                <th style={{ padding: '1rem' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No forensic audits initiated yet.</td>
                </tr>
              ) : (
                history.map(record => (
                  <tr key={record.id} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '1rem', color: '#888' }}>#{record.id}</td>
                    <td style={{ padding: '1rem' }}>{record.target_url}</td>
                    <td style={{ 
                        padding: '1rem', 
                        fontWeight: 'bold',
                        color: record.verdict === 'GENUINE' ? '#00ffcc' : record.verdict === 'NON-COMPLIANT' ? '#ff4444' : '#ffaa00'
                    }}>
                      {record.verdict}
                    </td>
                    <td style={{ padding: '1rem' }}>{record.risk_score}/100</td>
                    <td style={{ padding: '1rem', color: '#666' }}>{new Date(record.created_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
