/**
 * GlobalLiveFeed — collapsible panel used on Home + standalone /live page
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { useLiveFeed, type LiveBetEntry } from '../../store/LiveFeedContext';
import { formatCurrency } from '../../lib/utils';

function FeedRow({ entry, animate = true }: { entry: LiveBetEntry; animate?: boolean }) {
  const timeStr = new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: -8, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[rgba(212,175,55,0.08)] bg-[rgba(11,35,24,0.5)] hover:border-[rgba(212,175,55,0.2)] transition-all"
    >
      {/* Game icon */}
      <span className="text-lg w-7 shrink-0 text-center">{entry.gameIcon}</span>

      {/* User + game */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-black text-gold">{entry.user}</span>
          <span className="text-[9px] text-[rgba(212,175,55,0.35)] border border-[rgba(212,175,55,0.15)] px-1 rounded font-bold">{entry.game}</span>
        </div>
        <span className="text-[9px] text-[rgba(212,175,55,0.35)]">{timeStr}</span>
      </div>

      {/* Bet amount */}
      <div className="text-right shrink-0">
        <p className="text-[10px] text-[rgba(212,175,55,0.5)]">₹{formatCurrency(entry.betAmount)}</p>
        {entry.result === 'won' ? (
          <p className="text-xs font-black text-[#2ECC71]">+₹{formatCurrency(entry.winAmount ?? 0)}
            {entry.multiplier && <span className="text-[9px] ml-0.5">({entry.multiplier}×)</span>}
          </p>
        ) : entry.result === 'lost' ? (
          <p className="text-xs font-black text-[#FF4D6D]">Lost</p>
        ) : (
          <p className="text-xs font-black text-amber-400 animate-pulse">Active</p>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Collapsible panel (used on HomePage) ─────────────────────── */
export function LiveFeedPanel() {
  const { entries } = useLiveFeed();
  const [collapsed, setCollapsed] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const prevLen = useRef(entries.length);

  useEffect(() => {
    const delta = entries.length - prevLen.current;
    if (delta > 0 && collapsed) setNewCount(c => c + delta);
    prevLen.current = entries.length;
  }, [entries.length, collapsed]);

  return (
    <div className="royal-panel rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => { setCollapsed(c => !c); setNewCount(0); }}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[rgba(212,175,55,0.04)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Activity className="w-4 h-4 text-gold" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#2ECC71] animate-pulse" />
          </div>
          <span className="text-sm font-black text-[#E8C97A]">Live Bet Feed</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[rgba(46,204,113,0.12)] border border-[rgba(46,204,113,0.25)] text-[#2ECC71] font-black">
            {entries.length} LIVE
          </span>
          {newCount > 0 && collapsed && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-black animate-bounce">
              +{newCount} new
            </span>
          )}
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4 text-[rgba(212,175,55,0.5)]" /> : <ChevronUp className="w-4 h-4 text-[rgba(212,175,55,0.5)]" />}
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1.5 max-h-80 overflow-y-auto scrollbar-none">
              {entries.slice(0, 30).map((e, i) => (
                <FeedRow key={e.id} entry={e} animate={i < 3} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Full /live page ───────────────────────────────────────────── */
export function LiveFeedPage() {
  const { entries } = useLiveFeed();
  const [gameFilter, setGameFilter] = useState('All');
  const games = ['All', '✈️ Aviator', '💣 Mines', '🪙 Plinko', '🃏 Teen Patti', '🎨 WinGo', '🎲 Matka', '🎟️ Lottery', '🟢 Color'];

  const filtered = gameFilter === 'All'
    ? entries
    : entries.filter(e => gameFilter.includes(e.game.split(' ')[0]) || e.game.startsWith(gameFilter.replace(/^.\s/, '')));

  const totalBets = entries.reduce((s, e) => s + e.betAmount, 0);
  const totalWins = entries.filter(e => e.result === 'won').reduce((s, e) => s + (e.winAmount ?? 0), 0);

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="relative w-10 h-10 rounded-xl bg-[rgba(46,204,113,0.1)] border border-[rgba(46,204,113,0.3)] flex items-center justify-center">
            <Zap className="w-5 h-5 text-[#2ECC71]" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#2ECC71] animate-pulse ring-2 ring-[#0B2318]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#E8C97A] font-heading">Live Bet Feed</h1>
            <p className="text-[10px] text-[rgba(212,175,55,0.4)]">Real-time activity across all PlayArena games</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total Bets', value: entries.length },
          { label: 'Volume', value: `₹${formatCurrency(totalBets)}` },
          { label: 'Paid Out', value: `₹${formatCurrency(totalWins)}` },
        ].map(s => (
          <div key={s.label} className="royal-panel rounded-xl p-3 text-center">
            <p className="text-lg font-black text-gold font-heading">{s.value}</p>
            <p className="text-[9px] text-[rgba(212,175,55,0.4)] font-bold uppercase mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Game filter */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {games.map(g => (
          <button key={g} onClick={() => setGameFilter(g)}
            className={`shrink-0 px-2.5 py-1.5 rounded-xl text-[10px] font-black cursor-pointer transition-all border ${gameFilter === g ? 'bg-[rgba(212,175,55,0.18)] border-[rgba(212,175,55,0.5)] text-gold' : 'border-[rgba(212,175,55,0.1)] text-[rgba(212,175,55,0.45)] hover:text-gold bg-[#0a1e12]'}`}>
            {g}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="space-y-1.5">
        <AnimatePresence mode="popLayout">
          {filtered.slice(0, 80).map((e, i) => (
            <FeedRow key={e.id} entry={e} animate={i < 5} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
