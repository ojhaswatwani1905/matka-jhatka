import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'win' | 'bonus' | 'achievement' | 'vip' | 'kyc' | 'wallet' | 'system' | 'spin';
  read: boolean;
  createdAt: string;
  icon?: string;
}

interface NotificationState {
  notifications: AppNotification[];
}

type NotificationAction =
  | { type: 'ADD'; payload: AppNotification }
  | { type: 'MARK_READ'; payload: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'SET'; payload: AppNotification[] };

function notifReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'ADD':
      return { notifications: [action.payload, ...state.notifications].slice(0, 100) };
    case 'MARK_READ':
      return { notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n) };
    case 'MARK_ALL_READ':
      return { notifications: state.notifications.map(n => ({ ...n, read: true })) };
    case 'SET':
      return { notifications: action.payload };
    default:
      return state;
  }
}

interface NotificationContextType extends NotificationState {
  addNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be inside NotificationProvider');
  return ctx;
}

const STORAGE_KEY = 'playarena_notifications';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(notifReducer, { notifications: [] });

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) dispatch({ type: 'SET', payload: JSON.parse(saved) });
    } catch { /* ignore */ }
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notifications));
    } catch { /* ignore */ }
  }, [state.notifications]);

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    dispatch({
      type: 'ADD',
      payload: {
        ...n,
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        createdAt: new Date().toISOString(),
        read: false,
      },
    });
  }, []);

  const markRead = useCallback((id: string) => dispatch({ type: 'MARK_READ', payload: id }), []);
  const markAllRead = useCallback(() => dispatch({ type: 'MARK_ALL_READ' }), []);
  const unreadCount = state.notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ ...state, addNotification, markRead, markAllRead, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}
