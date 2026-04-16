# 💻 @finografic/gli - git CLI, Live PR dashboard

> Git utilities for monitoring and managing PRs from the terminal. Built on the GitHub CLI (`gh`).

## Installation

```bash
pnpm add -g @finografic/gli
```

Or clone and link locally:

```bash
pnpm install && pnpm link --global
```

## Commands

```text
gli <command>

  live    Live-updating PR status dashboard - ⭐ FEATURE
  status  Snapshot of PR status (same output as live, exits)
  rebase  Interactively rebase branches that are behind
  select  Interactively checkout a branch for one of your PRs
  config  Manage multi-repo configuration
```

### `gli live` ⭐

Live-updating terminal dashboard for PR status monitoring (like htop, but for your PRs).

```bash
gli live    # Start live dashboard (refreshes every 60s)
```

Perfect for keeping a terminal panel open to monitor your pull requests in real-time. Shows:

- PR list with status indicators, including build and approval columns plus unresolved comments (`💬 N`) when present
- Clickable PR numbers and repo names
- Config path footer

The refresh interval defaults to 60s and is configurable via `gli config edit` (`live.interval`).

### `gli status`

Same output as `gli live`, but prints once and exits — no live repaint loop.

```bash
gli status    # Print PR status snapshot and exit
```

### `gli rebase`

Interactively rebase branches that are behind the default branch. Combines the best of both worlds: shows full PR status, steps through each branch, prompts for force-push confirmation.

```bash
gli rebase                  # Select a branch to rebase
gli rebase --all            # Rebase all stale branches (step-through)
gli rebase --all -y         # Rebase all, auto-accept prompts
gli rebase -i               # Interactive rebase (manual pick/squash/edit)
gli rebase -s               # Auto-squash multiple commits into one
gli rebase --all --stay     # Rebase all, stay on last branch
```

**Features:**

- Shows ALL PRs (not just stale) for full context
- Force-push confirmation after each successful rebase
- Step-through flow with [1/3] progress indicators
- Abort handling: continue to next branch or exit
- Interactive mode (`-i`) for manual commit editing
- Auto-squash (`-s`) for cleaning up commit history
- Returns to original branch (unless `--stay` flag)
- Yes-mode (`-y`) — auto-accepts rebase and force-push prompts

### `gli select`

Interactively checkout a branch from one of your open PRs.

```bash
gli select
```

### `gli config`

Manage the multi-repo configuration stored at `~/.config/gli/config.json`.

On first run, the config file is written with **all default values** so every option is visible and editable.

```bash
gli config add       # Add a repo (auto-detects current repo)
gli config list      # List configured repos
gli config remove    # Remove a repo interactively
gli config path      # Show config file path
gli config edit      # Open config in $EDITOR
```

**Config options** (all shown in the generated config file):

| Key                          | Default   | Description                                                               |
| ---------------------------- | --------- | ------------------------------------------------------------------------- |
| `live.interval`              | `60`      | Refresh interval in seconds for `gli live`                                |
| `live.autoRebase`            | `false`   | Periodically run `gli rebase --all -y` while live (see `gli live --help`) |
| `jira.baseUrl`               | _(unset)_ | Global Jira browse URL for branch ticket links                            |
| `jira.issuePrefix`           | _(unset)_ | Optional Jira key prefix filter (e.g. `SBS`)                              |
| `prListing.title.display`    | `false`   | Show PR title column                                                      |
| `prListing.title.maxChars`   | `40`      | Max title characters to display                                           |
| `prListing.title.sliceStart` | `0`       | Skip N chars from title start (e.g. ticket prefix)                        |

## Prerequisites

- [GitHub CLI](https://cli.github.com) installed and authenticated (`gh auth login`)

## Development

```bash
pnpm install        # Install dependencies (sets up git hooks)
pnpm dev            # Dev mode
pnpm build          # Build
pnpm test:run       # Tests
pnpm lint           # Lint
```

See [docs/DEVELOPER_WORKFLOW.md](./docs/DEVELOPER_WORKFLOW.md) for the complete workflow.

## License

MIT &copy; [Justin Rankin / @finografic](https://github.com/finografic)
