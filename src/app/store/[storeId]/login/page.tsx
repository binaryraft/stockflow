
// This file is deprecated. New path is /storeportal/[storeId]/login.
// This file can be removed or simply redirect.
export default function DeprecatedStoreLoginPage() {
  if (typeof window !== 'undefined') {
    const parts = window.location.pathname.split('/');
    const storeId = parts[2]; // Assuming format /store/[storeId]/login
    if (storeId) {
      window.location.href = `/storeportal/${storeId}/login`;
    } else {
      window.location.href = '/storeportal';
    }
  }
  return null;
}
