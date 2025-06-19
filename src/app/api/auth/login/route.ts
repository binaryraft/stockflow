
import { NextRequest, NextResponse } from 'next/server';
import { readDB } from '@/lib/db-access';
import type { User, Store } from '@/types';
import bcrypt from 'bcryptjs';

const SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE = "DEMO_SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE_V2"; // Updated token for clarity if needed

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
      const userToVerify = db.users.find(u => u.role === 'admin' && u.email?.toLowerCase() === email.toLowerCase());
      if (userToVerify && userToVerify.password && bcrypt.compareSync(password, userToVerify.password)) {
        authenticatedUser = userToVerify;
      }
    } else if (loginType === 'employee') {
      if (!employeeId || !password || !companyId) { // companyId is needed to find the right employee if employeeIds are not globally unique
        return NextResponse.json({ success: false, message: 'Employee ID, password, and company context are required for employee login' }, { status: 400 });
      }
      const userToVerify = db.users.find(u => u.role === 'employee' && u.employeeId === employeeId && u.companyId === companyId);
      if (userToVerify && userToVerify.password && bcrypt.compareSync(password, userToVerify.password)) {
        authenticatedUser = userToVerify;
      }
    } else if (loginType === 'store') {
      if (!companyId || !storeId || !storePasskey) {
        return NextResponse.json({ success: false, message: 'Company ID, Store ID, and Store Passkey are required for store terminal login' }, { status: 400 });
      }
      authenticatedStore = db.stores.find(s => s.companyId === companyId && s.id === storeId && s.passkey === storePasskey);
      if (authenticatedStore) {
        return NextResponse.json({
          success: true,
          message: `Store terminal for ${authenticatedStore.name} authenticated.`,
          store: {
            id: authenticatedStore.id,
            name: authenticatedStore.name,
            companyId: authenticatedStore.companyId,
            location: authenticatedStore.location,
            allowedOperations: authenticatedStore.allowedOperations,
          }
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
        token: SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE, 
        user: userWithoutPassword,
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

    