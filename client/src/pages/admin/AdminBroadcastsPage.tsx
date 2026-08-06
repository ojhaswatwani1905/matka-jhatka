import { useState } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Send, History, Users, CheckCircle, BellRing } from 'lucide-react';
import { useNotifications } from '../../store/NotificationContext';

interface BroadcastRecord {
  id: string;
  title: string;
  message: string;
  targetSegment: string;
  recipientCount: number;
  sentAt: string;
}

const DEFAULT_BROADCASTS: BroadcastRecord[] = [
  {
    id: 'bc_1',
    title: '🎉 Weekend Deposit Bonus Live!',
    message: 'Get 50% extra bonus on all deposits above ₹1,000 this weekend.',
    targetSegment: 'All Users',
    recipientCount: 1420,
    sentAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'bc_2',
    title: '⚡ Aviator Multiplier Race',
    message: 'Compete for ₹50,000 in weekly prizes on the Aviator leaderboard.',
    targetSegment: 'VIP Players',
    recipientCount: 185,
    sentAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

export default function AdminBroadcastsPage() {
  const { addNotification } = useNotifications();
  const [broadcasts, setBroadcasts] = useState<BroadcastRecord[]>(() => {
    try {
      const saved = localStorage.getItem('playarena_broadcasts');
      return saved ? JSON.parse(saved) : DEFAULT_BROADCASTS;
    } catch {
      return DEFAULT_BROADCASTS;
    }
  });

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetSegment, setTargetSegment] = useState('All Users');
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    const count = targetSegment === 'All Users' ? 1450 : targetSegment === 'VIP Players' ? 190 : 340;

    // Send broadcast notification to client NotificationContext
    addNotification({
      title: `📢 ${title}`,
      message,
      type: 'info',
    });

    const newRecord: BroadcastRecord = {
      id: `bc_${Date.now()}`,
      title,
      message,
      targetSegment,
      recipientCount: count,
      sentAt: new Date().toISOString(),
    };

    const updated = [newRecord, ...broadcasts];
    setBroadcasts(updated);
    localStorage.setItem('playarena_broadcasts', JSON.stringify(updated));

    setTitle('');
    setMessage('');
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-gold" /> Broadcast Announcements
        </h1>
        <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">
          Send platform-wide or segment-targeted push notifications to player bell feeds
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Form */}
        <div className="lg:col-span-1 space-y-4">
          <form onSubmit={handleSend} className="royal-panel p-5 rounded-2xl border border-[rgba(212,175,55,0.2)] space-y-4">
            <h3 className="text-sm font-black text-[#E8C97A] font-heading flex items-center gap-2">
              <BellRing className="w-4 h-4 text-gold" /> Compose Announcement
            </h3>

            <div>
              <label className="text-[10px] font-bold text-[rgba(212,175,55,0.6)] uppercase block mb-1">
                Target Audience Segment
              </label>
              <select
                value={targetSegment}
                onChange={e => setTargetSegment(e.target.value)}
                className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-xs text-gold focus:outline-none focus:border-gold cursor-pointer"
              >
                <option value="All Users">All Registered Players (~1,450)</option>
                <option value="VIP Players">VIP Tier Players (~190)</option>
                <option value="KYC Verified">KYC Verified Users (~820)</option>
                <option value="Active Today">Active in Last 24 Hours (~340)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[rgba(212,175,55,0.6)] uppercase block mb-1">
                Notification Title
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. 🎁 Special Bonus Offer"
                className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-xs text-[#F5F1E6] focus:outline-none focus:border-gold"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[rgba(212,175,55,0.6)] uppercase block mb-1">
                Message Body
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                placeholder="Type notification content to be displayed in user notification feed..."
                className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl p-3 text-xs text-[#F5F1E6] focus:outline-none focus:border-gold resize-none"
                required
              />
            </div>

            <button
              type="submit"
              className={`w-full py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                sentSuccess
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'btn-royal-gold'
              }`}
            >
              {sentSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Broadcast Sent Successfully!
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send Broadcast Notification
                </>
              )}
            </button>
          </form>
        </div>

        {/* History Table */}
        <div className="lg:col-span-2">
          <div className="royal-panel rounded-2xl overflow-hidden border border-[rgba(212,175,55,0.15)]">
            <div className="p-4 border-b border-[rgba(212,175,55,0.1)] flex items-center justify-between">
              <h2 className="text-sm font-black text-[#E8C97A] font-heading flex items-center gap-2">
                <History className="w-4 h-4 text-gold" /> Broadcast Dispatch History ({broadcasts.length})
              </h2>
            </div>

            <div className="divide-y divide-[rgba(212,175,55,0.06)]">
              {broadcasts.map(b => (
                <div key={b.id} className="p-4 space-y-2 hover:bg-[rgba(212,175,55,0.02)] transition-colors">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-gold">{b.title}</h4>
                    <span className="text-[10px] text-[rgba(212,175,55,0.4)] font-mono">
                      {new Date(b.sentAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-[rgba(212,175,55,0.7)] leading-relaxed">{b.message}</p>
                  <div className="flex items-center gap-3 pt-1 text-[10px]">
                    <span className="px-2 py-0.5 rounded-full bg-[rgba(212,175,55,0.1)] text-gold border border-[rgba(212,175,55,0.2)] font-bold">
                      Segment: {b.targetSegment}
                    </span>
                    <span className="text-[rgba(212,175,55,0.4)] flex items-center gap-1 font-bold">
                      <Users className="w-3 h-3 text-gold" /> Delivered to {b.recipientCount} accounts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
