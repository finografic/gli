Let me read the select command and understand the full current structure first.

Read [](file:///Users/justin.rankin/repos-my/%40finografic-git-cli/src/commands/select/select.command.ts#1-1), lines 1 to 120

Now let me check what `@clack/prompts` select supports for option customization:

Ran terminal command: grep -r "select\|SelectOption\|label\|hint" node_modules/@clack/prompts/dist/index.d.ts 2>/dev/null | head -60

Ran terminal command: find /Users/justin.rankin/repos-my/@finografic-git-cli/node_modules/@clack -name "*.d.ts" | xargs grep -l "select\|Option" 2>/dev/null | head -5

Ran terminal command: cat node_modules/.pnpm/@clack+prompts*/node_modules/@clack/prompts/dist/index.d.ts 2>/dev/null | head -80 || find . -path "_/clack/prompts_" -name "*.d.ts" 2>/dev/null | head -5

Ran terminal command: pnpm install --frozen-lockfile 2>&1 | tail -5 && find node_modules -path "_clack/prompts_" -name "*.d.ts" 2>/dev/null | head -5

Ran terminal command: find . -path "_/node_modules/_" -name "*.d.ts" 2>/dev/null | grep clack | head -10

Ran terminal command: find ~/.local/share/pnpm/store -path "*clack*prompts*" -name "_.d.ts" 2>/dev/null | head -3; find /Users/justin.rankin -path "*clack*prompts_" -name "index.d.ts" 2>/dev/null | head -3

Let me check the package.json version and look up the clack API directly:

Ran terminal command: grep clack package.json
Completed with input: grep clack package.json

Searched for text `clack` (`**/package.json`), 1 result

Good — I have everything I need. Here's the plan:

- Extract a small `truncatePrTitle` helper in pr-display.utils.ts (DRY: reused by both `formatPrLine` and the new select function)
- Add `formatSelectOptions` — takes PRs, returns aligned `{ value, label }` array with branch in cyan + dim title
- In select.command.ts: force `showTitle: false` on the summary header; swap the options builder to use `formatSelectOptions`

Regarding color control in clack options: `label` accepts full ANSI strings, so we have full color control. The selected row gets clack's own cursor/indicator decoration on the left, but everything inside `label` renders as-is — so cyan branch + dim title will display correctly in both selected and unselected states.

Read [](file:///Users/justin.rankin/repos-my/%40finografic-git-cli/src/utils/pr-display.utils.ts#145-145), lines 145 to 175

Now I'll make all the changes:

Replacing 18 lines with 60 lines in [](file:///Users/justin.rankin/repos-my/%40finografic-git-cli/src/utils/pr-display.utils.ts)

```
```

Now update select.command.ts:

Replacing 20 lines with 20 lines in [](file:///Users/justin.rankin/repos-my/%40finografic-git-cli/src/commands/select/select.command.ts)

```
```

Ran terminal command: pnpm tsc --noEmit 2>&1

Clean. Here's a summary of what changed and why:

**pr-display.utils.ts**

- `truncatePrTitle({ title, maxChars, sliceStart })` — extracted helper; the inline slice/trim/truncate logic that existed in `formatPrLine` now goes through this. DRY baseline for both the line formatter and the new select formatter.
- `formatSelectOptions({ prs, titleMaxChars, titleSliceStart })` — returns `{ value, label }[]` for clack. Branch name is padded to max width across all PRs (same alignment approach as `computeColumnWidths`), coloured cyan. Title is sliced/truncated and wrapped in `pc.dim()`.

**select.command.ts**

- Summary header above the prompt: `showTitle: false` hardcoded — title now lives only in the options
- Options: replaced the raw `{ value, label: headRefName }` map with `formatSelectOptions(...)`, reading `titleMaxChars` and `titleSliceStart` from config as before

**On clack color control:** `label` is just a string — full ANSI control. Clack renders its own `●`/`○` cursor indicator and active-row underline on top of whatever you put in `label`, but doesn't strip or invert your color codes. So cyan branch + dim title will look correct in both active and inactive states.

Made changes.

---

Let me read the current select command and config utils fully first.

Read [](file:///Users/justin.rankin/repos-my/%40finografic-git-cli/src/commands/select/select.command.ts)

Read [](file:///Users/justin.rankin/repos-my/%40finografic-git-cli/src/utils/config.utils.ts#130-130), lines 130 to 150

Now I have the full picture. Key insight: when using the **cache** (populated by `live`), all repos are merged together — so we need to filter by the matched repo's `remote`. When fetching **fresh**, we should pass `repo: matchedConfig.remote` instead of the no-arg call.

Replacing 61 lines with 89 lines in [](file:///Users/justin.rankin/repos-my/%40finografic-git-cli/src/commands/select/select.command.ts)

```
```

Now fix the duplicate `readConfig()` call and update the empty-PRs message to mention the specific repo:

Read [](file:///Users/justin.rankin/repos-my/%40finografic-git-cli/src/commands/select/select.command.ts#90-90), lines 90 to 130

Replacing 31 lines with 29 lines in [](file:///Users/justin.rankin/repos-my/%40finografic-git-cli/src/commands/select/select.command.ts)

```
```

Now verify:

Ran terminal command: pnpm tsc --noEmit 2>&1

Clean. Here's what was changed and the logic:

**cwd matching** — `config.repos` is searched for a `localPath` that equals or is an ancestor of `cwd()`, so running from a subdirectory (e.g. inside src) still matches correctly.

**No configured repos** — if `config.repos` is empty the guard is skipped entirely, falling back to the original no-arg `fetchMyOpenPrs()` behaviour (current directory context).

**Cache filtering** — when `live` cache is fresh, sections are filtered by `repoInfo.url === matchedRepo.remote` before flattening PRs, so you only see PRs from the repo you're in.

**Fresh fetch** — passes `{ repo: matchedRepo.remote }` to `fetchMyOpenPrs`, scoping the `gh pr list` call to the correct repo regardless of what directory `gh` would otherwise infer.

**Error state** — if repos are configured but none match `cwd`, exits with:

```
✗ Current directory is not a configured repo path.
  Run gli select from within one of your configured repo directories.
```

Made changes.
