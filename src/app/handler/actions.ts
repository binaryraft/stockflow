
'use server';

import { readDB, writeDB } from '@/lib/db-access';
import type { Company, SubscriptionType, User } from '@/types';
import { add, sub } from 'date-fns';

const HANDLER_PASSWORD = 'admin1212';

export async function verifyPassword(password: string): Promise<{ success: boolean; error?: string }> {
  if (password === HANDLER_PASSWORD) {
    return { success: true };
  }
  return { success: false, error: 'Invalid password.' };
}

export async function getCustomers(): Promise<{ company: Company; admin: User | null }[]> {
  const db = await readDB();
  return db.companies.map(company => {
    const admin = db.users.find(u => u.companyId === company.id && u.role === 'admin') || null;
    return { company, admin };
  }).sort((a,b) => (a.company.paymentStatus === 'pending' ? -1 : 1)); // Show pending first
}

export async function markAsPaid(companyId: string, subscriptionType: SubscriptionType): Promise<{ success: boolean; error?: string }> {
  const db = await readDB();
  const companyIndex = db.companies.findIndex(c => c.id === companyId);

  if (companyIndex === -1) {
    return { success: false, error: 'Company not found.' };
  }

  const company = db.companies[companyIndex];
  const now = new Date();
  
  const expiryDate = subscriptionType === 'yearly'
    ? add(now, { years: 1 })
    : add(now, { months: 1 });
  
  // To be safe, set expiry to the end of the day
  expiryDate.setHours(23, 59, 59, 999);

  company.paymentStatus = 'paid';
  company.subscriptionStartDate = now.toISOString();
  company.subscriptionExpiryDate = expiryDate.toISOString();

  db.companies[companyIndex] = company;

  try {
    await writeDB(db);
    return { success: true };
  } catch (e) {
    console.error("Failed to write DB in markAsPaid:", e);
    return { success: false, error: 'Failed to save update to database.' };
  }
}
