import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import type { RecentWinner } from '../../types';

const mockWinners: RecentWinner[] = [
  { id: '1', name: 'Rah***', amount: 5200, game: 'Color Prediction', avatar: '', timestamp: new Date().toISOString() },
  { id: '2', name: 'Pri***', amount: 12500, game: 'Matka Jhatka', avatar: '', timestamp: new Date().toISOString() },
  { id: '3', name: 'Vik***', amount: 3800, game: 'Matka Jhatka', avatar: '', timestamp: new Date().toISOString() },
  { id: '4', name: 'Ank***', amount: 8900, game: 'Color Prediction', avatar: '', timestamp: new Date().toISOString() },
  { id: '5', name: 'Dee***', amount: 22000, game: 'Color Prediction', avatar: '', timestamp: new Date().toISOString() },
  { id: '6', name: 'Sar***', amount: 6700, game: 'Matka Jhatka', avatar: '', timestamp: new Date().toISOString() },
];

export default function RecentWinners() {
  const allWinners = [...mockWinners, ...mockWinners];

  return (
    <div className="overflow-hidden space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Crown className="w-4 h-4 text-gold" />
        <h3 className="text-sm font-bold text-[#E8C97A] font-heading">Recent Winners</h3>
        <span className="w-1.5 h-1.5 rounded-full bg-[#2ECC71] animate-pulse ml-1" />
        <span className="text-[10px] text-[rgba(212,175,55,0.5)] font-bold">LIVE</span>
      </div>

      <div className="relative overflow-hidden py-1">
        <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-[#0B2318] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#0B2318] to-transparent z-10 pointer-events-none" />

        <motion.div
          className="flex gap-3"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ x: { duration: 25, repeat: Infinity, ease: 'linear' } }}
        >
          {allWinners.map((winner, i) => (
            <div
              key={`${winner.id}-${i}`}
              className="flex-shrink-0 flex items-center gap-3 rounded-xl px-3.5 py-2.5 min-w-[200px] border border-[rgba(212,175,55,0.2)] bg-[#0d2419]"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F5D576] to-[#B8860B] flex items-center justify-center text-xs font-bold text-[#0B2318] flex-shrink-0 shadow-[0_0_8px_rgba(212,175,55,0.3)]">
                {winner.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-[#F5F1E6] truncate">{winner.name}</span>
                  <span className="text-[10px] text-[#2ECC71] font-bold bg-[rgba(46,204,113,0.1)] px-1 rounded">Won</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-bold text-gold">₹{formatCurrency(winner.amount)}</span>
                  <span className="text-[10px] text-[rgba(212,175,55,0.45)]">• {winner.game}</span>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
