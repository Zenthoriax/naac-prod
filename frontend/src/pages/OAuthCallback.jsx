import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Authenticating...');

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        toast.error(`Authentication failed: ${error}`, {
          style: { background: '#1a1a2e', color: '#e2e8f0', border: '1px solid #ef4444' }
        });
        navigate('/login');
        return;
      }

      if (!token) {
        toast.error('No authentication token received', {
          style: { background: '#1a1a2e', color: '#e2e8f0', border: '1px solid #ef4444' }
        });
        navigate('/login');
        return;
      }

      try {
        setStatus('Verifying credentials...');
        localStorage.setItem('authToken', token);
        
        // Verify token and fetch user data
        const result = await authService.getCurrentUser();
        localStorage.setItem('user', JSON.stringify(result));

        toast.success(`Welcome back, ${result.display_name || 'User'}!`, {
          style: { background: '#1a1a2e', color: '#e2e8f0', border: '1px solid #00ffcc' }
        });
        
        setStatus('Success! Redirecting...');
        setTimeout(() => navigate('/dashboard'), 500);
        
      } catch (error) {
        console.error('OAuth callback error:', error);
        localStorage.removeItem('authToken');
        toast.error('Verification failed. Please try again.', {
          style: { background: '#1a1a2e', color: '#e2e8f0', border: '1px solid #ef4444' }
        });
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#000000]">
      <div className="text-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="h-12 w-12 border-4 border-[#00ffcc] border-t-transparent rounded-full mx-auto mb-6"
        />
        <h2 className="text-[#00ffcc] text-2xl font-bold mb-2">{status}</h2>
        <p className="text-slate-400">Finalizing your secure session...</p>
      </div>
    </div>
  );
}
