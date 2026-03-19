import pc from 'picocolors';

import { COMPACT_TOGGLE_KEY } from '../config/ui.constants.js';
import { getConfigFilePath, readConfig, tildeify } from './config.utils.js';
import { isDaemonInstalled, isDaemonRunning } from './daemon.utils.js';
import type { RepoInfo, RepoSection } from './gh.utils.js';
import { fetchMyOpenPrs, fetchRepoInfo } from './gh.utils.js';
import { computeColumnWidths, formatPrLines, terminalLink } from './pr-display.utils.js';

export type { RepoSection };

interface RenderDisplayParams {
  sections: RepoSection[];
  showTitle: boolean;
  titleMaxChars: number;
  titleSliceStart: number;
  liveInterval: number;
  isLive: boolean;
  compact?: boolean;
  jiraBaseUrl?: string;
}

/**
 * Render the PR status display. Used by `gli live` (loop) and `gli status` (once).
 * Pass `isLive: true` to include the refresh hint footer line.
 */
export function renderDisplay({
  sections,
  showTitle,
  titleMaxChars,
  titleSliceStart,
  liveInterval,
  isLive,
  compact = false,
  jiraBaseUrl,
}: RenderDisplayParams): string {
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
    }${compact ? `  ${pc.dim('[compact]')}` : ''}`,
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
        compact,
        jiraBaseUrl,
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
      pc.dim(
        `  Refreshing every ${liveInterval}s · [${COMPACT_TOGGLE_KEY}] toggle compact · Ctrl+C to exit`,
      ),
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
