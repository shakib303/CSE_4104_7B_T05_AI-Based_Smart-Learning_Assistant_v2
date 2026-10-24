# Smart AI Learnet — Technical Fixes & SRS Status

This build corrects the earlier implementation's main architectural misunderstanding: the project is not only a student AI study app. The supplied SRS extension requires three roles (Student, Teacher/Educator, Admin), approval workflow, role-specific dashboards, teacher assignment, resources, messaging, reminders, complaints and backend-enforced RBAC.

## Major corrections

- Backend default port: `4001`.
- Student registration creates a `PENDING` account and does not issue a login token.
- Student login is blocked until an administrator approves the account.
- Separate login routes: `/student-login`, `/teacher-login`, `/admin-login`.
- Backend role authorization is enforced; hiding menu items is not the only protection.
- Existing SQLite databases are migrated instead of replaced.
- Existing task databases receive missing `task_type`, `difficulty`, `progress`, `notes`, recurrence fields.
- User schema now supports `STUDENT`, `TEACHER`, `ADMIN`, status, phone, department and learning preferences.
- Teacher/student assignment is persistent.
- Teacher-to-student messages and reminders are restricted to assigned relationships.
- Student complaints and admin responses are persistent.
- Educational resources can be assigned to students.
- Admin can approve/reject/suspend students, create/delete teachers, assign teachers and manage complaints/resources.
- Study planner and focus/Pomodoro modules were added.
- Recurring task records create the next occurrence when a recurring task is completed.
- Profile updates support phone, department, academic level, learning goals, study preferences and avatar data.
- The old `/SmartLearnDashboard` navigation bug is preserved only as a redirect to `/dashboard`.

## Demo accounts after `npm run db:seed`

- Student: `demo@smartlearning.app` / `Demo@1234`
- Admin: `admin@smartlearning.app` / `Admin@1234`
- Teacher: `teacher@smartlearning.app` / `Teacher@1234`

Change these passwords before deployment.

## SRS requirements that still depend on external infrastructure

These are not falsely represented as complete:

1. Google/GitHub/Microsoft OAuth requires provider applications and client secrets.
2. MFA requires a TOTP/recovery-code implementation and secure enrollment flow.
3. Email verification and email reminders require SMTP/email-provider configuration.
4. Browser Web Push requires VAPID keys, a service worker and push subscriptions.
5. HTTPS, 99.5% uptime, thousands of concurrent users, horizontal scaling and cloud infrastructure require deployment infrastructure rather than local SQLite/Express code.
6. Formal WCAG compliance requires automated and manual accessibility testing.
7. Production-grade automatic backups/fault tolerance require deployment/storage infrastructure; the local SQLite database is still a development database.

## Verification performed in this environment

- Backend JavaScript files were syntax-checked.
- SQLite initialization was tested against the supplied `dev(2).db`.
- Migration was verified to add the missing task fields and role-related tables without replacing the existing data schema.
- Frontend production build could not be executed here because the environment did not have the frontend npm packages cached; run `npm install` and `npm run build` on Windows.
