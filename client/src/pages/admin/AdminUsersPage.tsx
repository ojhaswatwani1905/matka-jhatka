import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Users, ShieldCheck, Ban, Plus, Minus, LogOut } from 'lucide-react';
import type { User } from '../../types';
import { useToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';

function loadUsers(): User[] {
  const users: User[] = JSON.parse(localStorage.getItem('playarena_users') || '[]');
  const activeUserStr = localStorage.getItem('playarena_user');
  let activeUser: User | null = null;
  try {
    if (activeUserStr) activeUser = JSON.parse(activeUserStr);
  } catch { /* ignore */ }

  const map = new Map<string, User>();
  users.forEach(u => {
    if (u && (u.id || u.email)) map.set((u.email || u.id).toLowerCase(), u);
  });

  if (activeUser && activeUser.email) {
    const key = activeUser.email.toLowerCase();
    if (!map.has(key)) map.set(key, activeUser);
  }

  if (!map.has('player@tirangagames.com')) {
    map.set('player@tirangagames.com', { id: 'usr_84920194', name: 'Demo Player', email: 'player@tirangagames.com', phone: '+91 98765 43210', role: 'user', balance: 0, isActive: true, createdAt: new Date(Date.now() - 7 * 86400000).toISOString() });
  }
  if (!map.has('admin@playarena.com')) {
    map.set('admin@playarena.com', { id: 'usr_admin_001', name: 'Admin', email: 'admin@playarena.com', phone: '+91 99999 00000', role: 'admin', isAdmin: true, balance: 0, isActive: true, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() });
  }

  const result = Array.from(map.values());
  localStorage.setItem('playarena_users', JSON.stringify(result));
  return result;
}

function getKYCStatus(userId: string): string {
  const kyc = JSON.parse(localStorage.getItem('playarena_kyc') || '{}');
  if (kyc.data?.userId === userId) return kyc.status || 'not_started';
  const queue = JSON.parse(localStorage.getItem('playarena_kyc_queue') || '[]');
  const entry = queue.find((k: any) => k.userId === userId);
  if (!entry) return 'not_started';
  if (entry.approved) return 'verified';
  if (entry.rejected) return 'rejected';
  return 'pending';
}

const KYC_BADGE: Record<string, { label: string; cls: string }> = {
  not_started: { label: 'Not Started', cls: 'text-[rgba(212,175,55,0.5)] bg-[rgba(212,175,55,0.06)] border-[rgba(212,175,55,0.15)]' },
  pending: { label: 'Pending', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  verified: { label: 'Verified', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  rejected: { label: 'Rejected', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
};

export default function AdminUsersPage() {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>(() => loadUsers());
  const [showBalance, setShowBalance] = useState<User | null>(null);
  const [showForceLogout, setShowForceLogout] = useState<User | null>(null);
  const [logoutReason, setLogoutReason] = useState('');
  const [balanceAdj, setBalanceAdj] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjType, setAdjType] = useState<'add' | 'subtract'>('add');

  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem('token') || localStorage.getItem('playarena_token') || 'admin-token-abc';
      try {
        const res = await fetch('/api/admin/users?limit=100', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          let apiList: User[] = [];
          if (json.success && Array.isArray(json.data?.users)) {
            apiList = json.data.users;
          } else if (json.success && Array.isArray(json.data)) {
            apiList = json.data;
          }

          if (apiList.length > 0) {
            const localList = loadUsers();
            const map = new Map<string, User>();
            localList.forEach(u => map.set((u.email || u.id).toLowerCase(), u));
            apiList.forEach(u => {
              const key = (u.email || u.id).toLowerCase();
              if (map.has(key)) {
                map.set(key, { ...map.get(key)!, ...u });
              } else {
                map.set(key, u);
              }
            });

            const merged = Array.from(map.values());
            localStorage.setItem('playarena_users', JSON.stringify(merged));
            setUsers(merged);
          }
        }
      } catch { /* graceful local fallback */ }
    };

    fetchUsers();
  }, []);

  const filtered = useMemo(() =>
    users.filter(u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    ),
  [users, search]);

  const saveUsers = (updated: User[]) => {
    setUsers(updated);
    localStorage.setItem('playarena_users', JSON.stringify(updated));
  };

  const toggleBan = (userId: string) => {
    const updated = users.map(u => u.id === userId ? { ...u, isActive: !u.isActive } : u);
    saveUsers(updated);
    const u = updated.find(u => u.id === userId);
    addToast({ type: u?.isActive ? 'success' : 'warning', title: u?.isActive ? 'User Unbanned' : 'User Banned', message: u?.email });
  };

  const confirmForceLogout = async () => {
    if (!showForceLogout) return;
    const target = showForceLogout;

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('playarena_token') || 'admin-token-abc';
      await fetch(`/api/admin/users/${target.id}/force-logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: logoutReason || 'Administrative termination' }),
      });
    } catch {
      // Fallback local dispatch simulation
    }

    // Broadcast session:admin_revoked if target is local active session
    const currentActiveUser = JSON.parse(localStorage.getItem('playarena_user') || '{}');
    if (currentActiveUser && (currentActiveUser.id === target.id || currentActiveUser.email === target.email)) {
      window.dispatchEvent(new CustomEvent('session:admin_revoked'));
    }

    // Log transaction / audit entry
    try {
      const allTxns = JSON.parse(localStorage.getItem('playarena_all_transactions') || '[]');
      const newTx = {
        id: `tx_admin_logout_${Date.now()}`,
        userId: target.id,
        type: 'admin_action',
        amount: 0,
        status: 'completed',
        description: `Force Logout by Admin: ${logoutReason || 'Immediate session termination'}`,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('playarena_all_transactions', JSON.stringify([newTx, ...allTxns]));
    } catch { /* ignore */ }

    addToast({ type: 'warning', title: 'User Force-Logged Out', message: `${target.name} session terminated.` });
    setShowForceLogout(null);
    setLogoutReason('');
  };

  const applyBalanceAdj = async () => {
    if (!showBalance || !balanceAdj) return;
    const amt = parseFloat(balanceAdj);
    if (isNaN(amt) || amt <= 0) return;

    const token = localStorage.getItem('token') || localStorage.getItem('playarena_token') || 'admin-token-abc';
    const reason = adjReason || (adjType === 'add' ? 'Admin Deposit Credit' : 'Admin Deduction');

    try {
      await fetch(`/api/admin/users/${showBalance.id}/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: amt, type: adjType, description: reason }),
      });
    } catch {
      // Graceful fallback simulation
    }

    const updated = users.map(u => {
      if (u.id !== showBalance.id) return u;
      const newBal = adjType === 'add' ? u.balance + amt : Math.max(0, u.balance - amt);
      return { ...u, balance: newBal };
    });
    saveUsers(updated);

    // Sync to active logged-in user if modifying self or active session
    const currentActiveUser = JSON.parse(localStorage.getItem('playarena_user') || '{}');
    if (currentActiveUser && (currentActiveUser.id === showBalance.id || currentActiveUser.email === showBalance.email)) {
      const nextBal = adjType === 'add' ? (currentActiveUser.balance || 0) + amt : Math.max(0, (currentActiveUser.balance || 0) - amt);
      currentActiveUser.balance = nextBal;
      localStorage.setItem('playarena_user', JSON.stringify(currentActiveUser));
    }

    // Audit log transaction
    try {
      const allTxns = JSON.parse(localStorage.getItem('playarena_all_transactions') || '[]');
      const newTx = {
        id: `tx_admin_adj_${Date.now()}`,
        userId: showBalance.id,
        type: adjType === 'add' ? 'deposit' : 'withdrawal',
        amount: amt,
        status: 'completed',
        description: `Admin Adjustment (${adjType === 'add' ? '+' : '-'}₹${amt}): ${reason}`,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('playarena_all_transactions', JSON.stringify([newTx, ...allTxns]));

      const targetId = showBalance.id;
      const key = `wallet_${targetId}`;
      const wallet = JSON.parse(localStorage.getItem(key) || '{}');
      const curBal = showBalance.balance ?? 0;
      const nxtBal = adjType === 'add' ? curBal + amt : Math.max(0, curBal - amt);
      localStorage.setItem(key, JSON.stringify({
        ...wallet,
        balance: nxtBal,
        transactions: [newTx, ...(wallet.transactions || [])],
      }));

      const activeUser = JSON.parse(localStorage.getItem('playarena_user') || '{}');
      if (activeUser && (activeUser.id === targetId || activeUser.email === showBalance.email)) {
        activeUser.balance = nxtBal;
        localStorage.setItem('playarena_user', JSON.stringify(activeUser));
      }

      window.dispatchEvent(new CustomEvent('wallet:updated', {
        detail: { userId: targetId, email: showBalance.email, balance: nxtBal }
      }));
    } catch { /* ignore */ }

    addToast({ type: 'success', title: 'Balance Adjusted', message: `${adjType === 'add' ? '+' : '-'}₹${amt} — ${reason}` });
    setShowBalance(null);
    setBalanceAdj('');
    setAdjReason('');
  };


  return (
    <div className="space-y-5 max-w-5xl pt-4">
      <div>
        <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2.5">
          <Users className="w-6 h-6" /> User Management
        </h1>
        <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">{users.length} total users</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(212,175,55,0.4)]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#F5F1E6] placeholder-[rgba(212,175,55,0.25)] focus:outline-none focus:border-[rgba(212,175,55,0.5)] transition-colors"
        />
      </div>

      {/* Table */}
      <div className="royal-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[rgba(212,175,55,0.1)]">
                {['User', 'Main Balance', 'Bonus Balance', 'KYC', 'Reg Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[rgba(212,175,55,0.5)] font-bold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => {
                const kycStatus = getKYCStatus(u.id);
                const badge = KYC_BADGE[kycStatus] || KYC_BADGE.not_started;
                const bonusAmt = (u as any).bonusBalance ?? (JSON.parse(localStorage.getItem(`playarena_bonus_${u.id}`) || '0')) ?? 0;
                return (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-[rgba(212,175,55,0.06)] hover:bg-[rgba(212,175,55,0.03)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[rgba(212,175,55,0.1)] flex items-center justify-center text-xs font-black text-gold">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-[#F5F1E6]">{u.name}</p>
                          <p className="text-[10px] text-[rgba(212,175,55,0.4)]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-black text-gold">₹{(u.balance || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 font-mono font-bold text-amber-400">
                      <span className="px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                        ₹{Number(bonusAmt).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[rgba(212,175,55,0.5)]">
                      {new Date(u.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.isActive !== false ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                        {u.isActive !== false ? 'Active' : 'Banned'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setShowBalance(u); setAdjType('add'); }}
                          className="p-1.5 rounded-lg bg-[rgba(212,175,55,0.08)] hover:bg-[rgba(212,175,55,0.15)] text-gold transition-colors cursor-pointer"
                          title="Adjust balance"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setShowForceLogout(u)}
                          className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors cursor-pointer"
                          title="Force Logout User"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleBan(u.id)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${u.isActive !== false ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'}`}
                          title={u.isActive !== false ? 'Ban user' : 'Unban user'}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-xs text-[rgba(212,175,55,0.4)] py-8">No users found</p>
          )}
        </div>
      </div>

      {/* Force Logout Modal */}
      <Modal isOpen={!!showForceLogout} onClose={() => setShowForceLogout(null)} title={`Force Logout — ${showForceLogout?.name}`}>
        <div className="space-y-4 text-xs">
          <p className="text-[rgba(212,175,55,0.7)] leading-relaxed">
            Immediately invalidate active session tokens for <strong className="text-gold">{showForceLogout?.email}</strong>.
            The user will be logged out on their next request with message "Your session was ended by an administrator".
          </p>
          <div>
            <label className="block text-[rgba(212,175,55,0.7)] mb-1.5 font-bold">Reason / Audit Note (Optional)</label>
            <input
              value={logoutReason}
              onChange={e => setLogoutReason(e.target.value)}
              placeholder="e.g. Fraud Investigation, Security Lock, Admin Request"
              className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F1E6] placeholder-[rgba(212,175,55,0.25)] focus:outline-none focus:border-[rgba(212,175,55,0.5)] transition-colors"
            />
          </div>
          <button onClick={confirmForceLogout} className="w-full py-3 rounded-xl font-black bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 cursor-pointer transition-colors flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" /> Terminate Active Session
          </button>
        </div>
      </Modal>

      {/* Balance Adjust Modal */}
      <Modal isOpen={!!showBalance} onClose={() => setShowBalance(null)} title={`Adjust Balance — ${showBalance?.name}`}>
        <div className="space-y-4 text-xs">
          <div className="flex gap-2">
            {(['add', 'subtract'] as const).map(t => (
              <button
                key={t}
                onClick={() => setAdjType(t)}
                className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${adjType === t ? 'btn-royal-gold' : 'bg-[#0d2419] border border-[rgba(212,175,55,0.2)] text-[#E8C97A]'}`}
              >
                {t === 'add' ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                {t === 'add' ? 'Add Funds' : 'Deduct Funds'}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-[rgba(212,175,55,0.7)] mb-1.5 font-bold">Amount (₹)</label>
            <input
              type="number"
              value={balanceAdj}
              onChange={e => setBalanceAdj(e.target.value)}
              placeholder="Enter amount"
              className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F1E6] placeholder-[rgba(212,175,55,0.25)] focus:outline-none focus:border-[rgba(212,175,55,0.5)] transition-colors"
            />
          </div>
          <div>
            <label className="block text-[rgba(212,175,55,0.7)] mb-1.5 font-bold">Reason / Audit Note</label>
            <input
              value={adjReason}
              onChange={e => setAdjReason(e.target.value)}
              placeholder="e.g. Manual bonus, Correction, etc."
              className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F1E6] placeholder-[rgba(212,175,55,0.25)] focus:outline-none focus:border-[rgba(212,175,55,0.5)] transition-colors"
            />
          </div>
          <button onClick={applyBalanceAdj} className="btn-royal-gold w-full py-3 rounded-xl font-black cursor-pointer">
            Apply Adjustment
          </button>
        </div>
      </Modal>
    </div>
  );
}
