"use client";

// This file is deprecated.
// Financial reporting functionality has been moved to the new /admin/accounting page.
// This file can be removed or left as a redirect.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeprecatedReportsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/accounting');
  }, [router]);

  return null;
}
