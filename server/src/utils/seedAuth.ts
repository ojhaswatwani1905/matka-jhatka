import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';

export async function seedDemoAccounts() {
  try {
    const adminPassword = await bcrypt.hash('adminpassword123', 12);
    const demoPlayerPassword = await bcrypt.hash('demoplayer123', 12);

    await prisma.user.upsert({
      where: { email: 'admin@playarena.com' },
      update: { password: adminPassword, role: 'admin' },
      create: {
        id: 'usr_admin_001',
        name: 'Admin',
        email: 'admin@playarena.com',
        password: adminPassword,
        phone: '+91 99999 00000',
        role: 'admin',
        balance: 100000,
      },
    });

    await prisma.user.upsert({
      where: { email: 'demoplayer@playarena.com' },
      update: { password: demoPlayerPassword },
      create: {
        id: 'usr_84920194',
        name: 'Demo Player',
        email: 'demoplayer@playarena.com',
        password: demoPlayerPassword,
        phone: '+91 98765 43210',
        role: 'user',
        balance: 10000,
      },
    });

    console.log('✅ Demo accounts seeded: admin@playarena.com & demoplayer@playarena.com');
  } catch {
    console.warn('[SeedAuth] Database offline or skipped.');
  }
}
