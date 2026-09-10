# Implementation and verification status

## Image generation plugin — 2026-09-10

- **Implemented:** public `dsh-image-generation` package, default Desktop composition, shared `image_generate` tool and `generate-image` Skill, OpenAI / ByteDance adapters, plugin configuration card, automatic validation on save, host-only atomic credential storage, governed PNG output.
- **PASS:** 19 focused integration tests plus 2 Desktop dependency-closure checks; full Desktop suite 90 files / 769 tests; TypeScript check and production build. The final ByteDance non-generating parameter probe and real macOS sandboxed PNG writer pass the focused suite.
- **PASS:** actual Host composition/authentication/origin and configuration save smoke against a loopback provider. Browser inspection confirmed the correct plugin settings entry, automatic save success/error, masked input retained on error, and no test-image action. This is a simulated-provider acceptance, not a paid-model result.
- **PASS:** macOS arm64 development DMG/ZIP build and strict deep code-signature verification. Package-level smoke starts Node and Harness from inside the built `.app`, validates default plugin/client composition, authentication and save flows. Browser inspection confirms both light/dark form layout and automatic save success. A final package-level check exercises both adapters, bundled Sharp and actual macOS sandboxed PNG output against a loopback provider. Build provenance and SHA-256 sums accompany the local artifacts.
- **PASS:** standalone tarball installation using the actual `dsh plugin --profile web add` command into an isolated DSH home, followed by authenticated Host startup and plugin/client discovery without the Desktop overlay.
- **Pending:** user acceptance. The development package uses the local Apple Development identity; Apple notarization is not run.
- **NOT_RUN:** current valid-key requests to the real OpenAI/ByteDance services, real generated-image visual review, insertion/render/edit/save/reopen in PowerPoint or Word, Windows and Intel Mac package acceptance. No paid image generation was used for configuration validation.
- **Distribution:** source and tarball are prepared for public distribution. npm publishing and upstream PR merge remain separate actions.

Validation checks connection/model metadata or required-parameter handling; actual image generation permissions, quota and visual quality are established during real generation. The Desktop package is based on upstream `main` (`c8c33c4`) and adds the shared image capability; independent Word/Excel feature branches are outside this PR.
