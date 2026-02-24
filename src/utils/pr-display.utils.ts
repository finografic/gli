import pc from 'picocolors';

import type { PrStatus } from './gh.utils.js';

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

    return conclusion === 'FAILURE'
      || conclusion === 'ERROR'
      || conclusion === 'TIMED_OUT'
      || conclusion === 'STARTUP_FAILURE'
      || state === 'FAILURE'
      || state === 'ERROR';
  });

  if (hasFailed) {
    return { symbol: '✗', color: pc.red, label: 'Build failed' };
  }

  const isBuilding = checks.some((check) => {
    const status = (check.status ?? check.state ?? '').toUpperCase();
    return status === 'IN_PROGRESS' || status === 'QUEUED' || status === 'PENDING';
  });

  if (isBuilding) {
    return { symbol: '⋯', color: pc.dim, label: 'Building' };
  }

  return { symbol: '✓', color: pc.green, label: 'Build passed' };
}

/**
 * Get approval status display (review decision + merge readiness) for a PR.
 */
export function getApprovalStatusDisplay({ pr }: { pr: PrStatus }): StatusDisplay {
  if (pr.mergeStateStatus === 'DIRTY') {
    return { symbol: '✗', color: pc.red, label: 'Conflicts' };
  }

  switch (pr.reviewDecision) {
    case 'APPROVED': {
      return { symbol: '✓', color: pc.green, label: 'Approved' };
    }
    case 'CHANGES_REQUESTED': {
      return { symbol: '○', color: pc.red, label: 'Changes requested' };
    }
    case 'REVIEW_REQUIRED': {
      return { symbol: '○', color: pc.white, label: 'Awaiting review' };
    }
    default: {
      return { symbol: '✓', color: pc.dim, label: 'Can be merged' };
    }
  }
}

/**
 * Create a clickable terminal link (if supported).
 */
export function terminalLink({ url, label }: { url: string; label: string }): string {
  // OSC 8 hyperlink format: \x1b]8;;URL\x1b\\TEXT\x1b]8;;\x1b\\
  return `\x1b]8;;${url}\x1b\\${label}\x1b]8;;\x1b\\`;
}

/**
 * Format a single PR line for display with proper column alignment.
 */
export function formatPrLine(
  {
    pr,
    prNumWidth = 0,
    branchWidth = 0,
    titleWidth = 0,
    titleSliceStart = 0,
    buildWidth = 0,
    commentsWidth = 0,
  }: {
    pr: PrStatus;
    prNumWidth?: number;
    branchWidth?: number;
    titleWidth?: number;
    /** Skip this many characters from the start of the title before truncating. */
    titleSliceStart?: number;
    buildWidth?: number;
    commentsWidth?: number;
  },
): string {
  // PR number with "PR#" prefix in magenta (clickable)
  const prNumText = `PR#${pr.number}`;
  const prNumber = terminalLink({ url: pr.url, label: pc.magenta(prNumText) });

  // Branch name in cyan
  const branch = pc.cyan(pr.headRefName);

  // Build status column
  const buildDisplay = getBuildStatusDisplay({ pr });
  const buildText = `${buildDisplay.symbol} ${buildDisplay.label}`;
  const buildStatusText = buildDisplay.color(buildText);

  // Approval status column
  const approvalDisplay = getApprovalStatusDisplay({ pr });
  const approvalText = `${approvalDisplay.symbol} ${approvalDisplay.label}`;
  const approvalStatusText = approvalDisplay.color(approvalText);

  const unresolvedCommentsBadge = getUnresolvedCommentsBadge({ pr });

  // Calculate padding (accounting for color codes that don't take space)
  const prNumPadding = prNumWidth > 0 ? prNumWidth - prNumText.length : 0;
  const branchPadding = branchWidth > 0 ? branchWidth - pr.headRefName.length : 0;
  const buildPadding = buildWidth > 0 ? buildWidth - buildText.length : 0;
  const commentsPadding = commentsWidth > 0
    ? commentsWidth - unresolvedCommentsBadge.length
    : 0;

  // Optional title column — trim front/back whitespace, then slice from start
  let titlePart = '';
  if (titleWidth > 0) {
    let titleText = pr.title.trim();
    if (titleSliceStart > 0) {
      titleText = titleText.slice(titleSliceStart).trim();
    }
    const truncated = titleText.length > titleWidth
      ? `${titleText.slice(0, titleWidth - 1)}…`
      : titleText;
    titlePart = `  ${pc.white(truncated)}${' '.repeat(titleWidth - truncated.length)}`;
  }

  const commentsPart = commentsWidth > 0
    ? `  ${unresolvedCommentsBadge}${' '.repeat(commentsPadding)}`
    : '';

  return `${prNumber}${' '.repeat(prNumPadding)}  ${branch}${
    ' '.repeat(branchPadding)
  }${titlePart}  ${buildStatusText}${
    ' '.repeat(buildPadding)
  }  ${approvalStatusText}${commentsPart}`;
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
}

/**
 * Format multiple PR lines with aligned columns.
 * Pass pre-computed widths to align columns across multiple repos.
 */
export function formatPrLines(
  {
    prs,
    showTitle = false,
    titleMaxChars = 40,
    titleSliceStart = 0,
    prNumWidth: prNumWidthOverride,
    branchWidth: branchWidthOverride,
    buildWidth: buildWidthOverride,
    commentsWidth: commentsWidthOverride,
  }: FormatPrLinesParams,
): string[] {
  if (prs.length === 0) return [];

  // Use provided widths or compute from this batch
  const prNumWidth = prNumWidthOverride
    ?? Math.max(...prs.map((pr) => `PR#${pr.number}`.length));
  const branchWidth = branchWidthOverride
    ?? Math.max(...prs.map((pr) => pr.headRefName.length));
  const titleWidth = showTitle
    ? Math.min(titleMaxChars, Math.max(...prs.map((pr) => pr.title.length)))
    : 0;
  const buildWidth = buildWidthOverride
    ?? Math.max(
      ...prs.map((pr) => {
        const d = getBuildStatusDisplay({ pr });
        return `${d.symbol} ${d.label}`.length;
      }),
    );

  const commentsWidth = commentsWidthOverride
    ?? Math.max(...prs.map((pr) => getUnresolvedCommentsBadge({ pr }).length));

  return prs.map((pr) =>
    formatPrLine({
      pr,
      prNumWidth,
      branchWidth,
      titleWidth,
      titleSliceStart,
      buildWidth,
      commentsWidth,
    })
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
 * Get summary line for PR list.
 */
export function getPrSummary({ pullRequests }: { pullRequests: PrStatus[] }): string {
  const needsRebaseCount = pullRequests.filter(
    (pr) => pr.mergeStateStatus === 'BEHIND' || pr.mergeStateStatus === 'DIRTY',
  ).length;

  const needsRebaseText = pc.yellow(
    `${needsRebaseCount} need${needsRebaseCount === 1 ? 's' : ''} rebase`,
  );

  return needsRebaseText;
}
