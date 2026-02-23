import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface CheckRun {
  __typename: string;
  conclusion: string;
  status: string;
  name: string;
  workflowName: string;
}

export interface PrStatus {
  number: number;
  title: string;
  headRefName: string;
  baseRefName: string;
  mergeStateStatus: string;
  mergeable: string;
  isDraft: boolean;
  updatedAt: string;
  url: string;
  statusCheckRollup: CheckRun[];
  reviewDecision: string;
}

interface GhPrListItem {
  number: number;
  title: string;
  headRefName: string;
  baseRefName: string;
  mergeStateStatus: string;
  mergeable: string;
  isDraft: boolean;
  updatedAt: string;
  url: string;
  statusCheckRollup: CheckRun[];
  reviewDecision: string;
}

export const assertGhAvailable = async (): Promise<void> => {
  try {
    await execAsync('gh auth status');
  } catch {
    throw new Error(
      'GitHub CLI (gh) is not installed or not authenticated.\n'
        + 'Install: https://cli.github.com\n'
        + 'Authenticate: gh auth login',
    );
  }
};

const parsePrListJson = ({ output }: { output: string }): PrStatus[] => {
  const parsed: unknown = JSON.parse(output);
  if (!Array.isArray(parsed)) {
    throw new Error('Unexpected output from `gh pr list` (expected JSON array).');
  }

  return parsed
    .map((item): PrStatus | null => {
      const maybeItem = item as Partial<GhPrListItem>;
      if (
        typeof maybeItem.number !== 'number'
        || typeof maybeItem.title !== 'string'
        || typeof maybeItem.headRefName !== 'string'
        || typeof maybeItem.baseRefName !== 'string'
        || typeof maybeItem.mergeStateStatus !== 'string'
        || typeof maybeItem.mergeable !== 'string'
        || typeof maybeItem.isDraft !== 'boolean'
        || typeof maybeItem.updatedAt !== 'string'
        || typeof maybeItem.url !== 'string'
      ) {
        return null;
      }

      return {
        number: maybeItem.number,
        title: maybeItem.title,
        headRefName: maybeItem.headRefName,
        baseRefName: maybeItem.baseRefName,
        mergeStateStatus: maybeItem.mergeStateStatus,
        mergeable: maybeItem.mergeable,
        isDraft: maybeItem.isDraft,
        updatedAt: maybeItem.updatedAt,
        url: maybeItem.url,
        statusCheckRollup: Array.isArray(maybeItem.statusCheckRollup)
          ? maybeItem.statusCheckRollup
          : [],
        reviewDecision: maybeItem.reviewDecision ?? '',
      };
    })
    .filter((pr): pr is PrStatus => pr !== null);
};

export const fetchMyOpenPrs = async ({ repo }: { repo?: string } = {}): Promise<PrStatus[]> => {
  const repoFlag = repo ? ` --repo ${repo}` : '';
  const { stdout } = await execAsync(
    `gh pr list --author "@me" --state open --json number,title,headRefName,baseRefName,mergeStateStatus,mergeable,isDraft,updatedAt,url,statusCheckRollup,reviewDecision${repoFlag}`,
  );
  return parsePrListJson({ output: stdout });
};

export const fetchDefaultBranch = async (): Promise<string> => {
  const { stdout } = await execAsync(
    'gh repo view --json defaultBranchRef --jq .defaultBranchRef.name',
  );
  return stdout.trim();
};

export interface RepoInfo {
  name: string;
  nameWithOwner: string;
  url: string;
}

export interface RepoSection {
  repoInfo: RepoInfo | null;
  pullRequests: PrStatus[];
  error?: string;
}

/**
 * Get current repository info (name, owner/name, url).
 */
export const fetchRepoInfo = async ({ repo }: { repo?: string } = {}): Promise<RepoInfo> => {
  const repoArg = repo ? ` ${repo}` : '';
  const { stdout } = await execAsync(
    `gh repo view${repoArg} --json name,nameWithOwner,url`,
  );

  const parsed: unknown = JSON.parse(stdout);
  const info = parsed as Partial<RepoInfo>;

  if (!info.name || !info.nameWithOwner || !info.url) {
    throw new Error('Failed to fetch repository info');
  }

  return {
    name: info.name,
    nameWithOwner: info.nameWithOwner,
    url: info.url,
  };
};
