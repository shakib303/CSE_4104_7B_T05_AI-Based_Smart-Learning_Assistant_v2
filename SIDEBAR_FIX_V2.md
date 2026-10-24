# Sidebar / workspace layout fix (v2)

This patch addresses the sidebar behavior seen in the latest screenshot:

- Desktop sidebar now participates in the workspace flex layout (`position: sticky`) instead of being fixed over page content.
- The main content no longer uses a compensating left margin, preventing the sidebar from covering page headings/cards.
- Sidebar height follows the viewport (`100dvh`) and only its navigation region scrolls; the brand, account panel, and footer remain in place.
- Light and dark themes now use separate sidebar surface, text, border, hover, and active-state tokens. Light mode is a light surface with readable dark text.
- On small screens, the sidebar becomes an off-canvas drawer with a backdrop and retains mobile navigation behavior.

The patch is appended at the end of `smartlearn-frontend/src/styles/globals.css` to override legacy duplicated shell styles without restructuring page components.
