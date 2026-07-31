import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, MessageCircle, Mail, ChevronDown, Send, ShieldCheck } from 'lucide-react';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';

const faqs = [
  { q: 'How does the Provably Fair SHA-256 hash verification work?', a: 'Before every round starts, the server generates a secret 32-byte seed and publishes its SHA-256 hash commitment. After the round ends, the server seed is revealed. Anyone can enter the revealed seed into our Verification Tool to re-calculate the HMAC-SHA256 outcome and verify that the result was unmanipulated.' },
  { q: 'What are the payout rates for Matka Jhatka?', a: 'Matka Jhatka features industry-standard payout multipliers: Single number bets pay 9.0x, Jodi 2-digit bets pay 90.0x, and Patti 3-digit combination bets pay 900.0x your stake.' },
  { q: 'What are the rules and color odds for Color Prediction (WinGo)?', a: 'Green and Red pay 2.0x standard payout (or 1.5x split if number 0 or 5 is drawn). Violet pays 4.5x payout. Single numbers 0–9 pay 9.0x payout. Big (5–9) and Small (0–4) pay 2.0x payout.' },
  { q: 'How do I deposit or withdraw funds from my balance?', a: 'Navigate to the Wallet tab in the navigation bar. Select "Deposit" or "Withdraw", enter your desired amount and preferred payment method, and confirm your transaction.' },
  { q: 'Is my personal data and account balance secure?', a: 'Yes. PlayArena uses SSL 256-bit encryption, strict session token security, and compliant data protection standards across all services.' },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const { addToast } = useToast();

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return;
    addToast({ type: 'success', title: 'Support Ticket Submitted', message: 'Thank you! Our support team will reply within 24 hours.' });
    setSubject('');
    setMessage('');
  };

  return (
    <div className="space-y-6 pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black text-white font-heading flex items-center gap-2.5">
          <HelpCircle className="w-6 h-6 text-gold" /> Support & Help Center
        </h1>
        <p className="text-xs text-slate-400 mt-1">24/7 Assistance, Provably Fair documentation, & FAQs</p>
      </motion.div>

      {/* Quick Contact Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="app-card p-4 rounded-2xl border border-white/5 flex items-center gap-4 hover:border-gold/30 transition-all">
          <div className="p-3 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-heading">24/7 Live Agent Chat</h3>
            <p className="text-xs text-slate-400">Instant response time • Support in 8 languages</p>
          </div>
        </div>

        <div className="app-card p-4 rounded-2xl border border-white/5 flex items-center gap-4 hover:border-gold/30 transition-all">
          <div className="p-3 rounded-xl bg-gold/10 text-gold border border-gold/20">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-heading">Email Support Desk</h3>
            <p className="text-xs text-slate-400">support@playarena.com • 24hr SLA</p>
          </div>
        </div>
      </div>

      {/* Smooth Height-Animated FAQ Accordion */}
      <div className="app-card p-5 rounded-2xl border border-white/10 space-y-3">
        <h2 className="text-base font-bold text-white font-heading mb-3 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" /> Frequently Asked Questions
        </h2>
        <div className="space-y-2.5">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl bg-slate-900/80 border border-white/5 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-4 cursor-pointer text-left hover:bg-slate-800/50 transition-colors"
              >
                <span className="text-xs font-bold text-white font-heading pr-4">{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-gold flex-shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-1 text-xs text-slate-300 leading-relaxed border-t border-white/5">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Form */}
      <form onSubmit={handleSendMessage} className="app-card p-5 rounded-2xl border border-white/10 space-y-4">
        <h2 className="text-base font-bold text-white font-heading">Submit Support Inquiry</h2>
        <Input
          label="Subject"
          placeholder="e.g. Question regarding Provably Fair verification"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Inquiry Details</label>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Please describe your question or issue in detail..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold resize-none"
          />
        </div>
        <button
          type="submit"
          className="w-full py-3 rounded-xl font-bold text-black btn-gold-shimmer flex items-center justify-center gap-2 cursor-pointer text-xs"
        >
          <Send className="w-4 h-4" /> Send Ticket Message
        </button>
      </form>
    </div>
  );
}

