import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Plus, Trash2, Star, Building, QrCode } from 'lucide-react';
import { useWithdrawalAccounts } from '../../store/WithdrawalAccountsContext';

export function SavedAccountsManager() {
  const { accounts, addAccount, deleteAccount, setDefault } = useWithdrawalAccounts();
  const [showAdd, setShowAdd] = useState(false);

  const [accType, setAccType] = useState<'bank' | 'upi'>('upi');
  const [label, setLabel] = useState('');
  const [accountHolder] = useState('Demo Player');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    addAccount({
      type: accType,
      label: label.trim(),
      accountHolder: accountHolder.trim() || 'Demo Player',
      bankName: accType === 'bank' ? bankName.trim() : undefined,
      accountNumber: accType === 'bank' ? `••••${accountNumber.slice(-4)}` : undefined,
      ifscCode: accType === 'bank' ? ifscCode.trim().toUpperCase() : undefined,
      upiId: accType === 'upi' ? upiId.trim() : undefined,
      isDefault: accounts.length === 0,
    });

    setLabel('');
    setBankName('');
    setAccountNumber('');
    setIfscCode('');
    setUpiId('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-black text-gold uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-gold" /> Saved Withdrawal Accounts ({accounts.length})
          </h4>
          <p className="text-[10px] text-[rgba(212,175,55,0.45)] mt-0.5">
            Select a default destination for fast automated withdrawal payouts
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-3 py-1.5 rounded-xl bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.3)] text-gold font-bold text-[10px] hover:bg-[rgba(212,175,55,0.25)] transition-all cursor-pointer flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Add Account
        </button>
      </div>

      {/* List of saved accounts */}
      <div className="space-y-2">
        {accounts.map(acc => (
          <div
            key={acc.id}
            className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              acc.isDefault
                ? 'bg-[rgba(212,175,55,0.12)] border-[rgba(212,175,55,0.4)] shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                : 'bg-[#061510] border-[rgba(212,175,55,0.12)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.2)] flex items-center justify-center text-gold">
                {acc.type === 'bank' ? <Building className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#F5F1E6]">{acc.label}</span>
                  {acc.isDefault && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[8px] font-black uppercase">
                      DEFAULT
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[rgba(212,175,55,0.5)] mt-0.5 font-mono">
                  {acc.type === 'bank' ? `${acc.bankName} (${acc.accountNumber}) • IFSC: ${acc.ifscCode}` : `UPI ID: ${acc.upiId}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {!acc.isDefault && (
                <button
                  onClick={() => setDefault(acc.id)}
                  title="Make Default"
                  className="p-1.5 rounded-lg border border-[rgba(212,175,55,0.2)] text-[rgba(212,175,55,0.6)] hover:text-gold hover:border-gold transition-all cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5" />
                </button>
              )}
              {accounts.length > 1 && (
                <button
                  onClick={() => deleteAccount(acc.id)}
                  title="Remove Account"
                  className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Account Modal / Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd}
            className="p-4 rounded-2xl bg-[#061510] border border-[rgba(212,175,55,0.25)] space-y-3 overflow-hidden"
          >
            <h5 className="font-bold text-gold text-xs">Add New Withdrawal Account</h5>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccType('upi')}
                className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  accType === 'upi'
                    ? 'bg-[rgba(212,175,55,0.18)] border-gold text-gold'
                    : 'bg-[#0d2419] border-[rgba(212,175,55,0.1)] text-[rgba(212,175,55,0.5)]'
                }`}
              >
                UPI ID (GPay / PhonePe / Paytm)
              </button>
              <button
                type="button"
                onClick={() => setAccType('bank')}
                className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  accType === 'bank'
                    ? 'bg-[rgba(212,175,55,0.18)] border-gold text-gold'
                    : 'bg-[#0d2419] border-[rgba(212,175,55,0.1)] text-[rgba(212,175,55,0.5)]'
                }`}
              >
                Bank Account
              </button>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[rgba(212,175,55,0.6)] uppercase block mb-1">
                Account Label
              </label>
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. My Primary GPay / HDFC Bank"
                className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-xs text-[#F5F1E6] focus:outline-none focus:border-gold"
                required
              />
            </div>

            {accType === 'upi' ? (
              <div>
                <label className="text-[10px] font-bold text-[rgba(212,175,55,0.6)] uppercase block mb-1">
                  UPI VPA ID
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                  placeholder="e.g. 9876543210@paytm"
                  className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-xs font-mono text-gold focus:outline-none focus:border-gold"
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-bold text-[rgba(212,175,55,0.6)] uppercase block mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    placeholder="e.g. State Bank of India"
                    className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-xs text-[#F5F1E6] focus:outline-none focus:border-gold"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-[rgba(212,175,55,0.6)] uppercase block mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={e => setAccountNumber(e.target.value)}
                      placeholder="Account number"
                      className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-xs font-mono text-gold focus:outline-none focus:border-gold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[rgba(212,175,55,0.6)] uppercase block mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={ifscCode}
                      onChange={e => setIfscCode(e.target.value)}
                      placeholder="SBIN0001234"
                      className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-xs font-mono uppercase text-gold focus:outline-none focus:border-gold"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex-1 py-2 rounded-xl border border-[rgba(212,175,55,0.2)] text-[rgba(212,175,55,0.6)] font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 btn-royal-gold py-2 rounded-xl font-black text-xs cursor-pointer"
              >
                Save Account
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
