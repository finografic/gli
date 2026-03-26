# Task: Implement `status` Command (Phase 1)

## Context

This is a new command for `@finografic/gli` (base CLI command: `gli`). It displays the merge status of open PRs in the current repository, highlighting branches that need rebasing. The user invokes it as `gli status`.

Before making any changes, explore the existing codebase to understand:

- How commands are structured (look at existing commands for the pattern)
- How `gh` CLI is currently invoked (from the branch selector command)
- How `@clack/prompts` and `picocolors` are used for output
- The project's import style, naming conventions, and file organisation

Follow all existing patterns. Do not introduce new dependencies.

---

## What to Implement

### 1. Create a `gh` utility module

Location: Decide based on existing project structure — likely `src/utils/gh.utils.ts` or `src/lib/gh.utils.ts`, whichever is consistent with how other utilities are organised.

This module wraps `gh` CLI interactions for reuse across commands.

```ts
/**
 * Check that `gh` CLI is installed and authenticated.
 * Throws or exits gracefully with a user-friendly message if not.
 */
export function assertGhAvailable(): void;

/**
 * Fetch open PRs for the current repo (or a given repo) authored by the current user.
 *
 * Shells out to:
 *   gh pr list --author "@me" --state open --json number,title,headRefName,baseRefName,mergeStateStatus,mergeable,isDraft,updatedAt,url
 *
 * If `repo` is provided, adds `--repo <repo>` flag (for future multi-repo support).
 *
 * Returns parsed JSON array.
 */
export async function fetchMyOpenPRs(repo?: string): Promise<PrStatus[]>;
```

Define the `PrStatus` type either in this file or in a types file, depending on project convention:

```ts
interface PrStatus {
  number: number;
  title: string;
  headRefName: string;
  baseRefName: string;
  mergeStateStatus: 'BEHIND' | 'DIRTY' | 'BLOCKED' | 'CLEAN' | 'HAS_HOOKS' | 'UNKNOWN' | 'UNSTABLE';
  mergeable: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN';
  isDraft: boolean;
  updatedAt: string;
  url: string;
}
```

Implementation notes:

- Use `child_process.execSync` or the async equivalent, matching whatever pattern the existing branch selector command uses for invoking `gh`
- Parse the JSON output with proper error handling (gh not installed, not authenticated, not in a git repo, no remote, etc.)
- Filter out draft PRs from the display by default (but keep them in the data — a `--include-drafts` flag could be added later)

### 2. Create the `pr-status` command

Create the command file following the project's existing command file pattern and naming convention. The command name is `status` (invoked as `gli status`).

#### Behaviour

1. **Check prerequisites**: Call `assertGhAvailable()`. If the current directory isn't a git repo with a GitHub remote, exit with a clear message.

2. **Fetch PRs**: Call `fetchMyOpenPRs()`.

3. **Handle empty state**: If no open PRs, display a success message ("No open PRs") and exit.

4. **Display results**: Format the PR list using `@clack/prompts` log methods and `picocolors` for colour. Group or sort by status:

   **Status indicators** (use colours/symbols that match the project's existing style):
   - `CLEAN` → green ✓ — "Up to date"
   - `BEHIND` → yellow ⚠ — "Behind base branch — rebase needed"
   - `DIRTY` → red ✗ — "Diverged from base — rebase needed"
   - `BLOCKED` → dim/grey ○ — "Blocked (checks/reviews pending)"
   - `UNSTABLE` → dim/grey ○ — "CI running or failed"
   - `UNKNOWN` → dim/grey ? — "Status pending"

   **Display format per PR** (adapt to match existing output patterns):

   ```
   #42  feat/add-notifications    ⚠ Behind base branch — rebase needed
   #38  fix/auth-token            ✓ Up to date
   #35  chore/update-deps         ✗ Diverged — rebase needed
   ```

   Show a summary line at the end:

   ```
   3 open PRs · 2 need rebase
   ```

5. **Interactive action** (optional but nice): After displaying the list, if any PRs exist, show a `@clack/prompts` `select` prompt:
   - "Open a PR in browser" → runs `gh pr view <number> --web`
   - "Done" → exits

   This step is optional for Phase 1. If it feels like scope creep given the project's current patterns, skip it and just display the list. The interactive rebase selection comes in Phase 3.

### 3. Register the command

Wire the new command into the CLI's command router / entry point, following the exact pattern used by the existing branch selector and other commands. This likely involves:

- Adding it to a command map or switch statement in the main CLI entry
- Adding help text (follow the project's help text pattern)

### 4. Verify

- Run `pnpm build` to ensure no type errors
- Test manually: run the built CLI in a repo with open PRs
- Test edge cases: repo with no PRs, directory that isn't a git repo, `gh` not authenticated

---

## Guidelines

- **Follow existing patterns exactly** — file naming, import style, error handling, output formatting
- **Do not add new dependencies** — use what's already in the project
- **Reuse existing `gh` invocation patterns** — look at the branch selector command for how it shells out to `gh`
- **Keep it simple** — this is Phase 1. No config files, no multi-repo, no daemon. Just a clean, useful single-repo command.
- **Centralise `gh` logic** — even though this is Phase 1, put `gh` calls in a utility module so Phase 2+ can reuse them
- **Error messages should be helpful** — if `gh` isn't installed, say "gh CLI is required — install from <https://cli.github.com>". If not authenticated, say "Run `gh auth login` first."
