import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tag, Plus, Users, Gift, Sparkles } from 'lucide-react';
import { usePromo } from '../../store/PromoContext';
import { formatCurrency } from '../../lib/utils';

export default function AdminPromosPage() {
  const { promos, redemptions, createPromoCode, togglePromoStatus } = usePromo();
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [type, setType] = useState<'fixed' | 'percent'>('fixed');
  const [value, setValue] = useState(250);
  const [maxRedemptions, setMaxRedemptions] = useState(100);
  const [expiryDays, setExpiryDays] = useState(7);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    const expiresAt = expiryDays > 0 ? new Date(Date.now() + expiryDays * 86400000).toISOString() : 'never';

    createPromoCode({
      code: code.trim().toUpperCase(),
      type,
      value: Number(value),
      maxRedemptions: Number(maxRedemptions),
      expiresAt,
      status: 'active',
    });

    setCode('');
    setValue(250);
    setMaxRedemptions(100);
    setShowCreate(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2">
            <Tag className="w-6 h-6 text-gold" /> Promo Code Generator
          </h1>
          <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">
            Create promotional bonus codes, set redemption caps & track redemption history
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn-royal-gold px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {showCreate ? 'Close Form' : 'Create New Promo'}
        </button>
      </div>

      {/* Create Promo Modal / Inline Form */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="royal-panel p-5 rounded-2xl border border-[rgba(212,175,55,0.3)] space-y-4"
        >
          <h3 className="text-sm font-black text-gold font-heading flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> New Promotional Offer
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-[rgba(212,175,55,0.6)] uppercase block mb-1">
                Promo Code String
              </label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="e.g. ARENA500"
                className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-xs font-mono text-gold focus:outline-none focus:border-gold uppercase"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[rgba(212,175,55,0.6)] uppercase block mb-1">
                Bonus Type
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as 'fixed' | 'percent')}
                className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-xs text-gold focus:outline-none focus:border-gold"
              >
                <option value="fixed">Fixed Bonus (₹ Amount)</option>
                <option value="percent">Percentage Match (%)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[rgba(212,175,55,0.6)] uppercase block mb-1">
                Reward Value {type === 'fixed' ? '(₹)' : '(%)'}
              </label>
              <input
                type="number"
                value={value}
                onChange={e => setValue(Number(e.target.value))}
                min={1}
                className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-xs font-mono text-gold focus:outline-none focus:border-gold"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[rgba(212,175,55,0.6)] uppercase block mb-1">
                Max Total Redemptions
              </label>
              <input
                type="number"
                value={maxRedemptions}
                onChange={e => setMaxRedemptions(Number(e.target.value))}
                min={1}
                className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-xs font-mono text-gold focus:outline-none focus:border-gold"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[rgba(212,175,55,0.6)] uppercase block mb-1">
                Validity Period
              </label>
              <select
                value={expiryDays}
                onChange={e => setExpiryDays(Number(e.target.value))}
                className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-xs text-gold focus:outline-none focus:border-gold"
              >
                <option value={1}>24 Hours</option>
                <option value={7}>7 Days</option>
                <option value={30}>30 Days</option>
                <option value={0}>Never Expires</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="btn-royal-gold w-full py-2.5 rounded-xl font-black text-xs uppercase cursor-pointer"
              >
                Publish Promo Code
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Promos Table */}
      <div className="royal-panel rounded-2xl overflow-hidden border border-[rgba(212,175,55,0.15)]">
        <div className="p-4 border-b border-[rgba(212,175,55,0.1)] flex items-center justify-between">
          <h2 className="text-sm font-black text-[#E8C97A] font-heading flex items-center gap-2">
            <Gift className="w-4 h-4 text-gold" /> Active Promo Campaigns ({promos.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[rgba(212,175,55,0.06)] border-b border-[rgba(212,175,55,0.12)] text-[10px] font-black text-[rgba(212,175,55,0.6)] uppercase">
                <th className="p-3">Code</th>
                <th className="p-3">Reward</th>
                <th className="p-3">Redemptions</th>
                <th className="p-3">Expires</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(212,175,55,0.06)] text-xs">
              {promos.map(p => {
                const isExpired = p.expiresAt !== 'never' && new Date(p.expiresAt).getTime() < Date.now();
                return (
                  <tr key={p.id} className="hover:bg-[rgba(212,175,55,0.03)] transition-colors">
                    <td className="p-3 font-mono font-black text-gold">{p.code}</td>
                    <td className="p-3 font-bold text-[#F5F1E6]">
                      {p.type === 'fixed' ? `₹${formatCurrency(p.value)}` : `${p.value}% Match`}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-[#F5F1E6]">{p.currentRedemptions}</span>
                      <span className="text-[rgba(212,175,55,0.4)]"> / {p.maxRedemptions}</span>
                    </td>
                    <td className="p-3 text-[rgba(212,175,55,0.6)]">
                      {p.expiresAt === 'never' ? 'Never' : new Date(p.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      {isExpired ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Expired
                        </span>
                      ) : p.status === 'active' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => togglePromoStatus(p.id)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-[rgba(212,175,55,0.2)] text-[rgba(212,175,55,0.7)] hover:text-gold hover:border-gold transition-all cursor-pointer"
                      >
                        {p.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Redemption Log */}
      <div className="royal-panel rounded-2xl p-4 border border-[rgba(212,175,55,0.15)] space-y-3">
        <h3 className="text-xs font-black text-[#E8C97A] font-heading uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-gold" /> Player Redemption Audit Log ({redemptions.length})
        </h3>
        {redemptions.length === 0 ? (
          <p className="text-xs text-[rgba(212,175,55,0.4)] py-4 text-center">No redemptions logged yet.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {redemptions.map(r => (
              <div key={r.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#061510] border border-[rgba(212,175,55,0.1)] text-xs">
                <div>
                  <span className="font-bold text-[#F5F1E6]">{r.userName}</span>
                  <span className="text-[rgba(212,175,55,0.4)] ml-2">redeemed <strong className="text-gold font-mono">{r.code}</strong></span>
                </div>
                <div className="text-right">
                  <span className="font-black text-emerald-400">+₹{formatCurrency(r.amountCredited)}</span>
                  <span className="block text-[9px] text-[rgba(212,175,55,0.35)]">{new Date(r.redeemedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
