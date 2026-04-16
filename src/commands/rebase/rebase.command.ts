import { execSync } from 'node:child_process';
import { exit } from 'node:process';
import { createFlowContext, promptConfirm } from '@finografic/cli-kit/flow';
import type { FlowContext } from '@finografic/cli-kit/flow';
import { renderCommandHelp } from '@finografic/cli-kit/render-help';
import * as clack from '@clack/prompts';
import { rebaseHelp } from 'commands/rebase/rebase.help.js';
import pc from 'picocolors';

import { readConfig } from 'utils/config.utils.js';
import type { PrStatus, RepoSection } from 'utils/gh.utils.js';
import { assertGhAvailable, fetchDefaultBranch } from 'utils/gh.utils.js';
import { formatPrLines } from 'utils/pr-display.utils.js';
import { fetchPrSections } from 'utils/pr-sections.utils.js';

interface RunRebaseCommandParams {
  argv: string[];
}

interface RebaseBranchParams {
  branch: string;
  _prNumber: number;
  defaultBranch: string;
  interactive: boolean;
  squash: boolean;
  flow: FlowContext;
}

interface RebaseBranchResult {
  success: boolean;
  aborted: boolean;
}

export interface SilentRebaseResult {
  repoName: string;
  branch: string;
  success: boolean;
  error?: string;
}

function needsRebase(pr: PrStatus): boolean {
  return pr.mergeStateStatus === 'BEHIND' || pr.mergeStateStatus === 'DIRTY';
}

function getCurrentBranch(cwd?: string): string {
  return execSync('git rev-parse --abbrev-ref HEAD', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    ...(cwd ? { cwd } : {}),
  }).trim();
}

function hasUncommittedChanges(cwd?: string): boolean {
  const output = execSync('git status --porcelain', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    ...(cwd ? { cwd } : {}),
  }).trim();

  return output.length > 0;
}

function getCommitCount({ defaultBranch, cwd }: { defaultBranch: string; cwd?: string }): number {
  try {
    const count = execSync(`git rev-list --count origin/${defaultBranch}..HEAD`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...(cwd ? { cwd } : {}),
    }).trim();
    return parseInt(count, 10);
  } catch {
    return 0;
  }
}

async function rebaseBranch({
  branch,
  _prNumber,
  defaultBranch,
  interactive,
  squash,
  flow,
}: RebaseBranchParams): Promise<RebaseBranchResult> {
  // Fetch origin
  try {
    console.log(`  ${pc.dim('•')} Fetching origin...`);
    execSync('git fetch origin', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (error: unknown) {
    console.log(`  ${pc.red('✗')} Fetch failed`);
    console.log(`    ${pc.red(error instanceof Error ? error.message : 'Failed to fetch origin')}`);
    return { success: false, aborted: false };
  }

  // Checkout branch
  try {
    console.log(`  ${pc.dim('•')} Checking out ${pc.cyan(branch)}...`);
    execSync(`git checkout ${branch}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (error: unknown) {
    console.log(`  ${pc.red('✗')} Checkout failed`);
    console.log(`    ${pc.red(error instanceof Error ? error.message : `Failed to checkout ${branch}`)}`);
    return { success: false, aborted: false };
  }

  // Determine rebase strategy
  let rebaseCommand: string;
  const rebaseEnv = { ...process.env };

  if (squash) {
    const commitCount = getCommitCount({ defaultBranch });
    console.log(
      `  ${pc.dim('•')} Found ${commitCount} commit${
        commitCount === 1 ? '' : 's'
      } ahead of origin/${defaultBranch}`,
    );

    if (commitCount > 1) {
      console.log(`  ${pc.dim('•')} Auto-squashing ${commitCount} commits...`);
      rebaseCommand = `git rebase -i origin/${defaultBranch}`;
      rebaseEnv.GIT_SEQUENCE_EDITOR = "sed -i -e '2,$s/^pick/squash/'";
    } else if (commitCount === 1) {
      console.log(`  ${pc.dim('•')} Single commit, using simple rebase`);
      rebaseCommand = `git rebase origin/${defaultBranch}`;
    } else {
      console.log(`  ${pc.yellow('⚠')} No commits to rebase`);
      return { success: false, aborted: false };
    }
  } else if (interactive) {
    console.log(`  ${pc.dim('•')} Starting interactive rebase...`);
    rebaseCommand = `git rebase -i origin/${defaultBranch}`;
  } else {
    console.log(`  ${pc.dim('•')} Rebasing onto origin/${defaultBranch}...`);
    rebaseCommand = `git rebase origin/${defaultBranch}`;
  }

  // Execute rebase
  try {
    execSync(rebaseCommand, {
      encoding: 'utf-8',
      stdio: 'inherit', // Show git's interactive editor if needed
      env: rebaseEnv,
    });
    console.log(`  ${pc.green('✓')} Rebase succeeded`);
  } catch {
    console.log(`  ${pc.yellow('⚠')} Rebase conflict detected`);
    console.log('');
    console.log(`  ${pc.dim('Resolve conflicts manually, then run:')}`);
    console.log(`    ${pc.cyan('git rebase --continue')}`);
    console.log(`    ${pc.cyan(`git push --force-with-lease origin ${branch}`)}`);
    console.log('');
    console.log(`  ${pc.dim('Or abort:')}`);
    console.log(`    ${pc.cyan('git rebase --abort')}`);
    console.log('');

    try {
      execSync('git rebase --abort', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    } catch {
      // Abort may fail if already aborted
    }

    return { success: false, aborted: true };
  }

  // Force-push confirmation
  const shouldPush = await promptConfirm(flow, {
    message: `Force-push ${pc.cyan(branch)} to origin?`,
    default: true,
    skipMessage: `  ${pc.dim('→')} Auto-pushing with --force-with-lease ${pc.dim('(-y)')}`,
  });
  if (!shouldPush) {
    console.log(`  ${pc.dim('○')} Skipped push`);
    return { success: true, aborted: false };
  }

  // Push with --force-with-lease
  try {
    console.log(`  ${pc.dim('•')} Pushing with --force-with-lease...`);
    execSync(`git push --force-with-lease origin ${branch}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log(`  ${pc.green('✓')} Pushed ${pc.bold(branch)}`);
  } catch (error: unknown) {
    console.log(`  ${pc.red('✗')} Push failed`);
    console.log(`    ${pc.red(error instanceof Error ? error.message : 'Failed to push')}`);
    return { success: false, aborted: false };
  }

  return { success: true, aborted: false };
}

export async function runRebaseCommand({ argv }: RunRebaseCommandParams) {
  const flow = createFlowContext(argv, {
    all: { type: 'boolean' },
    interactive: { alias: 'i', type: 'boolean' },
    squash: { alias: 's', type: 'boolean' },
    y: { type: 'boolean' },
  });

  const all = Boolean(flow.flags['all']);
  const interactive = Boolean(flow.flags['interactive']);
  const squash = Boolean(flow.flags['squash']);

  if (argv.includes('--help') || argv.includes('-h')) {
    renderCommandHelp(rebaseHelp);
    return;
  }

  console.log('');
  console.log('🔄 PR Rebase');
  console.log('');

  try {
    await assertGhAvailable();
  } catch (error: unknown) {
    console.log(`  ${pc.red('✗')} ${error instanceof Error ? error.message : 'GitHub CLI not available'}`);
    exit(1);
  }

  if (hasUncommittedChanges()) {
    console.log(`  ${pc.red('✗')} You have uncommitted changes. Please commit or stash them first.`);
    console.log('');
    exit(1);
  }

  const originalBranch = getCurrentBranch();

  console.log(`  ${pc.dim('•')} Fetching your open PRs...`);
  let allPrs: PrStatus[];
  try {
    const allSections = await fetchPrSections();
    const cwd = process.cwd();
    const config = await readConfig();
    const matchedRepo = config.repos.find((r) => cwd === r.localPath || cwd.startsWith(`${r.localPath}/`));
    let sections: RepoSection[];
    if (matchedRepo) {
      const normalise = (u: string) => u.replace(/\.git$/, '').replace(/\/+$/, '');
      const remoteKey = normalise(matchedRepo.remote);
      sections = allSections.filter((s) => s.repoInfo != null && normalise(s.repoInfo.url) === remoteKey);
      if (sections.length === 0) sections = allSections;
    } else {
      sections = allSections;
    }
    allPrs = sections.flatMap((s) => s.pullRequests);
  } catch (error: unknown) {
    console.log(`  ${pc.red('✗')} Failed to fetch PRs`);
    console.log(`    ${pc.red(error instanceof Error ? error.message : 'Unknown error')}`);
    exit(1);
  }

  const pullRequests = allPrs.filter((pr) => !pr.isDraft);
  const stalePrs = pullRequests.filter(needsRebase);

  console.log('');

  const config = await readConfig();
  const cwd = process.cwd();
  const matchedRepoConfig = config.repos.find(
    (r) => cwd === r.localPath || cwd.startsWith(`${r.localPath}/`),
  );
  const jiraConfig = matchedRepoConfig?.jira ?? config.jira;

  // Show full report (all PRs) — compact by default in rebase context
  const formattedLines = formatPrLines({
    prs: pullRequests,
    showTitle: config.prListing?.title?.display,
    titleMaxChars: config.prListing?.title?.maxChars,
    compact: true,
    jiraConfig,
  });
  for (const line of formattedLines) {
    console.log(`  ${line}`);
  }

  if (stalePrs.length === 0) {
    console.log(`  ${pc.green('✓')} All PRs are up to date. Nothing to rebase.`);
    console.log('');
    return;
  }

  let defaultBranch: string;
  try {
    defaultBranch = await fetchDefaultBranch();
  } catch {
    console.log(`  ${pc.red('✗')} Could not detect the default branch`);
    exit(1);
  }

  console.log('');

  let toRebase: PrStatus[];

  if (all) {
    const confirmed = await promptConfirm(flow, {
      message: `Rebase all ${stalePrs.length} branch${stalePrs.length === 1 ? '' : 'es'} onto origin/${defaultBranch}?`,
      default: flow.yesMode ? true : false,
      skipMessage: `  ${pc.dim('→')} Auto-rebasing all ${stalePrs.length} stale branch${stalePrs.length === 1 ? '' : 'es'} ${pc.dim('(-y)')}`,
    });
    if (!confirmed) {
      console.log(`  ${pc.dim('Cancelled')}`);
      console.log('');
      return;
    }

    toRebase = stalePrs;
  } else {
    const selected = await clack.select({
      message: 'Which branch do you want to rebase?',
      options: [
        ...stalePrs.map((pr) => ({
          value: pr.headRefName,
          label: pr.headRefName,
          hint: `#${pr.number} ${pr.title.length > 40 ? `${pr.title.slice(0, 37)}...` : pr.title}`,
        })),
        { value: '__cancel__', label: 'Cancel' },
      ],
    });

    if (clack.isCancel(selected) || selected === '__cancel__') {
      console.log(`  ${pc.dim('Cancelled')}`);
      console.log('');
      return;
    }

    const match = stalePrs.find((pr) => pr.headRefName === selected);
    if (!match) {
      console.log(`  ${pc.dim('Cancelled')}`);
      console.log('');
      return;
    }

    toRebase = [match];
  }

  console.log('');

  // Step-through flow for each branch
  let succeeded = 0;
  let failed = 0;
  let lastBranch = originalBranch;

  for (let i = 0; i < toRebase.length; i++) {
    const pr = toRebase[i]!;
    const progressLabel = toRebase.length > 1 ? `[${i + 1}/${toRebase.length}] ` : '';

    console.log(
      `${progressLabel}${pc.bold('Rebasing')} ${pc.cyan(pr.headRefName)} ${pc.dim(`(#${pr.number})`)}`,
    );
    console.log('');

    // Per-branch confirm (only in --all mode; auto-accepted with -y)
    if (all) {
      const confirmBranch = await promptConfirm(flow, {
        message: `Rebase ${pc.cyan(pr.headRefName)}?`,
        default: true,
        skipMessage: `  ${pc.dim('→')} Auto-confirming rebase ${pc.dim('(-y)')}`,
      });
      if (!confirmBranch) {
        console.log(`  ${pc.dim('○')} Skipped`);
        console.log('');
        continue;
      }
      console.log('');
    }

    const result = await rebaseBranch({
      branch: pr.headRefName,
      _prNumber: pr.number,
      defaultBranch,
      interactive,
      squash,
      flow,
    });

    console.log('');

    if (result.success) {
      succeeded++;
      lastBranch = pr.headRefName;
    } else {
      failed++;

      if (flow.yesMode) {
        // In -y mode, exit immediately on any failure
        console.log(`  ${pc.red('✗')} Stopping — rebase failed. Resolve conflicts and retry.`);
        console.log('');
        return;
      }

      // If aborted due to conflicts and more branches remain, ask to continue
      if (result.aborted && i < toRebase.length - 1) {
        const shouldContinue = await promptConfirm(flow, {
          message: 'Continue to next branch?',
          default: false,
          required: true,
        });
        if (!shouldContinue) {
          console.log(`  ${pc.dim('Stopped. Staying on')} ${pc.cyan(pr.headRefName)}`);
          console.log('');
          return;
        }
        console.log('');
      }
    }
  }

  if (lastBranch !== originalBranch) {
    try {
      execSync(`git checkout ${originalBranch}`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      console.log(`  ${pc.dim('Returned to')} ${pc.cyan(originalBranch)}`);
    } catch {
      console.log(`  ${pc.yellow('⚠')} Could not return to ${originalBranch}`);
    }
  }

  console.log('');

  if (failed === 0) {
    console.log(`  ${pc.green('✓')} Rebased ${succeeded} branch${succeeded === 1 ? '' : 'es'} successfully`);
  } else {
    console.log(
      `  ${pc.dim('Result:')} ${pc.green(`${succeeded} succeeded`)}, ${pc.red(`${failed} failed`)}`,
    );
  }

  console.log('');
}

/**
 * Silently rebase all stale branches across all configured repos. Used by `gli live --auto-rebase`. No
 * prompts, no console output. Failures are caught per-branch and the loop continues.
 */
export async function runSilentRebaseAll(): Promise<SilentRebaseResult[]> {
  const config = await readConfig();
  const results: SilentRebaseResult[] = [];

  let sections: RepoSection[];
  try {
    sections = await fetchPrSections();
  } catch {
    return [];
  }

  const normalise = (u: string) => u.replace(/\.git$/, '').replace(/\/+$/, '');

  for (const section of sections) {
    if (section.error || !section.repoInfo) continue;

    const repoConfig = config.repos.find((r) => normalise(r.remote) === normalise(section.repoInfo!.url));
    if (!repoConfig?.localPath) continue;

    const localPath = repoConfig.localPath;
    const stalePrs = section.pullRequests.filter((pr) => !pr.isDraft && needsRebase(pr));
    if (stalePrs.length === 0) continue;

    // Skip repo if there are uncommitted changes
    if (hasUncommittedChanges(localPath)) {
      results.push({
        repoName: section.repoInfo.nameWithOwner,
        branch: '*',
        success: false,
        error: 'Uncommitted changes',
      });
      continue;
    }

    let originalBranch: string;
    try {
      originalBranch = getCurrentBranch(localPath);
    } catch {
      continue;
    }

    let defaultBranch: string;
    try {
      defaultBranch = await fetchDefaultBranch({ repo: repoConfig.remote });
    } catch {
      continue;
    }

    for (const pr of stalePrs) {
      try {
        execSync('git fetch origin', {
          cwd: localPath,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        execSync(`git checkout ${pr.headRefName}`, {
          cwd: localPath,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        execSync(`git rebase origin/${defaultBranch}`, {
          cwd: localPath,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        execSync(`git push --force-with-lease origin ${pr.headRefName}`, {
          cwd: localPath,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        results.push({ repoName: section.repoInfo.nameWithOwner, branch: pr.headRefName, success: true });
      } catch (err: unknown) {
        try {
          execSync('git rebase --abort', {
            cwd: localPath,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          });
        } catch {
          // Already aborted or not in progress
        }
        const message =
          err instanceof Error ? (err.message.split('\n')[0] ?? 'Unknown error') : 'Unknown error';
        results.push({
          repoName: section.repoInfo.nameWithOwner,
          branch: pr.headRefName,
          success: false,
          error: message,
        });
      }
    }

    // Return to original branch
    try {
      execSync(`git checkout ${originalBranch}`, {
        cwd: localPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {
      // Non-critical
    }
  }

  return results;
}
