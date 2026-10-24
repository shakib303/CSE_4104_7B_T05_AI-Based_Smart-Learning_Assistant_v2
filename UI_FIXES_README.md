# Smart AI Learnet — UI Fixes

## Changes made

- Fixed the light-theme sidebar contrast by enforcing a dark, theme-aware sidebar with readable brand, navigation, account, and footer text.
- Made the sidebar a viewport-height flex layout. Its navigation list scrolls independently while account/theme/sign-out controls stay anchored at the bottom.
- Preserved the sidebar's scroll position across React Router page changes using session storage, so selecting a lower menu item does not jump the menu back to the top.
- Corrected a malformed CSS tail that contained literal `\n` text. That caused the font-scale rules and subsequent styles to be ignored by the browser.
- Kept font-size preferences live and persistent (Small 90%, Medium 100%, Large 115%) and added selected-state accessibility semantics and a reset hint in Settings.
- Improved role-selection/login responsiveness across viewport widths and short desktop windows.

## Layout architecture note

Yes—`LearningShell` can be a parent layout and pages can be nested child routes with React Router's `<Outlet />`. This is the cleaner long-term structure because it mounts the shell once. The current patch preserves the existing page wrappers and fixes the observed sidebar jump without a risky, broad conversion of every page (some pages have custom shell options, such as the dashboard/chat sidebar).

## Run locally

1. Install backend dependencies in `backend` and frontend dependencies in `smartlearn-frontend` with `npm install` (or `npm ci` where lockfiles are present).
2. Restore your local backend `.env` from `.env.example` and fill in your own credentials.
3. Start backend and frontend using the scripts documented in their respective `package.json` files.

The local `.env` file is intentionally not included in this archive. Never commit API keys or credentials.
