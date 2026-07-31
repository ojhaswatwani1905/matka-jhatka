import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, CreditCard, Shield, Bell, LogOut, ChevronRight, Camera, Mail, Phone, Gift, Check, Wallet } from 'lucide-react';
import confetti from 'canvas-confetti';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../store/AuthContext';
import { useWallet } from '../../store/WalletContext';
import AnimatedCounter from '../../components/ui/AnimatedCounter';
import { formatCurrency } from '../../lib/utils';

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const { balance, addBalance } = useWallet();
  const [activeSection, setActiveSection] = useState<'personal' | 'bank' | 'security' | 'notifications' | null>('personal');
  const [claimedToday, setClaimedToday] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form states
  const [name, setName] = useState(user?.name || 'Demo Player');
  const [phone, setPhone] = useState(user?.phone || '+91 98765 43210');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [accNumber, setAccNumber] = useState('XXXX XXXX 8492');
  const [ifsc, setIfsc] = useState('HDFC0001234');

  const handleClaimBonus = () => {
    if (claimedToday) return;
    addBalance(500, 'Daily Login Reward - ₹500');
    setClaimedToday(true);
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#00C853', '#9C27B0'],
    });
  };

  const handleSaveProfile = () => {
    updateUser({ name, phone });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const menuItems = [
    { key: 'personal' as const, icon: <User className="w-5 h-5 text-amber-400" />, label: 'Personal Information', desc: 'Name, phone number and email' },
    { key: 'bank' as const, icon: <CreditCard className="w-5 h-5 text-emerald-400" />, label: 'Bank & Payment Details', desc: 'Saved withdrawal accounts' },
    { key: 'security' as const, icon: <Shield className="w-5 h-5 text-purple-400" />, label: 'Security & Password', desc: 'Change password & 2FA protection' },
    { key: 'notifications' as const, icon: <Bell className="w-5 h-5 text-rose-500" />, label: 'Notifications', desc: 'Alerts & game preferences' },
  ];

  return (
    <div className="space-y-4 pb-6">
      {/* 1. Personalized User Profile Header */}
      <div className="relative overflow-hidden rounded-3xl p-6 bg-[#1C2030] border border-amber-500/30 shadow-2xl space-y-4">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gold via-amber-500 to-amber-600 flex items-center justify-center text-3xl font-black text-black shadow-lg">
              {user?.name?.charAt(0) || 'D'}
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-[#252B3F] border border-white/20 flex items-center justify-center text-white cursor-pointer hover:bg-amber-400 hover:text-black transition-colors">
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white font-heading truncate">
                {user?.name || 'Demo Player'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-black shadow">
                Gold VIP
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{user?.email || 'player@tirangagames.com'}</p>
            <p className="text-[10px] font-bold text-amber-400 tracking-wider mt-1">
              UID: {user?.id || 'usr_84920194'}
            </p>
          </div>
        </div>

        {/* Balance & VIP Level Bar */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400 font-bold">Balance:</span>
            <AnimatedCounter
              value={balance}
              prefix="₹"
              className="text-base font-black text-amber-400 font-heading"
            />
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-purple-400 uppercase block">VIP Progress</span>
            <div className="w-24 h-2 bg-[#252B3F] rounded-full overflow-hidden mt-1 border border-white/5">
              <div className="h-full bg-gradient-to-r from-purple-500 to-amber-400 w-[75%] rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Daily Reward Claim Section */}
      <div className="bg-[#1C2030] border border-amber-500/30 rounded-2xl p-4 shadow-lg flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <Gift className="w-6 h-6 text-amber-400 animate-bounce" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white font-heading">Daily Check-In Reward</h3>
            <p className="text-xs text-slate-400">Claim 500 free demo coins every 24 hours</p>
          </div>
        </div>

        <button
          onClick={handleClaimBonus}
          disabled={claimedToday}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex-shrink-0 cursor-pointer ${
            claimedToday
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'btn-3d-gold'
          }`}
        >
          {claimedToday ? 'Claimed ✓' : 'Claim ₹500'}
        </button>
      </div>

      {/* 3. Personal Gaming Statistics Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: 'Total Wagered', value: formatCurrency(45200), color: 'text-white' },
          { label: 'Total Won', value: formatCurrency(52800), color: 'text-emerald-400' },
          { label: 'Win Rate', value: '64%', color: 'text-amber-400' },
          { label: 'Total Games', value: '84 Rounds', color: 'text-purple-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-[#1C2030] border border-white/10 rounded-2xl p-3.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
            <p className={`text-base font-black font-heading mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* 4. Settings & Profile Menu Items */}
      <div className="space-y-2">
        {menuItems.map((item) => (
          <div key={item.key} className="space-y-1">
            <button
              onClick={() => setActiveSection(activeSection === item.key ? null : item.key)}
              className="w-full flex items-center justify-between bg-[#1C2030] border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all text-left cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#252B3F] flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{item.label}</h3>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${activeSection === item.key ? 'rotate-90 text-amber-400' : ''}`} />
            </button>

            {/* Expandable Form Content */}
            {activeSection === item.key && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-[#1C2030] border border-white/10 rounded-2xl p-4 space-y-3 mt-1">
                  {item.key === 'personal' && (
                    <>
                      <Input
                        label="Full Name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        icon={<User size={16} />}
                      />
                      <Input
                        label="Email Address"
                        value={user?.email || 'player@tirangagames.com'}
                        icon={<Mail size={16} />}
                        disabled
                      />
                      <Input
                        label="Phone Number"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        icon={<Phone size={16} />}
                      />
                      <Button variant="primary" size="md" fullWidth onClick={handleSaveProfile}>
                        {savedSuccess ? <span className="flex items-center gap-1"><Check size={16} /> Updated Successfully</span> : 'Save Information'}
                      </Button>
                    </>
                  )}

                  {item.key === 'bank' && (
                    <>
                      <Input label="Bank Name" value={bankName} onChange={e => setBankName(e.target.value)} />
                      <Input label="Account Number" value={accNumber} onChange={e => setAccNumber(e.target.value)} />
                      <Input label="IFSC Code" value={ifsc} onChange={e => setIfsc(e.target.value)} />
                      <Button variant="primary" size="md" fullWidth onClick={() => { setSavedSuccess(true); setTimeout(() => setSavedSuccess(false), 2500); }}>
                        {savedSuccess ? 'Bank Details Saved ✓' : 'Save Withdrawal Details'}
                      </Button>
                    </>
                  )}

                  {item.key === 'security' && (
                    <>
                      <Input label="Current Password" type="password" placeholder="••••••••" />
                      <Input label="New Password" type="password" placeholder="••••••••" />
                      <Button variant="primary" size="md" fullWidth>
                        Update Security Password
                      </Button>
                    </>
                  )}

                  {item.key === 'notifications' && (
                    <div className="space-y-2">
                      {['Game Win Alerts', 'Daily Bonus Reminders', 'Deposit Confirmations', 'Promotions & Offers'].map(pref => (
                        <div key={pref} className="flex items-center justify-between p-3 bg-[#252B3F] rounded-xl text-xs">
                          <span className="font-bold text-white">{pref}</span>
                          <input type="checkbox" defaultChecked className="rounded accent-amber-400 w-4 h-4" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {/* 5. Logout Action Button */}
      <Button variant="danger" size="lg" fullWidth onClick={logout}>
        <LogOut className="w-4 h-4 mr-2" /> Log Out Account
      </Button>
    </div>
  );
}
