
// This file is deprecated. New path is /storeportal/[storeId]/billing.
// This file can be removed or simply redirect.
export default function DeprecatedStoreBillingPage() {
  if (typeof window !== 'undefined') {
    const parts = window.location.pathname.split('/');
    const storeId = parts[2]; // Assuming format /store/[storeId]/billing
    if (storeId) {
      window.location.href = `/storeportal/${storeId}/billing`;
    } else {
      window.location.href = '/storeportal';
    }
  }
  return null;
}
