# Project — Handoff

> **How to maintain this file**
> Update after sessions that change architecture, add/remove features, resolve open questions, or shift priorities — not every session.
> — Update only the sections that changed. Keep the total under 150 lines.
> — Write in present tense. No code snippets — describe what exists, not how it works.
> — `.claude/memory.md` = session work log. `.ai/handoff.md` = project state snapshot. Never duplicate between the two.

## Project

`@finografic/gli` v1.21.2 — GitHub CLI workflow tool (PR listing, rebase, live dashboard). On `master`.

## Architecture

`src/cli.ts` → command router → `src/commands/<cmd>/<cmd>.command.ts` → `src/utils/` helpers.
Each command is a standalone async function receiving `{ argv }`. No shared state between commands.

Core primitives (`flow`, `render-help`, XDG) now come from `@finografic/cli-kit` — `src/core/` is gone.

## Stack

- `@finografic/cli-kit` — flow context, render-help, XDG config helpers
- `@clack/prompts`, `picocolors`, `log-update`
- `gh` CLI via `execSync` / `exec` (promisified)
- `tsdown` build, `oxfmt` + `eslint` formatting

## Config (`~/.config/gli/config.json`)

```json
{
  "repos": [{ "localPath": "...", "remote": "..." }],
  "live": { "interval": 60, "autoRebase": false },
  "jira": { "baseUrl": "", "issuePrefix": "" },
  "prs": { "title": { "display": false, "maxChars": 40, "sliceStart": 0 } }
}
```

`readConfig()` / `writeConfig()` are async — use `await` at every call site.

## CLI Commands

- `gli live [--compact] [--auto-rebase]` — live PR dashboard; auto-rebase fires every 4th refresh silently
- `gli status [--compact]` — one-shot snapshot of PR status, exits
- `gli rebase [--all] [-y] [-i] [-s] [--stay]` — rebase stale branches; `-y` skips all prompts including initial confirm
- `gli select` — interactive branch checkout from open PRs
- `gli config watch|list|remove|edit` — manage watched repos (`config add` renamed to `config watch`)

## Key Types / Exports

- `GliConfiguration` — config DTO in `src/types/config.types.ts`; `live`, `jira`, `prs`, `repos`
- `SilentRebaseResult` — exported from `commands/rebase/index.ts` for use in `live.command.ts`
- `runSilentRebaseAll()` — exported from rebase module; used by live for background auto-rebase
- `FlowContext` / `createFlowContext` / `promptConfirm` — from `@finografic/cli-kit/flow`

## Decisions

1. `gli live --auto-rebase` runs `runSilentRebaseAll` every 4th refresh (not a separate timer). Status shown in footer.
2. `--dry-run` removed from `gli rebase` — judged pointless.
3. `readConfig` is async (uses `readJsonc` from cli-kit/xdg); `cache.utils.ts` stays sync (hot path).
4. `config add` subcommand renamed to `config watch` — reflects that repos are "watched" for live display.
5. Per-command help configs live in `src/commands/<cmd>/<cmd>.help.ts` (separate from command logic).

## Open Questions / Next

- `prs` config key (was `prListing`) — verify all code consistently uses `config.prs` not `config.prListing`
- `scaffold-cli-help` skill in genx still references `core/render-help` — needs update to reflect cli-kit
- Other `@finografic` CLI projects (macos-layouts, etc.) still carry inline `src/core/` — use the `migrate-to-cli-kit` skill in genx to migrate them
