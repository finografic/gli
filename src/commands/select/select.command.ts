import { execSync } from 'node:child_process';
import { exit } from 'node:process';

import * as clack from '@clack/prompts';
import pc from 'picocolors';

import { isCacheFresh, readCache, readConfig } from '../../utils/config.utils.js';
import type { PrStatus } from '../../utils/gh.utils.js';
import { assertGhAvailable, fetchMyOpenPrs } from '../../utils/gh.utils.js';
import { printCommandHelp } from '../../utils/help.utils.js';
import { formatPrLines } from '../../utils/pr-display.utils.js';

interface RunSelectCommandParams {
  argv: string[];
}

/**
 * Run the select command.
 */
export async function runSelectCommand({ argv }: RunSelectCommandParams): Promise<void> {
  if (argv.includes('--help') || argv.includes('-h')) {
    printCommandHelp({
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
    console.error(
      pc.red('Error:'),
      error instanceof Error ? error.message : 'GitHub CLI not available',
    );
    exit(1);
  }

  // Use cache if live is running and data is fresh; otherwise fetch from gh
  let pullRequests: PrStatus[];
  const cache = readCache();
  if (cache !== null && isCacheFresh({ cache })) {
    pullRequests = cache.sections.flatMap((s) => s.pullRequests);
  } else {
    try {
      pullRequests = await fetchMyOpenPrs();
    } catch (error: unknown) {
      console.error(
        `\n${pc.red('Error:')} ${error instanceof Error ? error.message : 'Unknown error'}\n`,
      );
      exit(1);
    }
  }

  if (pullRequests.length === 0) {
    console.log('');
    console.log(pc.yellow('No open PRs found for your account in this repository.'));
    console.log('');
    exit(0);
  }

  console.log('');
  console.log(pc.bold('🌿 Select Branch'));
  console.log('');

  const config = readConfig();

  // Display PR list with aligned columns
  const formattedLines = formatPrLines({
    prs: pullRequests,
    showTitle: config.prListing?.title?.display,
    titleMaxChars: config.prListing?.title?.maxChars,
  });
  for (const line of formattedLines) {
    console.log(`  ${line}`);
  }

  console.log('');

  // Interactive selection
  const options = pullRequests.map((pr) => ({
    value: pr.headRefName,
    label: pr.headRefName,
  }));

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
