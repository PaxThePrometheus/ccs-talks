# Administrator provisioning

Public administrator registration and browser bootstrap are disabled, including when the database has no admins. `CCS_ADMIN_INVITE` is no longer used. Existing admins continue to sign in normally and can promote existing users through **Users & roles**. Promotion does not prove email ownership: administrators must independently confirm the intended user's identity before granting access.

## First administrator on a fresh deployment

1. Initialize the application's database schema by starting the application with the intended `DATABASE_URL`.
2. Register a regular account through the normal forum registration flow. Sign in once to check its credentials. The owner should control this account and its email.
3. From a trusted terminal in this repository, set `DATABASE_URL` to that deployment's database. The command also loads `.env.local` if present; existing environment variables take precedence. Confirm the target database before running it.
4. Run `npm run admin:provision -- owner@example.com --confirm`, substituting that account's exact email.
5. Sign in at `/admin/login` using the account's existing password. Remove temporary credentials from the terminal environment when finished.

The owner command only promotes an existing, non-banned account when **no administrator exists**. It does not reset passwords, unban accounts or issue sessions. A database table lock serializes provisioning with user writes; promotion and audit insertion share one transaction. Audit failure rolls back the promotion. Repeated or concurrent runs cannot provision a second first admin.

If an admin already exists, use their authenticated promotion workflow. The command deliberately refuses to recover a deployment whose only admin is banned; that requires an explicit owner-reviewed database recovery. No web route automatically reopens setup.

## Verification

Run `npm run test:admin`, `npm run lint` and `npm run build`. The focused tests run the real disabled enrollment/bootstrap handlers without DB access and check the CLI confirmation guard. They do not establish database transaction behavior.

Before using owner provisioning on a new deployment, verify against a disposable initialized database: existing-admin refusal, missing/banned-user refusal, successful promotion with audit, two concurrent attempts yielding only one admin, and audit-insert failure rolling back promotion. No production provisioning is performed by the test command.
