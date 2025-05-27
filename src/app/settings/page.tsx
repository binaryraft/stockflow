
// This file is deprecated. Settings page is now at /admin/settings.
// This file can be removed or left as a redirect.
export default function DeprecatedSettingsPage() {
  if (typeof window !== 'undefined') {
    window.location.href = '/admin/settings';
  }
  return null;
}
