import { DEFAULT_PR_TITLE_SLICE_START } from 'config/ui.constants';
import type { GliConfiguration } from 'types/config.types';

/** Max age before cached PR data is considered stale. */
export const DEFAULT_CACHE_MAX_AGE_SECONDS = 10;

export const DEFAULT_LIVE_INTERVAL_SECONDS = 60;
export const DEFAULT_PR_TITLE_MAX_CHARS = 40;

/** Run auto-rebase every Nth live refresh cycle. */
export const DEFAULT_AUTO_REBASE_EVERY_NTH_REFRESH = 4;

export const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/;

/**
 * Optional Jira base URL sourced from env. Example: https://your-org.atlassian.net/browse
 */
export const DEFAULT_JIRA_BASE_URL = process.env['GLI_JIRA_BASE_URL'] || undefined;

/**
 * Optional Jira issue prefix sourced from env. Example: "SBS" → matches SBS-123
 */
export const DEFAULT_JIRA_ISSUE_PREFIX = process.env['GLI_JIRA_ISSUE_PREFIX'] || undefined;

/**
 * Canonical config defaults. Persisted on first run so the full shape is visible/editable by the user.
 */
export const FULL_DEFAULT_CONFIG: GliConfiguration = {
  repos: [],
  live: {
    interval: DEFAULT_LIVE_INTERVAL_SECONDS,
    autoRebase: false,
  },
  jira: {
    baseUrl: '',
    issuePrefix: '',
  },
  prs: {
    title: {
      display: false,
      maxChars: DEFAULT_PR_TITLE_MAX_CHARS,
      sliceStart: DEFAULT_PR_TITLE_SLICE_START,
    },
  },
};
