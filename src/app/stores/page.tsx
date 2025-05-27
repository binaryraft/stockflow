
// This file is deprecated. Store management is now at /admin/stores.
// Public store portal entry is at /storeportal.
// This file can be removed or left as a redirect.
export default function DeprecatedStoresPage() {
  if (typeof window !== 'undefined') {
    window.location.href = '/admin/stores';
  }
  return null;
}
