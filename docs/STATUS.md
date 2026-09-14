# Enterprise login implementation status

Updated 2026-09-14. This clean migration is based on `main@6a9c668`. The enterprise-login feature commits were replayed without the retired `v0.9.0` merge, Harness-upgrade commits already present in `main`, and CI-only commits.

## Implemented

- BiSheng enterprise browser login, callback handling, secure local credential vault, token refresh and logout.
- Enterprise model adapter and account settings for the compatible `0.4.0` and `0.5.0` contracts.
- Stable Harness port and prewarmed shell environment remain active while enterprise variables are added to the child process.

## Verification

- Clean dependency installation completed with Harness `0.1.5-rc.2` and all 24 package patches applied.
- Full automated regression passed: 109 test files and 929 tests.
- TypeScript validation passed with `tsc --noEmit -p tsconfig.node.json`.
- Real enterprise login, model calls and native packaged-app acceptance remain separate gates.
