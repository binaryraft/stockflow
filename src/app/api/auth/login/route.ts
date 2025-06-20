
import { NextRequest, NextResponse } from 'next/server';
import { readDB } from '@/lib/db-access';
import type { User, Store } from '@/types';
import bcrypt from 'bcryptjs';

const SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE = "DEMO_SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE_V2"; // This should be a securely managed token or session mechanism in production
const routeNamePrefix = "[API_AUTH_LOGIN /api/auth/login]";

export async function POST(req: NextRequest) {
  console.log(`${routeNamePrefix} Received login request.`);
  try {
    const body = await req.json();
    const { loginType, email, password, employeeId, companyId, storeId, storePasskey } = body;

    if (!loginType) {
      console.warn(`${routeNamePrefix} Login type is required.`);
      return NextResponse.json({ success: false, message: 'Login type is required.' }, { status: 400 });
    }

    const db = await readDB();
    let authenticatedUser: User | undefined = undefined;
    let authenticatedStore: Store | undefined = undefined;

    if (loginType === 'admin') {
      if (!email || !password) {
        console.warn(`${routeNamePrefix} Email and password are required for admin login.`);
        return NextResponse.json({ success: false, message: 'Email and password are required for admin login.' }, { status: 400 });
      }
      const userToVerify = db.users.find(u => u.role === 'admin' && u.email?.toLowerCase() === email.toLowerCase());
      if (userToVerify && userToVerify.password && bcrypt.compareSync(password, userToVerify.password)) {
        authenticatedUser = userToVerify;
        console.log(`${routeNamePrefix} Admin user ${email} authenticated successfully.`);
      } else {
        console.warn(`${routeNamePrefix} Admin login failed for email: ${email}. Invalid credentials or user not found.`);
      }
    } else if (loginType === 'employee') {
      if (!employeeId || !password || !companyId) {
        console.warn(`${routeNamePrefix} Employee ID, password, and company context are required for employee login.`);
        return NextResponse.json({ success: false, message: 'Employee ID, password, and company context are required for employee login.' }, { status: 400 });
      }
      const userToVerify = db.users.find(u => u.role === 'employee' && u.employeeId === employeeId && u.companyId === companyId);
      if (userToVerify && userToVerify.password && bcrypt.compareSync(password, userToVerify.password)) {
        authenticatedUser = userToVerify;
        console.log(`${routeNamePrefix} Employee ${employeeId} from company ${companyId} authenticated successfully.`);
      } else {
         console.warn(`${routeNamePrefix} Employee login failed for employeeId: ${employeeId}, companyId: ${companyId}. Invalid credentials or user not found.`);
      }
    } else if (loginType === 'store') {
      if (!companyId || !storeId || !storePasskey) {
        console.warn(`${routeNamePrefix} Company ID, Store ID, and Store Passkey are required for store terminal login.`);
        return NextResponse.json({ success: false, message: 'Company ID, Store ID, and Store Passkey are required for store terminal login.' }, { status: 400 });
      }
      authenticatedStore = db.stores.find(s => s.companyId === companyId && s.id === storeId && s.passkey === storePasskey);
      if (authenticatedStore) {
        console.log(`${routeNamePrefix} Store terminal ${storeId} for company ${companyId} authenticated successfully.`);
        // For store login, we only return store details, not a full user object or token like admin/employee
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
        console.warn(`${routeNamePrefix} Store terminal login failed for storeId: ${storeId}, companyId: ${companyId}. Invalid store credentials.`);
        return NextResponse.json({ success: false, message: 'Invalid store credentials.' }, { status: 401 });
      }
    } else {
      console.warn(`${routeNamePrefix} Invalid login type: ${loginType}.`);
      return NextResponse.json({ success: false, message: 'Invalid login type specified.' }, { status: 400 });
    }

    if (authenticatedUser) {
      const { password: _, ...userWithoutPassword } = authenticatedUser; // Exclude password from response
      return NextResponse.json({
        success: true,
        token: SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE, // In a real app, generate a unique JWT
        user: userWithoutPassword,
      });
    } else {
      console.warn(`${routeNamePrefix} Authentication failed for loginType: ${loginType}.`);
      return NextResponse.json({ success: false, message: 'Invalid credentials or user not found.' }, { status: 401 });
    }

  } catch (error) {
    console.error(`${routeNamePrefix} Error during login process:`, error);
    const message = error instanceof Error ? error.message : 'An unexpected internal server error occurred during login.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
