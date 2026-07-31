import { motion } from 'framer-motion';
import { Palette, Dice1, Ticket, Fish, ShieldCheck, Trophy, Play, ChevronRight, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import BannerSlider from '../../components/shared/BannerSlider';
import RecentWinners from '../../components/shared/RecentWinners';
import AnimatedCounter from '../../components/ui/AnimatedCounter';
import { useWallet } from '../../store/WalletContext';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const gameCategories = [
  {
    id: 'color-prediction',
    title: 'Color Prediction',
    subtitle: 'Win Go 1Min / 3Min',
    icon: <Palette className="w-8 h-8 text-white" />,
    path: '/games/color-prediction',
    badge: '🔥 PROVABLY FAIR',
    bg: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
    border: 'border-rose-500/40',
  },
  {
    id: 'matka',
    title: 'Matka Jhatka',
    subtitle: 'Kalyan & Mumbai',
    icon: <Dice1 className="w-8 h-8 text-white" />,
    path: '/games/matka',
    badge: '⚡ 900X ODDS',
    bg: 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)',
    border: 'border-purple-500/40',
  },
  {
    id: 'lottery',
    title: 'Lottery 5D',
    subtitle: '5D & K3 Draw',
    icon: <Ticket className="w-8 h-8 text-white" />,
    path: '/games',
    badge: '💰 JACKPOT',
    bg: 'linear-gradient(135deg, #F5B92C 0%, #D97706 100%)',
    border: 'border-amber-500/40',
  },
  {
    id: 'fishing',
    title: 'Ocean Hunter',
    subtitle: 'Arcade Fishing',
    icon: <Fish className="w-8 h-8 text-white" />,
    path: '/games',
    badge: '🌊 CASINO',
    bg: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
    border: 'border-emerald-500/40',
  },
];

export default function HomePage() {
  const { balance } = useWallet();

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 sm:space-y-8 pb-6"
    >
      {/* 1. Wallet Card & Banner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Wallet Balance Card */}
        <motion.div variants={item} className="lg:col-span-1">
          <div className="app-card border border-gold/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-gold" /> Account Balance
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                PROVABLY FAIR
              </span>
            </div>

            <div className="my-2">
              <span className="text-3xl sm:text-4xl font-black text-gold font-heading tabular-nums tracking-tight">
                $<AnimatedCounter value={balance} decimals={2} duration={1} />
              </span>
              <span className="text-xs text-slate-400 block mt-1">Available for live betting & withdrawal</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <Link
                to="/wallet"
                className="py-2.5 rounded-xl font-bold text-xs text-black btn-gold-shimmer flex items-center justify-center gap-1.5 hover:scale-105 transition-transform shadow-lg"
              >
                <ArrowDownLeft className="w-4 h-4" /> Deposit
              </Link>
              <Link
                to="/wallet"
                className="py-2.5 rounded-xl font-bold text-xs text-white bg-slate-800 border border-white/10 flex items-center justify-center gap-1.5 hover:bg-slate-700 transition-all shadow-md"
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-400" /> Withdraw
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Hero Banner Slider */}
        <motion.div variants={item} className="lg:col-span-2">
          <BannerSlider />
        </motion.div>
      </div>

      {/* 2. Recent Winners Ticker */}
      <motion.div variants={item}>
        <RecentWinners />
      </motion.div>

      {/* 3. Featured Casino Games Grid */}
      <motion.div variants={item} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white font-heading tracking-tight flex items-center gap-2">
              <Trophy className="w-5 h-5 text-gold" /> Featured Games Suite
            </h2>
            <p className="text-xs text-slate-400">Verifiably fair outcomes powered by SHA-256 commitments</p>
          </div>
          <Link to="/games" className="text-xs font-bold text-gold hover:underline flex items-center gap-1">
            All Games <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {gameCategories.map((cat) => (
            <Link
              key={cat.id}
              to={cat.path}
              className={`app-card rounded-2xl p-5 border ${cat.border} relative overflow-hidden group hover:-translate-y-1.5 transition-all shadow-xl block cursor-pointer`}
              style={{ background: cat.bg }}
            >
              <div className="flex items-start justify-between mb-6 relative z-10">
                <div className="p-3 rounded-2xl bg-black/30 backdrop-blur-md group-hover:scale-110 transition-transform">
                  {cat.icon}
                </div>
                <span className="text-[10px] font-black uppercase text-black bg-gold px-2.5 py-1 rounded-full shadow-md">
                  {cat.badge}
                </span>
              </div>

              <div className="relative z-10">
                <h3 className="text-lg font-black text-white font-heading leading-snug">{cat.title}</h3>
                <p className="text-xs text-white/80 font-medium mt-0.5">{cat.subtitle}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-bold text-white relative z-10">
                <span>Play Now</span>
                <Play className="w-4 h-4 fill-white group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
