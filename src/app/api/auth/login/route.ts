
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { User, Company, Store } from '@/types';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const SHARED_AUTH_TOKEN = "DEMO_SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE"; // Shared token for authenticated users

interface Database {
  companies: Company[];
  users: User[];
  stores: Store[];
}

async function readDB(): Promise<Database> {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data) as Database;
  } catch (error) {
    console.error("Error reading DB:", error);
    return { companies: [], users: [], stores: [] };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { loginType, email, password, employeeId, companyId, storeId, storePasskey } = body;

    if (!loginType) {
      return NextResponse.json({ success: false, message: 'Login type is required' }, { status: 400 });
    }

    const db = await readDB();
    let authenticatedUser: User | undefined = undefined;
    let authenticatedStore: Store | undefined = undefined;

    if (loginType === 'admin') {
      if (!email || !password) {
        return NextResponse.json({ success: false, message: 'Email and password are required for admin login' }, { status: 400 });
      }
      authenticatedUser = db.users.find(u => u.role === 'admin' && u.email === email && u.password === password);
    } else if (loginType === 'employee') {
      if (!employeeId || !password) {
        return NextResponse.json({ success: false, message: 'Employee ID and password are required for employee login' }, { status: 400 });
      }
      authenticatedUser = db.users.find(u => u.role === 'employee' && u.employeeId === employeeId && u.password === password);
    } else if (loginType === 'store') {
      if (!companyId || !storeId || !storePasskey) {
        return NextResponse.json({ success: false, message: 'Company ID, Store ID, and Store Passkey are required for store terminal login' }, { status: 400 });
      }
      authenticatedStore = db.stores.find(s => s.companyId === companyId && s.id === storeId && s.passkey === storePasskey);
      if (authenticatedStore) {
        return NextResponse.json({
          success: true,
          message: `Store terminal for ${authenticatedStore.name} authenticated.`,
          storeName: authenticatedStore.name,
          storeId: authenticatedStore.id,
          companyId: authenticatedStore.companyId,
        });
      } else {
        return NextResponse.json({ success: false, message: 'Invalid store credentials' }, { status: 401 });
      }
    } else {
      return NextResponse.json({ success: false, message: 'Invalid login type' }, { status: 400 });
    }

    if (authenticatedUser) {
      return NextResponse.json({
        success: true,
        token: SHARED_AUTH_TOKEN, // User gets this token for client-side session
        userId: authenticatedUser.id,
        userName: authenticatedUser.name,
        role: authenticatedUser.role,
        companyId: authenticatedUser.companyId,
        assignedStoreIds: authenticatedUser.role === 'employee' ? authenticatedUser.assignedStoreIds : undefined,
      });
    } else {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

  } catch (error) {
    console.error('Login API error:', error);
    // Check if error is an instance of Error and has a message property
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
