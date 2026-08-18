
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import type { User, Store } from '@/types';
import bcrypt from 'bcryptjs';

const routeNamePrefix = "[API_AUTH_VERIFY_EMP_PASSKEY /api/auth/verify-employee-passkey]";

export async function POST(req: NextRequest) {
  console.log(`${routeNamePrefix} Received employee passkey verification request.`);
  try {
    const { db } = await connectToDatabase();
    const { employeePassword, storeId, companyId } = await req.json();

    if (!employeePassword || !storeId || !companyId) {
      console.warn(`${routeNamePrefix} Missing required fields. Required: employeePassword, storeId, companyId.`);
      return NextResponse.json({ success: false, message: 'Employee password, store ID, and company ID are required.' }, { status: 400 });
    }

    const store = await db.collection<Store>('stores').findOne({ id: storeId, companyId: companyId });
    if (!store) {
      console.warn(`${routeNamePrefix} Store not found (ID: ${storeId}) or does not belong to company (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Store not found or does not belong to this company.' }, { status: 404 });
    }

    const companyEmployees = await db.collection<User>('users').find({ role: 'employee', companyId: companyId }).toArray();

    let authenticatedEmployee: User | undefined = undefined;
    for (const emp of companyEmployees) {
      if (emp.password) {
        // Check if stored password is a bcrypt hash (starts with $2 and is 60 chars)
        const isHashed = emp.password.startsWith('$2') && emp.password.length === 60;
        if (isHashed) {
          if (bcrypt.compareSync(employeePassword, emp.password)) {
            authenticatedEmployee = emp;
            break;
          }
        } else {
          // Plain text comparison
          if (emp.password.trim() === employeePassword.trim()) {
            authenticatedEmployee = emp;
            break;
          }
        }
      }
    }

    if (!authenticatedEmployee) {
      console.warn(`${routeNamePrefix} Invalid employee credentials for company: ${companyId}. Password did not match any employee in this company.`);
      return NextResponse.json({ success: false, message: 'Invalid employee credentials.' }, { status: 401 });
    }

    const isExplicitlyAllowed = store.allowedStaffIds?.includes(authenticatedEmployee.id);
    const isGenerallyAllowedIfAssigned =
      (!store.allowedStaffIds || store.allowedStaffIds.length === 0) &&
      (authenticatedEmployee.assignedStoreIds?.includes(storeId) ?? false);
    const isCompanyEmployeeWithoutExplicitStoreAssignment = (!store.allowedStaffIds || store.allowedStaffIds.length === 0) && (!authenticatedEmployee.assignedStoreIds || authenticatedEmployee.assignedStoreIds.length === 0);

    if (isExplicitlyAllowed || isGenerallyAllowedIfAssigned || isCompanyEmployeeWithoutExplicitStoreAssignment) {
      console.log(`${routeNamePrefix} Employee ${authenticatedEmployee.id} (${authenticatedEmployee.name}) verified for store ${store.name} (ID: ${storeId}).`);
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
      console.warn(`${routeNamePrefix} Employee ${authenticatedEmployee.id} (${authenticatedEmployee.name}) not authorized for store ${store.name} (ID: ${storeId}).`);
      return NextResponse.json({ success: false, message: 'Employee not authorized for this store.' }, { status: 403 });
    }

  } catch (error) {
    console.error(`${routeNamePrefix} Error during employee verification:`, error);
    const message = error instanceof Error ? error.message : 'An unexpected internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
