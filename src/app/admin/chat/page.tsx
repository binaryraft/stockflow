
"use client";

import { PageTitle } from '@/components/common/page-title';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { MessageSquare, Building } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function AdminChatListPage() {
  const stores = useInventoryStore((state) => state.getAllStores());

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Chat with Stores" icon={MessageSquare} />
      {stores.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Stores Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              There are no stores configured in the system yet. Please add stores in the 
              <Link href="/admin/stores" className="text-primary hover:underline ml-1">Store Management</Link> section.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <Card key={store.id} className="shadow-sm hover:shadow-md transition-shadow border-t-2 border-t-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building className="h-5 w-5 text-primary" />
                  {store.name}
                </CardTitle>
                <CardDescription>{store.location}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href={`/admin/chat/${store.id}`}>
                    <MessageSquare className="mr-2 h-4 w-4" /> Open Chat
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
