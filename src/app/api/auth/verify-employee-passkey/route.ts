
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { User, Store } from '@/types';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

interface Database {
  users: User[];
  stores: Store[];
}

async function readDB(): Promise<Database> {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data) as Database;
  } catch (error) {
    console.error("Error reading DB for employee verification:", error);
    return { users: [], stores: [] };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { employeePassword, storeId, companyId } = await req.json();

    if (!employeePassword || !storeId || !companyId) {
      return NextResponse.json({ success: false, message: 'Employee password, store ID, and company ID are required' }, { status: 400 });
    }

    const db = await readDB();

    // Find the employee by password and companyId
    // In a real app, employeeId would be better than password for lookup, or use a session token.
    // Here, 'password' for employee is their passkey for operations.
    const employee = db.users.find(u => 
      u.role === 'employee' && 
      u.password === employeePassword && // Using main password as their operational passkey
      u.companyId === companyId
    );

    if (!employee) {
      return NextResponse.json({ success: false, message: 'Invalid employee credentials or employee does not belong to this company.' }, { status: 401 });
    }

    // Check if the employee is assigned to the store or if store allows all company employees
    const store = db.stores.find(s => s.id === storeId && s.companyId === companyId);
    if (!store) {
      return NextResponse.json({ success: false, message: 'Store not found or does not belong to this company.' }, { status: 404 });
    }

    const isExplicitlyAllowed = store.allowedStaffIds.includes(employee.id);
    const isGenerallyAllowed = store.allowedStaffIds.length === 0; // If no specific staff, any company employee assigned to ANY store might be allowed (depends on business rule).
                                                                 // For this prototype, if employee is assigned to *this* store, or if allowedStaffIds is empty AND employee is assigned to *any* store in the company
    const isAssignedToThisStore = employee.assignedStoreIds?.includes(storeId);

    if (isExplicitlyAllowed || (isGenerallyAllowed && isAssignedToThisStore)) {
      // Return minimal necessary employee info (excluding sensitive data like password)
      return NextResponse.json({
        success: true,
        employee: {
          id: employee.id,
          name: employee.name,
          employeeId: employee.employeeId,
        }
      });
    } else {
      return NextResponse.json({ success: false, message: 'Employee not authorized for this store.' }, { status: 403 });
    }

  } catch (error) {
    console.error('Employee verification API error:', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
