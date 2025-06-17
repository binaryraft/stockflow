
import { NextRequest, NextResponse } from 'next/server';
import { readDB } from '@/lib/db-access';
import type { User, Company, Store } from '@/types';
import bcrypt from 'bcryptjs';

const SHARED_AUTH_TOKEN = "DEMO_SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE"; 

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
      const userToVerify = db.users.find(u => u.role === 'admin' && u.email === email);
      if (userToVerify && userToVerify.password && bcrypt.compareSync(password, userToVerify.password)) {
        authenticatedUser = userToVerify;
      }
    } else if (loginType === 'employee') {
      if (!employeeId || !password) {
        return NextResponse.json({ success: false, message: 'Employee ID and password are required for employee login' }, { status: 400 });
      }
      const userToVerify = db.users.find(u => u.role === 'employee' && u.employeeId === employeeId);
      if (userToVerify && userToVerify.password && bcrypt.compareSync(password, userToVerify.password)) {
        authenticatedUser = userToVerify;
      }
    } else if (loginType === 'store') {
      if (!companyId || !storeId || !storePasskey) {
        return NextResponse.json({ success: false, message: 'Company ID, Store ID, and Store Passkey are required for store terminal login' }, { status: 400 });
      }
      // Store passkey is not hashed in this prototype. If it were, bcrypt comparison would be needed here too.
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
      const { password: _, ...userWithoutPassword } = authenticatedUser; // Exclude password from response
      return NextResponse.json({
        success: true,
        token: SHARED_AUTH_TOKEN, 
        user: userWithoutPassword, // Send user object without password
        // Deprecated direct fields, prefer user object:
        userId: authenticatedUser.id,
        userName: authenticatedUser.name,
        role: authenticatedUser.role,
        companyId: authenticatedUser.companyId,
        assignedStoreIds: authenticatedUser.role === 'employee' ? authenticatedUser.assignedStoreIds : undefined,
      });
    } else {
      return NextResponse.json({ success: false, message: 'Invalid credentials or user not found' }, { status: 401 });
    }

  } catch (error) {
    console.error('Login API error:', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
