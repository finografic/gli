// export const DEFAULT_LIVE_INTERVAL = 5;
export const DEFAULT_LIVE_INTERVAL = 60;
export const DEFAULT_PR_TITLE_MAX_CHARS = 40;

/** Max age (seconds) before cached PR data is considered stale and a fresh fetch is triggered. */
export const DEFAULT_CACHE_MAX_AGE_SECONDS = 10;

/**
 * Default Jira base URL — sourced from GLI_JIRA_BASE_URL env var only.
 * Example: "https://your-org.atlassian.net/browse"
 * Do not hardcode a real URL here; set it in your shell environment or .env file.
 */
export const DEFAULT_JIRA_BASE_URL: string | undefined = process.env['GLI_JIRA_BASE_URL']
  || undefined;

/**
 * Default Jira issue prefix — sourced from GLI_JIRA_ISSUE_PREFIX env var only.
 * Example: "SBS" — when set, only branches containing this prefix will get Jira links.
 * If unset, any PROJECT-NUMBER pattern is matched.
 */
export const DEFAULT_JIRA_ISSUE_PREFIX: string | undefined = process.env['GLI_JIRA_ISSUE_PREFIX']
  || undefined;
