import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, MessageCircle, Mail, ChevronDown, Send, ShieldCheck, Crown } from 'lucide-react';
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
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2.5">
          <HelpCircle className="w-6 h-6 text-gold" /> Support & Help Center
        </h1>
        <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">24/7 Assistance, Provably Fair documentation, & FAQs</p>
      </motion.div>

      {/* Quick Contact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="royal-panel p-4 rounded-2xl flex items-center gap-4 hover:border-[rgba(212,175,55,0.5)] transition-all cursor-pointer">
          <div className="p-3 rounded-xl bg-[rgba(212,175,55,0.1)] text-gold border border-[rgba(212,175,55,0.25)]">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#E8C97A] font-heading">24/7 Live Agent Chat</h3>
            <p className="text-xs text-[rgba(212,175,55,0.5)]">Instant response time • Support in 8 languages</p>
          </div>
        </div>

        <div className="royal-panel p-4 rounded-2xl flex items-center gap-4 hover:border-[rgba(212,175,55,0.5)] transition-all cursor-pointer">
          <div className="p-3 rounded-xl bg-[rgba(212,175,55,0.1)] text-gold border border-[rgba(212,175,55,0.25)]">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#E8C97A] font-heading">Email Support Desk</h3>
            <p className="text-xs text-[rgba(212,175,55,0.5)]">support@playarena.com • 24hr SLA</p>
          </div>
        </div>
      </div>

      {/* FAQ Accordion — pa-panel-alt items */}
      <div className="royal-panel p-5 rounded-2xl space-y-3">
        <h2 className="text-base font-bold text-[#E8C97A] font-heading mb-3 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-gold" /> Frequently Asked Questions
        </h2>
        <div className="space-y-2.5">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl bg-[rgba(212,175,55,0.05)] border border-[rgba(212,175,55,0.15)] overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-4 cursor-pointer text-left hover:bg-[rgba(212,175,55,0.08)] transition-colors"
              >
                <span className="text-xs font-bold text-[#F5F1E6] font-heading pr-4">{faq.q}</span>
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
                    <div className="px-4 pb-4 pt-1 text-xs text-[rgba(212,175,55,0.75)] leading-relaxed border-t border-[rgba(212,175,55,0.15)]">
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
      <form onSubmit={handleSendMessage} className="royal-panel p-5 rounded-2xl space-y-4">
        <h2 className="text-base font-bold text-[#E8C97A] font-heading flex items-center gap-2">
          <Crown className="w-4 h-4 text-gold" /> Submit Support Inquiry
        </h2>
        <Input
          label="Subject"
          placeholder="e.g. Question regarding Provably Fair verification"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <div>
          <label className="block text-xs font-bold text-[rgba(212,175,55,0.7)] mb-1.5">Inquiry Details</label>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Please describe your question or issue in detail..."
            className="w-full bg-[#0E2A1E] border border-[rgba(212,175,55,0.25)] rounded-xl px-4 py-3 text-[#F5F1E6] text-xs placeholder:text-[rgba(212,175,55,0.25)] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[rgba(212,175,55,0.3)] resize-none transition-all"
          />
        </div>
        <button
          type="submit"
          className="btn-royal-gold w-full py-3 rounded-xl font-black cursor-pointer text-xs flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" /> Send Ticket Message
        </button>
      </form>
    </div>
  );
}
