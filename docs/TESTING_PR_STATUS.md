# Testing Guide

## Creating Test PRs with BEHIND/DIRTY Status

To test the `gli live` command with PRs that need rebasing, use the included test scripts.

### Prerequisites

Your repository **must** have branch protection enabled with these settings:

1. **Branch protection rules** enabled on `master`/`main`
2. **"Require status checks to pass before merging"** enabled
3. **"Require branches to be up to date before merging"** enabled (strict mode)

### Enable Branch Protection

**Option 1: GitHub Web UI**

1. Go to: `Settings → Branches → Branch protection rules`
2. Add rule for `master` (or your default branch)
3. Enable: ☑️ "Require status checks to pass before merging"
4. Enable: ☑️ "Require branches to be up to date before merging"
5. Save

**Option 2: GitHub CLI**

```bash
./scripts/testing/enable-branch-protection.sh
```

Or manually:

```bash
gh api --method PUT "/repos/{owner}/{repo}/branches/master/protection" \
  --input - <<'EOF'
{
  "required_status_checks": {"strict": true, "checks": []},
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

### Create Test PRs

**Script 1: `create-behind-prs.sh`** (Recommended)
Creates PRs that modify the **same file**, ensuring conflicts when one is merged:

```bash
./scripts/testing/create-behind-prs.sh
```

This will:

- Create 3 PRs (all modifying `test-behind-*.md`)
- Merge PR #2
- Leave PRs #1 and #3 as **DIRTY** (needs rebase due to conflicts)

**Script 2: `create-stale-prs.sh`** (Legacy)
Creates PRs with **different files** (less reliable for testing):

```bash
./scripts/testing/create-stale-prs.sh
```

Note: These may show as `CLEAN` instead of `BEHIND` since they don't conflict.

### Expected Statuses

| Status     | Symbol | Color  | Description                              |
| ---------- | ------ | ------ | ---------------------------------------- |
| `CLEAN`    | ✓      | Green  | Up to date, mergeable                    |
| `BEHIND`   | ⚠      | Yellow | Behind base, needs rebase (no conflicts) |
| `DIRTY`    | ✗      | Red    | Diverged from base, has conflicts        |
| `BLOCKED`  | ○      | Dim    | Blocked by checks/reviews                |
| `UNSTABLE` | ○      | Dim    | CI running or failed                     |

### Test with `gli live`

```bash
gli live
```

You should see PRs with different status indicators based on their merge state.

### Cleanup

After testing, close the test PRs and delete the test branches:

```bash
gh pr close <PR_NUMBER>
git push origin --delete <branch-name>
```

Remove test files from the repository if needed.
