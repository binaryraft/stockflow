
// This file is deprecated. Admin billing is now at /admin/billing.
// Store billing is at /storeportal/[storeId]/billing.
// This file can be removed or left as a redirect if necessary.
export default function DeprecatedBillingPage() {
  if (typeof window !== 'undefined') {
    window.location.href = '/admin/billing'; // Or a more appropriate redirect
  }
  return null; 
}
