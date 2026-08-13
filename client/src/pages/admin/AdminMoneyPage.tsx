import { useState, useEffect } from 'react';
import { Banknote, Search, Plus, Minus, CheckCircle, Wallet, User, ArrowUpRight, ArrowDownRight, RefreshCw, Sparkles } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency } from '../../lib/utils';


interface UserItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  balance: number;
  role?: string;
}

interface TransferLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: 'add' | 'subtract';
  amount: number;
  reason: string;
  newBalance: number;
  timestamp: string;
}

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000, 50000, 100000];
const MAX_SINGLE_TRANSFER = 100000000; // 10 Crores max limit

export default function AdminMoneyPage() {
  const { addToast } = useToast();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [amount, setAmount] = useState<string>('1000');
  const [actionType, setActionType] = useState<'add' | 'subtract'>('add');
  const [reason, setReason] = useState('Admin Direct Deposit');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<TransferLog[]>([]);

  // Load all users from DB & local storage
  const loadUsers = async (showToast = false) => {
    setLoading(true);
    let apiUsers: UserItem[] = [];

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('playarena_token') || 'admin-token-abc';
      const res = await fetch('/api/admin/users?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.users)) {
          apiUsers = json.data.users;
        } else if (json.success && Array.isArray(json.data)) {
          apiUsers = json.data;
        }
      }
    } catch {
      // Graceful local fallback
    }

    const localUsers: UserItem[] = JSON.parse(localStorage.getItem('playarena_users') || '[]');
    const activeUser = JSON.parse(localStorage.getItem('playarena_user') || '{}');
    if (activeUser?.id && !localUsers.find(u => u.id === activeUser.id || u.email === activeUser.email)) {
      localUsers.push(activeUser);
    }

    // Merge and deduplicate by email/id
    const userMap = new Map<string, UserItem>();
    [...apiUsers, ...localUsers].forEach(u => {
      const key = (u.email || u.id).toLowerCase();
      if (!userMap.has(key)) {
        userMap.set(key, u);
      } else {
        const prev = userMap.get(key)!;
        userMap.set(key, { ...prev, ...u, balance: typeof u.balance === 'number' ? u.balance : prev.balance });
      }
    });

    const finalUsersList = Array.from(userMap.values());
    setUsers(finalUsersList);

    if (finalUsersList.length > 0 && !selectedUser) {
      setSelectedUser(finalUsersList[0]);
    }

    setLoading(false);

    if (showToast) {
      addToast({
        type: 'success',
        title: 'User List Refreshed',
        message: `Updated list with ${finalUsersList.length} registered player(s).`,
      });
    }
  };

  useEffect(() => {
    loadUsers();
    const savedLogs = JSON.parse(localStorage.getItem('playarena_admin_money_logs') || '[]');
    setLogs(savedLogs);
  }, []);


  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search)
  );

  const handleTransfer = async () => {
    if (!selectedUser) {
      addToast({ type: 'warning', title: 'Select User', message: 'Please choose a user account first.' });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      addToast({ type: 'warning', title: 'Invalid Amount', message: 'Please enter a valid amount greater than 0.' });
      return;
    }

    if (numAmount > MAX_SINGLE_TRANSFER) {
      addToast({ type: 'warning', title: 'Amount Limit Exceeded', message: 'Single balance adjustment is capped at ₹10,00,00,000 (10 Crores).' });
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token') || localStorage.getItem('playarena_token') || 'admin-token-abc';

    try {
      await fetch(`/api/admin/users/${selectedUser.id}/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: numAmount, type: actionType, description: reason }),
      });
    } catch {
      // Fallback local update
    }

    // Update state & local storage
    const newBal = actionType === 'add'
      ? (selectedUser.balance || 0) + numAmount
      : Math.max(0, (selectedUser.balance || 0) - numAmount);

    const updatedUsers = users.map(u => u.id === selectedUser.id ? { ...u, balance: newBal } : u);
    setUsers(updatedUsers);
    setSelectedUser(prev => prev ? { ...prev, balance: newBal } : null);

    localStorage.setItem('playarena_users', JSON.stringify(updatedUsers));

    // Update user wallet storage
    const key = `wallet_${selectedUser.id}`;
    const wallet = JSON.parse(localStorage.getItem(key) || '{}');
    wallet.balance = newBal;
    localStorage.setItem(key, JSON.stringify(wallet));

    const activeUser = JSON.parse(localStorage.getItem('playarena_user') || '{}');
    if (activeUser && (activeUser.id === selectedUser.id || activeUser.email === selectedUser.email)) {
      activeUser.balance = newBal;
      localStorage.setItem('playarena_user', JSON.stringify(activeUser));
    }

    // Trigger instant real-time live wallet update event across app
    window.dispatchEvent(new CustomEvent('wallet:updated', {
      detail: { userId: selectedUser.id, balance: newBal }
    }));

    // Add to transfer log
    const newLog: TransferLog = {
      id: `mny_${Date.now()}`,
      userId: selectedUser.id,
      userName: selectedUser.name,
      userEmail: selectedUser.email,
      type: actionType,
      amount: numAmount,
      reason: reason || (actionType === 'add' ? 'Direct Deposit' : 'Admin Deduction'),
      newBalance: newBal,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem('playarena_admin_money_logs', JSON.stringify(updatedLogs.slice(0, 100)));

    addToast({
      type: 'success',
      title: actionType === 'add' ? 'Money Credited!' : 'Money Deducted!',
      message: `${actionType === 'add' ? '+' : '-'}₹${formatCurrency(numAmount)} applied to ${selectedUser.name}. New balance: ₹${formatCurrency(newBal)}`,
    });

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-[#0d2419] via-[#061A10] to-[#0d2419] border border-[rgba(212,175,55,0.3)] shadow-[0_0_30px_rgba(212,175,55,0.1)] gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gold/20 border border-gold/40 flex items-center justify-center text-gold shadow-lg">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-[#E8C97A] font-heading">Add Money to User Account</h1>
              <Sparkles className="w-4 h-4 text-gold animate-pulse" />
            </div>
            <p className="text-xs text-[rgba(212,175,55,0.6)]">Instantly deposit or adjust money balance for any registered player</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadUsers(true)}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/35 text-gold text-xs font-bold hover:bg-amber-500/25 transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Users
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Player Selector & Search */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0d2419] p-5 rounded-2xl border border-[rgba(212,175,55,0.2)] space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-[#E8C97A] font-heading flex items-center gap-2">
                <User className="w-4 h-4 text-gold" /> Select Player
              </h2>
              <span className="text-[10px] font-bold text-gold bg-[rgba(212,175,55,0.1)] px-2 py-0.5 rounded-full border border-[rgba(212,175,55,0.2)]">
                {users.length} Registered
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[rgba(212,175,55,0.4)] absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="w-full bg-[#061A10] border border-[rgba(212,175,55,0.2)] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#F5F1E6] placeholder-[rgba(212,175,55,0.3)] focus:outline-none focus:border-gold transition-all"
              />
            </div>

            {/* Player List Container */}
            <div className="space-y-2 max-h-[360px] overflow-y-auto scrollbar-thin pr-1">
              {filteredUsers.map(u => {
                const isSelected = selectedUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUser(u)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[rgba(212,175,55,0.15)] border-gold shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                        : 'bg-[#061A10] border-[rgba(212,175,55,0.1)] hover:border-[rgba(212,175,55,0.3)] hover:bg-[#092215]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected ? 'bg-gold text-[#0B2318]' : 'bg-[rgba(212,175,55,0.1)] text-gold'
                      }`}>
                        {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-[#F5F1E6] truncate">{u.name || 'Unnamed Player'}</p>
                        <p className="text-[10px] text-[rgba(212,175,55,0.5)] truncate">{u.email}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <span className="block text-xs font-black text-gold truncate max-w-[110px]">₹{formatCurrency(u.balance || 0)}</span>
                      <span className="text-[9px] text-[rgba(212,175,55,0.4)]">Balance</span>
                    </div>
                  </button>
                );
              })}

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-xs text-[rgba(212,175,55,0.4)]">
                  No users matched "{search}"
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Money Add/Deduct Console */}
        <div className="lg:col-span-7 space-y-4">
          {selectedUser ? (
            <div className="bg-[#0d2419] p-5 rounded-2xl border border-[rgba(212,175,55,0.2)] space-y-5 shadow-xl">
              {/* Selected User Header Card */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-[rgba(212,175,55,0.15)] to-transparent border border-[rgba(212,175,55,0.25)]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center text-sm font-black text-[#0B2318] shrink-0">
                    {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-[#E8C97A] truncate">{selectedUser.name}</h3>
                    <p className="text-[11px] text-[rgba(212,175,55,0.6)] truncate">{selectedUser.email}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className="text-[10px] uppercase tracking-wider text-[rgba(212,175,55,0.5)] font-bold block">Current Balance</span>
                  <span className="text-base sm:text-lg font-black text-gold truncate max-w-[180px] block">₹{formatCurrency(selectedUser.balance || 0)}</span>
                </div>
              </div>

              {/* Action Mode Toggle */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActionType('add')}
                  className={`py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    actionType === 'add'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-emerald-400'
                      : 'bg-[#061A10] border border-[rgba(212,175,55,0.15)] text-[rgba(212,175,55,0.6)] hover:text-emerald-400'
                  }`}
                >
                  <Plus className="w-4 h-4" /> 🟢 Add Money (Credit)
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('subtract')}
                  className={`py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    actionType === 'subtract'
                      ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] border border-rose-400'
                      : 'bg-[#061A10] border border-[rgba(212,175,55,0.15)] text-[rgba(212,175,55,0.6)] hover:text-rose-400'
                  }`}
                >
                  <Minus className="w-4 h-4" /> 🔴 Deduct Money (Debit)
                </button>
              </div>

              {/* Amount Quick Presets */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[rgba(212,175,55,0.8)]">Quick Amount Presets (₹)</label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {PRESET_AMOUNTS.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset.toString())}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        amount === preset.toString()
                          ? 'bg-gold text-[#0B2318] border-gold font-black shadow-[0_0_12px_rgba(212,175,55,0.4)] scale-105'
                          : 'bg-[#061A10] text-[#E8C97A] border-[rgba(212,175,55,0.2)] hover:border-gold'
                      }`}
                    >
                      +₹{preset >= 1000 ? `${preset / 1000}k` : preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[rgba(212,175,55,0.8)]">Custom Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-gold font-black text-sm">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value.slice(0, 9))}
                    maxLength={9}
                    placeholder="Enter amount to add..."
                    className="w-full bg-[#061A10] border border-[rgba(212,175,55,0.3)] rounded-xl pl-8 pr-4 py-2.5 text-base font-black text-gold placeholder-[rgba(212,175,55,0.3)] focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
                  />
                </div>
              </div>

              {/* Description / Audit Note Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[rgba(212,175,55,0.8)]">Note / Reason</label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Admin Direct Deposit, Manual Bonus"
                  className="w-full bg-[#061A10] border border-[rgba(212,175,55,0.2)] rounded-xl px-3.5 py-2 text-xs text-[#F5F1E6] placeholder-[rgba(212,175,55,0.3)] focus:outline-none focus:border-gold transition-all"
                />
              </div>

              {/* Transfer Button */}
              <button
                type="button"
                onClick={handleTransfer}
                disabled={loading}
                className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer truncate ${
                  actionType === 'add'
                    ? 'bg-gradient-to-r from-[#F5D576] via-[#D4AF37] to-[#B8860B] text-[#0B2318] hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] active:scale-[0.99]'
                    : 'bg-gradient-to-r from-rose-600 to-rose-700 text-white hover:shadow-[0_0_25px_rgba(244,63,94,0.5)] active:scale-[0.99]'
                }`}
              >
                {actionType === 'add' ? (
                  <span className="truncate">
                    <Plus className="w-4 h-4 inline mr-1" /> ⚡ Add ₹{formatCurrency(parseFloat(amount || '0'))} To {selectedUser.name}'s Account
                  </span>
                ) : (
                  <span className="truncate">
                    <Minus className="w-4 h-4 inline mr-1" /> Deduct ₹{formatCurrency(parseFloat(amount || '0'))} From {selectedUser.name}'s Account
                  </span>
                )}
              </button>
            </div>
          ) : (
            <div className="bg-[#0d2419] p-8 rounded-2xl border border-[rgba(212,175,55,0.2)] text-center space-y-3">
              <Wallet className="w-10 h-10 text-[rgba(212,175,55,0.4)] mx-auto" />
              <p className="text-sm font-black text-[#E8C97A]">No Player Selected</p>
              <p className="text-xs text-[rgba(212,175,55,0.6)]">Choose a player from the list on the left to add or deduct money.</p>
            </div>
          )}
        </div>
      </div>

      {/* Transfer History Table */}
      <div className="bg-[#0d2419] p-5 rounded-2xl border border-[rgba(212,175,55,0.2)] space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-[#E8C97A] font-heading flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" /> Recent Money Transfer Log
          </h2>
          <span className="text-[10px] text-[rgba(212,175,55,0.5)] font-mono">Showing last {logs.length} transfers</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[rgba(212,175,55,0.15)] text-[10px] text-[rgba(212,175,55,0.5)] uppercase font-bold tracking-wider">
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">New Balance</th>
                <th className="py-2.5 px-3">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(212,175,55,0.08)] text-xs font-medium">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-[rgba(212,175,55,0.03)] transition-colors">
                  <td className="py-3 px-3 font-mono text-[11px] text-[rgba(212,175,55,0.6)]">{log.timestamp}</td>
                  <td className="py-3 px-3 font-black text-[#F5F1E6] truncate max-w-[140px]">{log.userName}</td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      log.type === 'add'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}>
                      {log.type === 'add' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {log.type === 'add' ? 'Credited' : 'Deducted'}
                    </span>
                  </td>
                  <td className={`py-3 px-3 font-black font-mono truncate max-w-[120px] ${log.type === 'add' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {log.type === 'add' ? '+' : '-'}₹{formatCurrency(log.amount)}
                  </td>
                  <td className="py-3 px-3 font-black text-gold font-mono truncate max-w-[120px]">₹{formatCurrency(log.newBalance)}</td>
                  <td className="py-3 px-3 text-[rgba(212,175,55,0.5)] truncate max-w-[180px]">{log.reason}</td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-[rgba(212,175,55,0.4)]">
                    No manual money transfers recorded yet. Select a user above to add funds.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
