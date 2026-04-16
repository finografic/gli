# `gli status` — PR Merge Status

Shows the merge status of your open PRs in the current repository, highlighting branches that need a rebase.

## Usage

```bash
gli status          # Current repo
gli status --all    # All configured repos
```

## What It Does

1. Checks that the GitHub CLI (`gh`) is installed and authenticated
2. Fetches your open PRs (authored by `@me`) via `gh pr list`
3. Filters out draft PRs
4. Groups and displays PRs by merge-state priority:

| Status     | Indicator                    | Meaning                       |
| ---------- | ---------------------------- | ----------------------------- |
| `BEHIND`   | `⚠ Behind — rebase needed`   | Base branch has newer commits |
| `DIRTY`    | `✗ Diverged — rebase needed` | Conflicts with base branch    |
| `BLOCKED`  | `○ Blocked`                  | Merge requirements not met    |
| `UNSTABLE` | `○ CI running or failed`     | Checks haven't passed yet     |
| `UNKNOWN`  | `? Status pending`           | GitHub hasn't computed status |
| `CLEAN`    | `✓ Up to date`               | Ready to merge                |

1. Prints a summary line (e.g. `3 open PRs · 2 need rebase`)
2. Offers an interactive prompt to open any PR in the browser

## Multi-Repo Mode (`--all`)

When using `--all`, PRs are fetched across all repos registered via `gli config`:

```bash
gli config watch        # Add a repo (path + GitHub URL prompts)
gli config list         # List configured repos
gli config remove       # Remove a repo interactively
```

Config is stored at `~/.config/gli/config.json` (respects `$XDG_CONFIG_HOME`).

Each repo's PRs are displayed under a header, with an aggregated summary at the end. Failures for individual repos are warned and skipped gracefully.

## Prerequisites

- [GitHub CLI](https://cli.github.com) installed and authenticated (`gh auth login`)
- Single-repo mode: run from inside a GitHub-hosted git repository
- Multi-repo mode: repos configured via `gli config watch`

## Flags

| Flag           | Description                           |
| -------------- | ------------------------------------- |
| `--all`        | Check PRs across all configured repos |
| `--help`, `-h` | Show usage info                       |
