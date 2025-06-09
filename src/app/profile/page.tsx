
// This file is deprecated. Profile management is now at /admin/profile.
// This file can be removed or left as a redirect.
export default function DeprecatedProfilePage() {
  if (typeof window !== 'undefined') {
    window.location.href = '/admin/profile';
  }
  return null;
}
