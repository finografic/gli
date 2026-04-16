import pc from 'picocolors';

import { getConfigFilePath, readConfig, tildeify } from 'utils/config.utils.js';
import type { RepoInfo, RepoSection } from 'utils/gh.utils.js';
import { fetchMyOpenPrs, fetchRepoInfo } from 'utils/gh.utils.js';
import { computeColumnWidths, formatPrLines, terminalLink } from 'utils/pr-display.utils.js';

import { DEFAULT_JIRA_BASE_URL, DEFAULT_JIRA_ISSUE_PREFIX } from 'config/defaults.constants.js';
import { COMPACT_TOGGLE_KEY } from 'config/ui.constants.js';
import type { JiraConfig } from 'types/config.types.js';

export type { RepoSection };

interface RenderDisplayParams {
  sections: RepoSection[];
  showTitle: boolean;
  titleMaxChars: number;
  titleSliceStart: number;
  liveInterval: number;
  isLive: boolean;
  compact?: boolean;
  jiraConfig?: JiraConfig;
}

/**
 * Render the PR status display. Used by `gli live` (loop) and `gli status` (once). Pass `isLive: true` to
 * include the refresh hint footer line.
 */
export function renderDisplay({
  sections,
  showTitle,
  titleMaxChars,
  titleSliceStart,
  liveInterval,
  isLive,
  compact = false,
  jiraConfig,
}: RenderDisplayParams): string {
  const lines: string[] = [];

  const now = new Date();
  lines.push('');
  lines.push(
    `${pc.bold('📊 PRs LIVE Status')} ${pc.dim(
      `- refreshed ${now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}`,
    )}${compact ? `  ${pc.dim('[compact]')}` : ''}`,
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

  for (const { repoInfo, pullRequests, jiraConfig: sectionJira, error } of visibleSections) {
    if (repoInfo) {
      const pullsUrl = `${repoInfo.url}/pulls`;
      const repoLink = terminalLink({
        url: pullsUrl,
        label: pc.bold(pc.white(repoInfo.nameWithOwner)),
      });
      lines.push(`  ${repoLink}`);
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
        jiraConfig: sectionJira ?? jiraConfig,
        ...globalWidths,
      });
      for (const line of formattedLines) {
        lines.push(`  ${line}`);
      }
    }

    lines.push('');
  }

  lines.push(`  ${pc.dim(tildeify(getConfigFilePath()))}`);

  lines.push('');

  if (isLive) {
    lines.push(
      pc.dim(
        `  Refreshing every ${liveInterval}s · [${COMPACT_TOGGLE_KEY.label}] toggle compact · Ctrl+C to exit`,
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
  const globalJira: JiraConfig | undefined =
    config.jira ??
    (DEFAULT_JIRA_BASE_URL
      ? { baseUrl: DEFAULT_JIRA_BASE_URL, issuePrefix: DEFAULT_JIRA_ISSUE_PREFIX }
      : undefined);

  if (config.repos.length > 0) {
    return Promise.all(
      config.repos.map(async (repo) => {
        try {
          const repoInfo = await fetchRepoInfo({ repo: repo.remote });
          const allPrs = await fetchMyOpenPrs({ repo: repo.remote });
          return {
            repoInfo,
            pullRequests: allPrs.filter((pr) => !pr.isDraft),
            jiraConfig: repo.jira ?? globalJira,
          };
        } catch (error: unknown) {
          return {
            repoInfo: null,
            pullRequests: [],
            jiraConfig: repo.jira ?? globalJira,
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
  const pullRequests = allPrs.filter((pr) => !pr.isDraft);

  return [{ repoInfo, pullRequests, jiraConfig: globalJira }];
}
