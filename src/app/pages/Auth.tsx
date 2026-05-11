import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Zap, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

/** Auth page — handles both sign-in and sign-up */
export function Auth() {
  const [params] = useSearchParams();
  const [isSignup, setIsSignup] = useState(params.get('mode') === 'signup');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [isForgot, setIsForgot] = useState(false);
  const { user, login, signup, sendPasswordReset } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!email.trim()) next.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Password is required.';
    else if (password.length < 6)
      next.password = 'Password must be at least 6 characters.';
    if (isSignup && !username.trim())
      next.username = 'Username is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleForgotSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setErrors({ email: 'Email is required to reset password.' });
      return;
    }
    setLoading(true);
    try {
      await sendPasswordReset(email);
      toast.success('Check your email for the reset link! 📧');
      setIsForgot(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset email.';
      toast.error(msg);
      setErrors({ form: msg });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (isSignup) {
        await signup(email, password, username);
        toast.success('Account created! Welcome aboard 🎉');
      } else {
        await login(email, password);
        const { data: { user: loggedInUser } } = await supabase.auth.getUser();
        const displayName = loggedInUser?.user_metadata?.display_name || email.split('@')[0];
        toast.success(`Welcome back, ${displayName}! 👋`);
      }
      navigate('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      toast.error(msg);
      setErrors({ form: msg });
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setIsSignup(v => !v);
    setIsForgot(false);
    setErrors({});
    setEmail('');
    setPassword('');
    setUsername('');
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-[Inter,sans-serif]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <ThemeToggle />
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-600/25">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl text-slate-900 dark:text-white mb-1">
              {isForgot 
                ? 'Reset password' 
                : isSignup 
                ? 'Create your account' 
                : 'Welcome back'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
              {isForgot
                ? "Enter your email and we'll send you a recovery link"
                : isSignup
                ? 'Start summarizing in seconds'
                : 'Sign in to SummarizeAI'}
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={isForgot ? handleForgotSubmit : handleSubmit}
            noValidate
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4"
          >
            {/* Global error */}
            {errors.form && (
              <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm">
                {errors.form}
              </div>
            )}

            {/* Username (signup only) */}
            {isSignup && (
              <div>
                <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => {
                    setUsername(e.target.value);
                    setErrors(prev => ({ ...prev, username: '' }));
                  }}
                  placeholder="Your display name"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all duration-200
                    ${errors.username
                      ? 'border-red-400 dark:border-red-700 focus:border-red-500'
                      : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-500'
                    }`}
                />
                {errors.username && (
                  <p className="text-xs text-red-500 mt-1">{errors.username}</p>
                )}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setErrors(prev => ({ ...prev, email: '' }));
                }}
                placeholder="you@example.com"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all duration-200
                  ${errors.email
                    ? 'border-red-400 dark:border-red-700 focus:border-red-500'
                    : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-500'
                  }`}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            {!isForgot && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  {!isSignup && (
                    <button
                      type="button"
                      onClick={() => setIsForgot(true)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      setErrors(prev => ({ ...prev, password: '' }));
                    }}
                    placeholder={isSignup ? 'At least 6 characters' : '••••••••'}
                    className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all duration-200
                      ${errors.password
                        ? 'border-red-400 dark:border-red-700 focus:border-red-500'
                        : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-500'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200"
                  >
                    {showPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm shadow-sm transition-all duration-200 mt-1"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isForgot ? 'Send reset link' : isSignup ? 'Create account' : 'Sign in'}
            </button>

            {/* Divider + switch */}
            <div className="pt-2 text-center text-sm text-slate-500 dark:text-slate-400">
              {isForgot ? (
                <button
                  type="button"
                  onClick={() => setIsForgot(false)}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Back to sign in
                </button>
              ) : (
                <>
                  {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <button
                    type="button"
                    onClick={switchMode}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {isSignup ? 'Sign in' : 'Sign up'}
                  </button>
                </>
              )}
            </div>
          </form>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
            Your data is stored securely in the cloud and synced across devices.
          </p>
        </div>
      </div>
    </div>
  );
}
