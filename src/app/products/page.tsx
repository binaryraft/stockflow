
// This file is deprecated. Products management is now at /admin/products.
// This file can be removed or left as a redirect.
export default function DeprecatedProductsPage() {
  if (typeof window !== 'undefined') {
    window.location.href = '/admin/products';
  }
  return null;
}
