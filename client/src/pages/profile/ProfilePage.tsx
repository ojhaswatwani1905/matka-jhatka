import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, CreditCard, Shield, Bell, LogOut, ChevronRight, Camera, Mail, Phone, Gift, Check, Wallet, Crown } from 'lucide-react';
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

  const [name, setName] = useState(user?.name || 'Demo Player');
  const [phone, setPhone] = useState(user?.phone || '+91 98765 43210');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [accNumber, setAccNumber] = useState('XXXX XXXX 8492');
  const [ifsc, setIfsc] = useState('HDFC0001234');

  const handleClaimBonus = () => {
    if (claimedToday) return;
    addBalance(500, 'Daily Login Reward - ₹500');
    setClaimedToday(true);
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#D4AF37', '#2ECC71', '#F5D576'] });
  };

  const handleSaveProfile = () => {
    updateUser({ name, phone });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const menuItems = [
    { key: 'personal' as const, icon: <User className="w-5 h-5 text-gold" />, label: 'Personal Information', desc: 'Name, phone number and email' },
    { key: 'bank' as const, icon: <CreditCard className="w-5 h-5 text-[#2ECC71]" />, label: 'Bank & Payment Details', desc: 'Saved withdrawal accounts' },
    { key: 'security' as const, icon: <Shield className="w-5 h-5 text-gold" />, label: 'Security & Password', desc: 'Change password & 2FA protection' },
    { key: 'notifications' as const, icon: <Bell className="w-5 h-5 text-gold" />, label: 'Notifications', desc: 'Alerts & game preferences' },
  ];

  return (
    <div className="space-y-4 pb-6">
      {/* 1. Profile Hero Card */}
      <div className="relative overflow-hidden rounded-3xl p-6 border border-[rgba(212,175,55,0.35)] shadow-2xl space-y-4"
        style={{ background: 'linear-gradient(135deg, #0d2419 0%, #0B2318 100%)' }}
      >
        {/* Top gold accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-[rgba(212,175,55,0.06)] blur-3xl pointer-events-none" />
        <div className="absolute bottom-4 right-4 text-[rgba(212,175,55,0.08)] text-6xl font-black font-heading select-none">♛</div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#F5D576] via-[#D4AF37] to-[#B8860B] flex items-center justify-center text-3xl font-black text-[#0B2318] shadow-[0_0_20px_rgba(212,175,55,0.4)]">
              {user?.name?.charAt(0) || 'D'}
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-[#0d2419] border border-[rgba(212,175,55,0.3)] flex items-center justify-center text-gold cursor-pointer hover:bg-[rgba(212,175,55,0.15)] transition-colors">
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-[#F5F1E6] font-heading truncate">
                {user?.name || 'Demo Player'}
              </h2>
              {/* VIP badge — crown icon + gold pill */}
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase btn-royal-gold shadow">
                <Crown className="w-3 h-3" /> Gold VIP
              </span>
            </div>
            <p className="text-xs text-[rgba(212,175,55,0.55)] mt-0.5 truncate">{user?.email || 'player@tirangagames.com'}</p>
            <p className="text-[10px] font-bold text-[rgba(212,175,55,0.6)] tracking-wider mt-1">
              UID: {user?.id || 'usr_84920194'}
            </p>
          </div>
        </div>

        {/* Balance & VIP Bar */}
        <div className="pt-3 border-t border-[rgba(212,175,55,0.15)] flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-gold" />
            <span className="text-xs text-[rgba(212,175,55,0.6)] font-bold">Balance:</span>
            <AnimatedCounter value={balance} prefix="₹" className="text-base font-black text-gold font-heading" />
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-[rgba(212,175,55,0.6)] uppercase block">VIP Progress</span>
            <div className="w-24 h-2 bg-[#0B2318] rounded-full overflow-hidden mt-1 border border-[rgba(212,175,55,0.15)]">
              <div className="h-full bg-gradient-to-r from-[#2ECC71] to-[#D4AF37] w-[75%] rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Daily Reward */}
      <div className="royal-panel p-4 rounded-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[rgba(212,175,55,0.12)] border border-[rgba(212,175,55,0.3)] flex items-center justify-center flex-shrink-0">
            <Gift className="w-6 h-6 text-gold animate-bounce" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#E8C97A] font-heading">Daily Check-In Reward</h3>
            <p className="text-xs text-[rgba(212,175,55,0.5)]">Claim ₹500 free demo coins every 24 hours</p>
          </div>
        </div>
        <button
          onClick={handleClaimBonus}
          disabled={claimedToday}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex-shrink-0 cursor-pointer ${
            claimedToday
              ? 'bg-[rgba(46,204,113,0.15)] text-[#2ECC71] border border-[rgba(46,204,113,0.3)] opacity-70 cursor-not-allowed'
              : 'btn-royal-gold'
          }`}
        >
          {claimedToday ? 'Claimed ✓' : 'Claim ₹500'}
        </button>
      </div>

      {/* 3. Stats Grid — pa-panel cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: 'Total Wagered', value: `₹${formatCurrency(45200)}`, color: 'text-[#F5D576]' },
          { label: 'Total Won', value: `₹${formatCurrency(52800)}`, color: 'text-[#2ECC71]' },
          { label: 'Win Rate', value: '64%', color: 'text-gold' },
          { label: 'Total Games', value: '84 Rounds', color: 'text-gold' },
        ].map((stat, i) => (
          <div key={i} className="royal-panel rounded-2xl p-3.5">
            <p className="text-[10px] font-bold text-[rgba(212,175,55,0.55)] uppercase tracking-wider">{stat.label}</p>
            <p className={`text-base font-black font-heading mt-1 tabular-nums ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* 4. Settings Menu */}
      <div className="space-y-2">
        {menuItems.map((item) => (
          <div key={item.key} className="space-y-1">
            <button
              onClick={() => setActiveSection(activeSection === item.key ? null : item.key)}
              className="w-full flex items-center justify-between royal-panel rounded-2xl p-4 hover:border-[rgba(212,175,55,0.45)] transition-all text-left cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[rgba(212,175,55,0.08)] flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F5F1E6]">{item.label}</h3>
                  <p className="text-xs text-[rgba(212,175,55,0.5)]">{item.desc}</p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-[rgba(212,175,55,0.5)] transition-transform ${activeSection === item.key ? 'rotate-90 text-gold' : ''}`} />
            </button>

            {activeSection === item.key && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="royal-panel rounded-2xl p-4 space-y-3 mt-1">
                  {item.key === 'personal' && (
                    <>
                      <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} icon={<User size={16} />} />
                      <Input label="Email Address" value={user?.email || 'player@tirangagames.com'} icon={<Mail size={16} />} disabled />
                      <Input label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} icon={<Phone size={16} />} />
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
                      <Button variant="primary" size="md" fullWidth>Update Security Password</Button>
                    </>
                  )}
                  {item.key === 'notifications' && (
                    <div className="space-y-2">
                      {['Game Win Alerts', 'Daily Bonus Reminders', 'Deposit Confirmations', 'Promotions & Offers'].map(pref => (
                        <div key={pref} className="flex items-center justify-between p-3 bg-[rgba(212,175,55,0.05)] border border-[rgba(212,175,55,0.12)] rounded-xl text-xs">
                          <span className="font-bold text-[#F5F1E6]">{pref}</span>
                          <input type="checkbox" defaultChecked className="rounded accent-[#D4AF37] w-4 h-4 cursor-pointer" />
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

      {/* 5. Logout — muted red text link, no button styling */}
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 py-3 text-[#FF4D6D] text-xs font-bold hover:text-[#FF6B87] transition-colors cursor-pointer"
      >
        <LogOut className="w-4 h-4" /> Log Out Account
      </button>
    </div>
  );
}
