/**
 * GameChat — per-game chat with profanity filter, rate-limit, guest gate
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, X, ChevronDown, Flag } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { useAuthGate } from '../../hooks/useAuthGate';

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  time: string;
  isOwn: boolean;
  reported?: boolean;
}

/* ─── Profanity filter (basic word list) ───────────────────────── */
const BLOCKED = ['fuck', 'shit', 'bastard', 'bitch', 'asshole', 'chutiya', 'madarchod', 'bhenchod', 'gaandu'];
function filterProfanity(text: string): string {
  let out = text;
  BLOCKED.forEach(word => {
    const re = new RegExp(word, 'gi');
    out = out.replace(re, '*'.repeat(word.length));
  });
  return out;
}

/* ─── Simulated activity ───────────────────────────────────────── */
const SIM_USERS = ['Raj***91', 'Priya***42', 'Amit***77', 'Sona***15', 'Vikram***33', 'Neha***08'];
const SIM_MSGS: Record<string, string[]> = {
  aviator: ['📈 Cashed out at 3.2x!', 'Crashed again 😭', 'Let\'s go 5x!!!', 'gg easy money', 'waiting for big mult', 'anyone using auto cashout?'],
  mines: ['💣 Hit 5 safe tiles!', 'So risky going 8 gems', 'gg no bomb 🎉', 'anyone else at 3x?', 'Phew, that was close!'],
  plinko: ['Hit multiplier 16x!!!', 'Ball keeps going left 😅', 'Steady at 2x gg', 'Love this game', 'risking high peg today'],
  'teen-patti': ['Full house dealt 🃏', 'Bluffing everyone lol', 'Nice hand bro', '3 patti finally!', 'Who else got pair?'],
  wingo: ['Predicted green right!', 'Red again 🔴', 'Violet pays 4.5x nice', 'gg gg gg', 'trying number bet today'],
  default: ['Loving PlayArena! 🎮', 'GG everyone!', 'Anyone on a win streak?', 'Big win incoming 🎯', 'Let\'s all win tonight!'],
};

function getSimMsgs(gameId: string) {
  return SIM_MSGS[gameId] ?? SIM_MSGS.default;
}

function simUser() { return SIM_USERS[Math.floor(Math.random() * SIM_USERS.length)]; }

/* ─── Chat Store (per-game, in-memory) ────────────────────────── */
const chatStore: Record<string, ChatMessage[]> = {};
function getChatStore(gameId: string): ChatMessage[] {
  if (!chatStore[gameId]) {
    // Pre-populate with 6 historical messages
    chatStore[gameId] = Array.from({ length: 6 }, (_, i) => {
      const msgs = getSimMsgs(gameId);
      return {
        id: `init_${i}`,
        user: simUser(),
        text: msgs[i % msgs.length],
        time: new Date(Date.now() - (6 - i) * 45000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        isOwn: false,
      };
    });
  }
  return chatStore[gameId];
}

interface GameChatProps {
  gameId: string; // e.g. 'aviator', 'mines', 'plinko'
}

export function GameChat({ gameId }: GameChatProps) {
  const { user } = useAuth();
  const { requireAuth } = useAuthGate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(getChatStore(gameId));
  const [input, setInput] = useState('');
  const [lastSent, setLastSent] = useState(0);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Simulate incoming messages
  useEffect(() => {
    const tick = () => {
      const msgs = getSimMsgs(gameId);
      const newMsg: ChatMessage = {
        id: `sim_${Date.now()}`,
        user: simUser(),
        text: msgs[Math.floor(Math.random() * msgs.length)],
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        isOwn: false,
      };
      chatStore[gameId].push(newMsg);
      if (chatStore[gameId].length > 100) chatStore[gameId].shift();
      setMessages([...chatStore[gameId]]);
      if (!open) setUnread(c => c + 1);
    };

    const delay = 5000 + Math.random() * 10000;
    const t = setInterval(tick, delay);
    return () => clearInterval(t);
  }, [gameId, open]);

  // Scroll to bottom when opened or new messages
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnread(0);
    }
  }, [open, messages.length]);

  const sendMessage = useCallback(() => {
    if (!requireAuth()) return;
    if (!input.trim()) return;

    const now = Date.now();
    if (now - lastSent < 3000) {
      return; // rate limit: 1 per 3 seconds
    }

    const filtered = filterProfanity(input.trim().slice(0, 140));
    const newMsg: ChatMessage = {
      id: `own_${now}`,
      user: user?.name?.split(' ')[0] ?? 'You',
      text: filtered,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
    };
    chatStore[gameId].push(newMsg);
    setMessages([...chatStore[gameId]]);
    setInput('');
    setLastSent(now);
  }, [input, lastSent, requireAuth, user, gameId]);

  const reportMessage = useCallback((id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, reported: true } : m));
    chatStore[gameId] = chatStore[gameId].map(m => m.id === id ? { ...m, reported: true } : m);
  }, [gameId]);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-[#0d2419] border border-[rgba(212,175,55,0.35)] flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:border-gold cursor-pointer transition-all lg:bottom-4"
      >
        <MessageCircle className="w-5 h-5 text-gold" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#FF4D6D] text-white text-[9px] font-black flex items-center justify-center px-0.5">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-20 right-4 z-40 w-[calc(100vw-32px)] max-w-sm lg:bottom-4 flex flex-col rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
            style={{ height: '420px', background: '#0d2419', border: '1px solid rgba(212,175,55,0.25)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(212,175,55,0.15)]">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-gold" />
                <span className="text-sm font-black text-[#E8C97A]">Live Chat</span>
                <span className="w-2 h-2 rounded-full bg-[#2ECC71] animate-pulse" />
              </div>
              <button onClick={() => setOpen(false)} className="text-[rgba(212,175,55,0.5)] hover:text-gold cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-none">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-2 group ${msg.isOwn ? 'flex-row-reverse' : ''}`}>
                  <div className={`max-w-[80%] ${msg.isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[9px] font-black ${msg.isOwn ? 'text-gold' : 'text-[rgba(212,175,55,0.6)]'}`}>
                        {msg.user}
                      </span>
                      <span className="text-[8px] text-[rgba(212,175,55,0.3)]">{msg.time}</span>
                    </div>
                    <div className={`px-3 py-1.5 rounded-2xl text-xs font-medium leading-relaxed ${msg.isOwn
                      ? 'bg-[rgba(212,175,55,0.18)] border border-[rgba(212,175,55,0.3)] text-[#F5F1E6] rounded-tr-sm'
                      : 'bg-[rgba(11,35,24,0.8)] border border-[rgba(212,175,55,0.1)] text-[#F5F1E6] rounded-tl-sm'
                    } ${msg.reported ? 'opacity-40 line-through' : ''}`}>
                      {msg.text}
                    </div>
                  </div>
                  {/* Report button */}
                  {!msg.isOwn && !msg.reported && (
                    <button
                      onClick={() => reportMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 text-[rgba(212,175,55,0.3)] hover:text-[#FF4D6D] cursor-pointer transition-all self-center"
                    >
                      <Flag className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-2 border-t border-[rgba(212,175,55,0.15)] flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder={user ? 'Type a message…' : 'Log in to chat'}
                maxLength={140}
                className="flex-1 bg-[#061510] border border-[rgba(212,175,55,0.15)] rounded-xl px-3 py-2 text-xs text-[#F5F1E6] placeholder-[rgba(212,175,55,0.25)] focus:outline-none focus:border-[rgba(212,175,55,0.4)]"
              />
              <button
                onClick={sendMessage}
                className="w-8 h-8 rounded-xl bg-[rgba(212,175,55,0.18)] border border-[rgba(212,175,55,0.3)] flex items-center justify-center text-gold hover:bg-[rgba(212,175,55,0.28)] cursor-pointer transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Guest hint */}
            {!user && (
              <div className="px-3 pb-2 text-[9px] text-[rgba(212,175,55,0.35)] text-center">
                👆 Tap Send to log in and join the conversation
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
