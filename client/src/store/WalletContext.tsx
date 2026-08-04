import type { ReactNode } from 'react';
import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { generateId } from '../lib/utils';
import type { Transaction, WalletState } from '../types';

type WalletAction =
  | { type: 'SET_BALANCE'; payload: number }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'UPDATE_TRANSACTION'; payload: { id: string; updates: Partial<Transaction> } }
  | { type: 'SET_LOADING'; payload: boolean };

const defaultDemoTxns: Transaction[] = [
  { id: 'tx-1', userId: 'demo', type: 'deposit', amount: 10000, status: 'completed', description: 'Welcome Bonus Deposit', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'tx-2', userId: 'demo', type: 'bet', amount: 100, status: 'completed', description: 'WinGo GREEN bet on Period 202607310082', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'tx-3', userId: 'demo', type: 'win', amount: 200, status: 'completed', description: 'Won WinGo GREEN (2.0x)', createdAt: new Date(Date.now() - 3550000).toISOString() },
  { id: 'tx-4', userId: 'demo', type: 'bet', amount: 50, status: 'completed', description: 'Matka Jhatka Single #7 bet', createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: 'tx-5', userId: 'demo', type: 'win', amount: 450, status: 'completed', description: 'Won Matka Jhatka Single #7 (9.0x)', createdAt: new Date(Date.now() - 1750000).toISOString() },
];

const initialState: WalletState = {
  balance: 10000,
  transactions: defaultDemoTxns,
  isLoading: false,
};

function walletReducer(state: WalletState, action: WalletAction): WalletState {
  switch (action.type) {
    case 'SET_BALANCE':
      return { ...state, balance: action.payload };
    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [action.payload, ...state.transactions],
      };
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map(t =>
          t.id === action.payload.id ? { ...t, ...action.payload.updates } : t
        ),
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

interface WalletContextType extends WalletState {
  addBalance: (amount: number, description?: string, type?: 'deposit' | 'win' | 'bonus') => void;
  deductBalance: (amount: number, description?: string) => boolean;
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => string;
  deposit: (amount: number) => void;
  withdraw: (amount: number) => string | null;
  approveWithdrawal: (txId: string) => void;
  rejectWithdrawal: (txId: string) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(walletReducer, initialState);
  // Use ref to avoid stale closure issues
  const balanceRef = useRef(state.balance);
  balanceRef.current = state.balance;

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('wallet');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'SET_BALANCE', payload: parsed.balance ?? 10000 });
        if (parsed.transactions && parsed.transactions.length > 0) {
          dispatch({ type: 'SET_TRANSACTIONS', payload: parsed.transactions });
        } else {
          dispatch({ type: 'SET_TRANSACTIONS', payload: defaultDemoTxns });
        }
      } catch {
        dispatch({ type: 'SET_TRANSACTIONS', payload: defaultDemoTxns });
      }
    } else {
      dispatch({ type: 'SET_TRANSACTIONS', payload: defaultDemoTxns });
    }
  }, []);

  // Persist to localStorage (also store in global transactions for admin)
  useEffect(() => {
    localStorage.setItem('wallet', JSON.stringify({
      balance: state.balance,
      transactions: state.transactions.slice(0, 200),
    }));
    // Write transactions to global admin-readable store
    localStorage.setItem('playarena_all_transactions', JSON.stringify(state.transactions.slice(0, 200)));
  }, [state.balance, state.transactions]);

  const addTransaction = useCallback((tx: Omit<Transaction, 'id' | 'createdAt'>): string => {
    const transaction: Transaction = {
      ...tx,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_TRANSACTION', payload: transaction });
    return transaction.id;
  }, []);

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    dispatch({ type: 'UPDATE_TRANSACTION', payload: { id, updates } });
  }, []);

  const addBalance = useCallback((amount: number, description?: string, type: 'deposit' | 'win' | 'bonus' = 'deposit') => {
    dispatch({ type: 'SET_BALANCE', payload: balanceRef.current + amount });
    const isWin = description?.toLowerCase().includes('won') || description?.toLowerCase().includes('win');
    addTransaction({
      userId: 'demo',
      type: isWin ? 'win' : type,
      amount,
      status: 'completed',
      description: description || `Added ₹${amount}`,
    });
  }, [addTransaction]);

  const deductBalance = useCallback((amount: number, description?: string): boolean => {
    if (balanceRef.current < amount) return false;
    dispatch({ type: 'SET_BALANCE', payload: balanceRef.current - amount });
    addTransaction({
      userId: 'demo',
      type: 'bet',
      amount,
      status: 'completed',
      description: description || `Bet ₹${amount}`,
    });
    return true;
  }, [addTransaction]);

  const deposit = useCallback((amount: number) => {
    dispatch({ type: 'SET_BALANCE', payload: balanceRef.current + amount });
    addTransaction({
      userId: 'demo',
      type: 'deposit',
      amount,
      status: 'completed',
      description: `Instant Deposit — ₹${amount}`,
    });
  }, [addTransaction]);

  const withdraw = useCallback((amount: number): string | null => {
    if (balanceRef.current < amount) return null;
    // Deduct immediately and hold as pending
    dispatch({ type: 'SET_BALANCE', payload: balanceRef.current - amount });
    const txId = addTransaction({
      userId: 'demo',
      type: 'withdrawal',
      amount,
      status: 'pending',
      description: `Withdrawal Request — ₹${amount}`,
    });
    return txId;
  }, [addTransaction]);

  const approveWithdrawal = useCallback((txId: string) => {
    dispatch({ type: 'UPDATE_TRANSACTION', payload: { id: txId, updates: { status: 'completed' } } });
  }, []);

  const rejectWithdrawal = useCallback((txId: string) => {
    // Find tx and refund
    const tx = state.transactions.find(t => t.id === txId);
    if (tx && tx.status === 'pending') {
      dispatch({ type: 'SET_BALANCE', payload: balanceRef.current + tx.amount });
      dispatch({ type: 'UPDATE_TRANSACTION', payload: { id: txId, updates: { status: 'failed', description: tx.description + ' (Rejected — Refunded)' } } });
    }
  }, [state.transactions]);

  return (
    <WalletContext.Provider value={{ ...state, addBalance, deductBalance, addTransaction, deposit, withdraw, approveWithdrawal, rejectWithdrawal, updateTransaction }}>
      {children}
    </WalletContext.Provider>
  );
}
