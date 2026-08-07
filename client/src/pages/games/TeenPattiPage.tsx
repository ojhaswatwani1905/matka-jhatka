import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useWallet } from '../../store/WalletContext';
import { useToast } from '../../components/ui/Toast';
import { useAuthGate } from '../../hooks/useAuthGate';
import { generateId, getRandomNumber } from '../../lib/utils';
import { sounds } from '../../lib/sound';
import { GameChat } from '../../components/ui/GameChat';

/* ─── Provably Fair ─────────────────────────────────────────────── */
async function generateTeenPattiSeed(): Promise<{ seed: string; hash: string }> {
  const seed = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return { seed, hash };
}

/* ─── Card types ────────────────────────────────────────────────── */
type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

interface Card { suit: Suit; rank: Rank; value: number; }

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RANK_VALUES: Record<Rank, number> = {
  A: 14, K: 13, Q: 12, J: 11, '10': 10, '9': 9, '8': 8,
  '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2,
};

function createDeck(): Card[] {
  return SUITS.flatMap(suit => RANKS.map(rank => ({ suit, rank, value: RANK_VALUES[rank] })));
}

// Seed → shuffled deck
function seedToDeck(seed: string): Card[] {
  const deck = createDeck();
  for (let i = deck.length - 1; i > 0; i--) {
    const byteIdx = (i * 2) % seed.length;
    const j = parseInt(seed.slice(byteIdx, byteIdx + 2), 16) % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/* ─── Hand ranking ──────────────────────────────────────────────── */
type HandRank = 'Trail' | 'Pure Sequence' | 'Sequence' | 'Color' | 'Pair' | 'High Card';

interface HandResult { rank: HandRank; score: number; description: string; }

function rankHand(cards: Card[]): HandResult {
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const values = sorted.map(c => c.value);
  const suits = cards.map(c => c.suit);
  const isFlush = new Set(suits).size === 1;

  // Trail (Three of a kind)
  if (values[0] === values[1] && values[1] === values[2]) {
    return { rank: 'Trail', score: 7000 + values[0], description: `Three ${sorted[0].rank}s` };
  }

  // Check sequence
  const isSeq = (values[0] - values[1] === 1 && values[1] - values[2] === 1) ||
    (values[0] === 14 && values[1] === 3 && values[2] === 2); // A-2-3 wrap

  if (isFlush && isSeq) {
    return { rank: 'Pure Sequence', score: 6000 + values[0], description: `Pure Sequence: ${sorted.map(c => c.rank).join('-')} ${suits[0]}` };
  }
  if (isSeq) {
    return { rank: 'Sequence', score: 5000 + values[0], description: `Sequence: ${sorted.map(c => c.rank).join('-')}` };
  }
  if (isFlush) {
    return { rank: 'Color', score: 4000 + values[0] * 100 + values[1] * 10 + values[2], description: `Color: ${sorted[0].rank} High ${suits[0]}` };
  }

  // Pair
  if (values[0] === values[1] || values[1] === values[2]) {
    const pairVal = values[0] === values[1] ? values[0] : values[1];
    return { rank: 'Pair', score: 3000 + pairVal, description: `Pair of ${RANKS.find(r => RANK_VALUES[r] === pairVal)}s` };
  }

  return { rank: 'High Card', score: values[0] * 100 + values[1] * 10 + values[2], description: `High Card: ${sorted[0].rank}` };
}

const BET_AMOUNTS = [10, 50, 100, 500, 1000];

/* ─── Card component ────────────────────────────────────────────── */
function PlayingCard({ card, faceDown = false, delay = 0 }: { card?: Card; faceDown?: boolean; delay?: number }) {
  const isRed = card && (card.suit === '♥' || card.suit === '♦');
  return (
    <motion.div
      initial={{ rotateY: 180, scale: 0.8, opacity: 0 }}
      animate={{ rotateY: faceDown ? 180 : 0, scale: 1, opacity: 1 }}
      transition={{ delay, duration: 0.35, type: 'spring', stiffness: 200 }}
      className="w-14 h-20 rounded-xl border-2 flex flex-col items-center justify-center shadow-xl relative select-none"
      style={{
        background: faceDown ? 'linear-gradient(135deg, #0d2419, #1a3a28)' : 'linear-gradient(135deg, #f8f8f8, #e8e8e8)',
        borderColor: faceDown ? 'rgba(212,175,55,0.3)' : 'rgba(200,200,200,0.5)',
        backfaceVisibility: 'hidden',
      }}
    >
      {faceDown ? (
        <span className="text-2xl" style={{ opacity: 0.4 }}>🂠</span>
      ) : card ? (
        <>
          <span className="text-xs font-black absolute top-1.5 left-2" style={{ color: isRed ? '#e74c3c' : '#1a1a2e' }}>{card.rank}</span>
          <span className="text-2xl" style={{ color: isRed ? '#e74c3c' : '#1a1a2e' }}>{card.suit}</span>
          <span className="text-xs font-black absolute bottom-1.5 right-2 rotate-180" style={{ color: isRed ? '#e74c3c' : '#1a1a2e' }}>{card.rank}</span>
        </>
      ) : null}
    </motion.div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
type GamePhase = 'idle' | 'dealt' | 'reveal' | 'result';

export default function TeenPattiPage() {
  const { balance, deductBalance, addBalance } = useWallet();
  const { addToast } = useToast();
  const { requireAuth } = useAuthGate();

  const [betAmount, setBetAmount] = useState(100);
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [houseCards, setHouseCards] = useState<Card[]>([]);
  const [showHouseCards, setShowHouseCards] = useState(false);
  const [result, setResult] = useState<'win' | 'lose' | 'tie' | null>(null);
  const [playerHand, setPlayerHand] = useState<HandResult | null>(null);
  const [houseHand, setHouseHand] = useState<HandResult | null>(null);
  const [commitHash, setCommitHash] = useState('');
  const [seed, setSeed] = useState('');
  const [currentBet, setCurrentBet] = useState(0);
  const [history, setHistory] = useState<('win' | 'lose' | 'tie')[]>([]);

  const dealCards = () => {
    requireAuth(async () => {
      if (!deductBalance(betAmount, `Teen Patti ante`)) {
        addToast({ type: 'error', title: 'Insufficient balance' });
        return;
      }
      setCurrentBet(betAmount);
      sounds.playChip();

      const { seed: s, hash } = await generateTeenPattiSeed();
      setSeed(s);
      setCommitHash(hash);
      const deck = seedToDeck(s);

      // Deal: player gets cards 0,2,4 — house gets 1,3,5
      const pCards = [deck[0], deck[2], deck[4]];
      const hCards = [deck[1], deck[3], deck[5]];

      setPlayerCards(pCards);
      setHouseCards(hCards);
      setPlayerHand(rankHand(pCards));
      setHouseHand(rankHand(hCards));
      setShowHouseCards(false);
      setResult(null);
      setPhase('dealt');
    });
  };

  const seeCall = () => {
    // Call = pay another betAmount to see the cards
    if (!deductBalance(currentBet, `Teen Patti call/see`)) {
      addToast({ type: 'error', title: 'Insufficient balance for call' });
      return;
    }

    setShowHouseCards(true);
    setPhase('reveal');

    setTimeout(() => {
      const ph = rankHand(playerCards);
      const hh = rankHand(houseCards);
      let outcome: 'win' | 'lose' | 'tie';

      if (ph.score > hh.score) {
        outcome = 'win';
        const win = currentBet * 3.8; // Ante + call + profit
        addBalance(win, `Teen Patti win — ${ph.rank}`);
        addToast({ type: 'success', title: `You Win! ₹${win.toFixed(0)}`, message: ph.description });
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 }, colors: ['#D4AF37', '#2ECC71'] });
      } else if (ph.score < hh.score) {
        outcome = 'lose';
        addToast({ type: 'error', title: `House Wins`, message: hh.description });
      } else {
        outcome = 'tie';
        // Tie returns ante only
        addBalance(currentBet, `Teen Patti tie — ante returned`);
        addToast({ type: 'info', title: `Tie! Ante returned`, message: `${ph.description}` });
      }

      setResult(outcome);
      setHistory(prev => [outcome, ...prev].slice(0, 20));
      setPhase('result');
    }, 1200);
  };

  const fold = () => {
    // Fold = lose the ante
    addToast({ type: 'warning', title: `Folded — lost ₹${currentBet} ante` });
    setResult('lose');
    setShowHouseCards(true);
    setHistory(prev => ['lose', ...prev].slice(0, 20));
    setPhase('result');
  };

  return (
    <div className="py-4 space-y-5 w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.3)] flex items-center justify-center text-xl">🃏</div>
          <div>
            <h1 className="text-lg font-black text-[#E8C97A] font-heading">Teen Patti</h1>
            <p className="text-[10px] text-[rgba(212,175,55,0.5)]">Indian Card Game · Provably Fair</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.2)]">
          <Shield className="w-3.5 h-3.5 text-gold" />
          <span className="text-[10px] font-bold text-gold">Provably Fair</span>
        </div>
      </div>

      {/* 2-Column Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Card Table & Controls */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {commitHash && (
            <div className="bg-[rgba(212,175,55,0.04)] border border-[rgba(212,175,55,0.12)] rounded-xl p-2 text-[10px] text-[rgba(212,175,55,0.45)] font-mono truncate">
              Seed hash: {commitHash}
            </div>
          )}

          {/* Hand rankings reference */}
      <div className="royal-panel rounded-xl p-2.5">
        <p className="text-[9px] font-black text-[rgba(212,175,55,0.4)] uppercase tracking-wider mb-1.5">Hand Rankings (High → Low)</p>
        <div className="flex gap-1 flex-wrap">
          {(['Trail', 'Pure Sequence', 'Sequence', 'Color', 'Pair', 'High Card'] as HandRank[]).map((r, i) => (
            <span key={r} className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[rgba(212,175,55,0.06)] text-[rgba(212,175,55,0.6)] border border-[rgba(212,175,55,0.12)]">
              {i + 1}. {r}
            </span>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="royal-panel rounded-2xl p-6 space-y-6">
        {/* House cards */}
        <div className="text-center space-y-3">
          <p className="text-xs font-black text-[rgba(212,175,55,0.5)] uppercase tracking-wider">🏦 House Hand</p>
          <div className="flex justify-center gap-2">
            {phase === 'idle' ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="w-14 h-20 rounded-xl border-2 border-[rgba(212,175,55,0.15)] bg-[#0d2419] flex items-center justify-center text-[rgba(212,175,55,0.2)] text-2xl">🂠</div>
              ))
            ) : houseCards.map((c, i) => (
              <PlayingCard key={i} card={c} faceDown={!showHouseCards} delay={i * 0.12} />
            ))}
          </div>
          {showHouseCards && houseHand && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-black text-[rgba(212,175,55,0.6)]">
              {houseHand.rank} — {houseHand.description}
            </motion.p>
          )}
        </div>

        {/* VS */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[rgba(212,175,55,0.15)]" />
          <span className="text-xs font-black text-[rgba(212,175,55,0.4)]">VS</span>
          <div className="flex-1 h-px bg-[rgba(212,175,55,0.15)]" />
        </div>

        {/* Player cards */}
        <div className="text-center space-y-3">
          <p className="text-xs font-black text-gold uppercase tracking-wider">👤 Your Hand</p>
          <div className="flex justify-center gap-2">
            {phase === 'idle' ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="w-14 h-20 rounded-xl border-2 border-[rgba(212,175,55,0.15)] bg-[#0d2419] flex items-center justify-center text-[rgba(212,175,55,0.2)] text-2xl">🂠</div>
              ))
            ) : playerCards.map((c, i) => (
              <PlayingCard key={i} card={c} faceDown={false} delay={i * 0.12 + 0.2} />
            ))}
          </div>
          {playerHand && phase !== 'idle' && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-black text-gold">
              {playerHand.rank} — {playerHand.description}
            </motion.p>
          )}
        </div>

        {/* Result banner */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
              className={`text-center py-3 rounded-xl border font-black text-sm ${
                result === 'win' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                result === 'lose' ? 'bg-[#FF4D6D]/10 border-[#FF4D6D]/30 text-[#FF4D6D]' :
                'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
              {result === 'win' ? '🎉 You Win!' : result === 'lose' ? '💔 House Wins' : '🤝 Tie!'}
              {seed && <p className="text-[9px] opacity-50 font-mono mt-1 font-normal">Seed: {seed.slice(0, 20)}...</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="royal-panel rounded-2xl p-4 space-y-3">
        {/* Bet amounts */}
        <div>
          <label className="text-[10px] text-[rgba(212,175,55,0.5)] font-bold mb-1.5 block">Ante (Bet Amount)</label>
          <div className="flex gap-1.5 flex-wrap">
            {BET_AMOUNTS.map(a => (
              <button key={a} onClick={() => setBetAmount(a)} disabled={phase === 'dealt'}
                className={`flex-1 min-w-[48px] py-2 rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-50 ${betAmount === a ? 'btn-royal-gold' : 'bg-[#0d2419] border border-[rgba(212,175,55,0.15)] text-[rgba(212,175,55,0.5)]'}`}>
                ₹{a}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          {(phase === 'idle' || phase === 'result') && (
            <button onClick={dealCards} className="col-span-2 btn-royal-gold py-3 rounded-xl font-black text-xs cursor-pointer">
              {phase === 'idle' ? '🃏 Deal Cards (₹' + betAmount + ' ante)' : '🔄 New Round'}
            </button>
          )}
          {phase === 'dealt' && (
            <>
              <button onClick={seeCall}
                className="py-3 rounded-xl font-black text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer transition-all">
                👁 See / Call (₹{currentBet})
              </button>
              <button onClick={fold}
                className="py-3 rounded-xl font-black text-xs bg-[#FF4D6D]/10 border border-[#FF4D6D]/30 text-[#FF4D6D] hover:bg-[#FF4D6D]/20 cursor-pointer transition-all">
                🚫 Fold
              </button>
            </>
          )}
        </div>

        {phase === 'dealt' && (
          <div className="text-center text-[10px] text-[rgba(212,175,55,0.4)]">
            Pot: ₹{currentBet} ante · Call costs ₹{currentBet} more · Win = ₹{(currentBet * 3.8).toFixed(0)}
          </div>
        )}
      </div>

      {/* Round history */}
      {history.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {history.map((r, i) => (
            <span key={i} className={`w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center ${r === 'win' ? 'bg-emerald-500/15 text-emerald-400' : r === 'lose' ? 'bg-[#FF4D6D]/15 text-[#FF4D6D]' : 'bg-amber-500/15 text-amber-400'}`}>
              {r === 'win' ? 'W' : r === 'lose' ? 'L' : 'T'}
            </span>
          ))}
        </div>
      )}
        </div>

        {/* Right Column: Game Chat */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          <GameChat gameId="teen-patti" />
        </div>
      </div>
    </div>
  );
}

