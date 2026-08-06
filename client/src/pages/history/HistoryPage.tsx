import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Trophy, Crown, ShieldCheck, Filter, TrendingUp, TrendingDown, BarChart2, ChevronDown } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { StatusBadge } from '../../components/shared/HistoryTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProvablyFairModal } from '../../components/ui/ProvablyFairModal';
import { getTimeAgo, formatCurrency } from '../../lib/utils';
import type { Transaction } from '../../types';

/* ─── Game name extraction from transaction description ─────────── */
const GAME_LABELS = [
  { key: 'aviator', label: 'Aviator' },
  { key: 'mines', label: 'Mines' },
  { key: 'plinko', label: 'Plinko' },
  { key: 'teen patti', label: 'Teen Patti' },
  { key: 'wingo', label: 'WinGo' },
  { key: 'matka', label: 'Matka' },
  { key: 'color', label: 'Color Prediction' },
  { key: 'lottery', label: 'Lottery 5D' },
];

function detectGame(tx: Transaction): string {
  const desc = (tx.description || '').toLowerCase();
  for (const g of GAME_LABELS) {
    if (desc.includes(g.key)) return g.label;
  }
  return 'Other';
}

type DateRange = 'all' | '7d' | '30d' | 'today';
type ResultFilter = 'all' | 'win' | 'loss';
type MainTab = 'history' | 'report';

/* ─── Simple Bar Chart Component ─────────────────────────────────── */
function MiniBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => Math.abs(d.value)), 1);
  return (
    <div className="space-y-2">
      {data.map(d => {
        const pct = (Math.abs(d.value) / max) * 100;
        const positive = d.value >= 0;
        return (
          <div key={d.label} className="flex items-center gap-2">
            <span className="text-[10px] text-[rgba(212,175,55,0.5)] w-24 shrink-0 truncate">{d.label}</span>
            <div className="flex-1 h-5 bg-[#061510] rounded-md overflow-hidden relative">
              <div
                className="h-full rounded-md transition-all"
                style={{ width: `${pct}%`, background: positive ? 'rgba(46,204,113,0.7)' : 'rgba(255,77,109,0.7)' }}
              />
            </div>
            <span className={`text-[10px] font-black w-20 text-right tabular-nums shrink-0 ${positive ? 'text-[#2ECC71]' : 'text-[#FF4D6D]'}`}>
              {positive ? '+' : ''}₹{formatCurrency(Math.abs(d.value))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Daily PnL micro line chart ─────────────────────────────────── */
function DailyPnLChart({ points }: { points: { date: string; net: number }[] }) {
  if (points.length === 0) return <div className="text-center py-6 text-[rgba(212,175,55,0.3)] text-xs">No data</div>;
  const max = Math.max(...points.map(p => Math.abs(p.net)), 1);
  const h = 80;
  const w = Math.max(points.length * 28, 200);
  const midY = h / 2;

  const pts = points.map((p, i) => {
    const x = (i / Math.max(points.length - 1, 1)) * (w - 20) + 10;
    const y = midY - (p.net / max) * (midY - 8);
    return { x, y, net: p.net, date: p.date };
  });

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h + 20} className="block mx-auto">
        {/* Zero line */}
        <line x1={10} y1={midY} x2={w - 10} y2={midY} stroke="rgba(212,175,55,0.15)" strokeWidth={1} strokeDasharray="3,3" />
        {/* Line */}
        <path d={pathD} fill="none" stroke="#D4AF37" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill={p.net >= 0 ? '#2ECC71' : '#FF4D6D'} />
          </g>
        ))}
        {/* Date labels — every 3 points */}
        {pts.filter((_, i) => i % Math.max(1, Math.floor(pts.length / 5)) === 0).map((p, i) => (
          <text key={i} x={p.x} y={h + 14} textAnchor="middle" fontSize={8} fill="rgba(212,175,55,0.4)">{p.date}</text>
        ))}
      </svg>
    </div>
  );
}

export default function HistoryPage() {
  const { transactions } = useWallet();
  const [mainTab, setMainTab] = useState<MainTab>('history');
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);

  // Filters
  const [selectedGame, setSelectedGame] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Report time range
  const [reportRange, setReportRange] = useState<'7d' | '30d' | 'all'>('7d');

  /* ─── Filtering logic ─────────────────────────────────── */
  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoffs: Record<DateRange, number> = {
      all: 0,
      today: now - 24 * 3600 * 1000,
      '7d': now - 7 * 24 * 3600 * 1000,
      '30d': now - 30 * 24 * 3600 * 1000,
    };
    const cutoff = cutoffs[dateRange];

    return transactions.filter(tx => {
      // Date filter
      if (new Date(tx.createdAt).getTime() < cutoff) return false;
      // Type: only bet+win for game history
      if (!['bet', 'win', 'bonus'].includes(tx.type)) return false;
      // Game filter
      if (selectedGame !== 'all' && detectGame(tx) !== selectedGame) return false;
      // Result filter
      if (resultFilter === 'win' && tx.type !== 'win') return false;
      if (resultFilter === 'loss' && tx.type !== 'bet') return false;
      return true;
    });
  }, [transactions, dateRange, selectedGame, resultFilter]);

  const betTxns = useMemo(() => filtered.filter(t => t.type === 'bet'), [filtered]);
  const winTxns = useMemo(() => filtered.filter(t => t.type === 'win'), [filtered]);
  const winRate = betTxns.length > 0 ? Math.round((winTxns.length / betTxns.length) * 100) : 0;

  const activeFiltersCount = [selectedGame !== 'all', dateRange !== 'all', resultFilter !== 'all'].filter(Boolean).length;

  /* ─── P&L Report data ─────────────────────────────────── */
  const reportData = useMemo(() => {
    const now = Date.now();
    const cutoff = reportRange === '7d' ? now - 7 * 86400000 : reportRange === '30d' ? now - 30 * 86400000 : 0;

    const relevant = transactions.filter(t =>
      new Date(t.createdAt).getTime() >= cutoff &&
      ['bet', 'win', 'bonus'].includes(t.type)
    );

    const totalWagered = relevant.filter(t => t.type === 'bet').reduce((s, t) => s + t.amount, 0);
    const totalWon = relevant.filter(t => t.type === 'win' || t.type === 'bonus').reduce((s, t) => s + t.amount, 0);
    const netPL = totalWon - totalWagered;

    // Per-game breakdown
    const byGame: Record<string, { bets: number; wins: number }> = {};
    relevant.forEach(t => {
      const g = detectGame(t);
      if (!byGame[g]) byGame[g] = { bets: 0, wins: 0 };
      if (t.type === 'bet') byGame[g].bets += t.amount;
      if (t.type === 'win' || t.type === 'bonus') byGame[g].wins += t.amount;
    });
    const gameBreakdown = Object.entries(byGame).map(([name, d]) => ({ label: name, value: d.wins - d.bets }));

    // Daily PnL
    const dailyMap: Record<string, { bets: number; wins: number }> = {};
    relevant.forEach(t => {
      const day = new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      if (!dailyMap[day]) dailyMap[day] = { bets: 0, wins: 0 };
      if (t.type === 'bet') dailyMap[day].bets += t.amount;
      if (t.type === 'win') dailyMap[day].wins += t.amount;
    });
    const dailyPoints = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({ date, net: d.wins - d.bets }));

    return { totalWagered, totalWon, netPL, gameBreakdown, dailyPoints };
  }, [transactions, reportRange]);

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-gold" /> Gaming History
          </h1>
          <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">Audit bets & verify outcomes</p>
        </div>
        <button onClick={() => setIsFairnessOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[rgba(212,175,55,0.4)] text-[#E8C97A] text-xs font-bold hover:bg-[rgba(212,175,55,0.1)] transition-all cursor-pointer">
          <ShieldCheck className="w-4 h-4 text-gold" /> Verify Hash
        </button>
      </motion.div>

      {/* Main tab switcher */}
      <div className="flex gap-1.5 bg-[#0d2419]/80 rounded-2xl p-1.5 border border-[rgba(212,175,55,0.15)]">
        {[
          { key: 'history' as const, label: '📋 Bet History', icon: <Crown className="w-3.5 h-3.5" /> },
          { key: 'report' as const, label: '📊 P&L Report', icon: <BarChart2 className="w-3.5 h-3.5" /> },
        ].map(tab => (
          <button key={tab.key} onClick={() => setMainTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${mainTab === tab.key ? 'bg-[rgba(212,175,55,0.18)] text-gold border border-[rgba(212,175,55,0.45)]' : 'text-[rgba(212,175,55,0.5)] hover:text-[#E8C97A]'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {mainTab === 'history' ? (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Filter bar */}
            <div className="space-y-2">
              <button onClick={() => setShowFilters(f => !f)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[rgba(212,175,55,0.2)] bg-[#0a1e12] text-xs font-black text-[rgba(212,175,55,0.7)] cursor-pointer hover:border-[rgba(212,175,55,0.4)] transition-all">
                <span className="flex items-center gap-2">
                  <Filter className="w-4 h-4" /> Filters
                  {activeFiltersCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[rgba(212,175,55,0.2)] text-gold text-[9px] font-black">{activeFiltersCount} active</span>
                  )}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showFilters && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden royal-panel rounded-xl p-4 space-y-3">
                    {/* Game filter */}
                    <div>
                      <p className="text-[10px] font-black text-[rgba(212,175,55,0.5)] mb-1.5 uppercase tracking-wider">Game</p>
                      <div className="flex flex-wrap gap-1.5">
                        {['all', ...GAME_LABELS.map(g => g.label)].map(g => (
                          <button key={g} onClick={() => setSelectedGame(g)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all border ${selectedGame === g ? 'bg-[rgba(212,175,55,0.18)] border-[rgba(212,175,55,0.5)] text-gold' : 'border-[rgba(212,175,55,0.1)] text-[rgba(212,175,55,0.4)] hover:text-gold'}`}>
                            {g === 'all' ? 'All Games' : g}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Date range */}
                    <div>
                      <p className="text-[10px] font-black text-[rgba(212,175,55,0.5)] mb-1.5 uppercase tracking-wider">Date Range</p>
                      <div className="flex gap-1.5">
                        {([['all', 'All Time'], ['today', 'Today'], ['7d', 'Last 7d'], ['30d', 'Last 30d']] as const).map(([v, l]) => (
                          <button key={v} onClick={() => setDateRange(v)}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all border ${dateRange === v ? 'bg-[rgba(212,175,55,0.18)] border-[rgba(212,175,55,0.5)] text-gold' : 'border-[rgba(212,175,55,0.1)] text-[rgba(212,175,55,0.4)] hover:text-gold'}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Result filter */}
                    <div>
                      <p className="text-[10px] font-black text-[rgba(212,175,55,0.5)] mb-1.5 uppercase tracking-wider">Result</p>
                      <div className="flex gap-1.5">
                        {([['all', 'All'], ['win', '✅ Wins'], ['loss', '❌ Losses']] as const).map(([v, l]) => (
                          <button key={v} onClick={() => setResultFilter(v)}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all border ${resultFilter === v ? 'bg-[rgba(212,175,55,0.18)] border-[rgba(212,175,55,0.5)] text-gold' : 'border-[rgba(212,175,55,0.1)] text-[rgba(212,175,55,0.4)] hover:text-gold'}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Reset */}
                    {activeFiltersCount > 0 && (
                      <button onClick={() => { setSelectedGame('all'); setDateRange('all'); setResultFilter('all'); }}
                        className="text-[10px] text-[rgba(212,175,55,0.5)] hover:text-gold cursor-pointer transition-colors font-bold">
                        ✕ Clear all filters
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Stat cards — recalculate based on filtered */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Bets', value: betTxns.length, color: 'text-[#F5D576]' },
                { label: 'Total Wins', value: winTxns.length, color: 'text-[#2ECC71]' },
                { label: 'Win Rate', value: `${winRate}%`, color: 'text-gold' },
              ].map((s, i) => (
                <div key={i} className="royal-panel rounded-2xl p-4 text-center">
                  <p className="text-[10px] text-[rgba(212,175,55,0.55)] font-bold uppercase tracking-wider">{s.label}</p>
                  <p className={`text-xl font-black mt-1 font-heading tabular-nums ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Transaction list */}
            <div className="space-y-2.5">
              {filtered.length === 0 ? (
                <EmptyState title="No History Found" description="No transactions match your current filters." actionText="Clear filters" actionLink="#" iconType="history" />
              ) : (
                filtered.map((tx, i) => (
                  <motion.div key={tx.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="flex items-center justify-between royal-panel rounded-2xl p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#F5F1E6]">{tx.description || tx.type}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[rgba(212,175,55,0.08)] text-[rgba(212,175,55,0.5)] border border-[rgba(212,175,55,0.12)]">{detectGame(tx)}</span>
                      </div>
                      <p className="text-[11px] text-[rgba(212,175,55,0.45)] mt-0.5">{getTimeAgo(tx.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black font-heading tabular-nums ${tx.type === 'bet' ? 'text-[#FF4D6D]' : 'text-[#2ECC71]'}`}>
                        {tx.type === 'bet' ? '-' : '+'}₹{tx.amount.toFixed(2)}
                      </p>
                      <StatusBadge status={tx.status} />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          /* ─── P&L REPORT ────────────────────────────────── */
          <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Time range selector */}
            <div className="flex gap-1.5">
              {([['7d', 'Last 7 Days'], ['30d', 'Last 30 Days'], ['all', 'All Time']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setReportRange(v)}
                  className={`flex-1 py-2 rounded-xl text-xs font-black cursor-pointer transition-all border ${reportRange === v ? 'bg-[rgba(212,175,55,0.18)] border-[rgba(212,175,55,0.45)] text-gold' : 'border-[rgba(212,175,55,0.1)] text-[rgba(212,175,55,0.4)] hover:text-gold bg-[#0a1e12]'}`}>
                  {l}
                </button>
              ))}
            </div>

            {/* Summary strip */}
            <div className={`royal-panel rounded-2xl p-4 border-l-4 ${reportData.netPL >= 0 ? 'border-[#2ECC71]' : 'border-[#FF4D6D]'}`}>
              <div className="flex items-center gap-2 mb-3">
                {reportData.netPL >= 0 ? <TrendingUp className="w-4 h-4 text-[#2ECC71]" /> : <TrendingDown className="w-4 h-4 text-[#FF4D6D]" />}
                <span className="text-xs font-black text-[rgba(212,175,55,0.7)]">Net P&L Summary</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Total Wagered', value: `₹${formatCurrency(reportData.totalWagered)}`, color: 'text-[#F5D576]' },
                  { label: 'Total Won', value: `₹${formatCurrency(reportData.totalWon)}`, color: 'text-[#2ECC71]' },
                  { label: 'Net P&L', value: `${reportData.netPL >= 0 ? '+' : ''}₹${formatCurrency(Math.abs(reportData.netPL))}`, color: reportData.netPL >= 0 ? 'text-[#2ECC71]' : 'text-[#FF4D6D]' },
                ].map(s => (
                  <div key={s.label}>
                    <p className={`text-lg font-black font-heading tabular-nums ${s.color}`}>{s.value}</p>
                    <p className="text-[9px] text-[rgba(212,175,55,0.45)] mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily chart */}
            <div className="royal-panel rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-black text-[rgba(212,175,55,0.7)] uppercase tracking-wider">📈 Daily Net P&L</h3>
              <DailyPnLChart points={reportData.dailyPoints} />
            </div>

            {/* Per-game breakdown */}
            <div className="royal-panel rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-black text-[rgba(212,175,55,0.7)] uppercase tracking-wider">🎮 By Game</h3>
              {reportData.gameBreakdown.length === 0 ? (
                <p className="text-xs text-[rgba(212,175,55,0.3)] text-center py-4">No game data in this period</p>
              ) : (
                <MiniBarChart data={reportData.gameBreakdown} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProvablyFairModal isOpen={isFairnessOpen} onClose={() => setIsFairnessOpen(false)} />
    </div>
  );
}
