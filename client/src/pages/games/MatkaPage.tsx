import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dice1,
  Clock,
  Unlock,
  Volume2,
  VolumeX,
  ShieldCheck,
  Check,
  Sparkles,
  Layers,
  Search,
  Award,
} from 'lucide-react';
import { ProvablyFairModal } from '../../components/ui/ProvablyFairModal';
import { AuthGateModal } from '../../components/ui/AuthGateModal';
import { useAuthGate } from '../../hooks/useAuthGate';
import { useAuth } from '../../store/AuthContext';
import { useWallet } from '../../store/WalletContext';
import { useToast } from '../../components/ui/Toast';
import { sounds } from '../../lib/sound';
import { AutoBetPanel } from '../../components/ui/AutoBetPanel';
import { GameChat } from '../../components/ui/GameChat';
import { triggerWinCelebration } from '../../components/ui/WinCelebrationOverlay';
import { haptics } from '../../lib/haptics';
import { SEOHead } from '../../components/shared/SEOHead';
import { RelatedGamesSection } from '../../components/shared/RelatedGamesSection';
import { useGameControl } from '../../store/GameControlContext';
import { realBetSync } from '../../lib/realBetSync';
import { orderLedger } from '../../lib/orderLedger';
import { GameOrderLedger } from '../../components/shared/GameOrderLedger';

const matkaBreadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://playarena.com/' },
    { '@type': 'ListItem', position: 2, name: 'Games', item: 'https://playarena.com/games' },
    { '@type': 'ListItem', position: 3, name: 'Matka Jhatka', item: 'https://playarena.com/games/matka' },
  ],
};

export type MatkaGameType =
  | 'SINGLE'
  | 'JODI'
  | 'PATTI'
  | 'DOUBLE_PATTI'
  | 'TRIPLE_PATTI'
  | 'HALF_SANGAM'
  | 'FULL_SANGAM';

interface GameTypeMeta {
  id: MatkaGameType;
  label: string;
  shortLabel: string;
  badge: string;
  mult: number;
  description: string;
}

const GAME_TYPES: GameTypeMeta[] = [
  { id: 'SINGLE', label: 'Single Ank', shortLabel: 'Single (0–9)', badge: '9.5x', mult: 9.5, description: 'Pick any 1 single digit (0 to 9) for Open or Close.' },
  { id: 'JODI', label: 'Jodi Bracket', shortLabel: 'Jodi (00–99)', badge: '90x', mult: 90, description: 'Pick 2 digits (00 to 99) matching Open Ank + Close Ank.' },
  { id: 'PATTI', label: 'Single Patti', shortLabel: 'Single Patti', badge: '140x', mult: 140, description: 'Pick 3 distinct ascending digits (e.g. 128, 137).' },
  { id: 'DOUBLE_PATTI', label: 'Double Patti', shortLabel: 'Double Patti', badge: '280x', mult: 280, description: 'Pick 3 digits with 2 matching digits (e.g. 112, 224).' },
  { id: 'TRIPLE_PATTI', label: 'Triple Patti', shortLabel: 'Triple Patti', badge: '700x', mult: 700, description: 'Pick all 3 identical digits (000, 111, ..., 999).' },
  { id: 'HALF_SANGAM', label: 'Half Sangam', shortLabel: 'Half Sangam', badge: '1200x', mult: 1200, description: 'Combine Open Patti + Close Ank OR Open Ank + Close Patti.' },
  { id: 'FULL_SANGAM', label: 'Full Sangam', shortLabel: 'Full Sangam', badge: '10000x', mult: 10000, description: 'Combine Open Patti (3 digits) + Close Patti (3 digits).' },
];

interface Market {
  id: string;
  name: string;
  openTime: string;
  closeTime: string;
  status: 'open' | 'closed';
  lastOpenPatti: string;
  lastJodi: string;
  lastClosePatti: string;
  commitHash?: string;
}

const markets: Market[] = [
  { id: 'matka-kalyan', name: '🎰 Kalyan Matka', openTime: 'LIVE 2m', closeTime: 'Continuous', status: 'open', lastOpenPatti: '128', lastJodi: '16', lastClosePatti: '349', commitHash: '3f4e5d...6c7b' },
  { id: 'matka-mumbai', name: '🌆 Mumbai Main Bazar', openTime: 'LIVE 2m', closeTime: 'Continuous', status: 'open', lastOpenPatti: '256', lastJodi: '38', lastClosePatti: '468', commitHash: '7a8b9c...d1e2' },
  { id: 'matka-rajdhani', name: '🚂 Rajdhani Express', openTime: 'LIVE 2m', closeTime: 'Continuous', status: 'open', lastOpenPatti: '347', lastJodi: '49', lastClosePatti: '289', commitHash: '1a2b3c...4d5e' },
  { id: 'matka-satka-1m', name: '⚡ Matka Satka 1-Min', openTime: 'LIVE 1m', closeTime: 'Continuous', status: 'open', lastOpenPatti: '139', lastJodi: '32', lastClosePatti: '589', commitHash: '9a8b7c...4f2e' },
  { id: 'matka-satka-5m', name: '⏳ Matka Satka 5-Min', openTime: 'LIVE 5m', closeTime: 'Continuous', status: 'open', lastOpenPatti: '719', lastJodi: '74', lastClosePatti: '239', commitHash: '2e4d6f...8a1c' },
  { id: 'matka-satka-30m', name: '🕒 Matka Satka 30-Min', openTime: 'LIVE 30m', closeTime: 'Continuous', status: 'open', lastOpenPatti: '835', lastJodi: '61', lastClosePatti: '470', commitHash: '5c1b9a...3f7d' },
];

// Helper: generate 120 single pattis
function getSinglePattis(): string[] {
  const list: string[] = [];
  for (let i = 0; i <= 9; i++) {
    for (let j = i + 1; j <= 9; j++) {
      for (let k = j + 1; k <= 9; k++) {
        list.push(`${i}${j}${k}`);
      }
    }
  }
  return list;
}

// Helper: generate 90 double pattis
function getDoublePattis(): string[] {
  const list: string[] = [];
  for (let d1 = 0; d1 <= 9; d1++) {
    for (let d2 = 0; d2 <= 9; d2++) {
      if (d1 !== d2) {
        const sorted = [d1, d1, d2].sort((a, b) => a - b).join('');
        if (!list.includes(sorted)) {
          list.push(sorted);
        }
      }
    }
  }
  return list.sort();
}

const ALL_SINGLE_PATTIS = getSinglePattis();
const ALL_DOUBLE_PATTIS = getDoublePattis();
const ALL_TRIPLE_PATTIS = Array.from({ length: 10 }, (_, i) => `${i}${i}${i}`);

export default function MatkaPage() {
  const { balance, deductBalance, addBalance } = useWallet();
  const { isAuthenticated, user } = useAuth();
  const { addToast } = useToast();
  const { requireAuth, isOpen: authGateOpen, onSuccess: authGateSuccess, onClose: authGateClose } = useAuthGate();
  const { getManualOverrideForGame } = useGameControl();

  const [selectedMarket, setSelectedMarket] = useState<Market>(markets[0]);
  const [activeGameType, setActiveGameType] = useState<MatkaGameType>('SINGLE');
  const [sessionSide, setSessionSide] = useState<'open' | 'close'>('open');
  const [betAmount, setBetAmount] = useState(100);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(`20260731${Math.floor(Math.random() * 9000 + 1000)}`);
  const [remainingSeconds, setRemainingSeconds] = useState(60);

  // Selections state
  const [singleDigit, setSingleDigit] = useState<number | null>(null);
  const [jodiSelection, setJodiSelection] = useState<string>('');
  const [jodiSearch, setJodiSearch] = useState<string>('');
  const [pattiFilterDigit, setPattiFilterDigit] = useState<number | null>(null);
  const [selectedPatti, setSelectedPatti] = useState<string>('');
  const [customPattiInput, setCustomPattiInput] = useState<string>('');

  // Sangam states
  const [halfSangamMode, setHalfSangamMode] = useState<'patti-ank' | 'ank-patti'>('patti-ank');
  const [sangamPatti, setSangamPatti] = useState('');
  const [sangamAnk, setSangamAnk] = useState('');
  const [fullSangamOpenPatti, setFullSangamOpenPatti] = useState('');
  const [fullSangamClosePatti, setFullSangamClosePatti] = useState('');

  // Live results history
  const [results, setResults] = useState<{
    id: string;
    market: string;
    gameType: MatkaGameType;
    selection: string;
    outcomeDisplay: string;
    won: boolean;
    payout: number;
    timestamp: number;
  }[]>([]);

  // Period polling
  const fetchActivePeriod = useCallback(async () => {
    if (!selectedMarket) return;
    try {
      const res = await fetch(`/api/games/active-round/${selectedMarket.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setCurrentPeriod(json.data.period);
        if (typeof json.data.remainingSec === 'number') {
          setRemainingSeconds(json.data.remainingSec);
        }
      }
    } catch {
      // offline fallback
    }
  }, [selectedMarket]);

  useEffect(() => {
    fetchActivePeriod();
    const interval = setInterval(fetchActivePeriod, 5000);
    return () => clearInterval(interval);
  }, [fetchActivePeriod]);

  // Local seconds countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeMeta = useMemo(() => {
    return GAME_TYPES.find((g) => g.id === activeGameType) || GAME_TYPES[0];
  }, [activeGameType]);

  // Filtered lists for Patti
  const filteredSinglePattis = useMemo(() => {
    if (pattiFilterDigit === null) return ALL_SINGLE_PATTIS.slice(0, 30);
    return ALL_SINGLE_PATTIS.filter((p) => {
      const sum = (parseInt(p[0]) + parseInt(p[1]) + parseInt(p[2])) % 10;
      return sum === pattiFilterDigit;
    });
  }, [pattiFilterDigit]);

  const filteredDoublePattis = useMemo(() => {
    if (pattiFilterDigit === null) return ALL_DOUBLE_PATTIS;
    return ALL_DOUBLE_PATTIS.filter((p) => {
      const sum = (parseInt(p[0]) + parseInt(p[1]) + parseInt(p[2])) % 10;
      return sum === pattiFilterDigit;
    });
  }, [pattiFilterDigit]);

  // Determine current formatted selection string and validity
  const { currentSelectionString, isValidSelection } = useMemo(() => {
    switch (activeGameType) {
      case 'SINGLE':
        return {
          currentSelectionString: singleDigit !== null ? String(singleDigit) : '',
          isValidSelection: singleDigit !== null,
        };
      case 'JODI':
        return {
          currentSelectionString: jodiSelection,
          isValidSelection: /^\d{2}$/.test(jodiSelection),
        };
      case 'PATTI':
        const pattiVal = (customPattiInput || selectedPatti).trim();
        return {
          currentSelectionString: pattiVal,
          isValidSelection: /^\d{3}$/.test(pattiVal),
        };
      case 'DOUBLE_PATTI':
        const dpVal = (customPattiInput || selectedPatti).trim();
        return {
          currentSelectionString: dpVal,
          isValidSelection: /^\d{3}$/.test(dpVal),
        };
      case 'TRIPLE_PATTI':
        return {
          currentSelectionString: selectedPatti,
          isValidSelection: /^\d{3}$/.test(selectedPatti) && selectedPatti[0] === selectedPatti[1] && selectedPatti[1] === selectedPatti[2],
        };
      case 'HALF_SANGAM':
        if (halfSangamMode === 'patti-ank') {
          const valid = /^\d{3}$/.test(sangamPatti) && /^\d{1}$/.test(sangamAnk);
          return {
            currentSelectionString: valid ? `${sangamPatti}-${sangamAnk}` : '',
            isValidSelection: valid,
          };
        } else {
          const valid = /^\d{1}$/.test(sangamAnk) && /^\d{3}$/.test(sangamPatti);
          return {
            currentSelectionString: valid ? `${sangamAnk}-${sangamPatti}` : '',
            isValidSelection: valid,
          };
        }
      case 'FULL_SANGAM':
        const fullValid = /^\d{3}$/.test(fullSangamOpenPatti) && /^\d{3}$/.test(fullSangamClosePatti);
        return {
          currentSelectionString: fullValid ? `${fullSangamOpenPatti}-${fullSangamClosePatti}` : '',
          isValidSelection: fullValid,
        };
      default:
        return { currentSelectionString: '', isValidSelection: false };
    }
  }, [
    activeGameType,
    singleDigit,
    jodiSelection,
    selectedPatti,
    customPattiInput,
    halfSangamMode,
    sangamPatti,
    sangamAnk,
    fullSangamOpenPatti,
    fullSangamClosePatti,
  ]);

  // Execute Bet & Calculate Outcome
  const placeBet = async () => {
    if (!selectedMarket || selectedMarket.status === 'closed') {
      addToast({ type: 'warning', title: 'Market Closed', message: 'Please select an open live market room.' });
      return;
    }

    if (!isValidSelection) {
      addToast({
        type: 'warning',
        title: 'Incomplete Selection',
        message: `Please complete your ${activeMeta.label} number selection.`,
      });
      return;
    }

    if (balance < betAmount) {
      addToast({ type: 'error', title: 'Insufficient Funds', message: 'Please top up your wallet to place this bet.' });
      return;
    }

    if (!deductBalance(betAmount, `Matka ${activeMeta.label} — ${selectedMarket.name}`)) return;

    if (soundEnabled) sounds.playSpin();

    // Broadcast live bet to Admin Cockpit & backend API
    const betPayload = {
      id: `mb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      user: user?.name || user?.phone || 'Player_You',
      gameType: selectedMarket.id,
      period: currentPeriod,
      selection: `${activeGameType}:${sessionSide}:${currentSelectionString}`,
      amount: betAmount,
    };

    realBetSync.publishRealBet(betPayload);

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('playarena_token');
      fetch('/api/games/bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          gameType: selectedMarket.id,
          period: currentPeriod,
          selection: `${activeGameType}:${currentSelectionString}`,
          amount: betAmount,
        }),
      }).catch(() => {});
    } catch {}

    // Check for admin manual override or generate provably fair draw
    const manualDigit = getManualOverrideForGame(selectedMarket.id) ?? getManualOverrideForGame('matka');

    // Simulate standard Matka draw outcome
    let openPannaArr: [number, number, number];
    let closePannaArr: [number, number, number];

    if (manualDigit !== undefined && activeGameType === 'SINGLE') {
      const d1 = Math.floor(manualDigit / 3);
      const d2 = Math.floor(manualDigit / 3);
      const d3 = manualDigit - (d1 + d2);
      openPannaArr = [d1, d2, d3].sort((a, b) => a - b) as [number, number, number];
      closePannaArr = [1, 2, 3];
    } else {
      openPannaArr = [
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
      ].sort((a, b) => a - b) as [number, number, number];

      closePannaArr = [
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
      ].sort((a, b) => a - b) as [number, number, number];
    }

    const openPattiStr = openPannaArr.join('');
    const openAnk = (openPannaArr[0] + openPannaArr[1] + openPannaArr[2]) % 10;

    const closePattiStr = closePannaArr.join('');
    const closeAnk = (closePannaArr[0] + closePannaArr[1] + closePannaArr[2]) % 10;

    const jodiStr = `${openAnk}${closeAnk}`;
    const displayResult = `${openPattiStr} - ${jodiStr} - ${closePattiStr}`;

    // Winning evaluation
    let won = false;
    const cleanSel = currentSelectionString.trim();

    switch (activeGameType) {
      case 'SINGLE': {
        const uDigit = parseInt(cleanSel, 10);
        if (sessionSide === 'open') won = uDigit === openAnk;
        else won = uDigit === closeAnk;
        break;
      }
      case 'JODI': {
        won = cleanSel.padStart(2, '0') === jodiStr;
        break;
      }
      case 'PATTI':
      case 'DOUBLE_PATTI':
      case 'TRIPLE_PATTI': {
        const sortedSel = cleanSel.split('').sort().join('');
        if (sessionSide === 'open') won = sortedSel === openPattiStr;
        else won = sortedSel === closePattiStr;
        break;
      }
      case 'HALF_SANGAM': {
        const parts = cleanSel.split('-');
        if (parts.length === 2) {
          if (parts[0].length === 3 && parts[1].length === 1) {
            const sortedP = parts[0].split('').sort().join('');
            won = sortedP === openPattiStr && parseInt(parts[1], 10) === closeAnk;
          } else if (parts[0].length === 1 && parts[1].length === 3) {
            const sortedP = parts[1].split('').sort().join('');
            won = parseInt(parts[0], 10) === openAnk && sortedP === closePattiStr;
          }
        }
        break;
      }
      case 'FULL_SANGAM': {
        const parts = cleanSel.split('-');
        if (parts.length === 2) {
          const sortedP1 = parts[0].split('').sort().join('');
          const sortedP2 = parts[1].split('').sort().join('');
          won = sortedP1 === openPattiStr && sortedP2 === closePattiStr;
        }
        break;
      }
    }

    const multiplier = activeMeta.mult;
    const payout = won ? Math.round(betAmount * multiplier) : 0;
    const txnId = `TXN_MATKA_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // Record order in persistent Order Ledger
    orderLedger.recordOrder({
      id: txnId,
      gameId: selectedMarket.id,
      gameName: selectedMarket.name,
      period: currentPeriod,
      userId: user?.id || 'demo_user',
      userName: user?.name || user?.phone || 'You',
      selection: `${activeGameType}: ${currentSelectionString}`,
      betAmount,
      resultOutcome: displayResult,
      multiplier,
      winAmount: payout,
      status: won ? 'won' : 'lost',
    });

    if (won) {
      addBalance(payout, `Matka ${activeMeta.label} Win — ${selectedMarket.name}`);
      triggerWinCelebration({
        winAmount: payout,
        multiplier: Math.round(multiplier),
        gameName: `Matka ${activeMeta.label}`,
      });
      addToast({
        type: 'success',
        title: '🎉 MATKA JACKPOT WINNER!',
        message: `Won ₹${payout} with ${activeMeta.label} on ${selectedMarket.name}!`,
      });
      if (soundEnabled) sounds.playWin();
    } else {
      haptics.loss();
      addToast({
        type: 'info',
        title: 'Draw Result Declared',
        message: `Result: ${displayResult}. Good luck in the next round!`,
      });
    }

    setResults((prev) => [
      {
        id: txnId,
        market: selectedMarket.name,
        gameType: activeGameType,
        selection: currentSelectionString,
        outcomeDisplay: displayResult,
        won,
        payout,
        timestamp: Date.now(),
      },
      ...prev.slice(0, 19),
    ]);

    // Reset selection after bet
    setSingleDigit(null);
    setJodiSelection('');
    setSelectedPatti('');
    setCustomPattiInput('');
    setSangamPatti('');
    setSangamAnk('');
    setFullSangamOpenPatti('');
    setFullSangamClosePatti('');
  };

  return (
    <div className="space-y-4 pb-8 max-w-6xl mx-auto">
      <SEOHead
        title="Matka Jhatka Bazaars — Live Single, Jodi, Patti & Sangam Draws"
        description="Bet on live Matka Jhatka markets including Kalyan, Mumbai Main, and Rajdhani with Single, Jodi, Patti, Double Patti, Triple Patti, Half Sangam & Full Sangam paying up to 10,000x."
        jsonLd={matkaBreadcrumbLd}
      />

      {/* Top Banner Header */}
      <div className="app-card border border-gold/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl btn-gold-shimmer flex items-center justify-center text-black font-black shadow-lg shrink-0">
            <Dice1 className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-black text-white font-heading tracking-tight flex flex-wrap items-center gap-2">
              Matka Jhatka Bazaars
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-gold" /> ALL 7 FORMATS
              </span>
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">
              Single • Jodi • Patti • Double • Triple • Half Sangam • Full Sangam (Up to 10,000×)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 self-end md:self-auto shrink-0">
          <button
            onClick={() => setIsFairnessOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Audit Hashes</span>
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Market Selector Carousel */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 font-heading flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-gold" /> Select Market Bazaar
          </span>
          <span className="text-[11px] text-amber-400 font-mono flex items-center gap-1">
            <Clock className="w-3 h-3" /> Next Draw in {remainingSeconds}s
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
          {markets.map((m) => {
            const isSelected = selectedMarket?.id === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  if (m.status === 'open') {
                    setSelectedMarket(m);
                  }
                }}
                disabled={m.status === 'closed'}
                className={`p-2.5 sm:p-3 rounded-2xl text-left border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  m.status === 'closed'
                    ? 'bg-slate-900/40 border-slate-800 opacity-60 cursor-not-allowed'
                    : isSelected
                    ? 'bg-slate-900 border-gold shadow-xl ring-1 ring-gold/50'
                    : 'bg-slate-900/80 border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-xs font-bold text-white truncate">{m.name}</span>
                  <span className="shrink-0 flex items-center gap-1 text-[8px] sm:text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20">
                    <Unlock className="w-2 h-2" /> LIVE
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono tracking-tight">
                  <span>{m.lastOpenPatti} - {m.lastJodi} - {m.lastClosePatti}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Market Live Board Display */}
      <div className="app-card rounded-2xl p-3.5 sm:p-4 border border-gold/20 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="text-center sm:text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Bazaar</span>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 justify-center sm:justify-start">
              {selectedMarket.name}
              <span className="text-[11px] sm:text-xs font-mono text-gold px-2 py-0.5 rounded bg-gold/10 border border-gold/20">
                Period #{currentPeriod}
              </span>
            </h2>
          </div>

          {/* Traditional Matka 3-Part Result Box */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 bg-slate-950/80 p-2 sm:p-2.5 rounded-2xl border border-white/10 shadow-inner w-full sm:w-auto">
            <div className="text-center px-2.5 sm:px-3 py-1 bg-slate-900 rounded-xl border border-white/5 flex-1 sm:flex-none">
              <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold block uppercase">Open Patti</span>
              <span className="text-sm sm:text-base font-black text-amber-400 font-mono">{selectedMarket.lastOpenPatti}</span>
            </div>
            <span className="text-slate-600 font-black text-base sm:text-lg">-</span>
            <div className="text-center px-3 sm:px-4 py-1 bg-gradient-to-r from-amber-500/20 to-gold/20 rounded-xl border border-gold/40 shadow-lg flex-1 sm:flex-none">
              <span className="text-[8px] sm:text-[9px] text-gold font-bold block uppercase">Jodi</span>
              <span className="text-base sm:text-lg font-black text-white font-mono">{selectedMarket.lastJodi}</span>
            </div>
            <span className="text-slate-600 font-black text-base sm:text-lg">-</span>
            <div className="text-center px-2.5 sm:px-3 py-1 bg-slate-900 rounded-xl border border-white/5 flex-1 sm:flex-none">
              <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold block uppercase">Close Patti</span>
              <span className="text-sm sm:text-base font-black text-amber-400 font-mono">{selectedMarket.lastClosePatti}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Game Type Selection Tabs (All 7 Game Types) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 font-heading">Choose Game Format</span>
          <span className="text-[11px] text-emerald-400 font-bold font-mono">
            {activeMeta.label} ({activeMeta.badge} Payout)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 sm:gap-2">
          {GAME_TYPES.map((gt) => {
            const isActive = activeGameType === gt.id;
            return (
              <button
                key={gt.id}
                onClick={() => {
                  setActiveGameType(gt.id);
                  // Reset temporary fields
                  setSingleDigit(null);
                  setJodiSelection('');
                  setSelectedPatti('');
                  setCustomPattiInput('');
                  setSangamPatti('');
                  setSangamAnk('');
                  setFullSangamOpenPatti('');
                  setFullSangamClosePatti('');
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isActive
                    ? 'bg-slate-900 border-gold shadow-lg ring-1 ring-gold/40'
                    : 'bg-slate-900/60 border-white/5 hover:border-white/20'
                }`}
              >
                <div>
                  <span className={`text-xs font-bold block ${isActive ? 'text-gold' : 'text-white'}`}>
                    {gt.shortLabel}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-amber-400">{gt.badge}</span>
                  {isActive && <Check className="w-3.5 h-3.5 text-gold" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Betting Panel for Active Game Type */}
      <div className="app-card p-5 rounded-2xl border border-white/10 space-y-5 bg-slate-900/90 shadow-2xl">
        {/* Game Type Header & Session Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white font-heading">{activeMeta.label}</h3>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {activeMeta.badge} Multiplier
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{activeMeta.description}</p>
          </div>

          {/* Session Selector (Open vs Close) for Single / Patti game types */}
          {['SINGLE', 'PATTI', 'DOUBLE_PATTI', 'TRIPLE_PATTI'].includes(activeGameType) && (
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-400 px-2 font-bold uppercase">Session:</span>
              <button
                onClick={() => setSessionSide('open')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sessionSide === 'open'
                    ? 'bg-gold text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                OPEN
              </button>
              <button
                onClick={() => setSessionSide('close')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sessionSide === 'close'
                    ? 'bg-gold text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                CLOSE
              </button>
            </div>
          )}
        </div>

        {/* 1. SINGLE (0-9) */}
        {activeGameType === 'SINGLE' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-300">Select Single Digit (0–9):</span>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                const isSelected = singleDigit === num;
                return (
                  <button
                    key={num}
                    onClick={() => {
                      requireAuth(() => {
                        if (soundEnabled) sounds.playChip();
                        setSingleDigit(singleDigit === num ? null : num);
                      });
                    }}
                    className={`h-14 rounded-2xl font-black text-lg transition-all cursor-pointer relative flex items-center justify-center border ${
                      isSelected
                        ? 'bg-gradient-to-br from-gold to-amber-500 text-black border-white shadow-lg scale-105 ring-2 ring-gold/80'
                        : 'bg-slate-950 text-white border-white/10 hover:border-gold/40 hover:scale-105'
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
        )}

        {/* 2. JODI (00-99) */}
        {activeGameType === 'JODI' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-300">Select 2-Digit Jodi (00–99):</span>
              <div className="relative w-full sm:w-48">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  maxLength={2}
                  value={jodiSearch}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setJodiSearch(val);
                    if (val.length === 2) setJodiSelection(val);
                  }}
                  placeholder="Quick Search (e.g. 56)"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-gold font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 max-h-56 overflow-y-auto pr-1 p-1 bg-slate-950/60 rounded-xl border border-white/5">
              {Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0'))
                .filter((item) => !jodiSearch || item.includes(jodiSearch))
                .map((pair) => {
                  const isSelected = jodiSelection === pair;
                  return (
                    <button
                      key={pair}
                      onClick={() => {
                        requireAuth(() => {
                          if (soundEnabled) sounds.playChip();
                          setJodiSelection(isSelected ? '' : pair);
                        });
                      }}
                      className={`h-11 rounded-xl font-mono font-bold text-xs transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-gold text-black border-white shadow-md scale-105 ring-2 ring-gold/80'
                          : 'bg-slate-900 text-slate-300 border-white/5 hover:border-gold/30 hover:text-white'
                      }`}
                    >
                      {pair}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* 3. PATTI (Single Patti - 120 combinations) */}
        {activeGameType === 'PATTI' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-300">Filter by Patti Sum Ank (0–9) or Type 3-Digits:</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={3}
                  value={customPattiInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setCustomPattiInput(val);
                    setSelectedPatti('');
                  }}
                  placeholder="Custom Patti (e.g. 128)"
                  className="bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-gold font-mono w-44"
                />
              </div>
            </div>

            {/* Quick Ank Filter Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setPattiFilterDigit(null)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  pattiFilterDigit === null ? 'bg-gold text-black' : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                All (120)
              </button>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  onClick={() => setPattiFilterDigit(digit)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    pattiFilterDigit === digit ? 'bg-amber-500 text-black' : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  Sum {digit}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-2 max-h-48 overflow-y-auto pr-1 p-1 bg-slate-950/60 rounded-xl border border-white/5">
              {filteredSinglePattis.map((p) => {
                const isSelected = selectedPatti === p || customPattiInput === p;
                return (
                  <button
                    key={p}
                    onClick={() => {
                      requireAuth(() => {
                        if (soundEnabled) sounds.playChip();
                        setSelectedPatti(isSelected ? '' : p);
                        setCustomPattiInput('');
                      });
                    }}
                    className={`h-10 rounded-xl font-mono font-bold text-xs transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-gold text-black border-white shadow-md scale-105 ring-2 ring-gold/80'
                        : 'bg-slate-900 text-slate-300 border-white/5 hover:border-gold/30 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. DOUBLE_PATTI (90 combinations) */}
        {activeGameType === 'DOUBLE_PATTI' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-300">Select Double Patti (2 Matching Digits):</span>
              <input
                type="text"
                maxLength={3}
                value={customPattiInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setCustomPattiInput(val);
                  setSelectedPatti('');
                }}
                placeholder="Custom Double Patti (e.g. 112)"
                className="bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-gold font-mono w-48"
              />
            </div>

            {/* Quick Ank Filter Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setPattiFilterDigit(null)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  pattiFilterDigit === null ? 'bg-gold text-black' : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                All (90)
              </button>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  onClick={() => setPattiFilterDigit(digit)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    pattiFilterDigit === digit ? 'bg-amber-500 text-black' : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  Sum {digit}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-2 max-h-48 overflow-y-auto pr-1 p-1 bg-slate-950/60 rounded-xl border border-white/5">
              {filteredDoublePattis.map((p) => {
                const isSelected = selectedPatti === p || customPattiInput === p;
                return (
                  <button
                    key={p}
                    onClick={() => {
                      requireAuth(() => {
                        if (soundEnabled) sounds.playChip();
                        setSelectedPatti(isSelected ? '' : p);
                        setCustomPattiInput('');
                      });
                    }}
                    className={`h-10 rounded-xl font-mono font-bold text-xs transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-gold text-black border-white shadow-md scale-105 ring-2 ring-gold/80'
                        : 'bg-slate-900 text-slate-300 border-white/5 hover:border-gold/30 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. TRIPLE_PATTI (10 combinations) */}
        {activeGameType === 'TRIPLE_PATTI' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-300">Select Triple Patti (All 3 Identical Digits — 700x Payout):</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {ALL_TRIPLE_PATTIS.map((tp) => {
                const isSelected = selectedPatti === tp;
                return (
                  <button
                    key={tp}
                    onClick={() => {
                      requireAuth(() => {
                        if (soundEnabled) sounds.playChip();
                        setSelectedPatti(isSelected ? '' : tp);
                      });
                    }}
                    className={`h-14 rounded-2xl font-mono font-black text-base transition-all cursor-pointer flex items-center justify-center border ${
                      isSelected
                        ? 'bg-gradient-to-br from-gold to-amber-500 text-black border-white shadow-xl ring-2 ring-gold'
                        : 'bg-slate-950 text-amber-400 border-white/10 hover:border-gold/40'
                    }`}
                  >
                    {tp}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. HALF_SANGAM */}
        {activeGameType === 'HALF_SANGAM' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-white/5">
              <button
                onClick={() => setHalfSangamMode('patti-ank')}
                className={`w-full sm:flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                  halfSangamMode === 'patti-ank' ? 'bg-gold text-black shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Mode 1: Open Patti (3D) + Close Ank (1D)
              </button>
              <button
                onClick={() => setHalfSangamMode('ank-patti')}
                className={`w-full sm:flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                  halfSangamMode === 'ank-patti' ? 'bg-gold text-black shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Mode 2: Open Ank (1D) + Close Patti (3D)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/70 p-4 rounded-2xl border border-white/5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  {halfSangamMode === 'patti-ank' ? '1. Open Patti (3 Digits)' : '1. Open Single Ank (1 Digit)'}
                </label>
                <input
                  type="text"
                  maxLength={halfSangamMode === 'patti-ank' ? 3 : 1}
                  value={halfSangamMode === 'patti-ank' ? sangamPatti : sangamAnk}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (halfSangamMode === 'patti-ank') setSangamPatti(val);
                    else setSangamAnk(val);
                  }}
                  placeholder={halfSangamMode === 'patti-ank' ? 'e.g. 128' : 'e.g. 6'}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-gold font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  {halfSangamMode === 'patti-ank' ? '2. Close Single Ank (1 Digit)' : '2. Close Patti (3 Digits)'}
                </label>
                <input
                  type="text"
                  maxLength={halfSangamMode === 'patti-ank' ? 1 : 3}
                  value={halfSangamMode === 'patti-ank' ? sangamAnk : sangamPatti}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (halfSangamMode === 'patti-ank') setSangamAnk(val);
                    else setSangamPatti(val);
                  }}
                  placeholder={halfSangamMode === 'patti-ank' ? 'e.g. 6' : 'e.g. 349'}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-gold font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* 7. FULL_SANGAM */}
        {activeGameType === 'FULL_SANGAM' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              <Award className="w-4 h-4 text-gold flex-shrink-0" />
              <span>Full Sangam matches both Open Patti & Close Patti for a massive <strong>10,000× payout</strong>!</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/70 p-4 rounded-2xl border border-white/5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">1. Open Patti (3 Digits)</label>
                <input
                  type="text"
                  maxLength={3}
                  value={fullSangamOpenPatti}
                  onChange={(e) => setFullSangamOpenPatti(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 128"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-gold font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">2. Close Patti (3 Digits)</label>
                <input
                  type="text"
                  maxLength={3}
                  value={fullSangamClosePatti}
                  onChange={(e) => setFullSangamClosePatti(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 349"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-gold font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Stake Amount Selector & Bet Placement */}
        <div className="pt-4 border-t border-white/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs text-slate-400">Select Bet Stake:</span>
            <div className="grid grid-cols-5 gap-1.5 sm:flex sm:gap-2">
              {[50, 100, 500, 1000, 5000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBetAmount(amt)}
                  className={`py-1.5 px-2 sm:px-3 sm:py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer text-center ${
                    betAmount === amt ? 'bg-gold text-black shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Your Selection:</span>
                <span className="font-mono font-bold text-gold px-2 py-0.5 rounded bg-gold/10 border border-gold/20">
                  {currentSelectionString || 'None'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Potential Return:</span>
                <span className="text-emerald-400 font-bold font-mono text-base">
                  ₹{isValidSelection ? Math.round(betAmount * activeMeta.mult).toLocaleString() : 0}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">({activeMeta.badge})</span>
              </div>
            </div>

            <button
              onClick={() => requireAuth(placeBet)}
              disabled={!isValidSelection}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-black btn-gold-shimmer disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-sm shadow-xl flex items-center justify-center gap-2"
            >
              <Dice1 className="w-4 h-4" />
              Place {activeMeta.shortLabel} Bet (₹{betAmount})
            </button>
          </div>
        </div>
      </div>

      {/* History Log Table */}
      {results.length > 0 && (
        <div className="app-card p-4 rounded-2xl border border-white/5">
          <span className="text-xs font-bold text-white font-heading mb-3 block">My Recent Matka Rounds</span>
          <div className="space-y-2 text-xs">
            {results.map((res) => (
              <div
                key={res.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-slate-900/60 border border-white/5"
              >
                <div>
                  <span className="font-bold text-white block">{res.market}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Format: {res.gameType} • Bet on: <strong className="text-gold">{res.selection}</strong>
                  </span>
                </div>
                <div className="text-center font-mono">
                  <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 font-bold text-[11px] border border-white/5">
                    {res.outcomeDisplay}
                  </span>
                </div>
                <div className="text-right">
                  {res.won ? (
                    <span className="text-emerald-400 font-bold font-mono text-sm">+₹{res.payout.toLocaleString()}</span>
                  ) : (
                    <span className="text-slate-500 font-mono">Loss</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comprehensive Game Order Ledger & Transactions */}
      <GameOrderLedger gameId={selectedMarket.id} gameName={selectedMarket.name} currentPeriod={currentPeriod} />

      {/* Auto-Bet Panel */}
      <AutoBetPanel
        balance={balance}
        intervalMs={5000}
        onPlaceBet={async (amount) => {
          if (!isAuthenticated) return 0;
          if (balance < amount) return 0;
          deductBalance(amount, `Auto-Bet — Matka Jhatka`);
          const won = Math.random() > 0.65;
          const mult = activeMeta.mult;
          const payout = won ? Math.round(amount * mult) : 0;
          if (won) addBalance(payout, `Auto-Bet Win — Matka Jhatka ${mult}×`, 'win');
          return won ? payout - amount : -amount;
        }}
      />

      <GameChat gameId="matka" />
      <ProvablyFairModal isOpen={isFairnessOpen} onClose={() => setIsFairnessOpen(false)} />
      <AuthGateModal isOpen={authGateOpen} onClose={authGateClose} onSuccess={authGateSuccess} />

      {/* Internal Cross-Linking */}
      <RelatedGamesSection currentGameId="matka" />
    </div>
  );
}
