import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LayoutTemplate, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Edit3, Crown } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';

export interface SlideData {
  id: string;
  eyebrow: string;
  headline: string;
  ribbonText: string;
  ctaText: string;
  ctaLink: string;
  bgGradient: string;
  bgImage?: string;
  isActive: boolean;
  order: number;
}

const DEFAULT_SLIDES: SlideData[] = [
  {
    id: '1',
    eyebrow: '🏆 NEW PLAYER EXCLUSIVE',
    headline: '100% WELCOME\nBONUS',
    ribbonText: 'UP TO ₹5,777 EXTRA CASH',
    ctaText: 'Claim Bonus Now',
    ctaLink: '/auth/register',
    bgGradient: 'linear-gradient(135deg, #061A10 0%, #0B2318 40%, #1A4A2C 100%)',
    bgImage: '',
    isActive: true,
    order: 0,
  },
  {
    id: '2',
    eyebrow: '⚡ DAILY CASHBACK',
    headline: 'UP TO 4%\nCASHBACK',
    ribbonText: 'NEXT DAY AUTO-PAYOUT',
    ctaText: 'Deposit Now',
    ctaLink: '/wallet',
    bgGradient: 'linear-gradient(135deg, #061A10 0%, #0A2A15 40%, #153D24 100%)',
    bgImage: '',
    isActive: true,
    order: 1,
  },
  {
    id: '3',
    eyebrow: '🎲 MATKA JHATKA ARENA',
    headline: '900X\nODDS',
    ribbonText: 'KALYAN & MUMBAI MARKETS',
    ctaText: 'Play Matka Jhatka',
    ctaLink: '/games/matka',
    bgGradient: 'linear-gradient(135deg, #0A1A08 0%, #122808 40%, #1C3B10 100%)',
    bgImage: '',
    isActive: true,
    order: 2,
  },
];

export default function AdminContentPage() {
  const { addToast } = useToast();
  const [slides, setSlides] = useState<SlideData[]>(() => {
    try {
      const saved = localStorage.getItem('playarena_promo_slides');
      return saved ? JSON.parse(saved) : DEFAULT_SLIDES;
    } catch {
      return DEFAULT_SLIDES;
    }
  });

  const [editingSlide, setEditingSlide] = useState<SlideData | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Form state
  const [form, setForm] = useState<Partial<SlideData>>({});

  useEffect(() => {
    localStorage.setItem('playarena_promo_slides', JSON.stringify(slides));
    // Try syncing to server endpoint
    const token = localStorage.getItem('token') || localStorage.getItem('playarena_token') || 'admin-token-abc';
    fetch('/api/admin/promo-slides-reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ slides }),
    }).catch(() => {});
  }, [slides]);

  const openCreateModal = () => {
    setIsNew(true);
    setForm({
      id: `slide_${Date.now()}`,
      eyebrow: '🎁 EXCLUSIVE PROMOTION',
      headline: 'SPECIAL\nBONUS OFFER',
      ribbonText: 'PLAY & WIN BIG REWARDS',
      ctaText: 'Explore Offer',
      ctaLink: '/games',
      bgGradient: 'linear-gradient(135deg, #061A10 0%, #0B2318 40%, #1A4A2C 100%)',
      bgImage: '',
      isActive: true,
      order: slides.length,
    });
    setEditingSlide({} as SlideData);
  };

  const openEditModal = (slide: SlideData) => {
    setIsNew(false);
    setForm(slide);
    setEditingSlide(slide);
  };

  const handleSave = () => {
    if (!form.headline || !form.ctaText) {
      addToast({ type: 'error', title: 'Missing required fields', message: 'Headline and CTA label are required.' });
      return;
    }

    if (isNew) {
      const newSlide: SlideData = {
        id: `slide_${Date.now()}`,
        eyebrow: form.eyebrow || '🎁 SPECIAL OFFER',
        headline: form.headline || 'PROMO OFFER',
        ribbonText: form.ribbonText || 'CLAIM REWARDS',
        ctaText: form.ctaText || 'Claim Now',
        ctaLink: form.ctaLink || '/wallet',
        bgGradient: form.bgGradient || 'linear-gradient(135deg, #061A10 0%, #0B2318 40%, #1A4A2C 100%)',
        bgImage: form.bgImage || '',
        isActive: form.isActive ?? true,
        order: slides.length,
      };
      setSlides(prev => [...prev, newSlide]);
      addToast({ type: 'success', title: 'Slide Created', message: 'New homepage promo banner slide created.' });
    } else if (editingSlide?.id) {
      setSlides(prev =>
        prev.map(s => (s.id === editingSlide.id ? ({ ...s, ...form } as SlideData) : s))
      );
      addToast({ type: 'success', title: 'Slide Updated', message: 'Promo banner slide updated.' });
    }

    setEditingSlide(null);
  };

  const toggleActive = (id: string) => {
    setSlides(prev =>
      prev.map(s => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
    addToast({ type: 'info', title: 'Status Updated', message: 'Slide active status toggled.' });
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;
    const next = [...slides];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    next.forEach((s, idx) => { s.order = idx; });
    setSlides(next);
  };

  const deleteSlide = (id: string) => {
    setSlides(prev => prev.filter(s => s.id !== id));
    addToast({ type: 'warning', title: 'Slide Deleted', message: 'Promo slide removed from homepage carousel.' });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2.5">
            <LayoutTemplate className="w-6 h-6" /> Homepage Promo Banner Editor
          </h1>
          <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">
            Manage live hero carousel slides, headlines, CTAs, background images & order sequence
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn-royal-gold px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Create New Slide
        </button>
      </div>

      {/* Slide Cards List */}
      <div className="space-y-4">
        {slides.length === 0 ? (
          <div className="royal-panel rounded-2xl p-8 text-center text-xs text-[rgba(212,175,55,0.4)]">
            No promo banner slides configured. Click "Create New Slide" above.
          </div>
        ) : (
          slides.map((slide, index) => (
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`royal-panel rounded-2xl p-5 border transition-all ${
                slide.isActive ? 'border-[rgba(212,175,55,0.3)]' : 'border-rose-500/20 opacity-60'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Visual Preview Snapshot */}
                <div
                  className="p-4 rounded-xl flex-1 border border-[rgba(212,175,55,0.2)] relative overflow-hidden"
                  style={{ background: slide.bgImage ? `url(${slide.bgImage}) center/cover` : slide.bgGradient }}
                >
                  <div className="space-y-1.5 max-w-md">
                    <span className="text-[9px] font-black text-gold uppercase tracking-wider bg-[rgba(212,175,55,0.15)] px-2 py-0.5 rounded-full border border-[rgba(212,175,55,0.3)]">
                      {slide.eyebrow}
                    </span>
                    <h3 className="text-lg font-black text-gold-3d leading-tight whitespace-pre-line font-heading">
                      {slide.headline}
                    </h3>
                    <p className="text-[10px] text-amber-300 font-bold bg-black/40 px-2 py-0.5 rounded inline-block">
                      {slide.ribbonText}
                    </p>
                  </div>
                </div>

                {/* Controls toolbar */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => moveSlide(index, 'up')}
                    disabled={index === 0}
                    className="p-2 rounded-xl bg-[rgba(212,175,55,0.08)] hover:bg-[rgba(212,175,55,0.18)] disabled:opacity-30 text-gold cursor-pointer transition-colors"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => moveSlide(index, 'down')}
                    disabled={index === slides.length - 1}
                    className="p-2 rounded-xl bg-[rgba(212,175,55,0.08)] hover:bg-[rgba(212,175,55,0.18)] disabled:opacity-30 text-gold cursor-pointer transition-colors"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => toggleActive(slide.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                      slide.isActive
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {slide.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {slide.isActive ? 'Active' : 'Disabled'}
                  </button>

                  <button
                    onClick={() => openEditModal(slide)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold btn-royal-gold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>

                  <button
                    onClick={() => deleteSlide(slide.id)}
                    className="p-2 rounded-xl bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 cursor-pointer transition-colors"
                    title="Delete Slide"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Edit / Create Slide Modal */}
      <Modal isOpen={!!editingSlide} onClose={() => setEditingSlide(null)} title={isNew ? 'Create New Promo Slide' : 'Edit Promo Slide'}>
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[rgba(212,175,55,0.7)] mb-1 font-bold">Eyebrow / Badge Label</label>
            <input
              value={form.eyebrow || ''}
              onChange={e => setForm({ ...form, eyebrow: e.target.value })}
              placeholder="e.g. 🏆 NEW PLAYER EXCLUSIVE"
              className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3.5 py-2 text-sm text-[#F5F1E6] focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-[rgba(212,175,55,0.7)] mb-1 font-bold">Headline (Use \n for line break)</label>
            <textarea
              value={form.headline || ''}
              onChange={e => setForm({ ...form, headline: e.target.value })}
              placeholder="100% WELCOME&#10;BONUS"
              rows={2}
              className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3.5 py-2 text-sm text-[#F5F1E6] focus:outline-none focus:border-gold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[rgba(212,175,55,0.7)] mb-1 font-bold">Ribbon / Subtitle Text</label>
              <input
                value={form.ribbonText || ''}
                onChange={e => setForm({ ...form, ribbonText: e.target.value })}
                placeholder="UP TO ₹5,777 EXTRA CASH"
                className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3.5 py-2 text-sm text-[#F5F1E6] focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block text-[rgba(212,175,55,0.7)] mb-1 font-bold">CTA Button Label</label>
              <input
                value={form.ctaText || ''}
                onChange={e => setForm({ ...form, ctaText: e.target.value })}
                placeholder="Claim Bonus Now"
                className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3.5 py-2 text-sm text-[#F5F1E6] focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[rgba(212,175,55,0.7)] mb-1 font-bold">CTA Route / Link</label>
              <input
                value={form.ctaLink || ''}
                onChange={e => setForm({ ...form, ctaLink: e.target.value })}
                placeholder="/auth/register or /wallet"
                className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3.5 py-2 text-sm text-[#F5F1E6] focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block text-[rgba(212,175,55,0.7)] mb-1 font-bold">Background Image URL (Optional)</label>
              <input
                value={form.bgImage || ''}
                onChange={e => setForm({ ...form, bgImage: e.target.value })}
                placeholder="https://... or hosted image link"
                className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3.5 py-2 text-sm text-[#F5F1E6] focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          {/* Live Preview inside Modal */}
          <div>
            <label className="block text-[rgba(212,175,55,0.7)] mb-1.5 font-bold">Live Slide Preview</label>
            <div
              className="p-4 rounded-2xl border border-[rgba(212,175,55,0.3)] shadow-inner relative overflow-hidden"
              style={{ background: form.bgImage ? `url(${form.bgImage}) center/cover` : form.bgGradient || 'linear-gradient(135deg, #061A10 0%, #0B2318 40%, #1A4A2C 100%)' }}
            >
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.3)] text-gold font-black text-[9px] uppercase">
                  <Crown className="w-3 h-3" /> {form.eyebrow || 'BADGE LABEL'}
                </span>
                <h4 className="text-gold-3d text-xl font-black font-heading leading-tight whitespace-pre-line">
                  {form.headline || 'HEADLINE TEXT'}
                </h4>
                <div className="ribbon-frame text-[10px] px-4 py-1 inline-block">
                  {form.ribbonText || 'SUBTITLE RIBBON'}
                </div>
                <div className="pt-1">
                  <span className="btn-royal-gold px-4 py-1.5 rounded-xl text-xs font-black uppercase inline-block">
                    {form.ctaText || 'BUTTON LABEL'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button onClick={handleSave} className="btn-royal-gold w-full py-3 rounded-xl font-black cursor-pointer">
            {isNew ? 'Create Slide' : 'Save Changes'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
