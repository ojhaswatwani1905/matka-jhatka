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



const getInitialWalletState = (): ExtendedWalletState => {
  let userBal = 0;
  let userTxns: Transaction[] = [];

  if (typeof window !== 'undefined') {
    try {
      const savedUserStr = localStorage.getItem('playarena_user');
      if (savedUserStr) {
        const u = JSON.parse(savedUserStr);
        const usersList: any[] = JSON.parse(localStorage.getItem('playarena_users') || '[]');
        const matchedInUsers = usersList.find(usr => usr.id === u.id || (usr.email && u.email && usr.email.toLowerCase() === u.email.toLowerCase()));

        if (matchedInUsers && typeof matchedInUsers.balance === 'number') {
          userBal = matchedInUsers.balance;
        } else if (typeof u.balance === 'number') {
          userBal = u.balance;
        }

        const savedWallet = localStorage.getItem(`wallet_${u.id}`);
        if (savedWallet) {
          const parsed = JSON.parse(savedWallet);
          if (typeof parsed.balance === 'number' && parsed.balance > userBal) {
            userBal = parsed.balance;
          }
          if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
            userTxns = parsed.transactions;
          }
        }
      }
    } catch { /* ignore */ }
  }

  return {
    balance: userBal,
    bonusBalance: 0,
    bonusWagerRequired: 0,
    bonusWagerProgress: 0,
    transactions: userTxns,
    isLoading: false,
  };
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
  const [state, dispatch] = useReducer(walletReducer, null, getInitialWalletState);
  const balanceRef = useRef(state.balance);
  balanceRef.current = state.balance;
  const bonusBalanceRef = useRef(state.bonusBalance);
  bonusBalanceRef.current = state.bonusBalance;
  const wagerReqRef = useRef({ req: state.bonusWagerRequired, prog: state.bonusWagerProgress });
  wagerReqRef.current = { req: state.bonusWagerRequired, prog: state.bonusWagerProgress };

  // Load balance & transactions for active logged in user
  useEffect(() => {
    const syncUserWallet = (evt?: Event) => {
      // Remove legacy non-user-prefixed wallet key
      localStorage.removeItem('wallet');

      // Check if custom event passed a direct balance update
      if (evt && 'detail' in evt) {
        const detail = (evt as CustomEvent).detail;
        const savedUserStr = localStorage.getItem('playarena_user');
        if (savedUserStr && detail) {
          try {
            const u = JSON.parse(savedUserStr);
            const isMatch = (detail.userId && u.id && detail.userId === u.id) ||
                            (detail.email && u.email && detail.email.toLowerCase() === u.email.toLowerCase());
            if (isMatch && typeof detail.balance === 'number') {
              dispatch({ type: 'SET_BALANCE', payload: detail.balance });
              u.balance = detail.balance;
              localStorage.setItem('playarena_user', JSON.stringify(u));
              return;
            }
          } catch { /* ignore */ }
        }
      }

      const savedUserStr = localStorage.getItem('playarena_user');
      if (savedUserStr) {
        try {
          const u = JSON.parse(savedUserStr);
          const usersList: any[] = JSON.parse(localStorage.getItem('playarena_users') || '[]');
          const matchedInUsers = usersList.find(usr => usr.id === u.id || (usr.email && u.email && usr.email.toLowerCase() === u.email.toLowerCase()));

          let userBal = typeof u.balance === 'number' ? u.balance : 0;
          if (matchedInUsers && typeof matchedInUsers.balance === 'number') {
            userBal = matchedInUsers.balance;
          }

          const savedWallet = localStorage.getItem(`wallet_${u.id}`);
          let userTxns: Transaction[] = [];

          if (savedWallet) {
            const parsed = JSON.parse(savedWallet);
            if (typeof parsed.balance === 'number' && parsed.balance > userBal) {
              userBal = parsed.balance;
            }
            if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
              userTxns = parsed.transactions;
            }
          }
          dispatch({ type: 'SET_BALANCE', payload: userBal });
          dispatch({ type: 'SET_TRANSACTIONS', payload: userTxns });
        } catch {
          dispatch({ type: 'SET_BALANCE', payload: 0 });
        }
      } else {
        dispatch({ type: 'SET_BALANCE', payload: 0 });
        dispatch({ type: 'SET_TRANSACTIONS', payload: [] });
      }
    };

    const fetchLatestServerBalance = async () => {
      const token = localStorage.getItem('token') || localStorage.getItem('playarena_token');
      if (!token) return;
      try {
        const res = await fetch('/api/wallet/balance', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && typeof json.data?.balance === 'number' && json.data.balance > 0) {
            dispatch({ type: 'SET_BALANCE', payload: json.data.balance });
            const savedUserStr = localStorage.getItem('playarena_user');
            if (savedUserStr) {
              const u = JSON.parse(savedUserStr);
              if (u.balance !== json.data.balance) {
                u.balance = json.data.balance;
                localStorage.setItem('playarena_user', JSON.stringify(u));
              }
            }
          }
        }
      } catch { /* offline fallback */ }
    };

    syncUserWallet();
    window.addEventListener('storage', syncUserWallet);
    window.addEventListener('wallet:updated', syncUserWallet);
    window.addEventListener('focus', fetchLatestServerBalance);

    const pollInterval = setInterval(() => {
      syncUserWallet();
      fetchLatestServerBalance();
    }, 2000);

    return () => {
      window.removeEventListener('storage', syncUserWallet);
      window.removeEventListener('wallet:updated', syncUserWallet);
      window.removeEventListener('focus', fetchLatestServerBalance);
      clearInterval(pollInterval);
    };
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
    const newBal = balanceRef.current + amount;
    dispatch({ type: 'SET_BALANCE', payload: newBal });

    const isWin = description?.toLowerCase().includes('won') || description?.toLowerCase().includes('win');
    addTransaction({
      userId: 'demo',
      type: isWin ? 'win' : type,
      amount,
      status: 'completed',
      description: description || `Added ₹${amount}`,
    });

    // Instant multi-user & Admin panel sync
    const savedUserStr = localStorage.getItem('playarena_user');
    if (savedUserStr) {
      try {
        const u = JSON.parse(savedUserStr);
        u.balance = newBal;
        localStorage.setItem('playarena_user', JSON.stringify(u));
        localStorage.setItem(`wallet_${u.id}`, JSON.stringify({
          balance: newBal,
          bonusBalance: bonusBalanceRef.current,
          transactions: state.transactions.slice(0, 200),
        }));

        const usersList = JSON.parse(localStorage.getItem('playarena_users') || '[]');
        const idx = usersList.findIndex((usr: any) => usr.id === u.id || usr.email.toLowerCase() === u.email.toLowerCase());
        if (idx >= 0) {
          usersList[idx].balance = newBal;
        } else {
          usersList.push(u);
        }
        localStorage.setItem('playarena_users', JSON.stringify(usersList));

        // Dispatch live real-time wallet update event across application
        window.dispatchEvent(new CustomEvent('wallet:updated', {
          detail: { userId: u.id, balance: newBal }
        }));

        // Server API background sync
        const token = localStorage.getItem('token') || localStorage.getItem('playarena_token');
        if (token) {
          fetch('/api/wallet/deposit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ amount, description }),
          }).catch(() => {});
        }
      } catch { /* ignore */ }
    }
  }, [addTransaction, state.transactions]);

  const deductBalance = useCallback((amount: number, description?: string, type: Transaction['type'] = 'bet'): boolean => {
    const mainBal = balanceRef.current;
    const bonusBal = bonusBalanceRef.current;

    if (mainBal + bonusBal < amount) return false;

    let newMain = mainBal;
    let newBonus = bonusBal;

    // Deduct main balance first, remainder from bonus balance if needed
    if (mainBal >= amount) {
      newMain = mainBal - amount;
      dispatch({ type: 'SET_BALANCE', payload: newMain });
    } else {
      const mainUsed = mainBal;
      const bonusUsed = amount - mainUsed;
      newMain = 0;
      newBonus = bonusBal - bonusUsed;
      dispatch({ type: 'SET_BALANCE', payload: 0 });
      dispatch({ type: 'SET_BONUS_BALANCE', payload: newBonus });
    }

    // Track wagering progress
    const newProg = wagerReqRef.current.prog + amount;
    const req = wagerReqRef.current.req;

    // Check if bonus wagering requirement is unlocked!
    if (req > 0 && newProg >= req && bonusBalanceRef.current > 0) {
      const unlockedBonus = bonusBalanceRef.current;
      newMain += unlockedBonus;
      newBonus = 0;
      dispatch({ type: 'SET_BALANCE', payload: newMain });
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
      type,
      amount,
      status: 'completed',
      description: description || `Deducted ₹${amount}`,
    });

    // Real-time sync to local storage & Admin Panel
    const savedUserStr = localStorage.getItem('playarena_user');
    if (savedUserStr) {
      try {
        const u = JSON.parse(savedUserStr);
        u.balance = newMain;
        localStorage.setItem('playarena_user', JSON.stringify(u));
        localStorage.setItem(`wallet_${u.id}`, JSON.stringify({
          balance: newMain,
          bonusBalance: newBonus,
          transactions: state.transactions.slice(0, 200),
        }));

        const usersList = JSON.parse(localStorage.getItem('playarena_users') || '[]');
        const idx = usersList.findIndex((usr: any) => usr.id === u.id || usr.email.toLowerCase() === u.email.toLowerCase());
        if (idx >= 0) {
          usersList[idx].balance = newMain;
        } else {
          usersList.push(u);
        }
        localStorage.setItem('playarena_users', JSON.stringify(usersList));

        // Dispatch real-time wallet update event across application & socket
        window.dispatchEvent(new CustomEvent('wallet:updated', {
          detail: { userId: u.id, balance: newMain }
        }));
      } catch { /* ignore */ }
    }

    // Dispatch real bet event to live feed ticker
    try {
      const savedUser = JSON.parse(localStorage.getItem('playarena_user') || '{}');
      const userName = savedUser.name || 'You';
      const gameName = description ? description.replace(/^Auto-Bet — |^Bet — |^Spin — /i, '') : 'Casino Game';
      window.dispatchEvent(new CustomEvent('bet:placed', {
        detail: {
          user: userName,
          game: gameName,
          gameIcon: '🎮',
          betAmount: amount,
          result: 'pending',
          timestamp: Date.now(),
        }
      }));
    } catch { /* ignore */ }

    return true;
  }, [addTransaction, state.transactions]);

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
