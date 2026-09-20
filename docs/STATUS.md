# Model switch display names

2026-09-20: implemented and verified with focused automated checks.

- Baseline: `dataelement/dsh-desktop:V0.9.1` at `9b2d2cf17e8f25f3c3cc1af297a25760cb0731f0`, Harness `0.1.5-rc.2`. The remote `v0.9.0` branch was absent when verified.
- The model-switch producer resolves adapter model names and commits them into the notice content and summary. Request configuration continues to use provider/model IDs. Saved notices retain the names recorded at the switch.
- The conversation row shows “已切换模型” / “Model changed” and the saved name transition. Its expanded explanation uses the selected UI language. Other context producers retain their existing rendering.
- Cross-provider switches use provider display names. Equal labels include route IDs for disambiguation. Missing metadata falls back to stable route IDs so an unavailable old catalog entry can still lead to a usable new model. Existing notices retain their saved summaries.
- The runtime correction is shipped through the repository's pinned Harness dependency distribution in `patches/`, updating both the package entry and standalone module. The chat bundle contains the corresponding localized renderer.

Verification:

- `npm ci --ignore-scripts --offline --no-audit --no-fund` followed by `npx --no-install patch-package`: PASS from a fresh dependency tree.
- `npx vitest run test/model-switch-display.test.ts test/model-selection-search-patch.test.ts test/model-reasoning-efforts-patch.test.ts test/local-path-links.test.ts`: 29 tests passed, including 8 new runtime/browser-bundle cases.
- `npm run typecheck`: PASS.
- `npm run build`: PASS.
- Native Desktop login, real provider calls, and installed-app UI acceptance: `NOT_RUN`.
