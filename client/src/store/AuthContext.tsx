import type { ReactNode } from 'react';
import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { AuthState, User } from '../types';

type AuthAction =
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> };

const ADMIN_USER: User = {
  id: 'usr_admin_001',
  name: 'Admin',
  email: 'admin@playarena.com',
  phone: '+91 99999 00000',
  role: 'admin',
  isAdmin: true,
  isActive: true,
  balance: 0,
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
  login: (email?: string, password?: string, rememberMe?: boolean) => Promise<void>;
  register: (data: Partial<User> & { password?: string }) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const savedUser = localStorage.getItem('playarena_user');
    const savedToken = localStorage.getItem('token') || localStorage.getItem('playarena_token');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        const token = savedToken || (parsed.role === 'admin' ? 'admin-token-abc' : `usr-token-${parsed.id}`);
        localStorage.setItem('token', token);
        localStorage.setItem('playarena_token', token);
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user: parsed, token } });
      } catch {
        localStorage.removeItem('playarena_user');
        localStorage.removeItem('token');
        localStorage.removeItem('playarena_token');
        dispatch({ type: 'LOGOUT' });
      }
    } else {
      dispatch({ type: 'LOGOUT' });
    }

    // Listen for force-logout custom event
    const handleRevoked = () => {
      localStorage.removeItem('playarena_user');
      localStorage.removeItem('token');
      localStorage.removeItem('playarena_token');
      dispatch({ type: 'LOGOUT' });
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login?reason=session_admin_revoked';
      }
    };

    window.addEventListener('session:admin_revoked', handleRevoked);
    return () => window.removeEventListener('session:admin_revoked', handleRevoked);
  }, []);

  const login = useCallback(async (email?: string, password?: string, rememberMe?: boolean) => {
    // Admin login shortcut
    if (email === 'admin@playarena.com' && (!password || password === 'adminpassword123')) {
      localStorage.setItem('playarena_user', JSON.stringify(ADMIN_USER));
      localStorage.setItem('token', 'admin-token-abc');
      localStorage.setItem('playarena_token', 'admin-token-abc');
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user: ADMIN_USER, token: 'admin-token-abc' } });
      return;
    }

    // Try backend API login
    if (email && password) {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, rememberMe }),
        });
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          const apiUser: User = {
            id: json.data.user.id,
            name: json.data.user.name,
            email: json.data.user.email,
            role: json.data.user.role === 'admin' ? 'admin' : 'user',
            isAdmin: json.data.user.role === 'admin',
            isActive: true,
            balance: json.data.user.balance || 0,
            createdAt: new Date().toISOString(),
          };
          localStorage.setItem('playarena_user', JSON.stringify(apiUser));
          localStorage.setItem('token', json.data.token);
          localStorage.setItem('playarena_token', json.data.token);
          dispatch({ type: 'LOGIN_SUCCESS', payload: { user: apiUser, token: json.data.token } });
          return;
        } else {
          throw new Error(json.message || 'Invalid email or password');
        }
      } catch (err: any) {
        if (err.message !== 'Failed to fetch' && err.name !== 'TypeError') {
          throw err;
        }
        // Fallback to local user store if backend server unreachable
      }
    }

    // Check multi-user local database
    const targetEmail = email || 'player@tirangagames.com';
    const creds: Record<string, string> = JSON.parse(localStorage.getItem('playarena_creds') || '{}');
    const users: User[] = JSON.parse(localStorage.getItem('playarena_users') || '[]');
    const existing = users.find(u => u.email.toLowerCase() === targetEmail.toLowerCase());

    if (existing && creds[targetEmail.toLowerCase()] && password && creds[targetEmail.toLowerCase()] !== password) {
      throw new Error('Invalid email or password');
    }

    const isAdminEmail = targetEmail.toLowerCase() === 'admin@playarena.com';
    const userToLogin: User = existing || {
      id: isAdminEmail ? 'usr_admin_001' : `usr_${Math.floor(10000000 + Math.random() * 90000000)}`,
      name: isAdminEmail ? 'Admin' : targetEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      email: targetEmail,
      phone: isAdminEmail ? '+91 99999 00000' : '+91 98765 43210',
      role: isAdminEmail ? 'admin' : 'user',
      isAdmin: isAdminEmail,
      isActive: true,
      balance: 0,
      createdAt: new Date().toISOString(),
    };

    const token = `usr-token-${userToLogin.id}`;
    localStorage.setItem('playarena_user', JSON.stringify(userToLogin));
    localStorage.setItem('token', token);
    localStorage.setItem('playarena_token', token);

    if (!existing) {
      localStorage.setItem('playarena_users', JSON.stringify([...users, userToLogin]));
    }
    if (password) {
      creds[targetEmail.toLowerCase()] = password;
      localStorage.setItem('playarena_creds', JSON.stringify(creds));
    }

    dispatch({ type: 'LOGIN_SUCCESS', payload: { user: userToLogin, token } });
  }, []);

  const register = useCallback(async (data: Partial<User> & { password?: string }) => {
    // Try backend API registration first
    if (data.email && data.password && data.name) {
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: data.name, email: data.email, password: data.password, phone: data.phone }),
        });
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          const apiUser: User = {
            id: json.data.user.id,
            name: json.data.user.name,
            email: json.data.user.email,
            phone: data.phone,
            role: 'user',
            isAdmin: false,
            isActive: true,
            balance: json.data.user.balance || 0,
            createdAt: new Date().toISOString(),
          };
          localStorage.setItem('playarena_user', JSON.stringify(apiUser));
          localStorage.setItem('token', json.data.token);
          localStorage.setItem('playarena_token', json.data.token);
          dispatch({ type: 'LOGIN_SUCCESS', payload: { user: apiUser, token: json.data.token } });
          return;
        } else if (res.status === 400) {
          throw new Error(json.message || 'An account with this email already exists.');
        }
      } catch (err: any) {
        if (err.message === 'An account with this email already exists.' || err.message === 'Email already registered') {
          throw err;
        }
        // Fallback to local storage if API server unreachable or DB offline
      }
    }

    const regName = data.name || (data.email ? data.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'New Player');
    const regEmail = data.email || `player_${Date.now()}@playarena.com`;

    const users: User[] = JSON.parse(localStorage.getItem('playarena_users') || '[]');
    if (users.find(u => u.email.toLowerCase() === regEmail.toLowerCase())) {
      throw new Error('An account with this email already exists.');
    }

    const newUser: User = {
      id: `usr_${Math.floor(10000000 + Math.random() * 90000000)}`,
      name: regName,
      email: regEmail,
      phone: data.phone || '+91 98765 43210',
      role: 'user',
      isAdmin: false,
      isActive: true,
      balance: 0,
      createdAt: new Date().toISOString(),
    };

    const token = `usr-token-${newUser.id}`;
    localStorage.setItem('playarena_user', JSON.stringify(newUser));
    localStorage.setItem('token', token);
    localStorage.setItem('playarena_token', token);

    // Sync to multi-user store
    localStorage.setItem('playarena_users', JSON.stringify([...users, newUser]));
    if (data.password) {
      const creds: Record<string, string> = JSON.parse(localStorage.getItem('playarena_creds') || '{}');
      creds[regEmail.toLowerCase()] = data.password;
      localStorage.setItem('playarena_creds', JSON.stringify(creds));
    }

    dispatch({ type: 'LOGIN_SUCCESS', payload: { user: newUser, token } });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('playarena_user');
    localStorage.removeItem('token');
    localStorage.removeItem('playarena_token');
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: data });
    if (state.user) {
      const updated = { ...state.user, ...data };
      localStorage.setItem('playarena_user', JSON.stringify(updated));
      // Sync to multi-user store
      const users: User[] = JSON.parse(localStorage.getItem('playarena_users') || '[]');
      const idx = users.findIndex(u => u.id === updated.id);
      if (idx >= 0) users[idx] = updated;
      localStorage.setItem('playarena_users', JSON.stringify(users));
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
