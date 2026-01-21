
'use server';

import { Suspense } from 'react';
import { HandlerAuth } from './_components/HandlerAuth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default async function HandlerPage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-6">Subscription Handler</h1>
        <Suspense fallback={<LoadingSpinner text="Loading Subscription Handler..." />}>
            <HandlerAuth />
        </Suspense>
      </div>
    </div>
  );
}
