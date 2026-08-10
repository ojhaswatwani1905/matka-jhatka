import { useState, useEffect } from 'react';
import { Banknote, Search, Plus, Minus, CheckCircle, Wallet, User, ArrowUpRight, ArrowDownRight, RefreshCw, Sparkles } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';


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
        if (json.success && Array.isArray(json.data.users)) {
          apiUsers = json.data.users;
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

    // Update active selected user reference
    if (selectedUser) {
      const matched = finalUsersList.find(u => u.id === selectedUser.id || u.email.toLowerCase() === selectedUser.email.toLowerCase());
      if (matched) {
        setSelectedUser(matched);
      } else if (finalUsersList.length > 0) {
        setSelectedUser(finalUsersList[0]);
      }
    } else if (finalUsersList.length > 0) {
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

    // Update logged-in user session if modifying currently active user
    const activeUser = JSON.parse(localStorage.getItem('playarena_user') || '{}');
    if (activeUser && (activeUser.id === selectedUser.id || activeUser.email === selectedUser.email)) {
      activeUser.balance = newBal;
      localStorage.setItem('playarena_user', JSON.stringify(activeUser));
      const wallet = JSON.parse(localStorage.getItem('wallet') || '{}');
      wallet.balance = newBal;
      localStorage.setItem('wallet', JSON.stringify(wallet));
    }

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

    const updatedLogs = [newLog, ...logs].slice(0, 50);
    setLogs(updatedLogs);
    localStorage.setItem('playarena_admin_money_logs', JSON.stringify(updatedLogs));

    addToast({
      type: 'success',
      title: actionType === 'add' ? 'Money Added Successfully!' : 'Money Deducted Successfully!',
      message: `${actionType === 'add' ? '+' : '-'}₹${numAmount.toLocaleString('en-IN')} credited to ${selectedUser.name}. New Balance: ₹${newBal.toLocaleString('en-IN')}`,
    });

    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-6xl pt-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d2419] p-5 rounded-2xl border border-[rgba(212,175,55,0.2)] shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8B6914] flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.4)]">
            <Banknote className="w-6 h-6 text-[#0B2318]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#E8C97A] font-heading flex items-center gap-2">
              Add Money to User Account
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            </h1>
            <p className="text-xs text-[rgba(212,175,55,0.6)]">Instantly deposit or adjust money balance for any registered player</p>
          </div>
        </div>

        <button
          onClick={() => loadUsers(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(212,175,55,0.1)] hover:bg-[rgba(212,175,55,0.2)] text-[#E8C97A] text-xs font-bold transition-all border border-[rgba(212,175,55,0.2)] cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Users
        </button>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: User Selection Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0d2419] p-4 rounded-2xl border border-[rgba(212,175,55,0.15)] space-y-3">
            <h2 className="text-sm font-black text-[#E8C97A] font-heading flex items-center gap-2">
              <User className="w-4 h-4 text-gold" /> Select Player
            </h2>

            {/* Search input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[rgba(212,175,55,0.4)] absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="w-full bg-[#061A10] border border-[rgba(212,175,55,0.2)] rounded-xl pl-9 pr-3 py-2 text-xs text-[#F5F1E6] placeholder-[rgba(212,175,55,0.3)] focus:outline-none focus:border-gold transition-all"
              />
            </div>

            {/* User List */}
            <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {filteredUsers.map(u => {
                const isSelected = selectedUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-[rgba(212,175,55,0.18)] border-gold shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                        : 'bg-[#061A10]/70 border-[rgba(212,175,55,0.1)] hover:border-[rgba(212,175,55,0.3)] hover:bg-[#061A10]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                        isSelected ? 'bg-gold text-[#0B2318]' : 'bg-[rgba(212,175,55,0.15)] text-gold'
                      }`}>
                        {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#F5F1E6] truncate">{u.name}</p>
                        <p className="text-[10px] text-[rgba(212,175,55,0.5)] truncate">{u.email}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="block text-xs font-black text-gold">₹{(u.balance || 0).toLocaleString('en-IN')}</span>
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
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center text-sm font-black text-[#0B2318]">
                    {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#E8C97A]">{selectedUser.name}</h3>
                    <p className="text-[11px] text-[rgba(212,175,55,0.6)]">{selectedUser.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-[rgba(212,175,55,0.5)] font-bold block">Current Balance</span>
                  <span className="text-lg font-black text-gold">₹{(selectedUser.balance || 0).toLocaleString('en-IN')}</span>
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

              {/* Quick Preset Amount Buttons */}
              <div className="space-y-1.5">
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
                    onChange={e => setAmount(e.target.value)}
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
                className={`w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                  actionType === 'add'
                    ? 'bg-gradient-to-r from-[#F5D576] via-[#D4AF37] to-[#B8860B] text-[#0B2318] hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] active:scale-[0.99]'
                    : 'bg-gradient-to-r from-rose-600 to-rose-700 text-white hover:shadow-[0_0_25px_rgba(244,63,94,0.5)] active:scale-[0.99]'
                }`}
              >
                {actionType === 'add' ? (
                  <>
                    <Plus className="w-5 h-5" /> ⚡ Add ₹{parseFloat(amount || '0').toLocaleString('en-IN')} To {selectedUser.name}'s Account
                  </>
                ) : (
                  <>
                    <Minus className="w-5 h-5" /> Deduct ₹{parseFloat(amount || '0').toLocaleString('en-IN')} From {selectedUser.name}'s Account
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="bg-[#0d2419] p-12 rounded-2xl border border-[rgba(212,175,55,0.15)] text-center space-y-3">
              <Wallet className="w-12 h-12 text-[rgba(212,175,55,0.3)] mx-auto" />
              <p className="text-sm font-bold text-[rgba(212,175,55,0.6)]">Select a user on the left to add money</p>
            </div>
          )}
        </div>
      </div>

      {/* Transfer History Log Table */}
      <div className="bg-[#0d2419] p-5 rounded-2xl border border-[rgba(212,175,55,0.15)] space-y-4">
        <h2 className="text-sm font-black text-[#E8C97A] font-heading flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" /> Recent Money Transfer Log
          </span>
          <span className="text-xs font-normal text-[rgba(212,175,55,0.5)]">Showing last {logs.length} transfers</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[rgba(212,175,55,0.15)] text-[rgba(212,175,55,0.6)] font-bold">
                <th className="pb-3 pl-2">Time</th>
                <th className="pb-3">User</th>
                <th className="pb-3">Action</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">New Balance</th>
                <th className="pb-3">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(212,175,55,0.06)]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[rgba(212,175,55,0.03)] transition-colors">
                  <td className="py-2.5 pl-2 text-[rgba(212,175,55,0.5)]">{log.timestamp}</td>
                  <td className="py-2.5">
                    <span className="font-bold text-[#F5F1E6] block">{log.userName}</span>
                    <span className="text-[10px] text-[rgba(212,175,55,0.4)]">{log.userEmail}</span>
                  </td>
                  <td className="py-2.5">
                    {log.type === 'add' ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold text-[10px] inline-flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" /> Credited
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 font-bold text-[10px] inline-flex items-center gap-1">
                        <ArrowDownRight className="w-3 h-3" /> Deducted
                      </span>
                    )}
                  </td>
                  <td className={`py-2.5 font-black ${log.type === 'add' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {log.type === 'add' ? '+' : '-'}₹{log.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 font-bold text-gold">₹{log.newBalance.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 text-[rgba(212,175,55,0.6)]">{log.reason}</td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-[rgba(212,175,55,0.4)]">
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
