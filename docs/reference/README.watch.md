# `gli watch` — Background PR Monitoring

Periodically checks your configured repos for PRs that need rebasing and sends macOS notifications.

## Usage

```bash
gli watch install      # Install the LaunchAgent
gli watch uninstall    # Remove the LaunchAgent
gli watch status       # Show whether the agent is running
gli watch check        # Run a one-off check (used by the agent)
```

## How It Works

1. `gli watch install` generates a macOS LaunchAgent plist at `~/Library/LaunchAgents/com.finografic.gli.pr-watch.plist`
2. The agent runs `gli watch check` at a configurable interval (default: 900s / 15 minutes)
3. Each check iterates all repos from `gli config`, fetches open PRs, and identifies stale ones
4. If any PRs are `BEHIND` or `DIRTY`, a macOS notification is sent
5. Clicking the notification runs `gli status --all`

## Notifications

- Uses `terminal-notifier` if installed (clickable notifications)
- Falls back to `osascript` (non-clickable but functional)
- Install `terminal-notifier` for the best experience: `brew install terminal-notifier`

## Configuration

The check interval and notification triggers are configured in `~/.config/gli/config.json`:

```json
{
  "repos": [...],
  "checkInterval": 900,
  "notifyOn": ["BEHIND", "DIRTY"]
}
```

- **`checkInterval`** — Seconds between checks (default: 900). Applied when running `gli watch install`.
- **`notifyOn`** — Which `mergeStateStatus` values trigger notifications (default: `["BEHIND", "DIRTY"]`).

## Logging

Check results are logged to `~/.config/gli/logs/watch.log` for debugging.

## Prerequisites

- macOS (uses LaunchAgents)
- [GitHub CLI](https://cli.github.com) installed and authenticated
- Repos configured via `gli config watch`
- Optional: `terminal-notifier` (`brew install terminal-notifier`) for clickable notifications

## Subcommands

| Subcommand  | Description                                          |
| ----------- | ---------------------------------------------------- |
| `install`   | Generate plist and load the LaunchAgent              |
| `uninstall` | Unload and remove the LaunchAgent                    |
| `status`    | Show agent status, interval, repo count, last log    |
| `check`     | Run a one-off check with notifications (for testing) |
