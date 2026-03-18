import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '';

// Google SVG Icon
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
  </svg>
);

// Floating particle component
const Particle = ({ style }) => (
  <div
    className="particle absolute rounded-full pointer-events-none"
    style={style}
  />
);
import { authService } from '../services/authService';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const isLogin = mode === 'login';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
          await authService.login({ email, password });
      } else {
          await authService.signup({ email, password, displayName });
      }
      
      toast.success(isLogin ? '🎉 Login Successful!' : '🚀 Account Created!', {
        style: {
          background: '#1a1a2e',
          color: '#e2e8f0',
          border: '1px solid #00ffcc',
        },
      });
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 800);
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong. Please try again.';
      toast.error(msg, {
        style: {
          background: '#1a1a2e',
          color: '#e2e8f0',
          border: '1px solid #ef4444',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    authService.loginWithGoogle();
  };

  const particles = [
    { width: 4, height: 4, top: '15%', left: '10%', background: '#8b5cf6', animationDelay: '0s', animationDuration: '5s' },
    { width: 6, height: 6, top: '75%', left: '85%', background: '#a78bfa', animationDelay: '1s', animationDuration: '6s' },
    { width: 3, height: 3, top: '40%', left: '5%',  background: '#c084fc', animationDelay: '2s', animationDuration: '4s' },
    { width: 5, height: 5, top: '85%', left: '20%', background: '#818cf8', animationDelay: '0.5s', animationDuration: '7s' },
    { width: 4, height: 4, top: '20%', left: '90%', background: '#7c3aed', animationDelay: '3s', animationDuration: '5s' },
  ];

  const formVariants = {
    initial: { opacity: 0, x: isLogin ? -20 : 20 },
    animate: { opacity: 1, x: 0 },
    exit:    { opacity: 0, x: isLogin ? 20 : -20 },
  };

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <Toaster position="top-center" reverseOrder={false} />

      {/* Glow orbs - subtle */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="glass-card rounded-2xl w-full max-w-md p-8 relative"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.3), rgba(168, 85, 247, 0.2))', border: '1px solid rgba(139, 92, 246, 0.3)' }}
          >
            <span className="text-3xl">⚡</span>
          </motion.div>
          <h1 className="text-[#00ffcc] text-3xl font-bold tracking-tight">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">Jain (Deemed-to-be University)</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-white/5 rounded-xl p-1 mb-8 border border-white/10">
          {['login', 'signup'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="relative flex-1 py-2 text-sm font-medium rounded-lg transition-colors duration-200 capitalize"
              style={{ color: mode === m ? '#e2e8f0' : '#64748b' }}
            >
              {mode === m && (
                <motion.div
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: 'rgba(0, 255, 204, 0.1)', border: '1px solid rgba(0, 255, 204, 0.3)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{m === 'login' ? 'Sign In' : 'Sign Up'}</span>
            </button>
          ))}
        </div>

        {/* Google Button */}
        <button
          onClick={handleGoogle}
          className="google-btn w-full flex items-center justify-center gap-3 rounded-xl py-3 px-4 text-slate-200 font-medium text-sm mb-6"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        {/* Separator */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-slate-500 text-xs font-medium">
            {isLogin ? 'or sign in with email' : 'or sign up with email'}
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Form */}
        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            variants={formVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Display Name (Signup only) */}
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your full name"
                  className="auth-input w-full rounded-xl px-4 py-3 text-sm"
                />
              </motion.div>
            )}

            {/* Email */}
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="auth-input w-full rounded-xl px-4 py-3 text-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isLogin ? 'Your password' : 'Create a strong password'}
                required
                className="auth-input w-full rounded-xl px-4 py-3 text-sm"
              />
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="primary-btn w-full py-3 rounded-xl text-white font-semibold text-sm mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75"/>
                  </svg>
                  {isLogin ? 'Signing in...' : 'Creating Account...'}
                </span>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </motion.button>
          </motion.form>
        </AnimatePresence>

        {/* Footer note */}
        <p className="text-center text-slate-600 text-xs mt-6">
          {isLogin ? "New here? " : "Already have an account? "}
          <button
            onClick={() => setMode(isLogin ? 'signup' : 'login')}
            className="text-[#00ffcc] hover:text-[#00ccaa] transition-colors font-medium"
          >
            {isLogin ? 'Create an account' : 'Sign in'}
          </button>
        </p>

      
      </motion.div>
    </div>
  );
}
