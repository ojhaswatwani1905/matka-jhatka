import { useState } from 'react';
import { Plus, Trash2, Power, Gamepad2, Edit3, BarChart3, Check } from 'lucide-react';
import { useSlots, type SlotGame } from '../../store/SlotContext';
import { useToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';
import { formatCurrency } from '../../lib/utils';

export default function AdminSlotsPage() {
  const { slots, createSlot, updateSlot, deleteSlot, toggleSlotStatus } = useSlots();
  const { addToast } = useToast();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<SlotGame | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [emoji, setEmoji] = useState('🎰');
  const [reels, setReels] = useState<3 | 5>(3);
  const [symbolsStr, setSymbolsStr] = useState('👑, 💎, 7️⃣, 🔔, 🍇, 🍒');
  const [jackpot777, setJackpot777] = useState(100);
  const [threeOfAKind, setThreeOfAKind] = useState(15);
  const [twoOfAKind, setTwoOfAKind] = useState(2);
  const [targetRtp, setTargetRtp] = useState(95);

  // P&L Analytics Metrics
  const totalWageredAll = slots.reduce((acc, s) => acc + s.totalWagered, 0);
  const totalPaidOutAll = slots.reduce((acc, s) => acc + s.totalPaidOut, 0);
  const netHouseProfitAll = totalWageredAll - totalPaidOutAll;
  const overallMarginPct = totalWageredAll > 0 ? ((netHouseProfitAll / totalWageredAll) * 100).toFixed(1) : '0';

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
      minBet: 10,
      maxBet: 2000,
      targetRtp,
      enabled: true,
    });

    addToast({ type: 'success', title: '🎰 Slot Variant Published!', message: `Published "${name}" successfully.` });
    setShowCreateModal(false);
    resetForm();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    updateSlot(editingSlot.id, {
      name,
      subtitle,
      targetRtp,
      paytable: {
        jackpot777,
        threeOfAKind,
        twoOfAKind,
      },
    });

    addToast({ type: 'success', title: 'Slot Variant Saved', message: `Updated settings for "${name}".` });
    setEditingSlot(null);
  };

  const startEditing = (slot: SlotGame) => {
    setEditingSlot(slot);
    setName(slot.name);
    setSubtitle(slot.subtitle);
    setTargetRtp(slot.targetRtp);
    setJackpot777(slot.paytable.jackpot777);
    setThreeOfAKind(slot.paytable.threeOfAKind);
    setTwoOfAKind(slot.paytable.twoOfAKind);
  };

  const resetForm = () => {
    setName('');
    setSubtitle('');
    setEmoji('🎰');
    setReels(3);
    setSymbolsStr('👑, 💎, 7️⃣, 🔔, 🍇, 🍒');
    setJackpot777(100);
    setThreeOfAKind(15);
    setTwoOfAKind(2);
    setTargetRtp(95);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(212,175,55,0.15)] pb-5">
        <div>
          <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2.5">
            <Gamepad2 className="w-6 h-6 text-gold" />
            Admin Slot Management & P&L Center
          </h1>
          <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">
            Manage active slot variants, configure paytables & RTP %, view revenue analytics, and publish new games.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#8B6914] text-[#061510] text-xs font-black flex items-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:brightness-110 transition-all shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Create New Slot Variant
        </button>
      </div>

      {/* Revenue P&L Analytics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="royal-panel p-4 rounded-2xl border border-[rgba(212,175,55,0.15)] space-y-1">
          <span className="text-[10px] text-[rgba(212,175,55,0.5)] uppercase font-bold">Total Slot Wagering</span>
          <p className="text-xl font-black font-mono text-gold">{formatCurrency(totalWageredAll)}</p>
        </div>

        <div className="royal-panel p-4 rounded-2xl border border-[rgba(212,175,55,0.15)] space-y-1">
          <span className="text-[10px] text-[rgba(212,175,55,0.5)] uppercase font-bold">Total Slot Payouts</span>
          <p className="text-xl font-black font-mono text-emerald-400">{formatCurrency(totalPaidOutAll)}</p>
        </div>

        <div className="royal-panel p-4 rounded-2xl border border-[rgba(212,175,55,0.15)] space-y-1">
          <span className="text-[10px] text-[rgba(212,175,55,0.5)] uppercase font-bold">Net House Profit</span>
          <p className="text-xl font-black font-mono text-gold">{formatCurrency(netHouseProfitAll)}</p>
        </div>

        <div className="royal-panel p-4 rounded-2xl border border-[rgba(212,175,55,0.15)] space-y-1">
          <span className="text-[10px] text-[rgba(212,175,55,0.5)] uppercase font-bold">House Net Margin</span>
          <p className="text-xl font-black font-mono text-emerald-400">+{overallMarginPct}%</p>
        </div>
      </div>

      {/* Main Admin Slot Management Table */}
      <div className="royal-panel rounded-2xl overflow-hidden border border-[rgba(212,175,55,0.2)]">
        <div className="p-4 border-b border-[rgba(212,175,55,0.15)] flex items-center justify-between">
          <h3 className="text-sm font-black text-[#E8C97A] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gold" />
            Active & Custom Slot Variants ({slots.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[rgba(212,175,55,0.15)] bg-[rgba(212,175,55,0.04)] text-[rgba(212,175,55,0.6)] uppercase text-[10px] font-bold">
                <th className="py-3 px-4">Variant</th>
                <th className="py-3 px-4">Reels</th>
                <th className="py-3 px-4">Max Jackpot</th>
                <th className="py-3 px-4">RTP %</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Total Wagered</th>
                <th className="py-3 px-4">Total Paid Out</th>
                <th className="py-3 px-4">Net P&L</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(212,175,55,0.08)]">
              {slots.map(slot => {
                const netProfit = slot.totalWagered - slot.totalPaidOut;
                return (
                  <tr key={slot.id} className="hover:bg-[rgba(212,175,55,0.03)] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{slot.emoji}</span>
                        <div>
                          <span className="font-bold text-[#E8C97A] block">{slot.name}</span>
                          <span className="text-[10px] text-[rgba(212,175,55,0.4)]">{slot.subtitle}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-gold">{slot.reels} Reels</td>
                    <td className="py-3 px-4 font-mono font-bold text-gold">{slot.paytable.jackpot777}×</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">{slot.targetRtp}%</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        slot.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}>
                        {slot.enabled ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[rgba(212,175,55,0.8)]">{formatCurrency(slot.totalWagered)}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400">{formatCurrency(slot.totalPaidOut)}</td>
                    <td className={`py-3 px-4 font-mono font-bold ${netProfit >= 0 ? 'text-gold' : 'text-rose-400'}`}>
                      {formatCurrency(netProfit)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => startEditing(slot)}
                          className="p-1.5 rounded-lg bg-[rgba(212,175,55,0.1)] text-gold border border-[rgba(212,175,55,0.2)] hover:bg-[rgba(212,175,55,0.2)] transition-all"
                          title="Edit Variant"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => toggleSlotStatus(slot.id)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            slot.enabled
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                          title={slot.enabled ? 'Disable Slot' : 'Enable Slot'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => deleteSlot(slot.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition-all"
                          title="Delete Slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Slot Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Custom Slot Variant">
        <form onSubmit={handleCreate} className="space-y-4 text-xs text-[#F5F1E6]/80">
          <div>
            <label className="block text-[11px] font-bold text-gold mb-1">Slot Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Golden Pharaoh"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-gold focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gold mb-1">Subtitle / Tagline</label>
            <input
              type="text"
              placeholder="e.g. 5-Reel Flagship Egyptian Slot"
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
              placeholder="𓀾, 👁️, 𓆣, 🪙, 🏺, 📜, ✨"
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
              <label className="block text-[10px] text-gold font-bold mb-1">Target RTP %</label>
              <input
                type="number"
                value={targetRtp}
                onChange={e => setTargetRtp(parseInt(e.target.value))}
                className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-2 py-1.5 text-gold font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#8B6914] text-[#061510] font-black text-sm uppercase tracking-wider shadow-lg mt-2"
          >
            Create & Publish Variant
          </button>
        </form>
      </Modal>

      {/* Edit Slot Modal */}
      <Modal isOpen={!!editingSlot} onClose={() => setEditingSlot(null)} title={`Edit Slot Variant: ${editingSlot?.name}`}>
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs text-[#F5F1E6]/80">
          <div>
            <label className="block text-[11px] font-bold text-gold mb-1">Slot Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gold mb-1">Target RTP %</label>
            <input
              type="number"
              min="50"
              max="99"
              value={targetRtp}
              onChange={e => setTargetRtp(parseInt(e.target.value))}
              className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-gold font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gold mb-1">Max Jackpot Multiplier</label>
              <input
                type="number"
                value={jackpot777}
                onChange={e => setJackpot777(parseInt(e.target.value))}
                className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-gold font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gold mb-1">3-of-a-Kind Multiplier</label>
              <input
                type="number"
                value={threeOfAKind}
                onChange={e => setThreeOfAKind(parseInt(e.target.value))}
                className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-gold font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#8B6914] text-[#061510] font-black text-sm uppercase tracking-wider shadow-lg mt-2 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            Save Variant Changes
          </button>
        </form>
      </Modal>
    </div>
  );
}
