import logUpdate from 'log-update';
import pc from 'picocolors';

import {
  DEFAULT_LIVE_INTERVAL,
  DEFAULT_PR_TITLE_MAX_CHARS,
} from '../../config/defaults.constants.js';
import {
  DEFAULT_PR_TITLE_SLICE_START,
  SPINNER_INTERVAL_MS,
  SPINNER_SEQUENCE,
} from '../../config/ui.constants.js';
import { getConfigFilePath, readConfig, tildeify, writeCache } from '../../utils/config.utils.js';
import { isDaemonInstalled, isDaemonRunning } from '../../utils/daemon.utils.js';
import type { RepoInfo, RepoSection } from '../../utils/gh.utils.js';
import { assertGhAvailable, fetchMyOpenPrs, fetchRepoInfo } from '../../utils/gh.utils.js';
import { printCommandHelp } from '../../utils/help.utils.js';
import { computeColumnWidths, formatPrLines, terminalLink } from '../../utils/pr-display.utils.js';

interface RunLiveCommandParams {
  argv: string[];
}

/**
 * Render the PR status display. Used by both `gli live` (loop) and `gli status` (once).
 * Pass `isLive: true` to include the refresh hint footer line.
 */
export function renderDisplay(
  {
    sections,
    showTitle,
    titleMaxChars,
    titleSliceStart,
    liveInterval,
    isLive,
  }: {
    sections: RepoSection[];
    showTitle: boolean;
    titleMaxChars: number;
    titleSliceStart: number;
    liveInterval: number;
    isLive: boolean;
  },
): string {
  const lines: string[] = [];

  // Header with 24h time (no timezone)
  const now = new Date();
  lines.push('');
  lines.push(
    `${pc.bold('📊 PRs LIVE Status')} ${
      pc.dim(
        `- refreshed ${
          now.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        }`,
      )
    }`,
  );
  lines.push('');

  // One section per repo — skip repos with no PRs and no error
  const visibleSections = sections.filter((s) => s.error || s.pullRequests.length > 0);

  if (visibleSections.length === 0) {
    lines.push(pc.dim('  No open PRs found'));
    lines.push('');
  }

  // Compute column widths across ALL repos for even alignment
  const allPrs = visibleSections.flatMap((s) => s.pullRequests);
  const globalWidths = computeColumnWidths({ prs: allPrs });

  for (const { repoInfo, pullRequests, error } of visibleSections) {
    if (repoInfo) {
      const pullsUrl = `${repoInfo.url}/pulls`;
      const repoLink = terminalLink({
        url: pullsUrl,
        label: pc.bold(pc.white(repoInfo.nameWithOwner)),
      });
      lines.push(`  ${repoLink}`);
      lines.push('');
    }

    if (error) {
      lines.push(`  ${pc.red('✗')} ${pc.dim(error)}`);
    } else {
      const formattedLines = formatPrLines({
        prs: pullRequests,
        showTitle,
        titleMaxChars,
        titleSliceStart,
        ...globalWidths,
      });
      for (const line of formattedLines) {
        lines.push(`  ${line}`);
      }
    }

    lines.push('');
  }

  // Metadata Footer
  const daemonInstalled = isDaemonInstalled();
  const daemonRunning = isDaemonRunning();

  // Calculate label width for alignment
  const labels = ['config:', 'daemon:'];
  const labelWidth = Math.max(...labels.map((l) => l.length));

  // Daemon status
  const daemonStatus = daemonRunning
    ? pc.green('✓ running')
    : daemonInstalled
    ? pc.yellow('○ installed, not running')
    : pc.dim('not installed');
  lines.push(`  ${pc.white('daemon:'.padEnd(labelWidth))}  ${daemonStatus}`);

  // Config info
  lines.push(
    `  ${pc.white('config:'.padEnd(labelWidth))}  ${pc.dim(tildeify(getConfigFilePath()))}`,
  );

  lines.push('');

  if (isLive) {
    lines.push(
      pc.dim(`  Refreshing every ${liveInterval}s · Press Ctrl+C to exit`),
    );
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Fetch PR sections from all configured repos (or current directory as fallback).
 */
export async function fetchPrSections(): Promise<RepoSection[]> {
  const config = readConfig();

  if (config.repos.length > 0) {
    return Promise.all(
      config.repos.map(async (repo) => {
        try {
          const repoInfo = await fetchRepoInfo({ repo: repo.remote });
          const allPrs = await fetchMyOpenPrs({ repo: repo.remote });
          return {
            repoInfo,
            pullRequests: allPrs.filter((pr) => !pr.isDraft),
          };
        } catch (error: unknown) {
          return {
            repoInfo: null,
            pullRequests: [],
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }),
    );
  }

  // No configured repos — fall back to current directory
  let repoInfo: RepoInfo | null = null;
  try {
    repoInfo = await fetchRepoInfo();
  } catch {
    // Not critical
  }
  const allPrs = await fetchMyOpenPrs();
  return [{ repoInfo, pullRequests: allPrs.filter((pr) => !pr.isDraft) }];
}

/**
 * Fetch and re-render the live display.
 */
async function fetchAndDisplay(): Promise<void> {
  try {
    const config = readConfig();
    const sections = await fetchPrSections();
    writeCache({ sections });

    const showTitle = config.prListing?.title?.display ?? false;
    const titleMaxChars = config.prListing?.title?.maxChars ?? DEFAULT_PR_TITLE_MAX_CHARS;
    const titleSliceStart = config.prListing?.title?.sliceStart ?? DEFAULT_PR_TITLE_SLICE_START;
    const liveInterval = config.liveInterval ?? DEFAULT_LIVE_INTERVAL;

    const output = renderDisplay({
      sections,
      showTitle,
      titleMaxChars,
      titleSliceStart,
      liveInterval,
      isLive: true,
    });

    logUpdate(output);
  } catch (error: unknown) {
    logUpdate(
      `\n${pc.red('Error:')} ${error instanceof Error ? error.message : 'Unknown error'}\n`,
    );
  }
}

/**
 * Show a spinner via logUpdate while waiting for the first data fetch.
 * Returns a cleanup function that stops the spinner.
 */
function startSpinner(): () => void {
  let frame = 0;
  const timer = setInterval(() => {
    const glyph = SPINNER_SEQUENCE[frame % SPINNER_SEQUENCE.length];
    logUpdate(`\n  ${pc.bold(pc.gray(glyph))}  ${pc.gray('Fetching PR status…')}\n`);
    frame++;
  }, SPINNER_INTERVAL_MS);

  return () => clearInterval(timer);
}

/**
 * Run the live command.
 */
export async function runLiveCommand({ argv }: RunLiveCommandParams): Promise<void> {
  if (argv.includes('--help') || argv.includes('-h')) {
    printCommandHelp({
      command: 'gli live',
      description: 'Live-updating PR status dashboard (⭐ RECOMMENDED)',
      usage: 'gli live',
      options: [],
      examples: [
        {
          command: 'gli live',
          description:
            `Start live dashboard (refreshes every ${DEFAULT_LIVE_INTERVAL}s by default)`,
        },
        {
          command: 'gli config edit',
          description: 'Customize refresh interval and other settings',
        },
      ],
      sections: [
        {
          title: 'DESCRIPTION',
          content: `  Live-updating terminal dashboard for PR status, like htop but for your PRs.
  Perfect for running in a terminal panel to monitor pull requests in real-time.

  The dashboard shows:
  - PR list with status indicators (clickable PR numbers and repo names)
  - Build and approval status columns
  - Config and daemon status

  Refresh interval defaults to ${DEFAULT_LIVE_INTERVAL}s. Customize via \`gli config edit\` (liveInterval).`,
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
    process.exit(1);
  }

  // Clear console and show animated spinner while first async fetch runs.
  console.clear();
  const stopSpinner = startSpinner();
  await fetchAndDisplay();
  stopSpinner();

  // Read interval from config for the polling loop
  const config = readConfig();
  const liveInterval = config.liveInterval ?? DEFAULT_LIVE_INTERVAL;
  const intervalMs = liveInterval * 1000;

  setInterval(() => {
    fetchAndDisplay();
  }, intervalMs);

  // Keep process alive
  process.stdin.resume();
}
