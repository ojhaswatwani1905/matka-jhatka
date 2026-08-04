import type { ReactNode } from 'react';
import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { KYCStatus, KYCData, KYCState } from '../types';

type KYCAction =
  | { type: 'SET_STATUS'; payload: KYCStatus }
  | { type: 'SET_DATA'; payload: KYCData }
  | { type: 'SET_REJECTION'; payload: string }
  | { type: 'RESET' };

const initialState: KYCState = {
  status: 'not_started',
  data: null,
};

function kycReducer(state: KYCState, action: KYCAction): KYCState {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_DATA':
      return { ...state, data: action.payload };
    case 'SET_REJECTION':
      return {
        ...state,
        status: 'rejected',
        data: state.data ? { ...state.data, rejectionReason: action.payload, reviewedAt: new Date().toISOString() } : state.data,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface KYCContextType extends KYCState {
  submitKYC: (data: Omit<KYCData, 'submittedAt'>) => void;
  approveKYC: () => void;
  rejectKYC: (reason: string) => void;
  resetKYC: () => void;
}

const KYCContext = createContext<KYCContextType | null>(null);

export function useKYC() {
  const ctx = useContext(KYCContext);
  if (!ctx) throw new Error('useKYC must be used within KYCProvider');
  return ctx;
}

export function KYCProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(kycReducer, initialState);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('playarena_kyc');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as KYCState;
        if (parsed.status) dispatch({ type: 'SET_STATUS', payload: parsed.status });
        if (parsed.data) dispatch({ type: 'SET_DATA', payload: parsed.data });
      } catch { /* ignore */ }
    }
  }, []);

  // Persist
  useEffect(() => {
    localStorage.setItem('playarena_kyc', JSON.stringify(state));
  }, [state]);

  const submitKYC = useCallback((data: Omit<KYCData, 'submittedAt'>) => {
    const full: KYCData = { ...data, submittedAt: new Date().toISOString() };
    dispatch({ type: 'SET_DATA', payload: full });
    dispatch({ type: 'SET_STATUS', payload: 'pending' });

    // Store in admin-accessible list
    const allKYC = JSON.parse(localStorage.getItem('playarena_kyc_queue') || '[]');
    const idx = allKYC.findIndex((k: KYCData) => k.userId === data.userId);
    if (idx >= 0) allKYC[idx] = full;
    else allKYC.push(full);
    localStorage.setItem('playarena_kyc_queue', JSON.stringify(allKYC));
  }, []);

  const approveKYC = useCallback(() => {
    dispatch({ type: 'SET_STATUS', payload: 'verified' });
    if (state.data) {
      const updated = { ...state.data, reviewedAt: new Date().toISOString() };
      dispatch({ type: 'SET_DATA', payload: updated });
      // Update admin queue
      const allKYC = JSON.parse(localStorage.getItem('playarena_kyc_queue') || '[]');
      const idx = allKYC.findIndex((k: KYCData) => k.userId === state.data?.userId);
      if (idx >= 0) allKYC[idx] = { ...updated, approved: true };
      localStorage.setItem('playarena_kyc_queue', JSON.stringify(allKYC));
    }
  }, [state.data]);

  const rejectKYC = useCallback((reason: string) => {
    dispatch({ type: 'SET_REJECTION', payload: reason });
    if (state.data) {
      const allKYC = JSON.parse(localStorage.getItem('playarena_kyc_queue') || '[]');
      const idx = allKYC.findIndex((k: KYCData) => k.userId === state.data?.userId);
      if (idx >= 0) allKYC[idx] = { ...allKYC[idx], rejectionReason: reason, rejected: true };
      localStorage.setItem('playarena_kyc_queue', JSON.stringify(allKYC));
    }
  }, [state.data]);

  const resetKYC = useCallback(() => {
    dispatch({ type: 'RESET' });
    localStorage.removeItem('playarena_kyc');
  }, []);

  return (
    <KYCContext.Provider value={{ ...state, submitKYC, approveKYC, rejectKYC, resetKYC }}>
      {children}
    </KYCContext.Provider>
  );
}
