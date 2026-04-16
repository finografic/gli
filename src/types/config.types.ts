export interface JiraConfig {
  /**
   * Jira browse base (no trailing slash). Empty string disables branch → Jira links. Example:
   * `https://your-org.atlassian.net/browse`
   */
  baseUrl: string;
  /**
   * When non-empty, only branches containing this prefix get Jira links (e.g. `SBS`). Empty string uses the
   * default PROJECT-NUMBER pattern.
   */
  issuePrefix?: string;
}

export interface RepoConfig {
  localPath: string;
  remote: string;
  jira?: JiraConfig;
}

export interface LiveConfig {
  /** Refresh interval in seconds (default: 60). */
  interval?: number;
  /** When true, rebase stale branches every Nth refresh automatically. */
  autoRebase?: boolean;
}

export interface GliConfiguration {
  repos: RepoConfig[];
  live?: LiveConfig;
  /**
   * Global Jira config — applies to all repos unless overridden per-repo. Example: { "baseUrl":
   * "https://your-org.atlassian.net/browse", "issuePrefix": "PROJ" }
   */
  jira?: JiraConfig;
  prListing?: {
    title?: {
      display?: boolean;
      maxChars?: number;
      /** Skip N characters from the start of the title before truncating. */
      sliceStart?: number;
    };
  };
}
