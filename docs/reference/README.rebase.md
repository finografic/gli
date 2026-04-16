# `gli rebase` — Interactive PR Rebase

Interactively select and rebase branches that are behind the default branch, then push with `--force-with-lease`.

## Usage

```bash
gli rebase              # Select a branch to rebase
gli rebase --all        # Rebase all behind branches (with confirmation)
gli rebase --all -y     # Rebase all stale branches, auto-confirm prompts
```

## What It Does

1. Checks that the GitHub CLI (`gh`) is installed and authenticated
2. Fetches your open PRs and filters to those needing rebase (`BEHIND` or `DIRTY`)
3. Detects the repo's default branch via `gh repo view`
4. Presents an interactive selector (or `--all` with confirmation)
5. For each selected branch:
   - `git fetch origin`
   - `git checkout <branch>`
   - `git rebase origin/<default-branch>`
   - On conflict: aborts the rebase, shows manual resolution instructions, continues to next branch
   - On success: `git push --force-with-lease origin <branch>`
6. Returns to the original branch when done

## Safety

- Refuses to run with uncommitted changes (commit or stash first)
- Uses `--force-with-lease` (not `--force`) to prevent overwriting upstream changes
- On conflict: aborts the rebase automatically and provides instructions for manual resolution
- Returns to the original branch after completion

## Prerequisites

- [GitHub CLI](https://cli.github.com) installed and authenticated (`gh auth login`)
- Run from inside a GitHub-hosted git repository
- Clean working tree (no uncommitted changes)

## Flags

| Flag                  | Description                                                     |
| --------------------- | --------------------------------------------------------------- |
| `--all`               | Rebase all branches that need it (with confirmation)            |
| `-y`                  | Auto-accept prompts, including the initial `--all` confirmation |
| `-i`, `--interactive` | Interactive rebase (manual pick/squash/edit)                    |
| `-s`, `--squash`      | Auto-squash multiple commits into one                           |
| `--help`, `-h`        | Show usage info                                                 |
