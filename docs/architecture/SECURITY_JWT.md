
# Security Hardening: JWT Implementation

## Current State
Authentication relies on a Shared Secret (`SHARED_AUTH_TOKEN_ADMIN_EMPLOYEE`) and passing `companyId` in query strings or storage.
**Risk**: High. If the secret leaks, anyone can spoof an admin.

## Target Architecture

### 1. Token Structure (Stateless)
**Access Token (15 min expiry):**
```json
{
  "sub": "user_123",
  "role": "admin",
  "companyId": "comp_XYZ",
  "iat": 1700000000,
  "exp": 1700000900
}
```

**Refresh Token (7 day expiry, HttpOnly Cookie):**
*   Stored in secure, HTTP-only cookie to prevent XSS theft.
*   Used to rotate access tokens silently.

### 2. Middleware Protection
We will implement Next.js Middleware (`middleware.ts`) to intercept **all** API requests to `/api/*` (except public endpoints).

```typescript
// middleware.ts concept
export function middleware(req) {
  const token = req.headers.get('Authorization');
  if (!verify(token)) return 401;
  // Pass user context to headers for the actual route handler
  const payload = decode(token);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', payload.sub);
  return NextResponse.next({ headers: requestHeaders });
}
```

### 3. Client Side
*   **Axios/Fetch Interceptor**: Automatically attach `Bearer <token>` to every request.
*   **Auto-Logout**: If refresh fails, redirect to login immediately.

## Rollout Plan
1.  Setup `lib/auth.ts` utils (sign/verify).
2.  Create `/api/auth/token` endpoint for login/refresh.
3.  Update one low-risk route (e.g., `GET /api/notifications`) to enforce it.
4.  Migrate all critical routes.
