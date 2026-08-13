export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  balance: number;
  isActive: boolean;
  createdAt: string;
}

export const inMemoryUsersStore: UserRecord[] = [
  {
    id: 'usr_84920194',
    name: 'Demo Player',
    email: 'player@tirangagames.com',
    phone: '+91 98765 43210',
    role: 'user',
    balance: 0,
    isActive: true,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'usr_admin_001',
    name: 'Admin',
    email: 'admin@playarena.com',
    phone: '+91 99999 00000',
    role: 'admin',
    balance: 0,
    isActive: true,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
];

export function addInMemoryUser(user: Partial<UserRecord> & { name: string; email: string }): UserRecord {
  const existingIdx = inMemoryUsersStore.findIndex(
    u => (user.id && u.id === user.id) || (user.email && u.email.toLowerCase() === user.email.toLowerCase())
  );
  const newUser: UserRecord = {
    id: user.id || `usr_${Math.floor(10000000 + Math.random() * 90000000)}`,
    name: user.name,
    email: user.email,
    phone: user.phone || '+91 98765 43210',
    role: user.role || 'user',
    balance: typeof user.balance === 'number' ? user.balance : 0,
    isActive: user.isActive !== undefined ? user.isActive : true,
    createdAt: user.createdAt || new Date().toISOString(),
  };
  if (existingIdx >= 0) {
    inMemoryUsersStore[existingIdx] = { ...inMemoryUsersStore[existingIdx], ...newUser };
    return inMemoryUsersStore[existingIdx];
  } else {
    inMemoryUsersStore.unshift(newUser);
    return newUser;
  }
}

export function updateInMemoryUserBalance(userId: string, delta: number): UserRecord | null {
  const user = inMemoryUsersStore.find(u => u.id === userId || u.email.toLowerCase() === userId.toLowerCase());
  if (user) {
    user.balance = Math.max(0, user.balance + delta);
    return user;
  }
  return null;
}
