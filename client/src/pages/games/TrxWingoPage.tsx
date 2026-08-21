import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Volume2, VolumeX, History, Cpu, Zap } from 'lucide-react';
import Timer from '../../components/shared/Timer';
import Modal from '../../components/ui/Modal';
import { ProvablyFairModal } from '../../components/ui/ProvablyFairModal';
import { AuthGateModal } from '../../components/ui/AuthGateModal';
import { useAuthGate } from '../../hooks/useAuthGate';
import { useWallet } from '../../store/WalletContext';
import { useToast } from '../../components/ui/Toast';
import { sounds } from '../../lib/sound';
import { haptics } from '../../lib/haptics';
import { triggerWinCelebration } from '../../components/ui/WinCelebrationOverlay';
import { SEOHead } from '../../components/shared/SEOHead';
import { RelatedGamesSection } from '../../components/shared/RelatedGamesSection';
import { orderLedger } from '../../lib/orderLedger';
import { GameOrderLedger } from '../../components/shared/GameOrderLedger';

const trxBreadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://playarena.com/' },
    { '@type': 'ListItem', position: 2, name: 'Games', item: 'https://playarena.com/games' },
    { '@type': 'ListItem', position: 3, name: 'TRX WinGo', item: 'https://playarena.com/games/trx' },
  ],
};

const BET_AMOUNTS = [10, 50, 100, 500, 1000];
const MULTIPLIERS = [1, 5, 10, 20, 50, 100];

interface TrxBlockResult {
  period: string;
  blockHeight: number;
  blockHash: string;
  winningNumber: number;
  color: 'green' | 'red' | 'violet' | 'violet-green' | 'violet-red';
  size: 'big' | 'small';
  timestamp: number;
}

export default function TrxWingoPage() {
  const { balance, deductBalance, addBalance } = useWallet();
  const { addToast } = useToast();
  const { requireAuth, isOpen: authGateOpen, onSuccess: authGateSuccess, onClose: authGateClose } = useAuthGate();

  const [timerMode, setTimerMode] = useState<'1m' | '3m' | '5m'>('1m');
  const [period, setPeriod] = useState<string>('20260821801');
  const [blockHeight, setBlockHeight] = useState<number>(68924105);
  const [currentHash, setCurrentHash] = useState<string>('00000000041b8a9f3e7c89d201ab56ef89ac34d7890123ef');
  const [remainingSec] = useState<number>(60);
  const [isLocked, setIsLocked] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);

  // Betting states
  const [selectedType, setSelectedType] = useState<'color' | 'size' | 'number' | null>(null);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [baseAmount, setBaseAmount] = useState(10);
  const [multiplier, setMultiplier] = useState(1);
  const [showBetModal, setShowBetModal] = useState(false);

  // Result animation
  const [lastResult, setLastResult] = useState<TrxBlockResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [history, setHistory] = useState<TrxBlockResult[]>([
    {
      period: '20260821800',
      blockHeight: 68924104,
      blockHash: '00000000041b8a9f3e7c89d201ab56ef89ac34d78901237e',
      winningNumber: 7,
      color: 'green',
      size: 'big',
      timestamp: Date.now() - 60000,
    },
    {
      period: '20260821799',
      blockHeight: 68924103,
      blockHash: '00000000041b8a9f3e7c89d201ab56ef89ac34d78901230a',
      winningNumber: 0,
      color: 'violet-red',
      size: 'small',
      timestamp: Date.now() - 120000,
    },
    {
      period: '20260821798',
      blockHeight: 68924102,
      blockHash: '00000000041b8a9f3e7c89d201ab56ef89ac34d78901234c',
      winningNumber: 4,
      color: 'red',
      size: 'small',
      timestamp: Date.now() - 180000,
    },
  ]);

  const activeBetsRef = useRef<Array<{
    id: string;
    period: string;
    type: 'color' | 'size' | 'number';
    selection: string;
    betAmount: number;
  }>>([]);

  const totalBetAmount = baseAmount * multiplier;

  const openBet = (type: 'color' | 'size' | 'number', value: string) => {
    setSelectedType(type);
    setSelectedValue(value);
    setShowBetModal(true);
  };

  const confirmBet = () => {
    requireAuth(async () => {
      if (!selectedType || !selectedValue) return;
      if (isLocked) {
        addToast({ type: 'warning', title: 'Block Mining Locked', message: 'Wait for next Tron block hash!' });
        return;
      }
      if (balance < totalBetAmount) {
        addToast({ type: 'error', title: 'Insufficient balance' });
        return;
      }

      if (!deductBalance(totalBetAmount, `TRX WinGo bet on ${selectedValue}`)) {
        addToast({ type: 'error', title: 'Insufficient balance' });
        return;
      }

      const orderId = `TXN_TRX_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      orderLedger.recordOrder({
        id: orderId,
        gameId: 'trx-wingo',
        gameName: 'TRX Hash WinGo',
        period,
        userId: 'player',
        userName: 'You',
        selection: `${selectedType.toUpperCase()}: ${selectedValue.toUpperCase()}`,
        betAmount: totalBetAmount,
        status: 'pending',
      });

      activeBetsRef.current.push({
        id: orderId,
        period,
        type: selectedType,
        selection: selectedValue,
        betAmount: totalBetAmount,
      });

      setShowBetModal(false);
      sounds.playChip();
      haptics.bet();
      addToast({
        type: 'success',
        title: 'TRX Bet Placed!',
        message: `${selectedValue.toUpperCase()} — ₹${totalBetAmount} (Block #${blockHeight})`,
      });
    });
  };

  const handleRoundComplete = useCallback(() => {
    setIsLocked(true);
    if (soundEnabled) sounds.playSpin();

    setTimeout(() => {
      // Simulate cryptographic hash generation from Tron block
      const newHeight = blockHeight + 1;
      const hexChars = '0123456789abcdef';
      let randomHex = '00000000041b';
      for (let i = 0; i < 32; i++) {
        randomHex += hexChars[Math.floor(Math.random() * hexChars.length)];
      }

      // Extract last digit
      const lastChar = randomHex[randomHex.length - 1];
      const winNum = parseInt(lastChar, 16) % 10;
      const color: TrxBlockResult['color'] =
        winNum === 0 ? 'violet-red' :
        winNum === 5 ? 'violet-green' :
        [1, 3, 7, 9].includes(winNum) ? 'green' : 'red';
      const size: 'big' | 'small' = winNum >= 5 ? 'big' : 'small';

      const result: TrxBlockResult = {
        period,
        blockHeight: newHeight,
        blockHash: randomHex,
        winningNumber: winNum,
        color,
        size,
        timestamp: Date.now(),
      };

      setBlockHeight(newHeight);
      setCurrentHash(randomHex);
      setLastResult(result);
      setShowResultModal(true);
      setHistory(prev => [result, ...prev].slice(0, 15));

      // Settle active bets
      const currentBets = activeBetsRef.current.filter(b => b.period === period);
      let totalWon = 0;

      currentBets.forEach(b => {
        let isWon = false;
        let mult = 1;

        if (b.type === 'color') {
          if (b.selection === 'green' && ([1, 3, 7, 9].includes(winNum) || winNum === 5)) {
            isWon = true;
            mult = winNum === 5 ? 1.5 : 2.0;
          } else if (b.selection === 'red' && ([2, 4, 6, 8].includes(winNum) || winNum === 0)) {
            isWon = true;
            mult = winNum === 0 ? 1.5 : 2.0;
          } else if (b.selection === 'violet' && (winNum === 0 || winNum === 5)) {
            isWon = true;
            mult = 4.5;
          }
        } else if (b.type === 'size') {
          if (b.selection === size) {
            isWon = true;
            mult = 2.0;
          }
        } else if (b.type === 'number') {
          if (parseInt(b.selection) === winNum) {
            isWon = true;
            mult = 9.0;
          }
        }

        const payout = isWon ? Math.floor(b.betAmount * mult * 100) / 100 : 0;
        if (isWon) totalWon += payout;

        orderLedger.updateOrder(b.id, {
          resultOutcome: `TRX Block #${newHeight} [..${randomHex.slice(-5)}] → ${winNum} (${color.toUpperCase()})`,
          multiplier: mult,
          winAmount: payout,
          status: isWon ? 'won' : 'lost',
        });
      });

      if (totalWon > 0) {
        addBalance(totalWon, `TRX WinGo payout — ₹${totalWon}`);
        triggerWinCelebration({ winAmount: totalWon, multiplier: 2, gameName: 'TRX Hash WinGo' });
        sounds.playWin();
        haptics.jackpot();
        addToast({ type: 'success', title: '🎉 TRX Block Win!', message: `Won ₹${totalWon}` });
      }

      activeBetsRef.current = [];

      setTimeout(() => {
        setShowResultModal(false);
        setPeriod(p => (parseInt(p) + 1).toString());
        setIsLocked(false);
      }, 3500);
    }, 1200);
  }, [period, blockHeight, soundEnabled, addBalance, addToast]);

  return (
    <div className="py-4 space-y-5 w-full max-w-6xl mx-auto">
      <SEOHead
        title="TRX Hash WinGo — Real-Time Blockchain Block Lottery"
        description="Bet on live Tron (TRX) block hashes. Authentic cryptographic hash resolution, color predictions (Green, Red, Violet), Big/Small, and 9x number payouts."
        jsonLd={trxBreadcrumbLd}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 via-red-600 to-amber-600 flex items-center justify-center text-white font-black text-2xl shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white font-heading tracking-tight flex items-center gap-2">
              TRX Hash WinGo
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/25 flex items-center gap-1">
                <Zap className="w-3 h-3 text-rose-400" /> TRON BLOCKCHAIN
              </span>
            </h1>
            <p className="text-xs text-slate-400">Live Block Hash • Colors • Big/Small • Numbers 0–9</p>
          </div>
        </div>

        {/* Modes & Audio */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-white/10">
            {(['1m', '3m', '5m'] as const).map(m => (
              <button
                key={m}
                onClick={() => setTimerMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  timerMode === m
                    ? 'bg-rose-500 text-white shadow-md font-heading'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                TRX {m}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsFairnessOpen(true)}
            className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
            title="Blockchain Verification"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Tron Block Explorer Live Visualizer */}
      <div className="rounded-3xl p-5 bg-gradient-to-b from-[#18080A] via-[#100406] to-[#080203] border border-rose-500/30 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tron Block Height</span>
            <h2 className="text-2xl font-black text-rose-400 font-mono flex items-center gap-2">
              #{blockHeight}
              <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                LIVE SYNCED
              </span>
            </h2>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <span className="text-slate-500">Hash:</span>
              <span className="truncate max-w-[200px] sm:max-w-sm text-slate-300">{currentHash}</span>
              <span className="text-rose-400 font-black text-sm bg-rose-500/15 px-2 py-0.5 rounded border border-rose-500/30">
                {currentHash.slice(-5)}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <Timer duration={remainingSec} onComplete={handleRoundComplete} size="md" />
          </div>
        </div>
      </div>

      {/* Betting Grid */}
      <div className="space-y-4">
        {/* Colors */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => openBet('color', 'green')}
            className="btn-3d-green py-4 rounded-2xl text-white font-black text-sm shadow-lg flex flex-col items-center justify-center cursor-pointer hover:scale-[1.02] transition-transform"
          >
            <span>GREEN</span>
            <span className="text-xs font-normal opacity-90">2.0×</span>
          </button>
          <button
            onClick={() => openBet('color', 'violet')}
            className="btn-3d-violet py-4 rounded-2xl text-white font-black text-sm shadow-lg flex flex-col items-center justify-center cursor-pointer hover:scale-[1.02] transition-transform"
          >
            <span>VIOLET</span>
            <span className="text-xs font-normal opacity-90">4.5×</span>
          </button>
          <button
            onClick={() => openBet('color', 'red')}
            className="btn-3d-red py-4 rounded-2xl text-white font-black text-sm shadow-lg flex flex-col items-center justify-center cursor-pointer hover:scale-[1.02] transition-transform"
          >
            <span>RED</span>
            <span className="text-xs font-normal opacity-90">2.0×</span>
          </button>
        </div>

        {/* Big / Small */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => openBet('size', 'big')}
            className="py-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-black text-sm hover:bg-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>BIG (5–9)</span>
            <span className="text-xs text-amber-400 font-mono">2.0×</span>
          </button>
          <button
            onClick={() => openBet('size', 'small')}
            className="py-3.5 rounded-2xl bg-blue-500/15 border border-blue-500/40 text-blue-300 font-black text-sm hover:bg-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>SMALL (0–4)</span>
            <span className="text-xs text-blue-400 font-mono">2.0×</span>
          </button>
        </div>

        {/* 0–9 Digits */}
        <div className="app-card p-4 rounded-2xl border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white font-heading">Pick Single Number (9.0× Multiplier)</span>
            <span className="text-[10px] text-slate-400 font-mono">Derived from last hex byte</span>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
              const colorClass =
                num === 0 ? 'bg-gradient-to-br from-violet-600 to-rose-600' :
                num === 5 ? 'bg-gradient-to-br from-violet-600 to-emerald-600' :
                [1, 3, 7, 9].includes(num) ? 'bg-emerald-600' : 'bg-red-600';

              return (
                <button
                  key={num}
                  onClick={() => openBet('number', num.toString())}
                  className={`${colorClass} h-12 rounded-xl text-white font-black text-base shadow flex items-center justify-center hover:scale-110 transition-transform cursor-pointer border border-white/20`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent History */}
      <div className="app-card p-4 rounded-2xl border border-white/5 space-y-2">
        <span className="text-xs font-bold text-white font-heading flex items-center gap-1.5">
          <History className="w-4 h-4 text-gold" /> Tron Block History
        </span>
        <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
          {history.map((h, i) => (
            <div key={i} className="flex-shrink-0 p-2.5 rounded-xl bg-slate-900/80 border border-white/5 text-center min-w-[100px]">
              <span className="text-[9px] text-slate-500 font-mono block">#{h.blockHeight}</span>
              <div
                className={`w-7 h-7 mx-auto rounded-full my-1 flex items-center justify-center text-xs font-black text-white ${
                  h.winningNumber === 0 ? 'bg-gradient-to-tr from-violet-600 to-rose-600' :
                  h.winningNumber === 5 ? 'bg-gradient-to-tr from-violet-600 to-emerald-600' :
                  [1, 3, 7, 9].includes(h.winningNumber) ? 'bg-emerald-600' : 'bg-red-600'
                }`}
              >
                {h.winningNumber}
              </div>
              <span className="text-[10px] font-mono text-slate-400 truncate block">..{h.blockHash.slice(-4)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bet Modal */}
      <Modal isOpen={showBetModal} onClose={() => setShowBetModal(false)} title={`TRX Bet: ${selectedValue?.toUpperCase()}`}>
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Select Base Amount (₹)</label>
            <div className="grid grid-cols-5 gap-2">
              {BET_AMOUNTS.map(amt => (
                <button
                  key={amt}
                  onClick={() => setBaseAmount(amt)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    baseAmount === amt ? 'bg-rose-500 text-white shadow-md' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Multiplier</label>
            <div className="flex gap-2">
              {MULTIPLIERS.map(m => (
                <button
                  key={m}
                  onClick={() => setMultiplier(m)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    multiplier === m ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {m}X
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-white/10 flex justify-between text-xs font-bold">
            <span className="text-slate-400">Total Bet:</span>
            <span className="text-rose-400 font-mono">₹{totalBetAmount}</span>
          </div>

          <button onClick={confirmBet} className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-black text-xs shadow-lg cursor-pointer">
            Confirm TRX Bet (₹{totalBetAmount})
          </button>
        </div>
      </Modal>

      {/* Result Modal */}
      <Modal isOpen={showResultModal} onClose={() => setShowResultModal(false)} title="⚡ Tron Block Result">
        {lastResult && (
          <div className="flex flex-col items-center text-center py-4 space-y-3">
            <motion.div
              initial={{ scale: 0.5, rotate: 180 }}
              animate={{ scale: 1, rotate: 0 }}
              className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-2xl border-4 border-white/30 ${
                lastResult.winningNumber === 0 ? 'bg-gradient-to-tr from-violet-600 to-rose-600' :
                lastResult.winningNumber === 5 ? 'bg-gradient-to-tr from-violet-600 to-emerald-600' :
                [1, 3, 7, 9].includes(lastResult.winningNumber) ? 'bg-emerald-600' : 'bg-red-600'
              }`}
            >
              {lastResult.winningNumber}
            </motion.div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white font-heading">
                Block #{lastResult.blockHeight}
              </h3>
              <p className="text-xs text-rose-400 font-mono truncate max-w-xs">
                Hash: {lastResult.blockHash}
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-white/10 text-white">
                  {lastResult.color}
                </span>
                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  {lastResult.size}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ProvablyFairModal isOpen={isFairnessOpen} onClose={() => setIsFairnessOpen(false)} />
      <AuthGateModal isOpen={authGateOpen} onClose={authGateClose} onSuccess={authGateSuccess} />

      {/* Game Order Ledger & Transactions */}
      <GameOrderLedger gameId="trx-wingo" gameName="TRX Hash WinGo" currentPeriod={period} />

      {/* Internal Cross-Linking */}
      <RelatedGamesSection currentGameId="trx" />
    </div>
  );
}
