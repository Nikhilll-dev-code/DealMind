import React, { useEffect, useState } from 'react';
import { Users, UserPlus, ShieldCheck, Power, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getUsers, createUser, setUserStatus } from '../../services/api';
import { formatDate } from '../../lib/format';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

export default function AdminUsersView() {
  const { user } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ displayName: '', email: '', password: '', role: 'SALESPERSON' });
  const [saving, setSaving] = useState(false);

  const load = () => getUsers().then(u => setUsers(Array.isArray(u) ? u : [])).catch(err => toast.error('Failed to load users', err.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createUser(form);
      toast.success('User created', `${form.displayName} can now sign in.`);
      setShowCreate(false);
      setForm({ displayName: '', email: '', password: '', role: 'SALESPERSON' });
      load();
    } catch (err) {
      toast.error('Could not create user', err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (u) => {
    const next = u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await setUserStatus(u.id, next);
      toast.success('Updated', `${u.display_name} is now ${next}.`);
      load();
    } catch (err) {
      toast.error('Update failed', err.message);
    }
  };

  const roleTone = { ADMIN: 'bg-dm-tint text-dm-deep', SALESPERSON: 'bg-dm-subtle text-dm-muted', MANAGER: 'bg-dm-subtle text-dm-muted', CUSTOMER: 'bg-dm-soft text-emerald-800' };
  const roleLabel = { ADMIN: 'Admin', SALESPERSON: 'Sales Representative', MANAGER: 'Sales Representative', CUSTOMER: 'Customer' };

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
      <div className="flex items-center justify-between mb-7 gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-dm-ink">Users</h1>
          <p className="mt-1.5 text-sm text-dm-muted">Manage authorized company users and their roles.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><UserPlus className="w-3.5 h-3.5" /> Add user</Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-14 rounded-2xl dm-shimmer animate-shimmer" />)}</div>
      ) : (
        <div className="bg-white border border-dm-border rounded-2xl shadow-card overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-dm-border bg-dm-subtle/50">
                {['User', 'Role', 'Status', 'Joined', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-dm-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-dm-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="text-xs font-bold text-dm-ink">{u.display_name}</div>
                    <div className="text-[10px] text-dm-muted">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${roleTone[u.role] || 'bg-dm-subtle text-dm-muted'}`}>{roleLabel[u.role] || u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${u.status === 'ACTIVE' ? 'text-emerald-600' : 'text-rose-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`} /> {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-dm-muted">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== user?.id && (
                      <button onClick={() => toggle(u)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-dm-muted hover:text-dm-ink">
                        <Power className="w-3.5 h-3.5" /> {u.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-dm-ink/30 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <form onSubmit={submit} className="relative bg-white rounded-2xl border border-dm-border shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-dm-ink flex items-center gap-2"><Users className="w-4 h-4 text-dm-blue" /> Add company user</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="text-dm-muted hover:text-dm-ink"><X className="w-4 h-4" /></button>
            </div>
            <Input label="Full name" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} required />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            <Input label="Temporary password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required helperText="Minimum 6 characters." />
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-dm-ink">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="w-full bg-white border border-dm-border rounded-xl py-2.5 px-3 text-xs text-dm-ink">
                <option value="SALESPERSON">Sales Representative</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-dm-muted bg-dm-tint/50 border border-dm-blue/15 rounded-lg px-3 py-2">
              <ShieldCheck className="w-3.5 h-3.5 text-dm-blue" /> Admin creation is restricted to company administrators.
            </div>
            <Button type="submit" loading={saving} className="w-full">Create user</Button>
          </form>
        </div>
      )}
    </div>
  );
}
