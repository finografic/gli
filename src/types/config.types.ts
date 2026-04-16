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

/** Settings for `gli live` (refresh cadence and optional background auto-rebase). */
export interface LiveConfig {
  /** Seconds between dashboard refreshes. */
  interval?: number;
  /**
   * When true, periodically runs `gli rebase --all -y` in the background (same cwd). Also enabled for this
   * session with `gli live --auto-rebase` (overrides to on regardless of this flag).
   */
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
