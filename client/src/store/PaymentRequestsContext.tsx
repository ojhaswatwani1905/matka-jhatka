import type { ReactNode } from 'react';
import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { PaymentRequest, PaymentRequestAccountDetails } from '../types';
import { generateId } from '../lib/utils';

const STORAGE_KEY = 'playarena_payment_requests';

interface PaymentRequestsState {
  requests: PaymentRequest[];
  isLoading: boolean;
}

type PaymentRequestsAction =
  | { type: 'SET_REQUESTS'; payload: PaymentRequest[] }
  | { type: 'ADD_REQUEST'; payload: PaymentRequest }
  | { type: 'UPDATE_REQUEST'; payload: { id: string; updates: Partial<PaymentRequest> } }
  | { type: 'SET_LOADING'; payload: boolean };

function requestsReducer(state: PaymentRequestsState, action: PaymentRequestsAction): PaymentRequestsState {
  switch (action.type) {
    case 'SET_REQUESTS':
      return { ...state, requests: action.payload, isLoading: false };
    case 'ADD_REQUEST':
      return { ...state, requests: [action.payload, ...state.requests] };
    case 'UPDATE_REQUEST':
      return {
        ...state,
        requests: state.requests.map(r => (r.id === action.payload.id ? { ...r, ...action.payload.updates } : r)),
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

interface PaymentRequestsContextType {
  requests: PaymentRequest[];
  isLoading: boolean;
  pendingDepositCount: number;
  pendingWithdrawalCount: number;
  pendingTotalCount: number;
  createDepositRequest: (params: {
    userId: string;
    userName: string;
    userEmail: string;
    amount: number;
    whatsappNumber: string;
  }) => string;
  createWithdrawalRequest: (params: {
    userId: string;
    userName: string;
    userEmail: string;
    amount: number;
    whatsappNumber: string;
    accountDetails: PaymentRequestAccountDetails;
  }) => string;
  approveRequest: (requestId: string, adminName?: string) => boolean;
  rejectRequest: (requestId: string, reason: string, adminName?: string) => boolean;
  getUserRequests: (userId: string) => PaymentRequest[];
}

const PaymentRequestsContext = createContext<PaymentRequestsContextType | null>(null);

export function usePaymentRequests() {
  const ctx = useContext(PaymentRequestsContext);
  if (!ctx) throw new Error('usePaymentRequests must be used within PaymentRequestsProvider');
  return ctx;
}

// Initial sample demo requests if empty
const DEFAULT_DEMO_REQUESTS: PaymentRequest[] = [
  {
    id: 'req_dep_demo_01',
    userId: 'usr_sample_01',
    userName: 'Vikram Singh',
    userEmail: 'vikram@example.com',
    type: 'deposit',
    amount: 1000,
    whatsappNumber: '+91 98765 43210',
    status: 'pending',
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    demo: true,
  },
  {
    id: 'req_wth_demo_02',
    userId: 'usr_sample_02',
    userName: 'Aanya Sharma',
    userEmail: 'aanya@example.com',
    type: 'withdrawal',
    amount: 2500,
    whatsappNumber: '+91 91234 56789',
    accountDetails: {
      accountHolder: 'Aanya Sharma',
      bankName: 'HDFC Bank',
      accountNumber: '•••• •••• 4421',
      ifscCode: 'HDFC0001234',
      type: 'bank',
      label: 'HDFC Bank (••••4421)',
    },
    status: 'pending',
    createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
    demo: true,
  },
];

function getStoredRequests(): PaymentRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_REQUESTS));
  return DEFAULT_DEMO_REQUESTS;
}

// Helper to push in-app notification
function sendUserNotification(title: string, message: string, type: 'wallet' | 'system' = 'wallet') {
  try {
    const notifs = JSON.parse(localStorage.getItem('playarena_notifications') || '[]');
    const newNotif = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('playarena_notifications', JSON.stringify([newNotif, ...notifs].slice(0, 100)));
    window.dispatchEvent(new CustomEvent('notification:received', { detail: newNotif }));
  } catch { /* ignore */ }
}

export function PaymentRequestsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(requestsReducer, {
    requests: [],
    isLoading: true,
  });

  // Load from localStorage on mount & sync across tabs
  useEffect(() => {
    const load = () => {
      const stored = getStoredRequests();
      dispatch({ type: 'SET_REQUESTS', payload: stored });
    };

    load();

    const handleUpdate = () => load();
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('payment_requests:updated', handleUpdate);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('payment_requests:updated', handleUpdate);
    };
  }, []);

  const saveRequests = useCallback((updated: PaymentRequest[]) => {
    dispatch({ type: 'SET_REQUESTS', payload: updated });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('payment_requests:updated'));
  }, []);

  // 1. Create Deposit Request
  const createDepositRequest = useCallback(
    (params: {
      userId: string;
      userName: string;
      userEmail: string;
      amount: number;
      whatsappNumber: string;
    }): string => {
      const newReq: PaymentRequest = {
        id: `dep_${generateId()}`,
        userId: params.userId,
        userName: params.userName || 'Player',
        userEmail: params.userEmail || 'player@playarena.com',
        type: 'deposit',
        amount: params.amount,
        whatsappNumber: params.whatsappNumber,
        status: 'pending',
        createdAt: new Date().toISOString(),
        demo: true,
      };

      const current = getStoredRequests();
      const updated = [newReq, ...current];
      saveRequests(updated);

      // Record pending transaction in user's wallet
      try {
        const walletKey = `wallet_${params.userId}`;
        const walletData = JSON.parse(localStorage.getItem(walletKey) || '{"balance":0,"transactions":[]}');
        const pendingTx = {
          id: `tx_${newReq.id}`,
          userId: params.userId,
          type: 'deposit',
          amount: params.amount,
          status: 'pending',
          description: `Deposit Request — ₹${params.amount} (Pending Admin Approval)`,
          createdAt: new Date().toISOString(),
        };
        walletData.transactions = [pendingTx, ...(walletData.transactions || [])];
        localStorage.setItem(walletKey, JSON.stringify(walletData));
        window.dispatchEvent(new CustomEvent('wallet:updated'));
      } catch { /* ignore */ }

      sendUserNotification(
        'Deposit Request Submitted',
        `Your deposit request of ₹${params.amount.toLocaleString('en-IN')} has been submitted. Status: Pending admin review (Demo Flow).`
      );

      return newReq.id;
    },
    [saveRequests]
  );

  // 2. Create Withdrawal Request (Hold funds immediately)
  const createWithdrawalRequest = useCallback(
    (params: {
      userId: string;
      userName: string;
      userEmail: string;
      amount: number;
      whatsappNumber: string;
      accountDetails: PaymentRequestAccountDetails;
    }): string => {
      const newReq: PaymentRequest = {
        id: `wth_${generateId()}`,
        userId: params.userId,
        userName: params.userName || 'Player',
        userEmail: params.userEmail || 'player@playarena.com',
        type: 'withdrawal',
        amount: params.amount,
        whatsappNumber: params.whatsappNumber,
        accountDetails: params.accountDetails,
        status: 'pending',
        createdAt: new Date().toISOString(),
        demo: true,
      };

      // Lock/hold balance from active user wallet
      try {
        const savedUserStr = localStorage.getItem('playarena_user');
        if (savedUserStr) {
          const u = JSON.parse(savedUserStr);
          if (u.id === params.userId || u.email === params.userEmail) {
            u.balance = Math.max(0, (u.balance || 0) - params.amount);
            localStorage.setItem('playarena_user', JSON.stringify(u));
          }
        }

        const users = JSON.parse(localStorage.getItem('playarena_users') || '[]');
        const idx = users.findIndex((u: any) => u.id === params.userId || u.email === params.userEmail);
        if (idx >= 0) {
          users[idx].balance = Math.max(0, (users[idx].balance || 0) - params.amount);
          localStorage.setItem('playarena_users', JSON.stringify(users));
        }

        const walletKey = `wallet_${params.userId}`;
        const walletData = JSON.parse(localStorage.getItem(walletKey) || '{"balance":0,"transactions":[]}');
        walletData.balance = Math.max(0, (walletData.balance || 0) - params.amount);
        const pendingTx = {
          id: `tx_${newReq.id}`,
          userId: params.userId,
          type: 'withdrawal',
          amount: params.amount,
          status: 'pending',
          description: `Withdrawal Request — ₹${params.amount} to ${params.accountDetails?.label || 'account'} (Held / Pending Approval)`,
          createdAt: new Date().toISOString(),
        };
        walletData.transactions = [pendingTx, ...(walletData.transactions || [])];
        localStorage.setItem(walletKey, JSON.stringify(walletData));

        window.dispatchEvent(new CustomEvent('wallet:updated', { detail: { userId: params.userId, balance: walletData.balance } }));
      } catch { /* ignore */ }

      const current = getStoredRequests();
      const updated = [newReq, ...current];
      saveRequests(updated);

      sendUserNotification(
        'Withdrawal Request Submitted',
        `₹${params.amount.toLocaleString('en-IN')} held for withdrawal to ${params.accountDetails?.label || 'account'}. Pending admin approval.`
      );

      return newReq.id;
    },
    [saveRequests]
  );

  // 3. Approve Request
  const approveRequest = useCallback(
    (requestId: string, adminName: string = 'Admin'): boolean => {
      const current = getStoredRequests();
      const target = current.find(r => r.id === requestId);
      if (!target || target.status !== 'pending') return false;

      const now = new Date().toISOString();

      if (target.type === 'deposit') {
        // Credit the deposit amount to user's wallet
        try {
          const savedUserStr = localStorage.getItem('playarena_user');
          if (savedUserStr) {
            const u = JSON.parse(savedUserStr);
            if (u.id === target.userId || u.email?.toLowerCase() === target.userEmail.toLowerCase()) {
              u.balance = (u.balance || 0) + target.amount;
              localStorage.setItem('playarena_user', JSON.stringify(u));
            }
          }

          const users = JSON.parse(localStorage.getItem('playarena_users') || '[]');
          const idx = users.findIndex((u: any) => u.id === target.userId || u.email?.toLowerCase() === target.userEmail.toLowerCase());
          if (idx >= 0) {
            users[idx].balance = (users[idx].balance || 0) + target.amount;
            localStorage.setItem('playarena_users', JSON.stringify(users));
          }

          const walletKey = `wallet_${target.userId}`;
          const walletData = JSON.parse(localStorage.getItem(walletKey) || '{"balance":0,"transactions":[]}');
          walletData.balance = (walletData.balance || 0) + target.amount;
          
          // Update the matching pending transaction or prepend completed one
          const txMatch = (walletData.transactions || []).find((t: any) => t.id === `tx_${target.id}`);
          if (txMatch) {
            txMatch.status = 'completed';
            txMatch.description = `Deposit Approved — ₹${target.amount} (Credited)`;
          } else {
            walletData.transactions = [
              {
                id: `tx_${target.id}_done`,
                userId: target.userId,
                type: 'deposit',
                amount: target.amount,
                status: 'completed',
                description: `Deposit Approved — ₹${target.amount}`,
                createdAt: now,
              },
              ...(walletData.transactions || []),
            ];
          }
          localStorage.setItem(walletKey, JSON.stringify(walletData));

          window.dispatchEvent(new CustomEvent('wallet:updated', { detail: { userId: target.userId, balance: walletData.balance } }));
        } catch { /* ignore */ }

        sendUserNotification(
          '🎉 Deposit Approved!',
          `Your deposit of ₹${target.amount.toLocaleString('en-IN')} has been approved by admin and credited to your wallet.`
        );
      } else if (target.type === 'withdrawal') {
        // Finalize withdrawal (amount was already held)
        try {
          const walletKey = `wallet_${target.userId}`;
          const walletData = JSON.parse(localStorage.getItem(walletKey) || '{"balance":0,"transactions":[]}');
          const txMatch = (walletData.transactions || []).find((t: any) => t.id === `tx_${target.id}`);
          if (txMatch) {
            txMatch.status = 'completed';
            txMatch.description = `Withdrawal Approved — ₹${target.amount} sent to ${target.accountDetails?.label || 'account'}`;
          }
          localStorage.setItem(walletKey, JSON.stringify(walletData));
          window.dispatchEvent(new CustomEvent('wallet:updated'));
        } catch { /* ignore */ }

        sendUserNotification(
          '✅ Withdrawal Approved & Processed',
          `Your withdrawal of ₹${target.amount.toLocaleString('en-IN')} has been approved and sent to ${target.accountDetails?.label || 'your bank/UPI'}.`
        );
      }

      const updated = current.map(r =>
        r.id === requestId
          ? {
              ...r,
              status: 'approved' as const,
              resolvedAt: now,
              resolvedBy: adminName,
            }
          : r
      );

      saveRequests(updated);
      return true;
    },
    [saveRequests]
  );

  // 4. Reject Request
  const rejectRequest = useCallback(
    (requestId: string, reason: string, adminName: string = 'Admin'): boolean => {
      const current = getStoredRequests();
      const target = current.find(r => r.id === requestId);
      if (!target || target.status !== 'pending') return false;

      const cleanReason = reason.trim() || 'Declined by administrator';
      const now = new Date().toISOString();

      if (target.type === 'deposit') {
        // Update pending tx to failed
        try {
          const walletKey = `wallet_${target.userId}`;
          const walletData = JSON.parse(localStorage.getItem(walletKey) || '{"balance":0,"transactions":[]}');
          const txMatch = (walletData.transactions || []).find((t: any) => t.id === `tx_${target.id}`);
          if (txMatch) {
            txMatch.status = 'failed';
            txMatch.description = `Deposit Declined — ₹${target.amount} (${cleanReason})`;
          }
          localStorage.setItem(walletKey, JSON.stringify(walletData));
          window.dispatchEvent(new CustomEvent('wallet:updated'));
        } catch { /* ignore */ }

        sendUserNotification(
          '❌ Deposit Request Declined',
          `Your deposit request of ₹${target.amount.toLocaleString('en-IN')} was rejected. Reason: ${cleanReason}`
        );
      } else if (target.type === 'withdrawal') {
        // Refund held balance back to user
        try {
          const savedUserStr = localStorage.getItem('playarena_user');
          if (savedUserStr) {
            const u = JSON.parse(savedUserStr);
            if (u.id === target.userId || u.email?.toLowerCase() === target.userEmail.toLowerCase()) {
              u.balance = (u.balance || 0) + target.amount;
              localStorage.setItem('playarena_user', JSON.stringify(u));
            }
          }

          const users = JSON.parse(localStorage.getItem('playarena_users') || '[]');
          const idx = users.findIndex((u: any) => u.id === target.userId || u.email?.toLowerCase() === target.userEmail.toLowerCase());
          if (idx >= 0) {
            users[idx].balance = (users[idx].balance || 0) + target.amount;
            localStorage.setItem('playarena_users', JSON.stringify(users));
          }

          const walletKey = `wallet_${target.userId}`;
          const walletData = JSON.parse(localStorage.getItem(walletKey) || '{"balance":0,"transactions":[]}');
          walletData.balance = (walletData.balance || 0) + target.amount;
          const txMatch = (walletData.transactions || []).find((t: any) => t.id === `tx_${target.id}`);
          if (txMatch) {
            txMatch.status = 'failed';
            txMatch.description = `Withdrawal Rejected — ₹${target.amount} (${cleanReason} — Refunded)`;
          }
          localStorage.setItem(walletKey, JSON.stringify(walletData));

          window.dispatchEvent(new CustomEvent('wallet:updated', { detail: { userId: target.userId, balance: walletData.balance } }));
        } catch { /* ignore */ }

        sendUserNotification(
          '❌ Withdrawal Request Rejected (Refunded)',
          `Your withdrawal of ₹${target.amount.toLocaleString('en-IN')} was rejected. Reason: ${cleanReason}. Funds refunded to balance.`
        );
      }

      const updated = current.map(r =>
        r.id === requestId
          ? {
              ...r,
              status: 'rejected' as const,
              rejectionReason: cleanReason,
              resolvedAt: now,
              resolvedBy: adminName,
            }
          : r
      );

      saveRequests(updated);
      return true;
    },
    [saveRequests]
  );

  const getUserRequests = useCallback(
    (userId: string): PaymentRequest[] => {
      return state.requests.filter(r => r.userId === userId || r.userEmail === userId);
    },
    [state.requests]
  );

  const pendingDepositCount = state.requests.filter(r => r.type === 'deposit' && r.status === 'pending').length;
  const pendingWithdrawalCount = state.requests.filter(r => r.type === 'withdrawal' && r.status === 'pending').length;
  const pendingTotalCount = pendingDepositCount + pendingWithdrawalCount;

  return (
    <PaymentRequestsContext.Provider
      value={{
        requests: state.requests,
        isLoading: state.isLoading,
        pendingDepositCount,
        pendingWithdrawalCount,
        pendingTotalCount,
        createDepositRequest,
        createWithdrawalRequest,
        approveRequest,
        rejectRequest,
        getUserRequests,
      }}
    >
      {children}
    </PaymentRequestsContext.Provider>
  );
}
