# SmartLearn Modern UI Fixes

## Changes
- Unified the authenticated workspace sidebar through `LearningShell` so Student Dashboard, AI Tutor, Tasks, Voice Tutor, Planner, Profile, and other student pages use the same navigation shell.
- Preserved the Chat recent-session functionality by moving recent chats into the unified sidebar as an optional sidebar section.
- Added responsive mobile navigation with overlay/drawer behavior.
- Added account avatar rendering to the sidebar and top-right account area.
- Profile picture changes now propagate through `AuthContext` and appear across the authenticated shell immediately after saving.
- Redesigned the Profile page with role-specific content:
  - Student: academic level and daily study goal.
  - Teacher/Educator: educator information and assigned-student analysis scope.
  - Admin: administrator/security information.
- Study Goal is intentionally hidden for Teacher and Admin.
- Added profile image type and size validation on the frontend.
- Kept existing authentication, APIs, task, AI tutor, and dashboard data flows intact.

## Important run notes
1. Copy `backend/.env.example` to `backend/.env` and configure the database/JWT/Gemini values.
2. Frontend API requests continue to use `/api` and Vite proxies them to `http://localhost:4001`.
3. Run `npm install` in both frontend and backend on the target Windows machine; do not copy a `node_modules` directory from another operating system.
4. Backend seed command is `npm run db:seed`.

## Validation performed in the build workspace
- Checked all modified JSX files with Babel's JSX/module parser: passed.
- Checked relative frontend imports: no missing relative imports found.
- Checked modified backend JavaScript syntax with Node: passed.
- A full Vite production build could not be executed in the Linux validation container because the supplied `node_modules` contains Windows-native esbuild/Rollup binaries; run `npm install` locally on Windows before `npm run build`.
