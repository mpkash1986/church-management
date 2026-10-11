# Church Management — Next.js + npm

Church management application built with **Next.js, TypeScript, Prisma and SQLite**.

## Included
- Login with hashed passwords and an HTTP-only signed session cookie
- Roles defined for Admin, Treasurer, Secretary and Viewer (role-specific permissions need to be enforced before production)
- Church profile: street, area, landmark, contact details, senior pastor, status, description and private logo upload; state defaults to Tamil Nadu, with Tamil Nadu districts selectable
- Members: street, area and landmark, automatically assigned read-only member numbers (M0001, M0002, ...), age calculated from date of birth, subscription eligibility, wedding anniversary, membership status, private profile photo, and family, ministry and fellowship assignments; state defaults to Tamil Nadu, with Tamil Nadu districts selectable
- Families: household contact details, family head, member assignment and family member counts; state defaults to Tamil Nadu, with Tamil Nadu districts selectable
- Fellowship groups: leaders, assistant leaders, member assignments and meeting schedules
- Ministries: leaders, member assignments, status and description
- Financial-year and monthly subscriptions with automatic read-only names (Member Name - Financial Year - Month), ten fund categories, per-member assessment, verification and approval, payment status, receipt number and outstanding balance
- Subscription payments default to the assessed total; receipt numbers are generated from payment date/time, payment date is fixed at creation, and request date remains editable
- Subscription financial-year selection defaults to the current April–March year and only offers current or previous years
- Dashboard fund-head totals for the current financial year and a filterable member-level fund report with family, financial-year, and month filters
- Cashbook for income and expenses; subscription payment entries are automatically added as income
- Create, view, edit, and delete for members, families, fellowships, subscriptions, and cashbook entries
- Create menu for Church, Family, Fellowship, Member, Ministry and Subscription forms; the church profile is a single app-wide record
- Subscription batch creation applies the selected fund breakdown and payment amount separately to each selected member
- Member/fellowship assignment, administrator-managed user accounts, and linked subscription payments in the cashbook
- Birthday and wedding anniversary list for the next 7 days, including on the dashboard
- JSON endpoint for reminders: `GET /api/reminders`

## Requirements
- Node.js 20.9+ (Node 22 LTS recommended)
- npm 10+

## Run locally

Run these commands from the project root (the directory containing the `church-management` folder):

```bash
npm install
```

Copy `church-management/.env.example` to `church-management/.env` and set a strong `AUTH_SECRET`. In PowerShell, run:

```powershell
Copy-Item church-management/.env.example church-management/.env
```

Then initialize the database and start the app:

```bash
npm run db:generate --workspace church-management
npm run db:migrate --workspace church-management
npm run db:seed --workspace church-management
npm run dev
```

Images uploaded for the church logo and member profiles are stored in the ignored `church-management/private-uploads` directory and are served only through authenticated routes. Back up this directory alongside the SQLite database.

Open http://localhost:3000 and sign in with:
- Email: `admin@church.local`
- Password: `ChangeMe123!`

**Change the temporary password immediately.** For local setup you can seed a custom administrator by setting `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your shell before running `npm run db:seed --workspace church-management`.

## Financial calculation
- Amounts are stored as whole Indian rupees.
- Balance = `max(0, amountDue - amountPaid)`.
- Status is calculated as `PENDING`, `PARTIAL`, `PAID`, or `WAIVED`.
- A member can have one subscription record per financial year and period.
- Subscription payment submissions create an `INCOME` cashbook entry.

## Important production checklist
This is a useful starter, not a fully audited financial or identity-verification system.

1. Use PostgreSQL (managed database) instead of SQLite for hosted/multi-user production. Update `DATABASE_URL` and Prisma provider.
2. Enforce role-based access in every route (e.g. only Admin can manage users, Treasurer can post payments/accounts). Roles exist in the schema but the starter currently only checks whether the user is signed in.
3. Add password reset, email verification/OTP if required, rate limiting, audit logs, CSRF/origin protection and secure account recovery.
4. Add family relationships/household head, exports, receipts, and reports.
5. Automatic email/SMS reminders require a provider (SMTP/Resend/Twilio/etc.) plus a scheduled job/cron. Current reminders are shown in the app when opened; no messages are sent automatically.
6. Decide how to handle partial payments, waivers, refunds and accounting periods. Do not treat this cashbook as double-entry accounting.
7. Back up the database and test restore procedures. Set a strong `AUTH_SECRET`; never commit `.env`.

## Project structure
- `app/` — pages and route handlers
- `components/Shell.tsx` — application navigation
- `lib/auth.ts` — session helpers
- `lib/reminders.ts` — upcoming-week reminder calculation
- `lib/subscriptions.ts` — subscription status and INR formatting
- `prisma/schema.prisma` — data model
- `prisma/seed.ts` — initial admin user

## Note about dates
Reminders compare month/day in the server's local timezone and include today through the next 7 days. For a deployed app, set the server timezone deliberately or change reminder calculations to use a configured church timezone.
