import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, TrendingUp } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { useAuth } from '../../store/AuthContext';
import { formatCurrency } from '../../lib/utils';

/* ─── Mock seed data (other players) ────────────────────────────── */
const MOCK_PLAYERS = [
  { id: 'p1', name: 'Rahul***93',  weekWin: 48200, monthWin: 182000, badge: '💎' },
  { id: 'p2', name: 'Priya***07',  weekWin: 36500, monthWin: 145000, badge: '💎' },
  { id: 'p3', name: 'Amit***44',   weekWin: 29800, monthWin: 98500,  badge: '🥇' },
  { id: 'p4', name: 'Sona***21',   weekWin: 22400, monthWin: 87200,  badge: '🥇' },
  { id: 'p5', name: 'Vikram***66', weekWin: 18100, monthWin: 71000,  badge: '🥈' },
  { id: 'p6', name: 'Neha***38',   weekWin: 14900, monthWin: 63400,  badge: '🥈' },
  { id: 'p7', name: 'Raj***55',    weekWin: 12300, monthWin: 52100,  badge: '🥈' },
  { id: 'p8', name: 'Anita***14',  weekWin: 9800,  monthWin: 42800,  badge: '🥉' },
  { id: 'p9', name: 'Karan***81',  weekWin: 7200,  monthWin: 31500,  badge: '🥉' },
  { id: 'p10', name: 'Pooja***29', weekWin: 5600,  monthWin: 24700,  badge: '🥉' },
];

const RANK_STYLES: Record<number, { icon: React.ReactNode; bg: string; border: string; text: string }> = {
  1: {
    icon: <Crown className="w-5 h-5" style={{ color: '#D4AF37' }} />,
    bg: 'linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(184,134,11,0.08) 100%)',
    border: 'rgba(212,175,55,0.6)',
    text: '#F5D576',
  },
  2: {
    icon: <Medal className="w-5 h-5" style={{ color: '#C0C0C0' }} />,
    bg: 'linear-gradient(135deg, rgba(192,192,192,0.12) 0%, rgba(100,100,100,0.05) 100%)',
    border: 'rgba(192,192,192,0.4)',
    text: '#D8D8D8',
  },
  3: {
    icon: <Medal className="w-5 h-5" style={{ color: '#CD7F32' }} />,
    bg: 'linear-gradient(135deg, rgba(205,127,50,0.15) 0%, rgba(100,60,10,0.05) 100%)',
    border: 'rgba(205,127,50,0.4)',
    text: '#E8A860',
  },
};

interface LeaderboardEntry {
  id: string;
  name: string;
  weekWin: number;
  monthWin: number;
  badge: string;
  isMe?: boolean;
}

function LeaderRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const style = RANK_STYLES[rank];
  const winAmt = entry.weekWin; // shown by parent based on tab

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.04 }}
      className="flex items-center gap-3 rounded-2xl px-4 py-3 border transition-all"
      style={{
        background: entry.isMe ? 'rgba(212,175,55,0.12)' : style?.bg ?? 'rgba(13,36,25,0.8)',
        borderColor: entry.isMe ? 'rgba(212,175,55,0.5)' : style?.border ?? 'rgba(212,175,55,0.12)',
      }}
    >
      {/* Rank badge */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm"
        style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', color: style?.text ?? 'rgba(212,175,55,0.6)' }}>
        {style?.icon ?? <span>#{rank}</span>}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-black truncate" style={{ color: entry.isMe ? '#F5D576' : style?.text ?? '#F5F1E6' }}>
            {entry.isMe ? 'You' : entry.name}
            {entry.isMe && <span className="ml-1 text-[9px] font-bold text-gold border border-[rgba(212,175,55,0.4)] px-1.5 py-0.5 rounded-full">YOU</span>}
          </p>
          <span className="text-sm">{entry.badge}</span>
        </div>
        <p className="text-[10px] text-[rgba(212,175,55,0.4)]">Rank #{rank}</p>
      </div>

      {/* Winnings */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-black font-heading tabular-nums" style={{ color: '#2ECC71' }}>
          +₹{formatCurrency(winAmt)}
        </p>
        <p className="text-[9px] text-[rgba(212,175,55,0.4)]">net winnings</p>
      </div>
    </motion.div>
  );
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<'week' | 'month'>('week');
  const { transactions } = useWallet();
  const { user } = useAuth();

  // Calculate current user's net winnings from real transactions
  const userNetWinnings = useMemo(() => {
    const now = Date.now();
    const cutoff = tab === 'week' ? now - 7 * 24 * 3600 * 1000 : now - 30 * 24 * 3600 * 1000;
    return transactions
      .filter(t => new Date(t.createdAt).getTime() >= cutoff)
      .reduce((sum, t) => {
        if (t.type === 'win' || t.type === 'bonus') return sum + t.amount;
        if (t.type === 'bet') return sum - t.amount;
        return sum;
      }, 0);
  }, [transactions, tab]);

  // Build leaderboard: inject real user with their calculated wins
  const entries = useMemo<LeaderboardEntry[]>(() => {
    const myEntry: LeaderboardEntry = {
      id: user?.id ?? 'me',
      name: user?.name ?? 'You',
      weekWin: Math.max(0, userNetWinnings),
      monthWin: Math.max(0, userNetWinnings * 1.3),
      badge: '⭐',
      isMe: true,
    };

    const all = [...MOCK_PLAYERS.map(p => ({ ...p, isMe: false })), myEntry];
    return all.sort((a, b) => (tab === 'week' ? b.weekWin - a.weekWin : b.monthWin - a.monthWin));
  }, [tab, userNetWinnings, user]);

  const myRank = entries.findIndex(e => e.isMe) + 1;
  const topList = entries.slice(0, 10);
  const myEntry = entries.find(e => e.isMe);
  const showMyCard = myRank > 10;

  const totalPool = entries.reduce((s, e) => s + (tab === 'week' ? e.weekWin : e.monthWin), 0);

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          <Trophy className="w-6 h-6 text-gold" />
          <h1 className="text-2xl font-black text-[#E8C97A] font-heading">Leaderboard</h1>
        </div>
        <p className="text-xs text-[rgba(212,175,55,0.5)]">Top winners ranked by net earnings</p>
      </motion.div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total Players', value: entries.length.toString() },
          { label: 'Prize Pool', value: `₹${formatCurrency(totalPool)}` },
          { label: 'Your Rank', value: `#${myRank}` },
        ].map(s => (
          <div key={s.label} className="royal-panel rounded-xl p-3 text-center">
            <p className="text-lg font-black text-gold font-heading">{s.value}</p>
            <p className="text-[9px] text-[rgba(212,175,55,0.45)] font-bold uppercase mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-[#0d2419]/80 rounded-2xl p-1.5 border border-[rgba(212,175,55,0.15)]">
        {(['week', 'month'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black capitalize cursor-pointer transition-all ${tab === t ? 'bg-[rgba(212,175,55,0.18)] text-gold border border-[rgba(212,175,55,0.45)]' : 'text-[rgba(212,175,55,0.45)] hover:text-[#E8C97A]'}`}>
            {t === 'week' ? '📅 This Week' : '📆 This Month'}
          </button>
        ))}
      </div>

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-2 items-end">
        {/* 2nd */}
        <div className="text-center space-y-2 mt-6">
          <div className="text-2xl">🥈</div>
          <div className="w-14 h-14 rounded-2xl mx-auto bg-[rgba(192,192,192,0.1)] border border-[rgba(192,192,192,0.3)] flex items-center justify-center font-black text-lg text-[#D8D8D8]">
            {topList[1]?.name?.[0] ?? 'P'}
          </div>
          <div className="h-16 rounded-xl bg-[rgba(192,192,192,0.08)] border border-[rgba(192,192,192,0.2)] flex flex-col items-center justify-center px-1">
            <p className="text-[10px] font-black text-[#D8D8D8] truncate w-full text-center">{topList[1]?.name?.split('***')[0]}***</p>
            <p className="text-xs font-black text-[#2ECC71]">₹{formatCurrency(tab === 'week' ? (topList[1]?.weekWin ?? 0) : (topList[1]?.monthWin ?? 0))}</p>
          </div>
        </div>
        {/* 1st */}
        <div className="text-center space-y-2">
          <div className="text-3xl">👑</div>
          <div className="w-16 h-16 rounded-2xl mx-auto bg-[rgba(212,175,55,0.15)] border-2 border-[rgba(212,175,55,0.6)] flex items-center justify-center font-black text-xl text-[#F5D576] shadow-[0_0_20px_rgba(212,175,55,0.3)]">
            {topList[0]?.name?.[0] ?? 'R'}
          </div>
          <div className="h-24 rounded-xl bg-[rgba(212,175,55,0.1)] border-2 border-[rgba(212,175,55,0.4)] flex flex-col items-center justify-center px-1 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
            <p className="text-[11px] font-black text-[#F5D576] truncate w-full text-center">{topList[0]?.name?.split('***')[0]}***</p>
            <p className="text-sm font-black text-[#2ECC71]">₹{formatCurrency(tab === 'week' ? (topList[0]?.weekWin ?? 0) : (topList[0]?.monthWin ?? 0))}</p>
          </div>
        </div>
        {/* 3rd */}
        <div className="text-center space-y-2 mt-8">
          <div className="text-2xl">🥉</div>
          <div className="w-14 h-14 rounded-2xl mx-auto bg-[rgba(205,127,50,0.1)] border border-[rgba(205,127,50,0.3)] flex items-center justify-center font-black text-lg text-[#E8A860]">
            {topList[2]?.name?.[0] ?? 'A'}
          </div>
          <div className="h-12 rounded-xl bg-[rgba(205,127,50,0.08)] border border-[rgba(205,127,50,0.2)] flex flex-col items-center justify-center px-1">
            <p className="text-[10px] font-black text-[#E8A860] truncate w-full text-center">{topList[2]?.name?.split('***')[0]}***</p>
            <p className="text-xs font-black text-[#2ECC71]">₹{formatCurrency(tab === 'week' ? (topList[2]?.weekWin ?? 0) : (topList[2]?.monthWin ?? 0))}</p>
          </div>
        </div>
      </div>

      {/* Full ranked list */}
      <div className="space-y-2">
        <p className="text-xs font-black text-[rgba(212,175,55,0.5)] uppercase tracking-wider">Full Rankings</p>
        {topList.map((entry, i) => (
          <LeaderRow key={entry.id} entry={{ ...entry, weekWin: tab === 'week' ? entry.weekWin : entry.monthWin }} rank={i + 1} />
        ))}
      </div>

      {/* My rank card (if outside top 10) */}
      {showMyCard && myEntry && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px border-t border-dashed border-[rgba(212,175,55,0.2)]" />
            <span className="text-[10px] text-[rgba(212,175,55,0.4)]">Your Position</span>
            <div className="flex-1 h-px border-t border-dashed border-[rgba(212,175,55,0.2)]" />
          </div>
          <LeaderRow entry={{ ...myEntry, weekWin: tab === 'week' ? myEntry.weekWin : myEntry.monthWin }} rank={myRank} />
        </div>
      )}
    </div>
  );
}
