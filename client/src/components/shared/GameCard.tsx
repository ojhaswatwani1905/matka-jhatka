import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Users, ArrowUpRight, Play, Flame, Zap } from 'lucide-react';

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
        <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-navy-900 shadow-2xl group-hover:border-violet/50 transition-all duration-300 flex flex-col">
          {/* Visual Header Box with Rich Gradient */}
          <div
            className="relative h-48 sm:h-52 flex items-center justify-center p-6 overflow-hidden"
            style={{ background: gradient }}
          >
            {/* Background Texture & Lighting */}
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-black/20" />
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-black/40 blur-2xl pointer-events-none" />
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* Glowing Icon Banner Badge */}
            <motion.div
              className="relative z-10 w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300"
            >
              {icon}
            </motion.div>

            {/* Tag Badge */}
            {tag && (
              <div className="absolute top-3.5 left-3.5 z-20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-navy-950/90 text-gold border border-gold/40 backdrop-blur-md shadow-lg flex items-center gap-1">
                {tag.includes('HOT') ? <Flame className="w-3 h-3 text-neon-red" /> : <Zap className="w-3 h-3 text-gold" />}
                {tag}
              </div>
            )}

            {/* Hover Play Button Overlay */}
            <div className="absolute inset-0 bg-navy-950/70 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gold to-gold-dark text-navy-950 flex items-center justify-center font-black shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-300">
                <Play className="w-7 h-7 fill-navy-950 ml-1" />
              </div>
            </div>
          </div>

          {/* Bottom Card Content */}
          <div className="p-5 flex-1 flex flex-col justify-between bg-gradient-to-b from-navy-900 to-surface">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="font-black text-white text-xl font-heading group-hover:text-gold transition-colors tracking-tight">
                  {title}
                </h3>
                <div className="w-8 h-8 rounded-xl bg-white/5 group-hover:bg-violet/20 flex items-center justify-center text-navy-500 group-hover:text-violet-light transition-colors">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs text-navy-500 line-clamp-2 leading-relaxed mb-4">
                {description}
              </p>
            </div>

            {/* Live Stats */}
            {players > 0 && (
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-navy-500">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                  <Users className="w-3.5 h-3.5 text-navy-500" />
                  <span className="font-semibold text-slate-300">{players.toLocaleString()} playing</span>
                </div>
                <span className="text-xs font-bold text-violet-light group-hover:text-gold transition-colors">Play Now &rarr;</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
