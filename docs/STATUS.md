# Implementation status

## PPT template preview bounds — 2026-09-10

Template previews now size their 2px selection borders inside each grid cell. The viewport gives both sides 4px of space for complete previews and keyboard focus, and the category toolbar aligns with that inset. Vertical scrolling and horizontal preview-page gestures retain their existing behavior. The default gray inset outline has been removed from both maintained clients.

- `PASS`: 41 tests across PPT integration, release packaging contracts and preview assets; TypeScript and production build.
- `PASS`: the two repacked distributions preserve their file lists and all file bytes except `lib/client.js` (710 core files and 44 adapter files). Their CSS exactly matches the maintained source and the previously delivered user-approved Apple Silicon package.
- `PASS`: browser verification exercises the actual distributed React components and real Host RPC inside a fixture composer. It covers three window widths, equal side clearance, first/last-column horizontal preview gestures, vertical scrolling, selected/focus states, categories and light/dark rendering. The original 736px viewport has 740px scrollable content; the corrected viewport has 736px content with 4px clearance on each side.
- User acceptance: the delivered macOS package was accepted on 2026-09-10. That package includes the personal-template feature under separate development; this PR carries the accepted gallery styles on `main@c8c33c4`.
- PR-branch native packaging, Windows UI, Apple notarization and Office round-trip are separate `NOT_RUN` gates.

Local evidence is retained under ignored `doc/ppt-gallery-bounds-qa/`, including archive comparison, before/after component geometry, screenshots and command logs. The broader WorkBuddy acceptance gates retain their existing status.
