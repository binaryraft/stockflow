
import { NextRequest, NextResponse } from 'next/server';
import { readDB } from '@/lib/db-access';
import type { User, Store } from '@/types';
import bcrypt from 'bcryptjs';

const routeNamePrefix = "[API_AUTH_VERIFY_EMP_PASSKEY /api/auth/verify-employee-passkey]";

export async function POST(req: NextRequest) {
  console.log(`${routeNamePrefix} Received employee passkey verification request.`);
  try {
    const { employeePassword, storeId, companyId } = await req.json();

    if (!employeePassword || !storeId || !companyId) {
      console.warn(`${routeNamePrefix} Missing required fields. Required: employeePassword, storeId, companyId.`);
      return NextResponse.json({ success: false, message: 'Employee password, store ID, and company ID are required.' }, { status: 400 });
    }

    const db = await readDB();
    
    // Find the store first to ensure it belongs to the company
    const store = db.stores.find(s => s.id === storeId && s.companyId === companyId);
    if (!store) {
      console.warn(`${routeNamePrefix} Store not found (ID: ${storeId}) or does not belong to company (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Store not found or does not belong to this company.' }, { status: 404 });
    }

    // Find all employees of the given company
    const companyEmployees = db.users.filter(u => u.role === 'employee' && u.companyId === companyId);

    let authenticatedEmployee: User | undefined = undefined;
    for (const emp of companyEmployees) {
        if (emp.password && bcrypt.compareSync(employeePassword, emp.password)) {
            authenticatedEmployee = emp;
            break;
        }
    }

    if (!authenticatedEmployee) {
      console.warn(`${routeNamePrefix} Invalid employee credentials for company: ${companyId}. Password did not match any employee in this company.`);
      return NextResponse.json({ success: false, message: 'Invalid employee credentials.' }, { status: 401 });
    }

    // Check if the authenticated employee is allowed to access this specific store
    const isExplicitlyAllowed = store.allowedStaffIds?.includes(authenticatedEmployee.id);
    // If allowedStaffIds is empty, any employee assigned to this store (or all stores if no specific assignment) is allowed
    const isGenerallyAllowedIfAssigned =
        (!store.allowedStaffIds || store.allowedStaffIds.length === 0) &&
        (authenticatedEmployee.assignedStoreIds?.includes(storeId) ?? false);
    // A simpler general access: if allowedStaffIds is empty, any employee of the company is allowed (assuming no specific store assignment logic is strictly enforced here)
    const isCompanyEmployeeWithoutExplicitStoreAssignment = (!store.allowedStaffIds || store.allowedStaffIds.length === 0) && (!authenticatedEmployee.assignedStoreIds || authenticatedEmployee.assignedStoreIds.length === 0);

    if (isExplicitlyAllowed || isGenerallyAllowedIfAssigned || isCompanyEmployeeWithoutExplicitStoreAssignment) {
      console.log(`${routeNamePrefix} Employee ${authenticatedEmployee.id} (${authenticatedEmployee.name}) verified for store ${store.name} (ID: ${storeId}).`);
      const { password, ...employeeWithoutPassword } = authenticatedEmployee; // Exclude password from response
      return NextResponse.json({
        success: true,
        employee: {
          id: employeeWithoutPassword.id,
          name: employeeWithoutPassword.name,
          employeeId: employeeWithoutPassword.employeeId,
        }
      });
    } else {
      console.warn(`${routeNamePrefix} Employee ${authenticatedEmployee.id} (${authenticatedEmployee.name}) not authorized for store ${store.name} (ID: ${storeId}).`);
      return NextResponse.json({ success: false, message: 'Employee not authorized for this store.' }, { status: 403 });
    }

  } catch (error) {
    console.error(`${routeNamePrefix} Error during employee verification:`, error);
    const message = error instanceof Error ? error.message : 'An unexpected internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
