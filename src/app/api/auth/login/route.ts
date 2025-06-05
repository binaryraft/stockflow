import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const SHARED_AUTH_TOKEN = "DEMO_SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE"; // Shared token

interface User {
  id: string;
  username: string;
  password?: string; // Password for direct user login
  passkey?: string;  // Passkey for staff terminal access
  role: 'admin' | 'staff';
  name: string;
}

interface StaffMember extends User {
  role: 'staff';
  email: string;
  phone: string;
  accessibleStoreIds: string[];
}


async function readDB(): Promise<{ users: User[], staff: StaffMember[] }> {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading DB:", error);
    // If DB doesn't exist or is corrupted, return empty structure
    return { users: [], staff: [] };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { username, password, loginType } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, message: 'Username and password are required' }, { status: 400 });
    }

    const db = await readDB();
    
    let user: User | StaffMember | undefined = undefined;

    if (loginType === 'admin') {
        user = db.users.find(u => u.username === username && u.password === password && u.role === 'admin');
    } else if (loginType === 'employee_passkey') {
        // This part is a placeholder. For a real app, staff would be in db.json or a proper DB.
        // Here we assume the client (EmployeePasskeyDialog) still handles passkey verification against Zustand.
        // If we were to fully implement server-side staff passkey auth, we'd search db.staff.
        // For now, to fulfill the "same token" if an employee *were* to log in this way:
        // This is a conceptual path that's not fully wired up from the employee passkey dialog yet.
        // It's here to show how the shared token *would* be issued.
        // A real implementation would require the employee passkey dialog to call this endpoint.
        // For demo, let's assume if username is 'staffdemo' and password is 'staffpass', it's a valid conceptual staff login.
        if (username === 'staffdemo' && password === 'staffpass') {
            user = { id: 'staffdemo001', username: 'staffdemo', role: 'staff', name: 'Demo Staff Member' } as User; // Simplified
        }
    }


    if (user) {
      // In a real app, generate a secure JWT. For this demo, use a shared static token.
      return NextResponse.json({ success: true, token: SHARED_AUTH_TOKEN, userName: user.name, role: user.role });
    } else {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ success: false, message: 'An internal server error occurred' }, { status: 500 });
  }
}