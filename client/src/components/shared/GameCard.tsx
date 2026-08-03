import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Users, Play, Flame, Zap } from 'lucide-react';

interface GameCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  path: string;
  players?: number;
  tag?: string;
  delay?: number;
}

export default function GameCard({
  title,
  description,
  icon,
  gradient,
  path,
  players = 0,
  tag,
  delay = 0,
}: GameCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="h-full"
    >
      <Link to={path} className="block h-full group">
        <div className="relative h-full overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.22)] bg-[#0d2419] shadow-xl group-hover:border-[rgba(212,175,55,0.5)] group-hover:shadow-[0_8px_30px_rgba(212,175,55,0.2)] transition-all duration-300 flex flex-col">
          {/* Visual Header with gradient */}
          <div
            className="relative h-48 sm:h-52 flex items-center justify-center p-6 overflow-hidden"
            style={{ background: gradient }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d2419]/80 via-transparent to-black/20" />
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[rgba(212,175,55,0.1)] blur-3xl pointer-events-none" />
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(rgba(212,175,55,0.6)_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* Icon */}
            <motion.div className="relative z-10 w-20 h-20 rounded-2xl bg-[rgba(255,255,255,0.12)] backdrop-blur-md border border-[rgba(255,255,255,0.2)] flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
              {icon}
            </motion.div>

            {/* Tag Badge */}
            {tag && (
              <div className="absolute top-3.5 left-3.5 z-20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0B2318]/90 text-gold border border-[rgba(212,175,55,0.4)] backdrop-blur-md shadow-lg flex items-center gap-1">
                {tag.includes('HOT') ? <Flame className="w-3 h-3 text-rose-400" /> : <Zap className="w-3 h-3 text-gold" />}
                {tag}
              </div>
            )}

            {/* Hover Play Overlay */}
            <div className="absolute inset-0 bg-[#0B2318]/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
              <div className="btn-royal-gold w-16 h-16 rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-300">
                <Play className="w-7 h-7 fill-[#0B2318] ml-1" />
              </div>
            </div>
          </div>

          {/* Bottom Content */}
          <div className="p-5 flex-1 flex flex-col justify-between bg-[#0d2419]">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="font-black text-[#F5F1E6] text-xl font-heading group-hover:text-gold transition-colors tracking-tight">
                  {title}
                </h3>
                <div className="w-8 h-8 rounded-xl bg-[rgba(212,175,55,0.08)] group-hover:bg-[rgba(212,175,55,0.2)] flex items-center justify-center text-[rgba(212,175,55,0.5)] group-hover:text-gold transition-colors">
                  <Play className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs text-[rgba(212,175,55,0.5)] line-clamp-2 leading-relaxed mb-4">
                {description}
              </p>
            </div>

            {players > 0 && (
              <div className="pt-3 border-t border-[rgba(212,175,55,0.12)] flex items-center justify-between text-xs text-[rgba(212,175,55,0.5)]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#2ECC71] animate-pulse" />
                  <Users className="w-3.5 h-3.5" />
                  <span className="font-semibold text-[#E8C97A]">{players.toLocaleString()} playing</span>
                </div>
                <span className="text-xs font-bold text-gold group-hover:text-[#F5D576] transition-colors">Play Now →</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
