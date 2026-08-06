import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface SavedAccount {
  id: string;
  type: 'bank' | 'upi';
  label: string;
  accountHolder: string;
  bankName?: string;
  accountNumber?: string; // masked
  ifscCode?: string;
  upiId?: string;
  isDefault: boolean;
  createdAt: string;
}

const DEFAULT_ACCOUNTS: SavedAccount[] = [
  {
    id: 'acc_default_1',
    type: 'upi',
    label: 'Primary GPay UPI',
    accountHolder: 'Demo Player',
    upiId: 'player@okaxis',
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'acc_bank_2',
    type: 'bank',
    label: 'HDFC Savings Bank',
    accountHolder: 'Demo Player',
    bankName: 'HDFC Bank',
    accountNumber: '••••••••4892',
    ifscCode: 'HDFC0001234',
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
];

interface WithdrawalAccountsContextType {
  accounts: SavedAccount[];
  defaultAccount: SavedAccount | undefined;
  addAccount: (acc: Omit<SavedAccount, 'id' | 'createdAt'>) => SavedAccount;
  updateAccount: (id: string, updates: Partial<SavedAccount>) => void;
  deleteAccount: (id: string) => void;
  setDefault: (id: string) => void;
}

const WithdrawalAccountsContext = createContext<WithdrawalAccountsContextType | undefined>(undefined);

export function WithdrawalAccountsProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<SavedAccount[]>(() => {
    try {
      const saved = localStorage.getItem('playarena_saved_accounts');
      return saved ? JSON.parse(saved) : DEFAULT_ACCOUNTS;
    } catch {
      return DEFAULT_ACCOUNTS;
    }
  });

  useEffect(() => {
    localStorage.setItem('playarena_saved_accounts', JSON.stringify(accounts));
  }, [accounts]);

  const defaultAccount = accounts.find(a => a.isDefault) || accounts[0];

  const setDefault = useCallback((id: string) => {
    setAccounts(prev =>
      prev.map(a => ({
        ...a,
        isDefault: a.id === id,
      }))
    );
  }, []);

  const addAccount = useCallback((accData: Omit<SavedAccount, 'id' | 'createdAt'>) => {
    const isFirst = accounts.length === 0;
    const newAcc: SavedAccount = {
      ...accData,
      id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      isDefault: isFirst || accData.isDefault,
      createdAt: new Date().toISOString(),
    };

    setAccounts(prev => {
      let next = [newAcc, ...prev];
      if (newAcc.isDefault) {
        next = next.map(a => ({ ...a, isDefault: a.id === newAcc.id }));
      }
      return next;
    });

    return newAcc;
  }, [accounts.length]);

  const updateAccount = useCallback((id: string, updates: Partial<SavedAccount>) => {
    setAccounts(prev =>
      prev.map(a => {
        if (a.id !== id) return a;
        return { ...a, ...updates };
      })
    );
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setAccounts(prev => {
      const filtered = prev.filter(a => a.id !== id);
      if (filtered.length > 0 && !filtered.some(a => a.isDefault)) {
        filtered[0].isDefault = true;
      }
      return filtered;
    });
  }, []);

  return (
    <WithdrawalAccountsContext.Provider value={{ accounts, defaultAccount, addAccount, updateAccount, deleteAccount, setDefault }}>
      {children}
    </WithdrawalAccountsContext.Provider>
  );
}

export function useWithdrawalAccounts() {
  const context = useContext(WithdrawalAccountsContext);
  if (!context) throw new Error('useWithdrawalAccounts must be used within WithdrawalAccountsProvider');
  return context;
}
