# Staff access and database upgrade

Phase 2 implementation, 21 October 2026. Existing administrators keep their accounts, roles and passwords. Do **not** run first-admin provisioning on an already configured deployment.

## Behavior

- Admin sign-in checks staff eligibility before issuing a session. Public sign-in also checks MFA when the account has enrolled; it cannot bypass staff MFA.
- Moderators can edit student profiles/status/badges and ban students. They cannot edit other staff or grant roles/delete accounts. Administrators manage staff. The UI uses the same capability policy as the server.
- Staff sessions last at most eight hours and expire after 30 minutes without authenticated requests. Background authenticated polling counts as request activity; this is not a human-input inactivity timer. Existing staff sessions without the new timestamps require a fresh login after the upgrade. Public student sessions retain their existing lifetime.
- All admin mutation endpoints require password authentication within the previous 15 minutes. A dialog confirms credentials and retries the pending request once, preserving its draft. Enrolled accounts must also supply an authenticator/recovery code.
- Account-based login limits are stored in PostgreSQL: ten attempts per 15 minutes shared across public login, staff login, reauthentication and MFA setup. A deployment-wide ceiling limits rotating-email abuse. Infrastructure/IP limits still need verification in Vercel; this implementation does not trust client-supplied IP headers.
- Database triggers protect the last non-banned administrator against role changes, bans and deletion. Access changes revoke sessions in the same statement. User deletion now wraps its existing dependent deletes in one transaction so a last-admin rejection cannot leave the user's content partially removed. Broader deletion cleanup remains Phase 3 work.
- Sign-out only redirects after the server confirms success. Database outages return retryable errors.

## Applying the additive database migration

The migration adds staff session timestamps, persistent attempt counters, encrypted MFA records, and last-admin/session-revocation triggers. It does not change any role, password or enrollment state.

With an existing deployment's `DATABASE_URL` available in the environment or `.env.local`, run:

```sh
npm run db:staff -- --apply
```

The command applies the migration in a transaction and reports only the active administrator count. The application initialization also includes the same idempotent migration; a controlled migration before deploying is preferable. Do not use a generic schema push as a replacement: the functions and triggers are part of the security boundary.

This chat currently has no local DATABASE_URL, Vercel CLI credentials or confirmed Neon connection. Hosted changes have **not** been applied. The migration and service behavior have been tested using disposable PGlite PostgreSQL instances. Hosted concurrency, deployed cookies/proxy behavior and authenticated browser verification remain release checks.

## Authenticator setup without forced lockout

MFA is opt-in for existing staff during this upgrade. The deployment owner first sets `CCS_MFA_KEY` to a stable random 32-byte hex key in the application environment. Keep it private and backed up; do not commit it or rotate it without a secret-reencryption plan. Changing/removing it after enrollment prevents verification of existing secrets.

After configuration, staff open **Account security**, enter the setup key in an authenticator app, and confirm a current code. Enrollment returns eight recovery codes once; save them securely. Confirmation revokes existing sessions, so the next login proves MFA. Recovery codes are stored only as account-bound hashes and consumed atomically. Authenticator time counters are consumed atomically to reject replay. Secrets use AES-256-GCM with account-bound authenticated data. No QR-code service receives the secret.

Disabling MFA requires recent password confirmation plus an authenticator/recovery code, and revokes sessions. If all recovery methods are lost, recovery requires an owner-reviewed database operation. No anonymous MFA reset endpoint exists. Enforcing mandatory enrollment for all staff is a later rollout decision after configuration and recovery verification.

## Verification

`npm run test:admin` includes actual application-service tests against disposable PostgreSQL, plus enrollment closure, permission matrix, session deadlines, migration idempotency, last-active-admin protection, password preservation, session revocation, encryption/account binding, MFA replay/recovery consumption and durable rate limits. `npm run build` and targeted lint also pass. The existing repository-wide lint backlog remains separate.

Production readiness still requires: connect the correct Neon project/branch; inspect current active-admin count and migration state; apply the migration; configure the MFA key without exposing it; verify the deployed preview with an existing staff account; test multi-connection races against hosted PostgreSQL and verify Vercel IP protections. No admin account should be recreated for this process.
