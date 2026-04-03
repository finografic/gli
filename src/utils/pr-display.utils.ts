import pc from 'picocolors';

import { isJiraLinksEnabled } from 'utils/config.utils.js';
import type { PrStatus } from 'utils/gh.utils.js';

interface StatusDisplay {
  symbol: string;
  color: (text: string) => string;
  label: string;
}

export function getUnresolvedCommentsBadge({ pr }: { pr: PrStatus }): string {
  if (pr.unresolvedCommentsCount <= 0) return '';
  return `💬\u2009${pc.dim(pr.unresolvedCommentsCount)}`;
}

/**
 * Get build status display (CI checks) for a PR.
 */
export function getBuildStatusDisplay({ pr }: { pr: PrStatus }): StatusDisplay {
  if (pr.mergeStateStatus === 'DIRTY') {
    return { symbol: '✗', color: pc.red, label: 'Conflicts' };
  }

  if (pr.mergeStateStatus === 'BEHIND') {
    return { symbol: '⚠', color: pc.yellow, label: 'Rebase needed' };
  }

  const checks = pr.statusCheckRollup;

  if (checks.length === 0) {
    return { symbol: '—', color: pc.dim, label: 'No CI' };
  }

  const hasFailed = checks.some((check) => {
    const conclusion = (check.conclusion ?? '').toUpperCase();
    const state = (check.state ?? '').toUpperCase();

    return (
      conclusion === 'FAILURE' ||
      conclusion === 'ERROR' ||
      conclusion === 'TIMED_OUT' ||
      conclusion === 'STARTUP_FAILURE' ||
      state === 'FAILURE' ||
      state === 'ERROR'
    );
  });

  if (hasFailed) {
    return { symbol: '❌', color: pc.red, label: 'Build failed' };
  }

  const isBuilding = checks.some((check) => {
    const status = (check.status ?? check.state ?? '').toUpperCase();
    return status === 'IN_PROGRESS' || status === 'QUEUED' || status === 'PENDING';
  });

  if (isBuilding) {
    return { symbol: '🚧', color: pc.dim, label: 'Building' };
  }

  return { symbol: '🟢', color: pc.green, label: 'Build passed' };
}

/**
 * Get approval status display (review decision + merge readiness) for a PR.
 */
export function getApprovalStatusDisplay({ pr }: { pr: PrStatus }): StatusDisplay {
  const approvalCount = pr.latestReviews.filter((r) => r.state === 'APPROVED').length;

  switch (pr.reviewDecision) {
    case 'APPROVED': {
      return { symbol: '✅', color: pc.green, label: `Approvals: ${approvalCount}` };
    }
    case 'CHANGES_REQUESTED': {
      return { symbol: '❗', color: pc.red, label: 'Changes requested' };
    }
    case 'REVIEW_REQUIRED': {
      const symbol = approvalCount === 1 ? '☑️' : '➖';
      return { symbol, color: pc.white, label: `Approvals: ${approvalCount}` };
    }
    default: {
      return { symbol: '✅', color: pc.dim, label: 'Can be merged' };
    }
  }
}

/**
 * Slice, trim, and truncate a PR title for display.
 */
export function truncatePrTitle({
  title,
  maxChars,
  sliceStart = 0,
}: {
  title: string;
  maxChars: number;
  sliceStart?: number;
}): string {
  let text = title.replace('  ', ' ').trim();
  if (sliceStart > 0) {
    text = text.slice(sliceStart).trim();
  }
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
}

/**
 * Create a clickable terminal link (if supported).
 */
export function terminalLink({ url, label }: { url: string; label: string }): string {
  // OSC 8 hyperlink format: \x1b]8;;URL\x1b\\TEXT\x1b]8;;\x1b\\
  return `\x1b]8;;${url}\x1b\\${label}\x1b]8;;\x1b\\`;
}

/**
 * Extract a JIRA-style ticket key from a branch name.
 * Matches the first occurrence of PROJECT-NUMBER (e.g. SBS-1234, JIRA-42).
 * Ignores common branch prefixes like build-, feature-, fix-, etc.
 */
export function getJiraTicketFromBranch({
  branch,
  issuePrefix,
}: {
  branch: string;
  issuePrefix?: string;
}): string | null {
  const pattern = issuePrefix ? new RegExp(`(${issuePrefix}-\\d+)`, 'i') : /([A-Z][A-Z0-9]+-\d+)/i;
  const match = pattern.exec(branch);
  return match?.[1]?.toUpperCase() ?? null;
}

/**
 * Format a single PR line for display with proper column alignment.
 */
export function formatPrLine({
  pr,
  prNumWidth = 0,
  branchWidth = 0,
  titleWidth = 0,
  titleSliceStart = 0,
  buildWidth = 0,
  commentsWidth = 0,
  compact = false,
  jiraConfig,
}: {
  pr: PrStatus;
  prNumWidth?: number;
  branchWidth?: number;
  titleWidth?: number;
  titleSliceStart?: number;
  buildWidth?: number;
  commentsWidth?: number;
  compact?: boolean;
  jiraConfig?: { baseUrl: string; issuePrefix?: string };
}): string {
  // PR number with "PR#" prefix in magenta (clickable)
  const prNumText = `PR#${pr.number}`;
  const prNumber = terminalLink({ url: pr.url, label: pc.magenta(prNumText) });

  // Branch name in cyan — optionally clickable JIRA link (disabled when baseUrl is empty)
  const jiraForBranchLink = jiraConfig && isJiraLinksEnabled(jiraConfig) ? jiraConfig : undefined;
  const ticket = jiraForBranchLink
    ? getJiraTicketFromBranch({
        branch: pr.headRefName,
        issuePrefix: jiraForBranchLink.issuePrefix,
      })
    : null;
  const branch =
    ticket && jiraForBranchLink
      ? terminalLink({
          url: `${jiraForBranchLink.baseUrl.replace(/\/$/, '')}/${ticket}`,
          label: pc.cyan(pr.headRefName),
        })
      : pc.cyan(pr.headRefName);

  const buildDisplay = getBuildStatusDisplay({ pr });
  const approvalDisplay = getApprovalStatusDisplay({ pr });
  const unresolvedCommentsBadge = getUnresolvedCommentsBadge({ pr });

  // Shared padding
  const prNumPadding = prNumWidth > 0 ? prNumWidth - prNumText.length : 0;
  const branchPadding = branchWidth > 0 ? branchWidth - pr.headRefName.length : 0;
  const commentsPadding = commentsWidth > 0 ? commentsWidth - unresolvedCommentsBadge.length : 0;
  const commentsPart = commentsWidth > 0 ? `  ${unresolvedCommentsBadge}${' '.repeat(commentsPadding)}` : '';

  if (compact) {
    const buildText = `${buildDisplay.symbol} ${buildDisplay.label}`;
    const buildStatusText = buildDisplay.color(buildText);
    const approvalText = `${approvalDisplay.symbol} ${approvalDisplay.label}`;
    const approvalStatusText = approvalDisplay.color(approvalText);
    const buildPadding = buildWidth > 0 ? buildWidth - buildText.length : 0;
    return `${prNumber}${' '.repeat(prNumPadding)}  ${branch}${' '.repeat(
      branchPadding,
    )}  ${buildStatusText}${' '.repeat(buildPadding)}  ${approvalStatusText}${commentsPart}`;
  }

  // Full mode
  const buildText = `${buildDisplay.symbol} ${buildDisplay.label}`;
  const buildStatusText = buildDisplay.color(buildText);
  const approvalText = `${approvalDisplay.symbol} ${approvalDisplay.label}`;
  const approvalStatusText = approvalDisplay.color(approvalText);
  const buildPadding = buildWidth > 0 ? buildWidth - buildText.length : 0;

  // Optional title column — trim front/back whitespace, then slice from start
  let titlePart = '';
  if (titleWidth > 0) {
    const truncated = truncatePrTitle({
      title: pr.title,
      maxChars: titleWidth,
      sliceStart: titleSliceStart,
    });
    titlePart = `  ${pc.white(truncated)}${' '.repeat(titleWidth - truncated.length)}`;
  }

  return `${prNumber}${' '.repeat(prNumPadding)}  ${branch}${' '.repeat(
    branchPadding,
  )}${titlePart}  ${buildStatusText}${' '.repeat(buildPadding)}  ${approvalStatusText}${commentsPart}`;
}

interface FormatPrLinesParams {
  prs: PrStatus[];
  showTitle?: boolean;
  titleMaxChars?: number;
  titleSliceStart?: number;
  /** Pre-computed widths — when provided, overrides per-batch calculation. */
  prNumWidth?: number;
  branchWidth?: number;
  buildWidth?: number;
  commentsWidth?: number;
  /** Compact mode: hides title, shows only build icon, shows approval icon + count only. */
  compact?: boolean;
  /** When set, branch names become clickable Jira ticket links. */
  jiraConfig?: { baseUrl: string; issuePrefix?: string };
}

/**
 * Format multiple PR lines with aligned columns.
 * Pass pre-computed widths to align columns across multiple repos.
 */
export function formatPrLines({
  prs,
  showTitle = false,
  titleMaxChars = 40,
  titleSliceStart = 0,
  prNumWidth: prNumWidthOverride,
  branchWidth: branchWidthOverride,
  buildWidth: buildWidthOverride,
  commentsWidth: commentsWidthOverride,
  compact = false,
  jiraConfig,
}: FormatPrLinesParams): string[] {
  if (prs.length === 0) return [];

  // Use provided widths or compute from this batch
  const prNumWidth = prNumWidthOverride ?? Math.max(...prs.map((pr) => `PR#${pr.number}`.length));
  const branchWidth = branchWidthOverride ?? Math.max(...prs.map((pr) => pr.headRefName.length));
  // Compact mode never shows title; full mode respects showTitle
  const titleWidth =
    !compact && showTitle ? Math.min(titleMaxChars, Math.max(...prs.map((pr) => pr.title.length))) : 0;
  const buildWidth =
    buildWidthOverride ??
    Math.max(
      ...prs.map((pr) => {
        const d = getBuildStatusDisplay({ pr });
        return `${d.symbol} ${d.label}`.length;
      }),
    );

  const commentsWidth =
    commentsWidthOverride ?? Math.max(...prs.map((pr) => getUnresolvedCommentsBadge({ pr }).length));

  return prs.map((pr) =>
    formatPrLine({
      pr,
      prNumWidth,
      branchWidth,
      titleWidth,
      titleSliceStart,
      buildWidth,
      commentsWidth,
      compact,
      jiraConfig,
    }),
  );
}

/**
 * Compute the column widths needed to align PR rows across multiple batches.
 * Useful for cross-repo alignment in the live display.
 */
export function computeColumnWidths({ prs }: { prs: PrStatus[] }): {
  prNumWidth: number;
  branchWidth: number;
  buildWidth: number;
  commentsWidth: number;
} {
  if (prs.length === 0) {
    return { prNumWidth: 0, branchWidth: 0, buildWidth: 0, commentsWidth: 0 };
  }
  return {
    prNumWidth: Math.max(...prs.map((pr) => `PR#${pr.number}`.length)),
    branchWidth: Math.max(...prs.map((pr) => pr.headRefName.length)),
    buildWidth: Math.max(
      ...prs.map((pr) => {
        const d = getBuildStatusDisplay({ pr });
        return `${d.symbol} ${d.label}`.length;
      }),
    ),
    commentsWidth: Math.max(...prs.map((pr) => getUnresolvedCommentsBadge({ pr }).length)),
  };
}

/**
 * Format PR options for a clack select prompt.
 * Each option has the branch name (aligned, cyan) followed by the truncated title (dim).
 */
export function formatSelectOptions({
  prs,
  titleMaxChars = 40,
  titleSliceStart = 0,
}: {
  prs: PrStatus[];
  titleMaxChars?: number;
  titleSliceStart?: number;
}): Array<{ value: string; label: string }> {
  const branchWidth = Math.max(...prs.map((pr) => pr.headRefName.length));

  return prs.map((pr) => {
    const branch = pc.cyan(pr.headRefName.padEnd(branchWidth));
    const truncated = truncatePrTitle({
      title: pr.title,
      maxChars: titleMaxChars,
      sliceStart: titleSliceStart,
    });
    return {
      value: pr.headRefName,
      label: `${branch}  ${pc.dim(truncated)}`,
    };
  });
}
