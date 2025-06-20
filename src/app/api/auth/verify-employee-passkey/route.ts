
import { NextRequest, NextResponse } from 'next/server';
import { readDB } from '@/lib/db-access';
import type { User, Store } from '@/types';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  console.log("[API_AUTH_VERIFY_EMP_PASSKEY] Received employee passkey verification request.");
  try {
    const { employeePassword, storeId, companyId } = await req.json();

    if (!employeePassword || !storeId || !companyId) {
      console.warn("[API_AUTH_VERIFY_EMP_PASSKEY] Missing required fields.");
      return NextResponse.json({ success: false, message: 'Employee password, store ID, and company ID are required' }, { status: 400 });
    }

    const db = await readDB();
    const companyEmployees = db.users.filter(u => u.role === 'employee' && u.companyId === companyId);

    let authenticatedEmployee: User | undefined = undefined;
    for (const emp of companyEmployees) {
        if (emp.password && bcrypt.compareSync(employeePassword, emp.password)) {
            authenticatedEmployee = emp;
            break;
        }
    }

    if (!authenticatedEmployee) {
      console.warn(`[API_AUTH_VERIFY_EMP_PASSKEY] Invalid employee credentials for company: ${companyId}.`);
      return NextResponse.json({ success: false, message: 'Invalid employee credentials or employee does not belong to this company.' }, { status: 401 });
    }

    const store = db.stores.find(s => s.id === storeId && s.companyId === companyId);
    if (!store) {
      console.warn(`[API_AUTH_VERIFY_EMP_PASSKEY] Store not found (ID: ${storeId}) or does not belong to company (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Store not found or does not belong to this company.' }, { status: 404 });
    }

    const isExplicitlyAllowed = store.allowedStaffIds?.includes(authenticatedEmployee.id);
    const isGenerallyAllowedIfAssigned =
        (!store.allowedStaffIds || store.allowedStaffIds.length === 0) &&
        (authenticatedEmployee.assignedStoreIds?.includes(storeId) ?? false);

    if (isExplicitlyAllowed || isGenerallyAllowedIfAssigned) {
      console.log(`[API_AUTH_VERIFY_EMP_PASSKEY] Employee ${authenticatedEmployee.id} verified for store ${storeId}.`);
      const { password, ...employeeWithoutPassword } = authenticatedEmployee;
      return NextResponse.json({
        success: true,
        employee: {
          id: employeeWithoutPassword.id,
          name: employeeWithoutPassword.name,
          employeeId: employeeWithoutPassword.employeeId,
        }
      });
    } else {
      console.warn(`[API_AUTH_VERIFY_EMP_PASSKEY] Employee ${authenticatedEmployee.id} not authorized for store ${storeId}.`);
      return NextResponse.json({ success: false, message: 'Employee not authorized for this store.' }, { status: 403 });
    }

  } catch (error) {
    console.error('[API_AUTH_VERIFY_EMP_PASSKEY] Error during employee verification:', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
