
// This file is deprecated. Staff management is now at /admin/staff.
// This file can be removed or left as a redirect.
export default function DeprecatedStaffPage() {
  if (typeof window !== 'undefined') {
    window.location.href = '/admin/staff';
  }
  return null;
}
