# AGENTS.md - AI Assistant Guide

## Rules - Project-Specific

Project-specific rules live in `.github/instructions/project/**/*.instructions.md`.

<!-- NOTE: @finografic/gli - CLI package (`genx:type:cli` keyword in package.json) only -->

- This is a **standalone installable package** (`@finografic/gli`), not a monorepo workspace member.
- Published to GitHub Packages (`https://npm.pkg.github.com`).
- Do not reference `@workspace/*` — all imports and deps must use published package names.

## Rules — Global

Rules are canonical in `.github/instructions/` and shared across Claude Code, Cursor, and GitHub Copilot.

- General: `.github/instructions/00-general.instructions.md`
- File Naming: `.github/instructions/01-file-naming.instructions.md`
- TypeScript: `.github/instructions/02-typescript-patterns.instructions.md`
- ESLint & Style: `.github/instructions/04-eslint-code-style.instructions.md`
- Documentation: `.github/instructions/05-documentation.instructions.md`
- Modern TS Patterns: `.github/instructions/06-modern-typescript-patterns.instructions.md`
- Variable Naming: `.github/instructions/07-variable-naming.instructions.md`
- README Standards: `.github/instructions/08-readme-standards.instructions.md`
- Picocolors CLI styling: `.github/instructions/09-picocolors-cli-styling.instructions.md`
- Git Policy: `.github/instructions/10-git-policy.instructions.md`
- Agent-facing Markdown: `.github/instructions/11-agent-facing-markdown.instructions.md`
- Feature Design Specs: `.github/instructions/12-feature-design-specs.instructions.md`

---

## Rules — Markdown Tables

- Padded pipes: one space on each side of every `|`, including the separator row.
- Align column widths so all cells in the same column are equal width.

---

## Git Policy

- IMPORTANT: NEVER include `Co-Authored-By` lines in commit messages. Non-negotiable.
- `.github/instructions/10-git-policy.instructions.md` (see Commits and Releases sections)

---

## Learned User Preferences

- Ignore .cursor/chats and .cursor/hooks; commit .cursor/mcp.json
- Prefer default `~/.config/gli/config.json` templates that list all keys (including optional blocks like `jira` with empty strings) so users can edit without inferring field names
- Prefer documentation and CLI examples that match shipped behavior (for example `gli rebase` has no `--dry-run` or `--stay`)
- Prefer per-command `*.help.ts` modules to import only types from `@finografic/cli-kit/render-help` and use literals (or comments pointing at constants) for default values in help text rather than importing app config modules

## Learned Workspace Facts

- The npm package is `@finografic/gli`; the repo and package were renamed from `git-cli` / `@finografic/git-cli`.
- The CLI entry is `src/cli.ts`, built to `dist/cli.mjs`; `main`, `types`, `exports["."]`, and `bin.gli` all target that bundle.
- TypeScript `paths` in `tsconfig` are resolved when bundling with tsdown; Vitest (or other runners) needs matching alias resolution if tests import via those aliases.
- Jira issue links in PR output are off when `jira.baseUrl` is missing, empty, or whitespace-only after trim; legacy top-level `jiraBaseUrl` in config is not read.
- Per-command `--help` text lives in `src/commands/<name>/<name>.help.ts` as `CommandHelpConfig`; root `gli --help` overview stays in `src/cli.help.ts`
- `gli config` subcommands are `watch`, `list`, `remove`, and `edit` (there is no `path` or `add` subcommand)
- PR list display settings in user config use the `prs` key (`prs.title.*`); `readConfig` still maps legacy `prListing` into `prs` when `prs` is absent
