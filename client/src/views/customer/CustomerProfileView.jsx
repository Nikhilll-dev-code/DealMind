import React, { useEffect } from 'react';
import { User, Mail, Building2, ShieldCheck, LogOut, BadgeCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouteContext';
import { useToast } from '../../context/ToastContext';
import { hasPermission, PERMISSIONS } from '../../lib/permissions';

export default function CustomerProfileView() {
  const { user, tenantId, logout, role } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();
  const canAccess = role === 'CUSTOMER' || hasPermission(role, PERMISSIONS.DEALS_VIEW);

  const rows = [
    { icon: User, label: 'Name', value: user?.display_name || '—' },
    { icon: Mail, label: 'Email', value: user?.email || '—' },
    { icon: ShieldCheck, label: 'Role', value: user?.role || '—' },
    { icon: Building2, label: 'Workspace', value: tenantId || '—' }
  ];

  useEffect(() => {
    if (!canAccess) {
      toast.error('Access denied', 'Profile is available to customer accounts only.');
      navigate('/customer', { replace: true });
    }
  }, [canAccess, navigate]);

  if (!canAccess) return null;

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-7">
        <h1 className="text-2xl font-black tracking-tight text-dm-ink">Profile</h1>
        <p className="mt-1.5 text-sm text-dm-muted">Your customer account and workspace details.</p>
      </div>

      <div className="bg-white border border-dm-border rounded-2xl shadow-card p-6">
        <div className="flex items-center gap-4 pb-5 border-b border-dm-border">
          <span className="w-14 h-14 rounded-2xl bg-dm-tint border border-dm-blue/20 flex items-center justify-center text-xl font-black text-dm-deep">
            {user?.display_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-dm-ink">{user?.display_name || 'Customer'}</h2>
              <BadgeCheck className="w-4 h-4 text-dm-blue" />
            </div>
            <p className="text-xs text-dm-muted">{user?.email}</p>
          </div>
        </div>

        <dl className="mt-5 space-y-3">
          {rows.map(r => (
            <div key={r.label} className="flex items-center gap-3 rounded-xl border border-dm-border px-4 py-3">
              <r.icon className="w-4 h-4 text-dm-muted shrink-0" />
              <dt className="text-xs text-dm-muted w-28">{r.label}</dt>
              <dd className="text-xs font-semibold text-dm-ink">{r.value}</dd>
            </div>
          ))}
        </dl>

        <button
          onClick={async () => { await logout(); navigate('/'); }}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-50 transition"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );
}
