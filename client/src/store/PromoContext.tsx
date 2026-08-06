import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface PromoCode {
  id: string;
  code: string;
  type: 'fixed' | 'percent';
  value: number; // e.g. 500 or 50 (%)
  maxRedemptions: number;
  currentRedemptions: number;
  expiresAt: string; // ISO string or 'never'
  status: 'active' | 'expired' | 'disabled';
  createdAt: string;
}

export interface RedemptionRecord {
  id: string;
  promoId: string;
  code: string;
  userId: string;
  userName: string;
  amountCredited: number;
  redeemedAt: string;
}

const DEFAULT_PROMOS: PromoCode[] = [
  {
    id: 'promo_welcome500',
    code: 'WELCOME500',
    type: 'fixed',
    value: 500,
    maxRedemptions: 100,
    currentRedemptions: 12,
    expiresAt: 'never',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'promo_vipbonus50',
    code: 'VIP50',
    type: 'percent',
    value: 50,
    maxRedemptions: 50,
    currentRedemptions: 5,
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    status: 'active',
    createdAt: new Date().toISOString(),
  },
];

interface PromoContextType {
  promos: PromoCode[];
  redemptions: RedemptionRecord[];
  createPromoCode: (data: Omit<PromoCode, 'id' | 'currentRedemptions' | 'createdAt'>) => PromoCode;
  togglePromoStatus: (id: string) => void;
  redeemCode: (code: string, userId: string, userName: string) => { success: boolean; message: string; amount?: number };
}

const PromoContext = createContext<PromoContextType | undefined>(undefined);

export function PromoProvider({ children }: { children: ReactNode }) {
  const [promos, setPromos] = useState<PromoCode[]>(() => {
    try {
      const saved = localStorage.getItem('playarena_promos');
      return saved ? JSON.parse(saved) : DEFAULT_PROMOS;
    } catch {
      return DEFAULT_PROMOS;
    }
  });

  const [redemptions, setRedemptions] = useState<RedemptionRecord[]>(() => {
    try {
      const saved = localStorage.getItem('playarena_promo_redemptions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('playarena_promos', JSON.stringify(promos));
  }, [promos]);

  useEffect(() => {
    localStorage.setItem('playarena_promo_redemptions', JSON.stringify(redemptions));
  }, [redemptions]);

  const createPromoCode = useCallback((data: Omit<PromoCode, 'id' | 'currentRedemptions' | 'createdAt'>) => {
    const newPromo: PromoCode = {
      ...data,
      id: `promo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      code: data.code.toUpperCase().trim(),
      currentRedemptions: 0,
      createdAt: new Date().toISOString(),
    };
    setPromos(prev => [newPromo, ...prev]);
    return newPromo;
  }, []);

  const togglePromoStatus = useCallback((id: string) => {
    setPromos(prev =>
      prev.map(p => {
        if (p.id !== id) return p;
        const nextStatus = p.status === 'active' ? 'disabled' : 'active';
        return { ...p, status: nextStatus };
      })
    );
  }, []);

  const redeemCode = useCallback((codeRaw: string, userId: string, userName: string) => {
    const code = codeRaw.toUpperCase().trim();
    const promo = promos.find(p => p.code === code);

    if (!promo) {
      return { success: false, message: 'Invalid promo code.' };
    }

    if (promo.status !== 'active') {
      return { success: false, message: 'This promo code is no longer active.' };
    }

    if (promo.expiresAt !== 'never' && new Date(promo.expiresAt).getTime() < Date.now()) {
      return { success: false, message: 'This promo code has expired.' };
    }

    if (promo.currentRedemptions >= promo.maxRedemptions) {
      return { success: false, message: 'This promo code has reached its maximum redemption limit.' };
    }

    // Check if user already redeemed
    const alreadyRedeemed = redemptions.some(r => r.promoId === promo.id && r.userId === userId);
    if (alreadyRedeemed) {
      return { success: false, message: 'You have already redeemed this promo code.' };
    }

    const creditAmount = promo.type === 'fixed' ? promo.value : 500; // default 500 for % simulation

    // Update promo redemptions
    setPromos(prev =>
      prev.map(p => (p.id === promo.id ? { ...p, currentRedemptions: p.currentRedemptions + 1 } : p))
    );

    const record: RedemptionRecord = {
      id: `red_${Date.now()}`,
      promoId: promo.id,
      code: promo.code,
      userId,
      userName,
      amountCredited: creditAmount,
      redeemedAt: new Date().toISOString(),
    };

    setRedemptions(prev => [record, ...prev]);

    return {
      success: true,
      message: `Promo code ${promo.code} redeemed! ₹${creditAmount} bonus credited to your wallet.`,
      amount: creditAmount,
    };
  }, [promos, redemptions]);

  return (
    <PromoContext.Provider value={{ promos, redemptions, createPromoCode, togglePromoStatus, redeemCode }}>
      {children}
    </PromoContext.Provider>
  );
}

export function usePromo() {
  const context = useContext(PromoContext);
  if (!context) throw new Error('usePromo must be used within a PromoProvider');
  return context;
}
