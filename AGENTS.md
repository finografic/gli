# AGENTS.md - AI Assistant Guide

## Rules - General

Rules are canonical in `.github/instructions/` and shared across Claude Code, Cursor, and GitHub Copilot.
Follow general TypeScript, ESLint, and naming conventions from prior context.

- [General](/.github/instructions/00-general.instructions.md)
- [File Naming](/.github/instructions/01-file-naming.instructions.md)
- [TypeScript Patterns](/.github/instructions/02-typescript-patterns.instructions.md)
- [Provider & Context Patterns](/.github/instructions/03-provider-context-patterns.instructions.md)
- [ESLint & Code Style](/.github/instructions/04-eslint-code-style.instructions.md)
- [Documentation](/.github/instructions/05-documentation.instructions.md)
- [Modern TypeScript Patterns](/.github/instructions/06-modern-typescript-patterns.instructions.md)
- [Variable Naming](/.github/instructions/07-variable-naming.instructions.md)
- [README Standards](/.github/instructions/08-readme-standards.instructions.md)
- [Picocolors CLI styling](/.github/instructions/09-picocolors-cli-styling.instructions.md)
- [Git Policy](/.github/instructions/10-git-policy.instructions.md)

## Rules - Project-Specific

Project-specific rules live in `.github/instructions/project/**/*.instructions.md`.

<!-- NOTE: CLI package (`genx:type:cli` keyword in package.json) only -->

- This is a **standalone installable package** (`@finografic/gli`), not a monorepo workspace member.
- Published to GitHub Packages (`https://npm.pkg.github.com`).
- Do not reference `@workspace/*` — all imports and deps must use published package names.

## Rules - Markdown Tables

- Padded pipes: one space on each side of every `|`, including the separator row.
- Align column widths so all cells in the same column are equal width.

## Git Policy

- IMPORTANT: NEVER include `Co-Authored-By` lines in commit messages. Not ever, not for any reason.
- [Git — Commits](/.github/instructions/10-git-policy.instructions.md#commits)
- [Git — Releases](/.github/instructions/10-git-policy.instructions.md#releases)

## Learned User Preferences

- Ignore .cursor/chats and .cursor/hooks; commit .cursor/mcp.json
- Prefer default `~/.config/gli/config.json` templates that list all keys (including optional blocks like `jira` with empty strings) so users can edit without inferring field names

## Learned Workspace Facts

- The npm package is `@finografic/gli`; the repo and package were renamed from `git-cli` / `@finografic/git-cli`.
- The CLI entry is `src/cli.ts`, built to `dist/cli.mjs`; `main`, `types`, `exports["."]`, and `bin.gli` all target that bundle.
- TypeScript `paths` in `tsconfig` are resolved when bundling with tsdown; Vitest (or other runners) needs matching alias resolution if tests import via those aliases.
- Jira issue links in PR output are off when `jira.baseUrl` is missing, empty, or whitespace-only after trim; legacy top-level `jiraBaseUrl` in config is not read.
