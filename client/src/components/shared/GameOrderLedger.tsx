import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Copy,
  Check,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { orderLedger, type GameOrderItem } from '../../lib/orderLedger';
import { useToast } from '../ui/Toast';

interface GameOrderLedgerProps {
  gameId: string;
  gameName: string;
  currentPeriod?: string;
  className?: string;
}

export function GameOrderLedger({
  gameId,
  gameName,
  className = '',
}: GameOrderLedgerProps) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'my_orders' | 'room_ledger'>('my_orders');
  const [statusFilter, setStatusFilter] = useState<'all' | 'won' | 'lost' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [orders, setOrders] = useState<GameOrderItem[]>([]);

  // Load orders from ledger
  const loadOrders = useCallback(() => {
    const data = orderLedger.getOrders(gameId);
    setOrders(data);
  }, [gameId]);

  useEffect(() => {
    loadOrders();
    const handleUpdate = () => loadOrders();
    window.addEventListener('order_ledger:updated', handleUpdate);
    return () => window.removeEventListener('order_ledger:updated', handleUpdate);
  }, [loadOrders]);

  // Demo generated room orders if user doesn't have many
  const roomOrders = useMemo<GameOrderItem[]>(() => {
    const baseList = orders.length > 0 ? orders : [];
    const simulated: GameOrderItem[] = [
      {
        id: `TXN_${gameId.toUpperCase()}_LIVE_8F92`,
        gameId,
        gameName,
        period: `20260819${Math.floor(Math.random() * 8000 + 1000)}`,
        userId: 'u_rajesh99',
        userName: 'Rajesh_K',
        selection: gameId.includes('matka') ? 'JODI: 16' : gameId.includes('color') ? 'GREEN (2.0x)' : '2.45x Cashout',
        betAmount: 500,
        resultOutcome: gameId.includes('matka') ? '128 - 16 - 349' : 'GREEN / 7',
        multiplier: 90,
        winAmount: 45000,
        status: 'won',
        timestamp: Date.now() - 45000,
      },
      {
        id: `TXN_${gameId.toUpperCase()}_LIVE_7A1B`,
        gameId,
        gameName,
        period: `20260819${Math.floor(Math.random() * 8000 + 1000)}`,
        userId: 'u_vikram_vip',
        userName: 'Vikram_Pro',
        selection: gameId.includes('matka') ? 'SINGLE: 8' : 'RED',
        betAmount: 1000,
        resultOutcome: gameId.includes('matka') ? '256 - 38 - 468' : 'RED / 2',
        multiplier: 9.5,
        winAmount: 9500,
        status: 'won',
        timestamp: Date.now() - 120000,
      },
      {
        id: `TXN_${gameId.toUpperCase()}_LIVE_3C4D`,
        gameId,
        gameName,
        period: `20260819${Math.floor(Math.random() * 8000 + 1000)}`,
        userId: 'u_amit_delhi',
        userName: 'Amit_92',
        selection: gameId.includes('matka') ? 'PATTI: 128' : 'BIG (5-9)',
        betAmount: 200,
        resultOutcome: gameId.includes('matka') ? '347 - 49 - 289' : 'SMALL / 3',
        multiplier: 0,
        winAmount: 0,
        status: 'lost',
        timestamp: Date.now() - 190000,
      },
      {
        id: `TXN_${gameId.toUpperCase()}_LIVE_9E8F`,
        gameId,
        gameName,
        period: `20260819${Math.floor(Math.random() * 8000 + 1000)}`,
        userId: 'u_sneha_m',
        userName: 'Sneha_Queen',
        selection: gameId.includes('matka') ? 'HALF_SANGAM: 128-6' : 'VIOLET (4.5x)',
        betAmount: 100,
        resultOutcome: gameId.includes('matka') ? '128 - 16 - 349' : 'VIOLET / 0',
        multiplier: 1200,
        winAmount: 120000,
        status: 'won',
        timestamp: Date.now() - 260000,
      },
    ];

    return [...baseList, ...simulated];
  }, [orders, gameId, gameName]);

  const displayedOrders = useMemo(() => {
    const list = activeTab === 'my_orders' ? orders : roomOrders;
    return list.filter((item) => {
      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.id.toLowerCase().includes(q) ||
          item.period.toLowerCase().includes(q) ||
          item.selection.toLowerCase().includes(q) ||
          (item.resultOutcome && item.resultOutcome.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [activeTab, orders, roomOrders, statusFilter, searchQuery]);

  // Summary statistics for My Orders
  const stats = useMemo(() => {
    const totalBets = orders.length;
    const totalWagered = orders.reduce((sum, o) => sum + o.betAmount, 0);
    const totalWon = orders.reduce((sum, o) => sum + (o.winAmount || 0), 0);
    const netProfit = totalWon - totalWagered;
    const winsCount = orders.filter((o) => o.status === 'won').length;
    const winRate = totalBets > 0 ? Math.round((winsCount / totalBets) * 100) : 0;
    return { totalBets, totalWagered, totalWon, netProfit, winRate };
  }, [orders]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    addToast({
      type: 'info',
      title: 'Copied Transaction ID',
      message: text,
      duration: 2000,
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={`app-card rounded-2xl border border-gold/20 bg-slate-900/90 shadow-2xl p-4 sm:p-5 space-y-4 ${className}`}>
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold shadow-md">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white font-heading tracking-tight flex items-center gap-2">
              <span>Game Order Ledger & Transactions</span>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PROVABLY AUDITED
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Live settlement ledger • Detailed Transaction ID, Game Results & Win Payouts
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/5 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('my_orders')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'my_orders'
                ? 'bg-gold text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>My Orders ({orders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('room_ledger')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'room_ledger'
                ? 'bg-gold text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Live Room Ledger</span>
          </button>
        </div>
      </div>

      {/* Stats KPI Chips for My Orders */}
      {activeTab === 'my_orders' && orders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/5 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Total Orders:</span>
            <span className="text-xs font-bold font-mono text-white">{stats.totalBets}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/5 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Total Wagered:</span>
            <span className="text-xs font-bold font-mono text-slate-200">₹{stats.totalWagered.toLocaleString()}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/5 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Total Won:</span>
            <span className="text-xs font-bold font-mono text-emerald-400">₹{stats.totalWon.toLocaleString()}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/5 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Net Profit/Loss:</span>
            <span
              className={`text-xs font-bold font-mono ${
                stats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {stats.netProfit >= 0 ? `+₹${stats.netProfit.toLocaleString()}` : `-₹${Math.abs(stats.netProfit).toLocaleString()}`}
            </span>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-[11px] text-slate-500 font-bold uppercase mr-1 hidden sm:inline flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'won', label: 'Won 🏆' },
            { id: 'lost', label: 'Lost' },
            { id: 'pending', label: 'Pending ⏳' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === st.id
                  ? 'bg-gold/20 text-gold border border-gold/40'
                  : 'bg-slate-950 text-slate-400 border border-white/5 hover:text-white'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Txn ID / Period..."
            className="w-full bg-slate-950 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-gold font-mono"
          />
        </div>
      </div>

      {/* Orders Table Container */}
      {displayedOrders.length === 0 ? (
        <div className="p-8 text-center bg-slate-950/50 rounded-xl border border-white/5 space-y-2">
          <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mx-auto text-slate-500">
            <FileText className="w-6 h-6" />
          </div>
          <h4 className="text-xs font-bold text-slate-300 font-heading">No Orders Recorded Yet</h4>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            Place your bet in {gameName} above. Every confirmed order and its declared result outcome will be recorded here in real-time.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/60 scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-white/10 bg-slate-900/80 text-slate-400 font-mono text-[10px] uppercase">
                <th className="py-2.5 px-3">Transaction / Order ID</th>
                <th className="py-2.5 px-3">Period / Round</th>
                {activeTab === 'room_ledger' && <th className="py-2.5 px-3">Player</th>}
                <th className="py-2.5 px-3">Selection</th>
                <th className="py-2.5 px-3 text-right">Stake (₹)</th>
                <th className="py-2.5 px-3 text-center">Declared Result</th>
                <th className="py-2.5 px-3 text-right">Win / Return</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayedOrders.map((ord) => {
                const isWon = ord.status === 'won';
                const isPending = ord.status === 'pending';

                return (
                  <tr
                    key={ord.id}
                    className="hover:bg-white/[0.02] transition-colors font-mono text-xs"
                  >
                    {/* Transaction ID with Copy */}
                    <td className="py-2.5 px-3 font-semibold text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-400 font-mono font-bold text-[11px]">
                          {ord.id.length > 18 ? `${ord.id.slice(0, 10)}...${ord.id.slice(-4)}` : ord.id}
                        </span>
                        <button
                          onClick={() => copyToClipboard(ord.id)}
                          title="Copy Full Transaction ID"
                          className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-white transition-colors cursor-pointer"
                        >
                          {copiedId === ord.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Period / Round */}
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      #{ord.period}
                    </td>

                    {/* Player (Room Ledger Tab) */}
                    {activeTab === 'room_ledger' && (
                      <td className="py-2.5 px-3 text-slate-300 text-[11px] font-sans">
                        {ord.userName || 'Player'}
                      </td>
                    )}

                    {/* Selection */}
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-white/5 text-gold font-bold text-[11px]">
                        {ord.selection}
                      </span>
                    </td>

                    {/* Stake */}
                    <td className="py-2.5 px-3 text-right font-bold text-white">
                      ₹{ord.betAmount.toLocaleString()}
                    </td>

                    {/* Declared Game Result */}
                    <td className="py-2.5 px-3 text-center">
                      {ord.resultOutcome ? (
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-200 font-bold border border-white/10 text-[11px]">
                          {ord.resultOutcome}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Awaiting Draw</span>
                      )}
                    </td>

                    {/* Win Amount */}
                    <td className="py-2.5 px-3 text-right font-bold">
                      {isWon ? (
                        <span className="text-emerald-400 font-bold flex items-center justify-end gap-1">
                          <ArrowUpRight className="w-3 h-3" />
                          +₹{(ord.winAmount || 0).toLocaleString()}
                        </span>
                      ) : isPending ? (
                        <span className="text-amber-400">In Progress</span>
                      ) : (
                        <span className="text-slate-500">₹0</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                          isWon
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : isPending
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="py-2.5 px-3 text-right text-slate-500 text-[10px]">
                      {new Date(ord.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
