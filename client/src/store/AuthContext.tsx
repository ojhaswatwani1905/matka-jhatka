import type { ReactNode } from 'react';
import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { AuthState, User } from '../types';

type AuthAction =
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> };

const DEMO_USER: User = {
  id: 'usr_84920194',
  name: 'Demo Player',
  email: 'player@tirangagames.com',
  phone: '+91 98765 43210',
  role: 'user',
  balance: 10000,
  createdAt: new Date().toISOString(),
};

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return { user: action.payload.user, token: action.payload.token, isAuthenticated: true, isLoading: false };
    case 'LOGOUT':
      return { user: null, token: null, isAuthenticated: false, isLoading: false };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    default:
      return state;
  }
}

interface AuthContextType extends AuthState {
  login: (email?: string, password?: string) => Promise<void>;
  register: (data: Partial<User> & { password?: string }) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const savedUser = localStorage.getItem('playarena_user');
    if (savedUser) {
      try {
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user: JSON.parse(savedUser), token: 'demo-token-123' } });
      } catch {
        localStorage.removeItem('playarena_user');
        dispatch({ type: 'LOGOUT' });
      }
    } else {
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  const login = useCallback(async (email?: string) => {
    const userToLogin: User = {
      ...DEMO_USER,
      name: email?.split('@')[0] || 'Demo Player',
      email: email || DEMO_USER.email,
    };
    localStorage.setItem('playarena_user', JSON.stringify(userToLogin));
    dispatch({ type: 'LOGIN_SUCCESS', payload: { user: userToLogin, token: 'demo-token-123' } });
  }, []);

  const register = useCallback(async (data: Partial<User> & { password?: string }) => {
    const newUser: User = {
      ...DEMO_USER,
      id: `usr_${Math.floor(10000000 + Math.random() * 90000000)}`,
      name: data.name || 'New Player',
      email: data.email || DEMO_USER.email,
      phone: data.phone || DEMO_USER.phone,
    };
    localStorage.setItem('playarena_user', JSON.stringify(newUser));
    dispatch({ type: 'LOGIN_SUCCESS', payload: { user: newUser, token: 'demo-token-123' } });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('playarena_user');
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: data });
    if (state.user) {
      localStorage.setItem('playarena_user', JSON.stringify({ ...state.user, ...data }));
    }
  }, [state.user]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
