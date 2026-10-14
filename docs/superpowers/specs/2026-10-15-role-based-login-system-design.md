# Role-Based Authentication & Access Control (RBAC) System Design Specification

- **Date:** 2026-10-15
- **Status:** Approved
- **Target Platform:** Next.js 15 (App Router), React 19, Tailwind CSS, Node.js >=22 (Native ESM & TypeScript)
- **Document Path:** `docs/superpowers/specs/2026-10-15-role-based-login-system-design.md`

---

## 1. Executive Summary & Purpose

The Wood Inventory Management & Timber Receiving application requires an industrial-grade, role-based login and session system. In real-world sawmill and timber yard operations, different personnel operate under strict divisions of responsibility:
1. **Mill Operations Managers / Scalers (Level 1)**: Inspect timber deliveries, record gate tallies, edit discrepancies, delete void entries, and manage batches.
2. **Finance, Auditing & Administrative Staff (Level 2)**: Oversee invoices, verify volume discrepancies, review PPh 22/23 deductions, and export reports without altering operational records.
3. **Executive Management / Board (Level 3)**: Monitor overall stock levels, species distributions, and financial exposure through real-time KPI dashboards without exposing raw data operational controls.

This design implements a secure, zero-dependency session authentication system using standard Node.js cryptographic primitives (`node:crypto` HMAC-SHA256) stored in HTTP-only cookies, combined with Next.js edge-compatible middleware route guarding and React UI role gating.

---

## 2. Role-Based Permissions Matrix (RBAC)

| Capability / View | Level 1: Manager (管理员/经办人) | Level 2: Admin/Auditor (审计/财务) | Level 3: Monitor (高管监控) |
| :--- | :---: | :---: | :---: |
| **Route Access: `/` (Dashboard)** | ✅ Full Access | ✅ Full Access | ✅ Monitor Only |
| **Route Access: `/login`** | Redirects to `/` if logged in | Redirects to `/` if logged in | Redirects to `/` if logged in |
| **Executive KPI Cards** | ✅ Visible | ✅ Visible | ✅ Visible |
| **Species Distribution Chart** | ✅ Visible | ✅ Visible | ✅ Visible |
| **Search & Species Filter Toolbar** | ✅ Visible & Active | ✅ Visible & Active | ❌ Hidden |
| **Export Ledger to CSV** | ✅ Allowed | ✅ Allowed | ❌ Hidden |
| **Add Inbound Record (`+ Input`)** | ✅ Allowed | ❌ Hidden & Gated | ❌ Hidden & Gated |
| **Edit Existing Record** | ✅ Allowed | ❌ Hidden & Gated | ❌ Hidden & Gated |
| **Delete Record** | ✅ Allowed | ❌ Hidden & Gated | ❌ Hidden & Gated |
| **Reset Demo Database** | ✅ Allowed | ❌ Hidden & Gated | ❌ Hidden & Gated |
| **Detailed Receiving Ledger Table** | ✅ Full Table + Actions | ✅ Full Table (Read-Only) | ❌ Hidden (Restricted Banner) |
| **Inbound Record Modal Dialog** | ✅ Add / Edit Forms | ❌ Inaccessible | ❌ Inaccessible |

---

## 3. Pre-configured Factory Accounts

| Role Level | Full Name | Email Address | Default Password | Initial Title |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Budi Santoso | `manager@timber.id` | `password123` | Kepala Operasional Gudang (Operations Manager) |
| **2** | Siti Rahmawati | `admin@timber.id` | `password123` | Auditor Keuangan & Pajak (Finance Auditor) |
| **3** | Robert Tan | `viewer@timber.id` | `password123` | Direktur Eksekutif (Executive Director) |

---

## 4. Single Source of Truth (SSOT) Types

All domain authentication interfaces are defined in `src/types/index.ts`:

```typescript
export type UserRoleLevel = 1 | 2 | 3;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roleLevel: UserRoleLevel;
  title: string;
}

export interface AuthSession {
  user: AuthUser;
  expiresAt: number; // Unix epoch timestamp (ms)
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthApiResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
}
```

---

## 5. Security & Session Architecture

### 5.1 Zero-Dependency Stateless Token (HMAC-SHA256)
- **Token Format**: Base64URL-encoded payload concatenated with an HMAC-SHA256 signature:
  `[payloadBase64].[signatureBase64]`
- **Payload Schema**:
  ```json
  {
    "userId": "usr-01",
    "email": "manager@timber.id",
    "roleLevel": 1,
    "name": "Budi Santoso",
    "title": "Kepala Operasional Gudang",
    "exp": 1792080000000
  }
  ```
- **Secret Key**: Sourced from `process.env.SESSION_SECRET` with a secure hardcoded fallback for local development (`"wood-inventory-development-secret-key-32chars-min"`).
- **Constant-Time Verification**: All signature checks utilize `crypto.timingSafeEqual` to prevent timing attacks.
- **Cookie Security Attributes**:
  - `Name`: `wood_session`
  - `HttpOnly`: `true` (unreadable via browser JavaScript)
  - `Secure`: `process.env.NODE_ENV === 'production'`
  - `SameSite`: `'lax'`
  - `Path`: `'/'`
  - `Max-Age`: `7 * 24 * 60 * 60` (7 days)

### 5.2 Password Verification
- Passwords stored in `src/auth/users.ts` with salt-hashed SHA-256 signatures and compared using `crypto.timingSafeEqual`.

---

## 6. Route & Middleware Flow

```
User visits /
    │
    ▼
[Next.js Middleware: middleware.ts]
    │
    ├─► Has valid 'wood_session' cookie?
    │       ├─► YES: Allow request to proceed to Dashboard (/)
    │       └─► NO: Redirect to /login
    │
User visits /login
    │
    ▼
[Next.js Middleware: middleware.ts]
    │
    ├─► Has valid 'wood_session' cookie?
    │       ├─► YES: Redirect to / (already logged in)
    │       └─► NO: Allow request to render /login
```

---

## 7. API Routes Specification

### 7.1 `POST /api/auth/login`
- **Request Body**: `{ email: string, password: string }`
- **Validation**:
  - Checks if user exists in `src/auth/users.ts`.
  - Verifies password hash using `timingSafeEqual`.
- **Response**:
  - **Success (200)**: `{ success: true, user: AuthUser }` + `Set-Cookie: wood_session=...`
  - **Failure (401)**: `{ success: false, error: "Email atau password salah." }`

### 7.2 `POST /api/auth/logout`
- **Request**: Empty body or POST request.
- **Response (200)**: `{ success: true, message: "Logged out" }` + `Set-Cookie: wood_session=; Max-Age=0`

### 7.3 `GET /api/auth/me`
- **Request**: Reads `wood_session` cookie.
- **Response**:
  - **Authenticated (200)**: `{ success: true, user: AuthUser }`
  - **Unauthenticated (401)**: `{ success: false, error: "Unauthenticated" }`

---

## 8. Client Components & UI Integration

### 8.1 Auth Context & Hook (`src/hooks/useAuth.ts`)
- Manages client authentication state (`user: AuthUser | null`, `isLoading: boolean`, `roleLevel: UserRoleLevel | null`).
- Exposes:
  - `login(credentials): Promise<{ success: boolean; error?: string }>`
  - `logout(): Promise<void>`
  - Role check booleans: `canEdit: boolean` (Level 1), `canViewAll: boolean` (Level 1 or 2), `isMonitorOnly: boolean` (Level 3).

### 8.2 Login Page (`app/login/page.tsx`)
- High-visibility timber aesthetic matching `theme.css` tokens (Warm wood tones, deep slate, clean borders).
- Bilingual header: `Masuk Sistem Inventaris Kayu (木材库存系统登录)`.
- Input fields for Email (`manager@timber.id`, etc.) and Password.
- Clear error notification banner upon invalid credentials.
- Fast, accessible keyboard navigation (`Enter` to submit).

### 8.3 User Navigation Badge (`src/components/layout/UserNav.tsx`)
- Placed in the top-right header of `app/page.tsx`.
- Displays:
  - Current user name and role badge (e.g., `Level 1 - Manager`, `Level 2 - Admin`, `Level 3 - Monitor`).
  - Dropdown or direct "Keluar (退出)" logout button.

### 8.4 Component Adaptations for RBAC
1. **`src/components/ledger/Toolbar.tsx`**:
   - `roleLevel === 1`: Renders `Search`, `Species filter`, `Export CSV`, `Reset Demo`, and `+ Input Penerimaan`.
   - `roleLevel === 2`: Renders `Search`, `Species filter`, and `Export CSV`. `Reset Demo` and `+ Input Penerimaan` are hidden.
   - `roleLevel === 3`: Hidden entirely.
2. **`src/components/ledger/RecordTable.tsx`**:
   - `roleLevel === 1`: Full table including the right-aligned `Aksi (操作)` column with `Edit` and `Delete` action buttons.
   - `roleLevel === 2`: Full table, but `Aksi (操作)` column is omitted.
   - `roleLevel === 3`: Hidden entirely.
3. **`app/page.tsx`**:
   - Level 3 renders: Header, UserNav, `KpiCards`, `SpeciesBar`, and a clean alert banner: *"Anda masuk dalam Mode Monitor (Level 3). Data tabel detail dibatasi untuk otorisasi Level 1 & 2."*
   - Level 1 & 2 render the full dashboard and table views according to permissions.

---

## 9. Code Quality & Architectural Invariants

- **Strict God-File Rule**: Every file must remain strictly under 200 lines of code.
- **Node.js Native ESM & TypeScript**: All code uses standard imports, fully compatible with Node 26 type stripping and Next.js 15.
- **Test Coverage**:
  - `test/auth-session.test.ts`: Tests token creation, signature verification, expiry handling, and tamper rejection.
  - `test/auth-users.test.ts`: Tests user credential validation and password hashing.
  - `npm test`: 100% pass across all test suites in `<150ms`.
  - `npm run build`: Zero TypeScript or lint errors.

