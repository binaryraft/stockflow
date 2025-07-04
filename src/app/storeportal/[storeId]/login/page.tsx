
// This file is deprecated. New path is /storeportal.
// This component performs a server-side redirect to the unified login page,
// passing the storeId as a query parameter.

import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Redirecting...',
};

export default function DeprecatedStoreSpecificLoginPage({
  params,
  searchParams,
}: {
  params: { storeId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { storeId } = params;
  
  // Construct a new URLSearchParams object to preserve existing query params and add new ones.
  const newSearchParams = new URLSearchParams();

  // Add storeId to the new search params
  if (storeId) {
    newSearchParams.set('storeId', storeId);
  }

  // Preserve other query params like companyId if they exist
  for (const key in searchParams) {
    const value = searchParams[key];
    if (value && key !== 'storeId') { // Avoid duplicating storeId if it's somehow in searchParams
      newSearchParams.set(key, Array.isArray(value) ? value[0] : value);
    }
  }

  // Perform the redirect to the unified store portal login page
  redirect(`/storeportal?${newSearchParams.toString()}`);
}
