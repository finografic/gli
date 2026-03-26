# PR Status Monitor — TODO Plan

## Overview

A set of commands for `@finografic/gli` that monitor PR status across repositories, detect branches that need rebasing, and provide an interactive terminal-native workflow for resolving them.

Built on top of `gh` CLI's JSON output, specifically the `mergeStateStatus` field from GitHub's GraphQL API.

---

## Key Reference

`mergeStateStatus` enum values (from GitHub GraphQL):

| Value       | Meaning                                                    | Action needed?  |
| ----------- | ---------------------------------------------------------- | --------------- |
| `BEHIND`    | Head ref is behind base ref                                | Rebase required |
| `DIRTY`     | Head ref is both ahead and behind (history has diverged)   | Rebase required |
| `BLOCKED`   | Merging is blocked (required checks/reviews not satisfied) | Check CI/review |
| `CLEAN`     | Up to date and mergeable                                   | None            |
| `HAS_HOOKS` | Has merge hooks configured                                 | None (usually)  |
| `UNKNOWN`   | Status not yet determined                                  | Retry later     |
| `UNSTABLE`  | CI running or failed                                       | Check CI        |

Note: `DRAFT` is deprecated — use the `isDraft` field separately.

---

## Phase 1 — `pr-status` command (manual check, single repo)

**Goal**: Run `gli status` in any repo directory and see a formatted, interactive display of your open PRs with their merge status.

**Scope**:

- Runs in current working directory (must be a git repo with a GitHub remote)
- Calls `gh pr list` with relevant JSON fields
- Displays formatted output using `@clack/prompts` / `picocolors`
- Highlights PRs that are `BEHIND` or `DIRTY`
- Optional: select a PR to open in browser (`gh pr view --web`)

**See**: `TASK_PR_STATUS_PHASE1.md` for full implementation spec.

**Estimated effort**: Small — one command file, one utility, leverages existing patterns.

---

## Phase 2 — Multi-repo support

**Goal**: Check PR status across all configured repositories from anywhere.

**Tasks**:

- [ ] Design config file structure at `~/.config/gli/config.json`
- [ ] Config schema:

  ```json
  {
    "repos": [
      {
        "localPath": "/Users/justin/dev/finografic/genx",
        "remote": "finografic/genx"
      }
    ],
    "checkInterval": 900,
    "notifyOn": ["BEHIND", "DIRTY"]
  }
  ```

- [ ] Add `config` command or subcommands (`gli config add-repo`, `gli config list`, `gli config remove-repo`)
- [ ] Update `pr-status` to accept `--all` flag that iterates all configured repos
- [ ] Aggregated output: group results by repo, show summary counts
- [ ] Use `gh pr list --repo owner/repo` for remote checks (no need to `cd` into each repo)
- [ ] Handle errors gracefully per-repo (auth issues, repo not found, etc.)

**Depends on**: Phase 1 complete.

---

## Phase 3 — `pr-rebase` command

**Goal**: Interactive branch selection → local rebase → push, all from the terminal.

**Tasks**:

- [ ] New command: `gli rebase`
- [ ] Reuse Phase 1's PR fetching logic to show PRs needing rebase (`BEHIND` / `DIRTY`)
- [ ] `@clack/prompts` select to choose which branch to rebase
- [ ] Execute rebase flow:
  1. `git fetch origin`
  2. `git checkout <branch>`
  3. `git rebase origin/main` (or `origin/master` — detect default branch)
  4. On conflict: inform user, exit gracefully (don't force-resolve)
  5. On success: `git push --force-with-lease`
- [ ] Detect default branch name: `gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'`
- [ ] Support `--all` flag to batch-rebase all behind branches (with confirmation)
- [ ] Dry-run mode: `--dry-run` flag that shows what would happen without executing

**Depends on**: Phase 1 complete. Phase 2 optional (single-repo works fine).

---

## Phase 4 — `pr-watch` daemon with notifications

**Goal**: Periodic background checks with native macOS notifications that open the terminal.

**Tasks**:

- [ ] Install `terminal-notifier` as optional peer/system dependency (via `brew`)
- [ ] Notification on click triggers: `open -a <Terminal> "cd <localPath> && gli status"`
  - Detect user's terminal app (Terminal.app, iTerm2, Warp, etc.)
  - Fallback to `open -a Terminal` if detection fails
- [ ] `gli watch install` subcommand:
  - Generates `~/Library/LaunchAgents/com.finografic.gli.pr-watch.plist`
  - Configures interval from `config.json` `checkInterval` (default 900s = 15 min)
  - Runs `launchctl load` to activate
- [ ] `gli watch uninstall` subcommand:
  - Runs `launchctl unload`
  - Removes the plist file
- [ ] `gli watch status` subcommand:
  - Shows whether the agent is loaded and last run time
- [ ] The check script itself:
  - Iterates configured repos (Phase 2 config)
  - For each repo, checks PRs authored by `@me`
  - If any are `BEHIND` or `DIRTY`, fires notification
  - Notification title: `"PR needs rebase"` / body: `"<repo>: #<number> <title>"`
  - Batches multiple stale PRs into a summary notification
- [ ] Logging: write check results to `~/.config/gli/logs/` for debugging
- [ ] `osascript` fallback if `terminal-notifier` is not installed (non-clickable but functional)

**Depends on**: Phase 2 (multi-repo config), Phase 3 (rebase command for the click action).

---

## Future Ideas (beyond Phase 4)

- [ ] **React feature in genx**: when added, `pr-status` could have a TUI dashboard (ink)
- [ ] **Slack/webhook notifications**: post to a channel instead of/in addition to macOS
- [ ] **Auto-rebase**: for branches with no conflicts, automatically rebase + push (opt-in, dangerous)
- [ ] **PR review status**: extend display to show review approval state alongside merge status
- [ ] **Stale PR detection**: flag PRs with no activity for N days
- [ ] **Team mode**: check PRs across an org/team, not just `@me`

---

## Architecture Notes

- All `gh` interactions should be wrapped in a utility module (e.g., `src/utils/gh.utils.ts` or `src/lib/gh/`) so the gh CLI calls are centralised and testable
- The config file path (`~/.config/gli/config.json`) should be a constant, possibly respecting `XDG_CONFIG_HOME`
- Each phase builds on the previous but each command is independently useful
- Error handling for missing `gh` CLI should be clear and early (check on command entry)
