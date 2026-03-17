import React, { useEffect, useState, Suspense, lazy } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import Docs from './pages/Docs';

// Implement Code-Splitting: Only load the heavy Dashboard bundle if authenticated
const Dashboard = lazy(() => import('./pages/Dashboard'));

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    
    // Redirect / to /login automatically
    if (window.location.pathname === '/') {
        window.history.replaceState(null, '', '/login');
        setCurrentPath('/login');
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (currentPath.startsWith('/dashboard')) {
    return (
      <>
        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0a0a0a', color: '#00ffcc', fontFamily: 'monospace' }}>
            [SYSTEM] Decrypting Faculty Telemetry Payload...
          </div>
        }>
          <Dashboard />
        </Suspense>
        <ToastContainer theme="dark" position="bottom-right" />
      </>
    );
  }

  if (currentPath.startsWith('/docs')) {
    return (
      <>
        <Docs />
        <ToastContainer theme="dark" position="bottom-right" />
      </>
    );
  }
  
  // Default to Login for any other route
  return (
    <>
      <Login />
      <ToastContainer theme="dark" position="bottom-right" />
    </>
  );
}
