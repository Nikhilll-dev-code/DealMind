import React, { useState } from 'react';
import { BrainCircuit, Eye, EyeOff, Lock, Mail, User, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouteContext';
import { useToast } from '../context/ToastContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

export default function LoginView() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('SALESPERSON');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const { login, register } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();

  const handleQuickFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setFormError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (isRegister && !displayName)) {
      setFormError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setFormError(null);

    try {
      if (isRegister) {
        await register({ email, password, displayName, role });
        toast.success('Account Created', `Welcome to DealMind, ${displayName}!`);
      } else {
        await login(email, password);
        toast.success('Authenticated', 'Signed in successfully.');
      }
      navigate('/dashboard');
    } catch (err) {
      setFormError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 select-none font-sans">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Logo & Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 mb-1">
            <BrainCircuit className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">DealMind 3.0</h1>
          <p className="text-xs text-slate-400">
            {isRegister ? 'Create an enterprise workspace account' : 'Sign in to access negotiation intelligence'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 backdrop-blur-md">
          {formError && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <Input
                label="Full Name *"
                type="text"
                placeholder="Jane Doe"
                icon={User}
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
              />
            )}

            <Input
              label="Email Address *"
              type="email"
              placeholder="sales@dealmind.local"
              icon={Mail}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">Password *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2 pl-9 pr-10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 capitalize"
                >
                  <option value="SALESPERSON">Sales Representative</option>
                  <option value="MANAGER">Deal Desk Manager</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full py-2.5 mt-2"
              variant="primary"
            >
              {isRegister ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          {/* Quick Demo Credentials */}
          {!isRegister && (
            <div className="pt-4 border-t border-slate-800 space-y-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Quick Fill Demo Accounts</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Admin', email: 'admin@dealmind.local' },
                  { label: 'Manager', email: 'manager@dealmind.local' },
                  { label: 'Sales Rep', email: 'sales@dealmind.local' }
                ].map(acc => (
                  <button
                    key={acc.label}
                    type="button"
                    onClick={() => handleQuickFill(acc.email, 'Password123!')}
                    className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-[11px] font-medium text-slate-300 hover:text-white transition text-center truncate"
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => { setIsRegister(p => !p); setFormError(null); }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition"
            >
              {isRegister ? 'Already have an account? Sign in' : "Need an account? Register new user"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
