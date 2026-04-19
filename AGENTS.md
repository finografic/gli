# AGENTS.md - AI Assistant Guide

## Roadmap and Planning Docs

**`docs/todo/ROADMAP.md` is the primary high-level plan for this project.**
**`docs/todo/NEXT_STEPS.md` is the near-term working list** — small tasks, fixes, and manual testing checklists too small for ROADMAP.

- Before proposing or generating new features, check the roadmap for existing items.
- When conceiving a new feature or initiative, add it to the appropriate priority tier.
- Detailed planning docs live alongside in `docs/todo/` as `TODO_*.md` (active) or `DONE_*.md` (complete).
- **TODO/DONE doc conventions:** `.github/instructions/documentation/todo-done-docs.instructions.md`
  — rules for naming, status headers, checkboxes, and graduating `TODO_` → `DONE_`.

---

## Rules — Project-Specific

Project-specific rules live in `.github/instructions/project/**/*.instructions.md`.

<!-- NOTE: @finografic/gli - CLI package (`genx:type:cli` keyword in package.json) only -->

- This is a **standalone installable package** (`@finografic/gli`), not a monorepo workspace member.
- Published to GitHub Packages (`https://npm.pkg.github.com`).
- Do not reference `@workspace/*` — all imports and deps must use published package names.

## Rules — Global

Rules are canonical in `.github/instructions/` — see `README.md` there for folder structure.
Shared across Claude Code, Cursor, and GitHub Copilot.

**General**

- General baseline: `.github/instructions/general.instructions.md`

**Code**

- TypeScript patterns: `.github/instructions/code/typescript-patterns.instructions.md`
- Modern TS patterns: `.github/instructions/code/modern-typescript-patterns.instructions.md`
- ESLint & style: `.github/instructions/code/eslint-code-style.instructions.md`
- Provider/context patterns: `.github/instructions/code/provider-context-patterns.instructions.md`
- Picocolors CLI styling: `.github/instructions/code/picocolors-cli-styling.instructions.md`

**Naming**

- File naming: `.github/instructions/naming/file-naming.instructions.md`
- Variable naming: `.github/instructions/naming/variable-naming.instructions.md`

**Documentation**

- Documentation: `.github/instructions/documentation/documentation.instructions.md`
- README standards: `.github/instructions/documentation/readme-standards.instructions.md`
- Agent-facing markdown: `.github/instructions/documentation/agent-facing-markdown.instructions.md`
- Feature design specs: `.github/instructions/documentation/feature-design-specs.instructions.md`
- TODO/DONE docs: `.github/instructions/documentation/todo-done-docs.instructions.md`

**Git**

- Git policy: `.github/instructions/git/git-policy.instructions.md`

---

## Rules — Markdown Tables

- Padded pipes: one space on each side of every `|`, including the separator row.
- Align column widths so all cells in the same column are equal width.

---

## Git Policy

- IMPORTANT: NEVER include `Co-Authored-By` lines in commit messages. Non-negotiable.
- `.github/instructions/git/git-policy.instructions.md` (see Commits and Releases sections)

---

## Claude Code — Session Memory and Handoff

> This section applies to Claude Code only. Other agents can ignore it.

- **Session log:** `.claude/memory.md` (gitignored) — maintenance rules are in that file.
- **Project state snapshot:** `.ai/handoff.md` (git-tracked) — maintenance rules are in that file.

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
