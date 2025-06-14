
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
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
    // If the file doesn't exist or is invalid, return a default structure
    return { companies: [], users: [], stores: [] };
  }
}

async function writeDB(data: Database): Promise<void> {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error("Error writing DB:", error);
    throw new Error("Could not save data to the database.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyName, adminName, email, password } = body;

    if (!companyName || !adminName || !email || !password) {
      return NextResponse.json({ success: false, message: 'All fields are required for signup (Company Name, Admin Name, Email, Password).' }, { status: 400 });
    }

    const db = await readDB();

    // Check if admin email already exists
    const existingAdmin = db.users.find(u => u.email === email && u.role === 'admin');
    if (existingAdmin) {
      return NextResponse.json({ success: false, message: 'An admin account with this email already exists.' }, { status: 409 }); // 409 Conflict
    }

    // Create new company
    const newCompany: Company = {
      id: `comp_${uuidv4()}`,
      name: companyName,
      token: `TOKEN_${uuidv4().toUpperCase()}` // Simple token generation for prototype
    };
    db.companies.push(newCompany);

    // Create new admin user
    const newAdminUser: User = {
      id: `user_admin_${uuidv4()}`,
      companyId: newCompany.id,
      name: adminName,
      email: email,
      password: password, // Storing password in plaintext for prototype. HASH IN PRODUCTION!
      role: 'admin',
    };
    db.users.push(newAdminUser);

    await writeDB(db);

    // Return success response, including token and user info for auto-login
    return NextResponse.json({
      success: true,
      message: `Company "${newCompany.name}" and admin user "${newAdminUser.name}" created successfully.`,
      token: SHARED_AUTH_TOKEN,
      userId: newAdminUser.id,
      userName: newAdminUser.name,
      role: newAdminUser.role,
      companyId: newAdminUser.companyId,
    });

  } catch (error) {
    console.error('Signup API error:', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred during signup.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
    