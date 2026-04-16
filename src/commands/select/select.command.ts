import { execSync } from 'node:child_process';
import { cwd } from 'node:process';
import { exit } from 'node:process';
import { renderCommandHelp } from '@finografic/cli-kit/render-help';
import * as clack from '@clack/prompts';
import pc from 'picocolors';

import { isCacheFresh, readCache } from 'utils/cache.utils.js';
import { readConfig } from 'utils/config.utils.js';
import type { PrStatus } from 'utils/gh.utils.js';
import { assertGhAvailable, fetchMyOpenPrs } from 'utils/gh.utils.js';
import { formatPrLines, formatSelectOptions } from 'utils/pr-display.utils.js';

interface RunSelectCommandParams {
  argv: string[];
}

/**
 * Run the select command.
 */
export async function runSelectCommand({ argv }: RunSelectCommandParams): Promise<void> {
  if (argv.includes('--help') || argv.includes('-h')) {
    renderCommandHelp({
      command: 'gli select',
      description: 'Interactively checkout a branch from one of your open PRs',
      usage: 'gli select',
      examples: [
        {
          command: 'gli select',
          description: 'Show PR list and select a branch to checkout',
        },
      ],
    });
    return;
  }

  // Check gh availability
  try {
    await assertGhAvailable();
  } catch (error: unknown) {
    console.error(pc.red('Error:'), error instanceof Error ? error.message : 'GitHub CLI not available');
    exit(1);
  }

  const config = await readConfig();

  // Match cwd against a configured repo localPath (support being in a subdirectory)
  const currentDir = cwd();
  const matchedRepo = config.repos.find(
    (repo) => currentDir === repo.localPath || currentDir.startsWith(`${repo.localPath}/`),
  );

  if (config.repos.length > 0 && matchedRepo === undefined) {
    console.log('');
    console.error(pc.red('✗ Current directory is not a configured repo path.'));
    console.error(
      pc.dim(`  Run ${pc.white('gli select')} from within one of your configured repo directories.`),
    );
    console.log('');
    exit(1);
  }

  // Use cache if live is running and data is fresh; otherwise fetch from gh.
  // When a matched repo is known, scope both cache lookup and fresh fetch to that repo only.
  let pullRequests: PrStatus[];
  const cache = readCache();
  if (cache !== null && isCacheFresh({ cache })) {
    pullRequests =
      matchedRepo !== undefined
        ? cache.sections.filter((s) => s.repoInfo?.url === matchedRepo.remote).flatMap((s) => s.pullRequests)
        : cache.sections.flatMap((s) => s.pullRequests);
  } else {
    try {
      pullRequests = await fetchMyOpenPrs(
        matchedRepo !== undefined ? { repo: matchedRepo.remote } : undefined,
      );
    } catch (error: unknown) {
      console.error(`\n${pc.red('Error:')} ${error instanceof Error ? error.message : 'Unknown error'}\n`);
      exit(1);
    }
  }

  if (pullRequests.length === 0) {
    console.log('');
    console.log(
      pc.yellow(
        `No open PRs found for your account${matchedRepo !== undefined ? ` in ${matchedRepo.remote}` : ''}.`,
      ),
    );
    console.log('');
    exit(0);
  }

  console.log('');
  console.log(pc.bold('🌿 Select Branch'));
  console.log('');

  // Display PR list with aligned columns — title suppressed here; shown in select options instead
  const formattedLines = formatPrLines({
    prs: pullRequests,
    showTitle: false,
  });
  for (const line of formattedLines) {
    console.log(`  ${line}`);
  }

  console.log('');

  // Interactive selection — branch name (aligned) + dim title in each option
  const options = formatSelectOptions({
    prs: pullRequests,
    titleMaxChars: config.prListing?.title?.maxChars,
    titleSliceStart: config.prListing?.title?.sliceStart,
  });

  const selectedBranch = await clack.select({
    message: 'Select a branch to checkout:',
    options,
  });

  if (clack.isCancel(selectedBranch)) {
    console.log('');
    console.log(pc.dim('Cancelled'));
    console.log('');
    exit(0);
  }

  // Checkout the branch
  try {
    execSync(`git checkout ${selectedBranch}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    console.log('');
    console.log(pc.green(`✓ Switched to branch: ${pc.bold(selectedBranch)}`));
    console.log('');
  } catch (error: unknown) {
    console.error('');
    console.error(
      pc.red('✗ Failed to checkout branch:'),
      error instanceof Error ? error.message : 'Unknown error',
    );
    console.error('');
    exit(1);
  }
}
