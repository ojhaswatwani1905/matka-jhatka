import { useState } from 'react';
import { Plus, Trash2, Power, Gamepad2 } from 'lucide-react';
import { useSlots } from '../../store/SlotContext';
import { useToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';

export default function AdminSlotsPage() {
  const { slots, createSlot, deleteSlot, toggleSlotStatus } = useSlots();
  const { addToast } = useToast();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [emoji, setEmoji] = useState('🎰');
  const [reels, setReels] = useState<3 | 5>(3);
  const [symbolsStr, setSymbolsStr] = useState('👑, 💎, 7️⃣, 🔔, 🍇, 🍒');
  const [jackpot777, setJackpot777] = useState(100);
  const [threeOfAKind, setThreeOfAKind] = useState(15);
  const [twoOfAKind, setTwoOfAKind] = useState(2);
  const [minBet] = useState(10);
  const [maxBet] = useState(1000);
  const [targetRtp] = useState(95);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedSymbols = symbolsStr.split(',').map(s => s.trim()).filter(Boolean);
    if (parsedSymbols.length < 3) {
      addToast({ type: 'error', title: 'Invalid Symbols', message: 'Enter at least 3 emoji symbols separated by commas.' });
      return;
    }

    createSlot({
      name: name.trim(),
      subtitle: subtitle.trim() || 'Custom Casino Slot Machine',
      emoji: emoji.trim() || '🎰',
      reels,
      symbols: parsedSymbols,
      paytable: {
        jackpot777,
        threeOfAKind,
        twoOfAKind,
      },
      minBet,
      maxBet,
      targetRtp,
      enabled: true,
    });

    addToast({ type: 'success', title: '🎰 Slot Game Created!', message: `Created "${name}" successfully.` });
    setShowCreateModal(false);
    setName('');
    setSubtitle('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(212,175,55,0.15)] pb-5">
        <div>
          <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2.5">
            <Gamepad2 className="w-6 h-6 text-gold" />
            Dynamic Slot Machine Creator
          </h1>
          <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">
            Create, configure, and publish custom 3-reel and 5-reel casino slot machines in real time.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#8B6914] text-[#061510] text-xs font-black flex items-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:brightness-110 transition-all shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Create New Slot
        </button>
      </div>

      {/* Slots List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {slots.map(slot => (
          <div key={slot.id} className="royal-panel rounded-2xl p-5 space-y-4 relative border border-[rgba(212,175,55,0.2)]">
            <div className="flex items-start justify-between gap-3 border-b border-[rgba(212,175,55,0.1)] pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{slot.emoji}</span>
                <div>
                  <h3 className="text-sm font-black text-[#E8C97A]">{slot.name}</h3>
                  <p className="text-[10px] text-[rgba(212,175,55,0.5)]">{slot.subtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleSlotStatus(slot.id)}
                  className={`p-1.5 rounded-lg border transition-all ${
                    slot.enabled
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                  title={slot.enabled ? 'Disable Slot' : 'Enable Slot'}
                >
                  <Power className="w-4 h-4" />
                </button>

                <button
                  onClick={() => deleteSlot(slot.id)}
                  className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition-all"
                  title="Delete Slot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Symbols & Specs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#040E0A] p-2.5 rounded-xl border border-[rgba(212,175,55,0.1)]">
                <span className="text-[10px] text-[rgba(212,175,55,0.4)] block">Layout & Reels</span>
                <span className="font-bold text-gold font-mono">{slot.reels} Reels Slot</span>
              </div>
              <div className="bg-[#040E0A] p-2.5 rounded-xl border border-[rgba(212,175,55,0.1)]">
                <span className="text-[10px] text-[rgba(212,175,55,0.4)] block">Target RTP</span>
                <span className="font-bold text-emerald-400 font-mono">{slot.targetRtp}% RTP</span>
              </div>
            </div>

            {/* Symbols Array Preview */}
            <div className="space-y-1">
              <span className="text-[10px] text-[rgba(212,175,55,0.4)] font-bold uppercase">Reel Symbol Set</span>
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {slot.symbols.map((sym, i) => (
                  <span key={i} className="text-xl bg-[#040E0A] px-2 py-1 rounded-lg border border-[rgba(212,175,55,0.1)]">
                    {sym}
                  </span>
                ))}
              </div>
            </div>

            {/* Paytable Summary */}
            <div className="space-y-1 text-[11px] text-[rgba(212,175,55,0.6)] font-mono border-t border-[rgba(212,175,55,0.1)] pt-2">
              <div className="flex justify-between">
                <span>Jackpot 777 Payout:</span>
                <span className="text-gold font-bold">{slot.paytable.jackpot777}×</span>
              </div>
              <div className="flex justify-between">
                <span>3-of-a-Kind Payout:</span>
                <span className="text-gold font-bold">{slot.paytable.threeOfAKind}×</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Slot Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Custom Slot Game">
        <form onSubmit={handleCreate} className="space-y-4 text-xs text-[#F5F1E6]/80">
          <div>
            <label className="block text-[11px] font-bold text-gold mb-1">Slot Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Maharaja Riches"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-gold focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gold mb-1">Subtitle / Tagline</label>
            <input
              type="text"
              placeholder="e.g. Royal Treasures & Golden Spins"
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-gold focus:outline-none focus:border-gold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gold mb-1">Main Icon Emoji</label>
              <input
                type="text"
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
                className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-gold font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gold mb-1">Reel Layout</label>
              <select
                value={reels}
                onChange={e => setReels(parseInt(e.target.value) as 3 | 5)}
                className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-gold focus:outline-none"
              >
                <option value={3}>3 Reels Classic</option>
                <option value={5}>5 Reels Video Slot</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gold mb-1">Symbol Emojis (comma-separated)</label>
            <input
              type="text"
              required
              value={symbolsStr}
              onChange={e => setSymbolsStr(e.target.value)}
              placeholder="👑, 💎, 7️⃣, 🔔, 🍇, 🍒"
              className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-gold font-mono focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-gold font-bold mb-1">Jackpot 777 Mult</label>
              <input
                type="number"
                value={jackpot777}
                onChange={e => setJackpot777(parseInt(e.target.value))}
                className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-2 py-1.5 text-gold font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gold font-bold mb-1">3-Match Mult</label>
              <input
                type="number"
                value={threeOfAKind}
                onChange={e => setThreeOfAKind(parseInt(e.target.value))}
                className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-2 py-1.5 text-gold font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gold font-bold mb-1">Pair Match Mult</label>
              <input
                type="number"
                value={twoOfAKind}
                onChange={e => setTwoOfAKind(parseFloat(e.target.value))}
                className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-2 py-1.5 text-gold font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#8B6914] text-[#061510] font-black text-sm uppercase tracking-wider shadow-lg mt-2"
          >
            Create & Publish Slot
          </button>
        </form>
      </Modal>
    </div>
  );
}
