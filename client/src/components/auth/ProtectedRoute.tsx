import { type ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../ui/Toast';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { addToast } = useToast();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      addToast({
        type: 'warning',
        title: 'Sign In Required',
        message: 'Please sign in or create an account to access games and place bets.',
      });
    }
  }, [isLoading, isAuthenticated, addToast]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
