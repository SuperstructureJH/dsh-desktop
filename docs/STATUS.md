# Implementation status

## PPT literal newline validation — 2026-09-10

- Implemented: one shared text-escape validator serves CLI and host checks for text elements and table cells. Literal `\n`/`\r` requires source correction or an explicit boolean `literalEscapes: true` for intentionally displayed notation. Both export paths retain the existing validation gate.
- Implemented: imported PPTX text retains its existing literal notation; actual line breaks and layout remain unchanged. Shared authoring guidance explains YAML block scalars, serialization and the correction loop. Active sessions refresh V2/V3 automatic Skill snapshots to V4.
- Regression baseline: all four faulty YAML cases fail the new expectations against the original distributed archive because it permits export.
- PASS: 761 tests across 89 files, TypeScript checking and production build. Regression coverage exercises the shipped archive through model tools and CLI, all seven YAML/HTML newline forms, rich text, table cells, explicit literal notation, both import routes, post-correction overflow and V2/V3 snapshot migration.
- PASS: all 32 bilingual template projects / 384 pages pass the updated checker. Archive readback contains the shared validator and matching source/instructions; the five changed existing entries and one new module account for every archive content change. Dependency integrity and SHA-256 metadata match the rebuilt archive.
- Native PowerPoint/WPS, application installation and customer-task acceptance: NOT_RUN. Original customer source files remain unavailable; this change addresses the reproduced input class.
