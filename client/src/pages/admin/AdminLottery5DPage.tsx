import { useState } from 'react';
import { Ticket, Clock, ShieldCheck, BarChart3, DollarSign, Award, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useToast } from '../../components/ui/Toast';

interface Lottery5DDraw {
  id: string;
  drawPeriod: string;
  winningNumbers: number[];
  sumTotal: number;
  totalTickets: number;
  totalPool: number;
  totalPayouts: number;
  drawnAt: string;
}

const MOCK_PAST_DRAWS: Lottery5DDraw[] = [
  { id: 'd_109', drawPeriod: '5D-20260816-014', winningNumbers: [7, 2, 9, 4, 8], sumTotal: 30, totalTickets: 482, totalPool: 24100, totalPayouts: 18200, drawnAt: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: 'd_108', drawPeriod: '5D-20260816-013', winningNumbers: [3, 5, 5, 0, 1], sumTotal: 14, totalTickets: 512, totalPool: 25600, totalPayouts: 16500, drawnAt: new Date(Date.now() - 10 * 60000).toISOString() },
  { id: 'd_107', drawPeriod: '5D-20260816-012', winningNumbers: [9, 8, 1, 6, 4], sumTotal: 28, totalTickets: 390, totalPool: 19500, totalPayouts: 14200, drawnAt: new Date(Date.now() - 15 * 60000).toISOString() },
  { id: 'd_106', drawPeriod: '5D-20260816-011', winningNumbers: [0, 4, 7, 2, 9], sumTotal: 22, totalTickets: 610, totalPool: 30500, totalPayouts: 22400, drawnAt: new Date(Date.now() - 20 * 60000).toISOString() },
  { id: 'd_105', drawPeriod: '5D-20260816-010', winningNumbers: [6, 6, 3, 8, 5], sumTotal: 28, totalTickets: 430, totalPool: 21500, totalPayouts: 15800, drawnAt: new Date(Date.now() - 25 * 60000).toISOString() },
];

export default function AdminLottery5DPage() {
  const { addToast } = useToast();
  const [selectedTimerVariant, setSelectedTimerVariant] = useState<'1min' | '3min' | '5min' | '10min'>('1min');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live round statistics
  const currentPeriod = `5D-20260816-015`;
  const remainingSec = 38;
  const currentPool = 34500;
  const currentTickets = 690;

  // Mock live bet distribution on 5 positions (A, B, C, D, E)
  const positionBets = [
    { pos: 'A (1st Digit)', highDigit: 8, totalWagered: 7200, topPick: '7 (28%)' },
    { pos: 'B (2nd Digit)', highDigit: 3, totalWagered: 6800, topPick: '3 (31%)' },
    { pos: 'C (3rd Digit)', highDigit: 5, totalWagered: 7100, topPick: '9 (24%)' },
    { pos: 'D (4th Digit)', highDigit: 9, totalWagered: 6500, topPick: '4 (26%)' },
    { pos: 'E (5th Digit)', highDigit: 2, totalWagered: 6900, topPick: '8 (30%)' },
  ];

  const refreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      addToast({ type: 'info', title: 'Refreshed', message: 'Lottery 5D analytics updated.' });
    }, 500);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(212,175,55,0.15)] pb-5">
        <div>
          <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2.5">
            <Ticket className="w-6 h-6 text-gold" />
            Lottery 5D Management & Analytics
          </h1>
          <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">
            Monitor active 5D draws, provably fair seed hashes, live position wagering distribution, and historical results.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-gold text-xs font-bold flex items-center gap-1.5 hover:bg-[rgba(212,175,55,0.2)] transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Timer Variant Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['1min', '3min', '5min', '10min'] as const).map(variant => (
          <button
            key={variant}
            onClick={() => setSelectedTimerVariant(variant)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedTimerVariant === variant
                ? 'bg-gradient-to-r from-[#FFD700] to-[#8B6914] text-[#061510] font-black shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                : 'bg-[#0d2419] text-[rgba(212,175,55,0.7)] border border-[rgba(212,175,55,0.2)] hover:border-gold hover:text-gold'
            }`}
          >
            Lottery 5D — {variant.toUpperCase()}
          </button>
        ))}
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="royal-panel p-4 rounded-2xl border border-[rgba(212,175,55,0.15)] space-y-1">
          <span className="text-[10px] text-[rgba(212,175,55,0.5)] uppercase font-bold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gold" /> Current Draw Period
          </span>
          <p className="text-lg font-black font-mono text-gold">{currentPeriod}</p>
          <span className="text-[10px] text-emerald-400 font-mono">Countdown: {remainingSec}s</span>
        </div>

        <div className="royal-panel p-4 rounded-2xl border border-[rgba(212,175,55,0.15)] space-y-1">
          <span className="text-[10px] text-[rgba(212,175,55,0.5)] uppercase font-bold flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Active Pool Volume
          </span>
          <p className="text-lg font-black font-mono text-emerald-400">{formatCurrency(currentPool)}</p>
          <span className="text-[10px] text-[rgba(212,175,55,0.5)] font-mono">{currentTickets} tickets placed</span>
        </div>

        <div className="royal-panel p-4 rounded-2xl border border-[rgba(212,175,55,0.15)] space-y-1">
          <span className="text-[10px] text-[rgba(212,175,55,0.5)] uppercase font-bold flex items-center gap-1">
            <BarChart3 className="w-3.5 h-3.5 text-gold" /> Today Total Volume
          </span>
          <p className="text-lg font-black font-mono text-gold">₹3,42,800</p>
          <span className="text-[10px] text-emerald-400 font-mono">Net House Margin: +18.4%</span>
        </div>

        <div className="royal-panel p-4 rounded-2xl border border-[rgba(212,175,55,0.15)] space-y-1">
          <span className="text-[10px] text-[rgba(212,175,55,0.5)] uppercase font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-gold" /> Fairness Security
          </span>
          <p className="text-sm font-black font-mono text-emerald-400">SHA-256 Verified</p>
          <span className="text-[10px] text-[rgba(212,175,55,0.5)] font-mono truncate block">Hash: 8f9b2c...d4e1</span>
        </div>
      </div>

      {/* Live Position Bet Distribution (Monitoring Only) */}
      <div className="royal-panel rounded-2xl p-5 border border-[rgba(212,175,55,0.2)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-[#E8C97A] font-heading flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gold" />
            Live Draw Bet Distribution (Monitoring & Analytics Only)
          </h2>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
            PROVABLY FAIR ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {positionBets.map((pos, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-[#081d13] border border-[rgba(212,175,55,0.15)] space-y-2">
              <span className="text-[10px] font-bold text-[rgba(212,175,55,0.6)] uppercase block">{pos.pos}</span>
              <p className="text-base font-black font-mono text-gold">{formatCurrency(pos.totalWagered)}</p>
              <div className="text-[10px] text-[rgba(212,175,55,0.5)] font-mono border-t border-[rgba(212,175,55,0.1)] pt-1.5">
                Top Pick: <strong className="text-[#F5F1E6]">{pos.topPick}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Past Draws History Table */}
      <div className="royal-panel rounded-2xl overflow-hidden border border-[rgba(212,175,55,0.2)]">
        <div className="p-4 border-b border-[rgba(212,175,55,0.15)] flex items-center justify-between">
          <h2 className="text-sm font-black text-[#E8C97A] flex items-center gap-2">
            <Award className="w-4 h-4 text-gold" />
            Recent 5D Draw Outcomes & Payout Audit
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[rgba(212,175,55,0.15)] bg-[rgba(212,175,55,0.04)] text-[rgba(212,175,55,0.6)] uppercase text-[10px] font-bold">
                <th className="py-3 px-4">Draw Period</th>
                <th className="py-3 px-4">Winning 5D Digits</th>
                <th className="py-3 px-4">Sum Total</th>
                <th className="py-3 px-4">Tickets</th>
                <th className="py-3 px-4">Pool Volume</th>
                <th className="py-3 px-4">Total Payouts</th>
                <th className="py-3 px-4">House P&L</th>
                <th className="py-3 px-4">Drawn At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(212,175,55,0.08)] font-mono">
              {MOCK_PAST_DRAWS.map(draw => {
                const houseProfit = draw.totalPool - draw.totalPayouts;
                return (
                  <tr key={draw.id} className="hover:bg-[rgba(212,175,55,0.03)] transition-colors">
                    <td className="py-3 px-4 font-bold text-gold">{draw.drawPeriod}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        {draw.winningNumbers.map((num, i) => (
                          <span
                            key={i}
                            className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#FFD700] to-[#8B6914] text-[#061510] font-black flex items-center justify-center text-xs shadow-sm"
                          >
                            {num}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-[#F5F1E6]">{draw.sumTotal}</td>
                    <td className="py-3 px-4 text-[rgba(212,175,55,0.7)]">{draw.totalTickets}</td>
                    <td className="py-3 px-4 text-emerald-400">{formatCurrency(draw.totalPool)}</td>
                    <td className="py-3 px-4 text-[rgba(212,175,55,0.8)]">{formatCurrency(draw.totalPayouts)}</td>
                    <td className={`py-3 px-4 font-bold ${houseProfit >= 0 ? 'text-gold' : 'text-rose-400'}`}>
                      +{formatCurrency(houseProfit)}
                    </td>
                    <td className="py-3 px-4 text-[rgba(212,175,55,0.5)] font-sans text-[11px]">
                      {new Date(draw.drawnAt).toLocaleTimeString('en-IN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
