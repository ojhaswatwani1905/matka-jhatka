import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

export type AuthGateAction = () => void;

export function useAuthGate() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const requireAuth = useCallback((action: AuthGateAction) => {
    if (isAuthenticated) {
      action();
    } else {
      // Skip the mini modal — go straight to the full Register page
      const returnTo = encodeURIComponent(location.pathname + location.search);
      navigate(`/auth/register?returnTo=${returnTo}`);
    }
  }, [isAuthenticated, navigate, location]);

  // Keep these so existing callers that spread AuthGateModal don't break —
  // the modal is never shown but the props are harmlessly unused.
  const isOpen = false;
  const onSuccess = useCallback(() => {}, []);
  const onClose = useCallback(() => {}, []);

  return { requireAuth, isOpen, onSuccess, onClose };
}
