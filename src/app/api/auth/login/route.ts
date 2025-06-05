
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { User, Company } from '@/types'; // Assuming types are updated

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const SHARED_AUTH_TOKEN = "DEMO_SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE"; // Shared token

interface Database {
  companies: Company[];
  users: User[];
  stores: any[]; // Keep other parts of DB for now
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
    const { loginType, email, password, employeeId } = await req.json();

    if (!loginType) {
      return NextResponse.json({ success: false, message: 'Login type is required' }, { status: 400 });
    }

    const db = await readDB();
    let authenticatedUser: User | undefined = undefined;

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
    } else {
      return NextResponse.json({ success: false, message: 'Invalid login type' }, { status: 400 });
    }

    if (authenticatedUser) {
      // In a real app, generate a secure JWT. For this demo, use a shared static token.
      // The token itself doesn't encode role/company; that info is sent separately.
      return NextResponse.json({
        success: true,
        token: SHARED_AUTH_TOKEN,
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
    return NextResponse.json({ success: false, message: 'An internal server error occurred' }, { status: 500 });
  }
}
