import React, { useState } from 'react';
import { BrainCircuit, Eye, EyeOff, Lock, Mail, AlertCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouteContext';
import { useToast } from '../context/ToastContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

const DEMO_ACCOUNTS = [
  { label: 'Sales Representative', email: 'sales@dealmind.local' },
  { label: 'Administrator', email: 'admin@dealmind.local' }
];

function homeForRole(role) {
  const normalized = String(role || '').toUpperCase();
  if (normalized === 'ADMIN') return '/admin';
  return '/dashboard';
}

export default function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const { login } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setFormError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setFormError(null);
    try {
      const user = await login(email, password);
      toast.success('Signed in', `Welcome back, ${user?.display_name || user?.email}.`);
      // Strict role-based routing (Two-Role spec §4):
      // Sales Rep -> workspace, Admin -> console, Customer -> legacy portal.
      navigate(homeForRole(user?.role));
    } catch (err) {
      setFormError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dm-bg flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md">
        <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-dm-muted hover:text-dm-ink mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to home
        </button>

        <div className="text-center mb-7">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-dm-blue text-white items-center justify-center shadow-lg shadow-dm-blue/25 mb-3">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-dm-ink">Welcome back</h1>
          <p className="text-xs text-dm-muted mt-1">Sign in to your DealMind workspace</p>
        </div>

        <div className="bg-white border border-dm-border rounded-2xl shadow-card p-6 sm:p-7 space-y-4">
          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@company.com"
              icon={Mail}
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-dm-ink">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dm-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-white border border-dm-border rounded-xl py-2.5 pl-9 pr-10 text-xs text-dm-ink focus:outline-none focus:border-dm-blue focus:ring-2 focus:ring-dm-blue/15"
                  required
                />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dm-muted hover:text-dm-ink">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" loading={loading} size="lg" className="w-full">Sign in</Button>
          </form>

          <div className="pt-4 border-t border-dm-border">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-dm-muted mb-2.5">
              <Sparkles className="w-3 h-3 text-dm-blue" /> Demo accounts
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.label}
                  type="button"
                  onClick={() => { setEmail(acc.email); setPassword('Password123!'); setFormError(null); }}
                  className="p-2 rounded-xl bg-dm-bg border border-dm-border hover:border-dm-blue/40 text-[11px] font-semibold text-dm-muted hover:text-dm-ink transition"
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-dm-muted mt-5">
          New sales representative?{' '}
          <button onClick={() => navigate('/signup')} className="font-bold text-dm-blue hover:text-dm-deep">
            Create an account
          </button>
        </p>
      </div>
    </div>
  );
}
