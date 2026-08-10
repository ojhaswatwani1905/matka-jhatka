import type { ReactNode } from 'react';
import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { generateId } from '../lib/utils';
import type { Transaction } from '../types';

export interface ExtendedWalletState {
  balance: number;
  bonusBalance: number;
  bonusWagerRequired: number;
  bonusWagerProgress: number;
  transactions: Transaction[];
  isLoading: boolean;
}

type WalletAction =
  | { type: 'SET_BALANCE'; payload: number }
  | { type: 'SET_BONUS_BALANCE'; payload: number }
  | { type: 'SET_WAGER_REQUIREMENT'; payload: { required: number; progress: number } }
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

const initialState: ExtendedWalletState = {
  balance: 10000,
  bonusBalance: 1500,
  bonusWagerRequired: 5000,
  bonusWagerProgress: 2340,
  transactions: defaultDemoTxns,
  isLoading: false,
};

function walletReducer(state: ExtendedWalletState, action: WalletAction): ExtendedWalletState {
  switch (action.type) {
    case 'SET_BALANCE':
      return { ...state, balance: action.payload };
    case 'SET_BONUS_BALANCE':
      return { ...state, bonusBalance: action.payload };
    case 'SET_WAGER_REQUIREMENT':
      return { ...state, bonusWagerRequired: action.payload.required, bonusWagerProgress: action.payload.progress };
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

interface WalletContextType extends ExtendedWalletState {
  addBalance: (amount: number, description?: string, type?: 'deposit' | 'win' | 'bonus') => void;
  addBonusBalance: (amount: number, description?: string) => void;
  deductBalance: (amount: number, description?: string) => boolean;
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => string;
  deposit: (amount: number) => void;
  withdraw: (amount: number, selectedAccountId?: string) => string | null;
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
  const balanceRef = useRef(state.balance);
  balanceRef.current = state.balance;
  const bonusBalanceRef = useRef(state.bonusBalance);
  bonusBalanceRef.current = state.bonusBalance;
  const wagerReqRef = useRef({ req: state.bonusWagerRequired, prog: state.bonusWagerProgress });
  wagerReqRef.current = { req: state.bonusWagerRequired, prog: state.bonusWagerProgress };

  // Load balance & transactions for active logged in user
  useEffect(() => {
    const syncUserWallet = () => {
      const savedUserStr = localStorage.getItem('playarena_user');
      if (savedUserStr) {
        try {
          const u = JSON.parse(savedUserStr);
          const savedWallet = localStorage.getItem(`wallet_${u.id}`) || localStorage.getItem('wallet');
          let userBal = typeof u.balance === 'number' ? u.balance : 0;
          let userTxns = defaultDemoTxns;

          if (savedWallet) {
            const parsed = JSON.parse(savedWallet);
            if (typeof parsed.balance === 'number') userBal = parsed.balance;
            if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
              userTxns = parsed.transactions;
            }
          }
          dispatch({ type: 'SET_BALANCE', payload: userBal });
          dispatch({ type: 'SET_TRANSACTIONS', payload: userTxns });
        } catch {
          dispatch({ type: 'SET_BALANCE', payload: 0 });
        }
      }
    };

    syncUserWallet();
    window.addEventListener('storage', syncUserWallet);
    return () => window.removeEventListener('storage', syncUserWallet);
  }, []);

  // Persist balance & transactions to user storage
  useEffect(() => {
    const savedUserStr = localStorage.getItem('playarena_user');
    if (savedUserStr) {
      try {
        const u = JSON.parse(savedUserStr);
        u.balance = state.balance;
        localStorage.setItem('playarena_user', JSON.stringify(u));
        localStorage.setItem(`wallet_${u.id}`, JSON.stringify({
          balance: state.balance,
          bonusBalance: state.bonusBalance,
          transactions: state.transactions.slice(0, 200),
        }));

        // Sync to users directory
        const users = JSON.parse(localStorage.getItem('playarena_users') || '[]');
        const idx = users.findIndex((usr: any) => usr.id === u.id || usr.email.toLowerCase() === u.email.toLowerCase());
        if (idx >= 0) {
          users[idx].balance = state.balance;
          localStorage.setItem('playarena_users', JSON.stringify(users));
        }
      } catch { /* ignore */ }
    }
  }, [state.balance, state.bonusBalance, state.transactions]);


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

  const addBonusBalance = useCallback((amount: number, description?: string) => {
    const newBonus = bonusBalanceRef.current + amount;
    const addedReq = amount * 5; // 5x wagering requirement
    const newReq = wagerReqRef.current.req + addedReq;

    dispatch({ type: 'SET_BONUS_BALANCE', payload: newBonus });
    dispatch({ type: 'SET_WAGER_REQUIREMENT', payload: { required: newReq, progress: wagerReqRef.current.prog } });

    addTransaction({
      userId: 'demo',
      type: 'bonus',
      amount,
      status: 'completed',
      description: description || `Bonus Funds Added — ₹${amount} (5x Wagering Required)`,
    });
  }, [addTransaction]);

  const addBalance = useCallback((amount: number, description?: string, type: 'deposit' | 'win' | 'bonus' = 'deposit') => {
    if (type === 'bonus') {
      addBonusBalance(amount, description);
      return;
    }
    dispatch({ type: 'SET_BALANCE', payload: balanceRef.current + amount });
    const isWin = description?.toLowerCase().includes('won') || description?.toLowerCase().includes('win');
    addTransaction({
      userId: 'demo',
      type: isWin ? 'win' : type,
      amount,
      status: 'completed',
      description: description || `Added ₹${amount}`,
    });
  }, [addBonusBalance, addTransaction]);

  const deductBalance = useCallback((amount: number, description?: string, type: Transaction['type'] = 'bet'): boolean => {
    const mainBal = balanceRef.current;
    const bonusBal = bonusBalanceRef.current;

    if (mainBal + bonusBal < amount) return false;

    // Deduct main balance first, remainder from bonus balance if needed
    if (mainBal >= amount) {
      dispatch({ type: 'SET_BALANCE', payload: mainBal - amount });
    } else {
      const mainUsed = mainBal;
      const bonusUsed = amount - mainUsed;
      dispatch({ type: 'SET_BALANCE', payload: 0 });
      dispatch({ type: 'SET_BONUS_BALANCE', payload: bonusBal - bonusUsed });
    }

    // Track wagering progress
    const newProg = wagerReqRef.current.prog + amount;
    const req = wagerReqRef.current.req;

    // Check if bonus wagering requirement is unlocked!
    if (req > 0 && newProg >= req && bonusBalanceRef.current > 0) {
      const unlockedBonus = bonusBalanceRef.current;
      dispatch({ type: 'SET_BALANCE', payload: balanceRef.current + unlockedBonus });
      dispatch({ type: 'SET_BONUS_BALANCE', payload: 0 });
      dispatch({ type: 'SET_WAGER_REQUIREMENT', payload: { required: 0, progress: 0 } });

      addTransaction({
        userId: 'demo',
        type: 'bonus',
        amount: unlockedBonus,
        status: 'completed',
        description: `🎁 Bonus Unlocked! ₹${unlockedBonus} converted to main withdrawable balance.`,
      });
    } else {
      dispatch({ type: 'SET_WAGER_REQUIREMENT', payload: { required: req, progress: newProg } });
    }

    addTransaction({
      userId: 'demo',
      type: type || 'bet',
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

  const withdraw = useCallback((amount: number, selectedAccountLabel?: string): string | null => {
    if (balanceRef.current < amount) return null;
    dispatch({ type: 'SET_BALANCE', payload: balanceRef.current - amount });
    const accText = selectedAccountLabel ? ` to ${selectedAccountLabel}` : '';
    const txId = addTransaction({
      userId: 'demo',
      type: 'withdrawal',
      amount,
      status: 'pending',
      description: `Withdrawal Request — ₹${amount}${accText}`,
    });
    return txId;
  }, [addTransaction]);

  const approveWithdrawal = useCallback((txId: string) => {
    dispatch({ type: 'UPDATE_TRANSACTION', payload: { id: txId, updates: { status: 'completed' } } });
  }, []);

  const rejectWithdrawal = useCallback((txId: string) => {
    const tx = state.transactions.find(t => t.id === txId);
    if (tx && tx.status === 'pending') {
      dispatch({ type: 'SET_BALANCE', payload: balanceRef.current + tx.amount });
      dispatch({ type: 'UPDATE_TRANSACTION', payload: { id: txId, updates: { status: 'failed', description: tx.description + ' (Rejected — Refunded)' } } });
    }
  }, [state.transactions]);

  return (
    <WalletContext.Provider
      value={{
        ...state,
        addBalance,
        addBonusBalance,
        deductBalance,
        addTransaction,
        deposit,
        withdraw,
        approveWithdrawal,
        rejectWithdrawal,
        updateTransaction,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
