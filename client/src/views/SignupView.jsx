import React, { useState } from 'react';
import { BrainCircuit, Eye, EyeOff, Lock, Mail, User, AlertCircle, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouteContext';
import { useToast } from '../context/ToastContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

export default function SignupView() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const { register } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName || !email || !password) {
      setFormError('Please complete all fields.');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setFormError(null);
    try {
      await register({ email, password, displayName });
      toast.success('Account created', `Welcome to DealMind, ${displayName}.`);
      navigate('/dashboard');
    } catch (err) {
      setFormError(err.message || 'Could not create your account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dm-bg grid lg:grid-cols-2 font-sans">
      {/* Left: benefits */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-dm-deep text-white relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-dm-blue/40 blur-3xl" />
        <button onClick={() => navigate('/')} className="relative inline-flex items-center gap-2.5 self-start">
          <span className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
            <BrainCircuit className="w-5 h-5" />
          </span>
          <span className="font-extrabold tracking-tight">DealMind</span>
        </button>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-black leading-tight">Negotiate with evidence, not guesswork.</h2>
          <p className="mt-4 text-white/70 leading-relaxed text-sm">
            Create a DealMind sales workspace to run live negotiations with evidence-grounded
            intelligence. Tenant-isolated, server-enforced, and grounded in real precedents.
          </p>
          <ul className="mt-8 space-y-3.5">
            {[
              'Grounded in real historical precedents',
              'Company guardrails applied automatically',
              'Every agreement becomes shared learning'
            ].map(t => (
              <li key={t} className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="w-5 h-5 text-dm-radium" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative inline-flex items-center gap-2 text-xs text-white/60">
          <ShieldCheck className="w-4 h-4" /> Tenant-isolated · server-enforced governance
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-dm-muted hover:text-dm-ink mb-6 lg:hidden">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to home
          </button>

          <div className="text-center mb-7">
            <h1 className="text-2xl font-black tracking-tight text-dm-ink">Create your account</h1>
            <p className="text-xs text-dm-muted mt-1">Sign up as a sales representative</p>
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
                label="Full name"
                type="text"
                placeholder="Jordan Buyer"
                icon={User}
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
              />
              <Input
                label="Work email"
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
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    className="w-full bg-white border border-dm-border rounded-xl py-2.5 pl-9 pr-10 text-xs text-dm-ink focus:outline-none focus:border-dm-blue focus:ring-2 focus:ring-dm-blue/15"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dm-muted hover:text-dm-ink">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" loading={loading} size="lg" className="w-full">Create account</Button>
            </form>

            <p className="text-[11px] text-dm-muted text-center leading-relaxed">
              Admin accounts are created by your company administrator — public signup always
              creates a sales representative account.
            </p>
          </div>

          <p className="text-center text-xs text-dm-muted mt-5">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="font-bold text-dm-blue hover:text-dm-deep">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
