import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { KeyRound, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { ThemeToggle } from '../components/ThemeToggle';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      toast.success('Password updated successfully! 🎉');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-[Inter,sans-serif]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <button
          onClick={() => navigate('/auth')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </button>
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          {/* Logo/Icon */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-600/25">
              <KeyRound className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 text-center">
              Create new password
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center px-4">
              Your new password must be different from previous used passwords.
            </p>
          </div>

          <form
            onSubmit={handleReset}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5"
          >
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-2.5 pr-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Confirm New Password
              </label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold shadow-sm transition-all duration-200 active:scale-[0.98]"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Updating password...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Secured by SummarizeAI Recovery System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
