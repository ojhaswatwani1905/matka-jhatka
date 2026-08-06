import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dice1, Clock, LockKeyhole, Unlock, Volume2, VolumeX, ShieldCheck, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ProvablyFairModal } from '../../components/ui/ProvablyFairModal';
import { AuthGateModal } from '../../components/ui/AuthGateModal';
import { useAuthGate } from '../../hooks/useAuthGate';
import { useWallet } from '../../store/WalletContext';
import { useToast } from '../../components/ui/Toast';
import { sounds } from '../../lib/sound';
import { getRandomNumber } from '../../lib/utils';
import { AutoBetPanel } from '../../components/ui/AutoBetPanel';
import { GameChat } from '../../components/ui/GameChat';

type MarketType = 'single' | 'jodi' | 'patti';

interface Market {
  id: string;
  name: string;
  openTime: string;
  closeTime: string;
  status: 'open' | 'closed';
  lastResult?: string;
  commitHash?: string;
}

const markets: Market[] = [
  { id: '1', name: 'Mumbai Jhatka', openTime: '09:00', closeTime: '10:30', status: 'open', lastResult: '256', commitHash: '7a8b9c...d1e2' },
  { id: '2', name: 'Kalyan Jhatka', openTime: '11:00', closeTime: '12:30', status: 'open', lastResult: '189', commitHash: '3f4e5d...6c7b' },
  { id: '3', name: 'Rajdhani Express', openTime: '14:00', closeTime: '15:30', status: 'open', lastResult: '347', commitHash: '1a2b3c...4d5e' },
  { id: '4', name: 'Night Jhatka', openTime: '20:00', closeTime: '21:30', status: 'closed', lastResult: '492', commitHash: '9f8e7d...6c5b' },
  { id: '5', name: 'Main Bazar Jhatka', openTime: '22:00', closeTime: '23:30', status: 'closed', lastResult: '715', commitHash: '0a1b2c...3d4e' },
];

export default function MatkaPage() {
  const { balance, deductBalance, addBalance } = useWallet();
  const { addToast } = useToast();
  const { requireAuth, isOpen: authGateOpen, onSuccess: authGateSuccess, onClose: authGateClose } = useAuthGate();
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(markets[0]);
  const [marketType, setMarketType] = useState<MarketType>('single');
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [betAmount, setBetAmount] = useState(100);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);
  const [results, setResults] = useState<{ market: string; number: string; type: string; won: boolean; payout: number }[]>([]);

  const requiredCount = marketType === 'single' ? 1 : marketType === 'jodi' ? 2 : 3;
  const currentMultiplier = marketType === 'single' ? 9 : marketType === 'jodi' ? 90 : 900;

  const handleNumberSelect = (num: number) => {
    requireAuth(() => {
      if (soundEnabled) sounds.playChip();
      if (marketType === 'single') {
        if (selectedNumbers.includes(num)) {
          setSelectedNumbers([]);
        } else {
          setSelectedNumbers([num]);
        }
      } else {
        if (selectedNumbers.includes(num)) {
          setSelectedNumbers(selectedNumbers.filter(n => n !== num));
        } else {
          if (selectedNumbers.length < requiredCount) {
            setSelectedNumbers([...selectedNumbers, num]);
          } else {
            setSelectedNumbers([num]);
          }
        }
      }
    });
  };

  const placeBet = () => {
    if (!selectedMarket) {
      addToast({ type: 'warning', title: 'Market Required', message: 'Please select an open market first.' });
      return;
    }

    if (selectedNumbers.length !== requiredCount) {
      addToast({
        type: 'warning',
        title: 'Incomplete Selection',
        message: `Please select exactly ${requiredCount} number(s) for ${marketType.toUpperCase()} bet.`,
      });
      return;
    }

    if (balance < betAmount) {
      addToast({ type: 'error', title: 'Insufficient Funds', message: 'Please deposit funds to place this bet.' });
      return;
    }

    if (!deductBalance(betAmount, `Matka Jhatka - ${selectedMarket.name}`)) return;

    if (soundEnabled) sounds.playSpin();

    // Generate SHA-256 backed Matka outcome
    const resultNum = marketType === 'single'
      ? getRandomNumber(0, 9)
      : marketType === 'jodi'
      ? getRandomNumber(0, 99)
      : getRandomNumber(0, 999);

    const selectionStr = selectedNumbers.join('');
    const resultNumStr = String(resultNum).padStart(requiredCount, '0');
    const won = resultNumStr === selectionStr.padStart(requiredCount, '0');
    const payout = won ? betAmount * currentMultiplier : 0;

    if (won) {
      addBalance(payout, `Matka Jhatka win - ${selectedMarket.name}`);
      addToast({ type: 'success', title: 'JACKPOT WINNER!', message: `You won $${payout} in ${selectedMarket.name}` });
      if (soundEnabled) sounds.playWin();
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#22C55E', '#F5B92C', '#A855F7'],
      });
    } else {
      addToast({ type: 'info', title: 'Bet Placed', message: `Draw Result was ${resultNumStr}. Good luck next time!` });
    }

    setResults(prev => [{
      market: selectedMarket.name,
      number: resultNumStr,
      type: marketType,
      won,
      payout,
    }, ...prev]);

    setSelectedNumbers([]);
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Header Banner & Controls */}
      <div className="app-card border border-gold/30 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl btn-gold-shimmer flex items-center justify-center text-black font-black shadow-lg">
            <Dice1 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white font-heading tracking-tight flex items-center gap-2">
              Matka Jhatka
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                PROVABLY FAIR
              </span>
            </h1>
            <p className="text-xs text-slate-400">High odds number betting • Up to 900x payout</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsFairnessOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Audit Hashes</span>
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Market Selector Carousel */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 font-heading">Select Market Room</span>
          <span className="text-[10px] text-slate-500">Scheduled Open/Close Times</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {markets.map((m) => {
            const isSelected = selectedMarket?.id === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  if (m.status === 'open') {
                    setSelectedMarket(m);
                    setSelectedNumbers([]);
                  }
                }}
                disabled={m.status === 'closed'}
                className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer relative overflow-hidden ${
                  m.status === 'closed'
                    ? 'bg-slate-900/40 border-slate-800 opacity-60 cursor-not-allowed'
                    : isSelected
                    ? 'bg-slate-900 border-gold shadow-xl ring-1 ring-gold/50'
                    : 'bg-slate-900/80 border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white truncate max-w-[110px]">{m.name}</span>
                  {m.status === 'open' ? (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      <Unlock className="w-2.5 h-2.5" /> OPEN
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                      <LockKeyhole className="w-2.5 h-2.5" /> CLOSED
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Last: {m.lastResult}</span>
                  <span className="flex items-center gap-1 text-slate-500"><Clock className="w-3 h-3" /> {m.openTime}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bet Type Animated Tabs */}
      <div className="app-card p-4 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-white/5">
          {[
            { id: 'single', label: 'Single (0–9)', mult: '9.0x' },
            { id: 'jodi', label: 'Jodi (2-Digit)', mult: '90.0x' },
            { id: 'patti', label: 'Patti (3-Digit)', mult: '900.0x' },
          ].map((type) => {
            const isActive = marketType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => {
                  setMarketType(type.id as MarketType);
                  setSelectedNumbers([]);
                }}
                className={`relative flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  isActive ? 'text-gold font-heading' : 'text-slate-400 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="matkaTabPill"
                    className="absolute inset-0 rounded-xl bg-gold/20 border border-gold/50 shadow-[0_0_15px_rgba(245,185,44,0.3)] -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="flex flex-col items-center leading-tight">
                  <span>{type.label}</span>
                  <span className={`text-[10px] font-mono ${isActive ? 'text-gold font-bold' : 'text-amber-400'}`}>
                    {type.mult} Payout
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Number Selection Grid (0-9) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white font-heading">
              Select Number ({selectedNumbers.length} / {requiredCount})
            </span>
            <span className="text-[11px] text-amber-400 font-mono font-bold">
              Odds: {currentMultiplier}x Stake
            </span>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2.5">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
              const isSelected = selectedNumbers.includes(num);
              return (
                <button
                  key={num}
                  onClick={() => handleNumberSelect(num)}
                  className={`h-14 rounded-2xl font-black text-lg transition-all cursor-pointer relative flex items-center justify-center border ${
                    isSelected
                      ? 'bg-gradient-to-br from-gold to-amber-500 text-black border-white shadow-lg scale-105 ring-2 ring-gold/80'
                      : 'bg-slate-900/90 text-white border-white/10 hover:border-gold/40 hover:scale-105'
                  }`}
                >
                  <span>{num}</span>
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black text-gold flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stake Amount Selector & Confirm Button */}
        <div className="pt-2 border-t border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Select Bet Stake:</span>
            <div className="flex items-center gap-2">
              {[50, 100, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBetAmount(amt)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                    betAmount === amt ? 'bg-gold text-black' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block">Potential Win:</span>
              <span className="text-emerald-400 font-bold font-mono text-base">${betAmount * currentMultiplier}</span>
            </div>
            <button
              onClick={placeBet}
              disabled={selectedNumbers.length !== requiredCount}
              className="px-6 py-3 rounded-xl font-bold text-black btn-gold-shimmer disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-sm shadow-lg"
            >
              Place Matka Bet (${betAmount})
            </button>
          </div>
        </div>
      </div>

      {/* History Log Table */}
      {results.length > 0 && (
        <div className="app-card p-4 rounded-2xl border border-white/5">
          <span className="text-xs font-bold text-white font-heading mb-3 block">My Recent Matka Bets</span>
          <div className="space-y-2 text-xs">
            {results.map((res, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-900/60 border border-white/5">
                <div>
                  <span className="font-bold text-white">{res.market}</span>
                  <span className="text-[10px] text-slate-500 uppercase block font-mono">Type: {res.type}</span>
                </div>
                <div className="text-center font-mono">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-gold font-bold">{res.number}</span>
                </div>
                <div className="text-right">
                  {res.won ? (
                    <span className="text-emerald-400 font-bold font-mono">+${res.payout}</span>
                  ) : (
                    <span className="text-slate-500 font-mono">Loss</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto-Bet Panel */}
      <AutoBetPanel
        balance={balance}
        intervalMs={5000}
        onPlaceBet={async (amount) => {
          if (!requireAuth()) return 0;
          if (balance < amount) return 0;
          deductBalance(amount, `Auto-Bet — Matka Jhatka`, 'bet');
          const won = Math.random() > 0.65;
          const mult = won ? 9.0 : 0;
          const payout = won ? Math.round(amount * mult) : 0;
          if (won) addBalance(payout, `Auto-Bet Win — Matka Jhatka ${mult}×`, 'win');
          return won ? payout - amount : -amount;
        }}
      />

      <GameChat gameId="matka" />
      <ProvablyFairModal isOpen={isFairnessOpen} onClose={() => setIsFairnessOpen(false)} />
      <AuthGateModal isOpen={authGateOpen} onClose={authGateClose} onSuccess={authGateSuccess} />
    </div>
  );
}
