
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';
import { Building } from 'lucide-react';
import { EmployeePasskeyDialog } from '@/components/billing/employee-passkey-dialog';
import { getAllStoresToServer, getStoreDetailsByEmailFromServer } from '@/api/storeHandler';
import { getAllClientStoresToServer, getClientTokenFromServer } from '@/api/clientStoreHandler';
import { getTokenFromStorage, getUserFromToken } from '@/api/authHandler';
import { getEmployeeFromToken, getAllStaffToServer, getEmployeeTokenFromStorage, removeEmployeeTokenFromStorage, getStaffByIdToServer, getStaffDetailsForEmployee } from '@/api/staffHandler';

export default function StorePortalPage() {
  const router = useRouter();

  useEffect(() => {
    const fetchStores = async () => {
    const token = getTokenFromStorage()
    console.log('token', token)
    console.log("----------------------")
    const userDetails = await getEmployeeFromToken()
    console.log('ud', userDetails.data.user.email)
    const stores = await getAllStoresToServer()
    console.log('stores', stores)

    console.log('--------------')
    // const availableStores = await getAllStaffToServer()
    const availableStores = await getStaffDetailsForEmployee( userDetails.data.user.email)
    console.log(availableStores.data.data.accessibleStoreIds)
    };
    fetchStores();
  }, []);
  

  function handleLogout(event: MouseEvent<HTMLButtonElement, MouseEvent>): void {
    removeEmployeeTokenFromStorage();
    router.push("/");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <Image
        src="https://placehold.co/128x128.png"
        alt={`${APP_NAME} Logo`}
        width={80}
        height={80}
        className="mb-6 rounded-xl shadow-lg"
        data-ai-hint="logo company"
      />
      <h1 className="text-3xl font-bold text-primary mb-3">{APP_NAME} Store Portal</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        Welcome to the store portal. Store staff should access their specific store terminal using the unique URL provided by the administrator.
      </p>
      <div className="flex gap-4">
        <Button asChild variant="outline">
          <Link href="/admin/stores">
            <Building className="mr-2 h-4 w-4" /> View Stores (Admin)
          </Link>
        </Button>
        <Button asChild>
          <Link href="/">
            Back to Website
          </Link>
        </Button>

        <button onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
}


// TODO :

// 1) get accessible stores for loggedin Employee
// 2) On store Click, route to /storeportal/storeid