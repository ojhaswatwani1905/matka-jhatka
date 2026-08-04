import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../store/AuthContext';

export type AuthGateAction = () => void;

export function useAuthGate() {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const pendingActionRef = useRef<AuthGateAction | null>(null);

  const requireAuth = useCallback((action: AuthGateAction) => {
    if (isAuthenticated) {
      action();
    } else {
      pendingActionRef.current = action;
      setIsOpen(true);
    }
  }, [isAuthenticated]);

  const onSuccess = useCallback(() => {
    setIsOpen(false);
    if (pendingActionRef.current) {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      // Small delay so auth state can settle
      setTimeout(action, 100);
    }
  }, []);

  const onClose = useCallback(() => {
    setIsOpen(false);
    pendingActionRef.current = null;
  }, []);

  return { requireAuth, isOpen, onSuccess, onClose };
}
