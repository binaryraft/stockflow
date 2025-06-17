
import { NextRequest, NextResponse } from 'next/server';
import { readDB } from '@/lib/db-access';
import type { User, Store } from '@/types';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { employeePassword, storeId, companyId } = await req.json();

    if (!employeePassword || !storeId || !companyId) {
      return NextResponse.json({ success: false, message: 'Employee password, store ID, and company ID are required' }, { status: 400 });
    }

    const db = await readDB();

    // Find the employee by companyId and verify password (assuming employeePassword is their main login password)
    // This implies employees use their main account password for this operational verification.
    // If a simpler, separate "operational passkey" was intended, this logic would differ.
    
    // First, find employees of the company
    const companyEmployees = db.users.filter(u => 
      u.role === 'employee' && 
      u.companyId === companyId
    );

    let authenticatedEmployee: User | undefined = undefined;
    for (const emp of companyEmployees) {
        if (emp.password && bcrypt.compareSync(employeePassword, emp.password)) {
            authenticatedEmployee = emp;
            break;
        }
    }


    if (!authenticatedEmployee) {
      return NextResponse.json({ success: false, message: 'Invalid employee credentials or employee does not belong to this company.' }, { status: 401 });
    }

    const store = db.stores.find(s => s.id === storeId && s.companyId === companyId);
    if (!store) {
      return NextResponse.json({ success: false, message: 'Store not found or does not belong to this company.' }, { status: 404 });
    }

    const isExplicitlyAllowed = store.allowedStaffIds?.includes(authenticatedEmployee.id);
    
    // An employee is considered generally allowed if:
    // 1. The store's allowedStaffIds list is empty (meaning no specific restrictions)
    // 2. AND the employee is assigned to *this specific store* in their User profile.
    const isGenerallyAllowedIfAssigned = 
        (!store.allowedStaffIds || store.allowedStaffIds.length === 0) && 
        (authenticatedEmployee.assignedStoreIds?.includes(storeId) ?? false);

    if (isExplicitlyAllowed || isGenerallyAllowedIfAssigned) {
      const { password, ...employeeWithoutPassword } = authenticatedEmployee;
      return NextResponse.json({
        success: true,
        employee: { // Return minimal necessary employee info
          id: employeeWithoutPassword.id,
          name: employeeWithoutPassword.name,
          employeeId: employeeWithoutPassword.employeeId,
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
