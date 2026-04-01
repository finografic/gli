import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface StatusCheckRollupItem {
  __typename: string;
  conclusion?: string;
  status?: string;
  state?: string;
  name?: string;
  workflowName?: string;
}

export interface LatestReview {
  state: string;
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
  statusCheckRollup: StatusCheckRollupItem[];
  reviewDecision: string;
  latestReviews: LatestReview[];
  unresolvedCommentsCount: number;
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
  statusCheckRollup: StatusCheckRollupItem[];
  reviewDecision: string;
  latestReviews: LatestReview[];
}

interface ReviewThreadsGraphqlResponse {
  data?: {
    repository?: {
      pullRequests?: {
        nodes?: Array<{
          number?: number;
          reviewThreads?: {
            nodes?: Array<{
              isResolved?: boolean;
            }>;
          };
        }>;
      };
    };
  };
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
        latestReviews: Array.isArray(maybeItem.latestReviews) ? maybeItem.latestReviews : [],
        unresolvedCommentsCount: 0,
      };
    })
    .filter((pr): pr is PrStatus => pr !== null);
};

const extractOwnerAndNameFromPrUrl = ({
  pullRequestUrl,
}: {
  pullRequestUrl: string;
}): { owner: string; name: string } | null => {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/\d+/.exec(pullRequestUrl);

  if (!match) return null;

  return {
    owner: match[1],
    name: match[2],
  };
};

const fetchUnresolvedCommentsCountByPrNumber = async ({
  pullRequests,
}: {
  pullRequests: PrStatus[];
}): Promise<Map<number, number>> => {
  if (pullRequests.length === 0) {
    return new Map();
  }

  const repositoryIdentity = extractOwnerAndNameFromPrUrl({
    pullRequestUrl: pullRequests[0].url,
  });

  if (!repositoryIdentity) {
    return new Map();
  }

  const openPullRequestNumbers = new Set(pullRequests.map((pullRequest) => pullRequest.number));

  const graphqlQuery =
    'query($owner:String!,$name:String!){repository(owner:$owner,name:$name){pullRequests(states:OPEN,first:100){nodes{number reviewThreads(first:100){nodes{isResolved}}}}}}';

  const { stdout } = await execAsync(
    `gh api graphql -F owner=${repositoryIdentity.owner} -F name=${repositoryIdentity.name} -f query='${graphqlQuery}'`,
  );

  const parsed = JSON.parse(stdout) as ReviewThreadsGraphqlResponse;
  const nodes = parsed.data?.repository?.pullRequests?.nodes ?? [];

  const unresolvedCountByPullRequestNumber = new Map<number, number>();

  for (const node of nodes) {
    if (typeof node.number !== 'number' || !openPullRequestNumbers.has(node.number)) {
      continue;
    }

    const reviewThreads = node.reviewThreads?.nodes ?? [];
    const unresolvedCount = reviewThreads.filter((thread) => thread.isResolved === false).length;

    unresolvedCountByPullRequestNumber.set(node.number, unresolvedCount);
  }

  return unresolvedCountByPullRequestNumber;
};

export const fetchMyOpenPrs = async ({ repo }: { repo?: string } = {}): Promise<PrStatus[]> => {
  const repoFlag = repo ? ` --repo ${repo}` : '';
  const { stdout } = await execAsync(
    `gh pr list --author "@me" --state open --json number,title,headRefName,baseRefName,mergeStateStatus,mergeable,isDraft,updatedAt,url,statusCheckRollup,reviewDecision,latestReviews${repoFlag}`,
  );
  const pullRequests = parsePrListJson({ output: stdout });

  try {
    const unresolvedCountByPullRequestNumber = await fetchUnresolvedCommentsCountByPrNumber({
      pullRequests,
    });

    return pullRequests.map((pullRequest) => ({
      ...pullRequest,
      unresolvedCommentsCount: unresolvedCountByPullRequestNumber.get(pullRequest.number) ?? 0,
    }));
  } catch {
    return pullRequests;
  }
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
  /** Per-repo Jira config attached during fetch. */
  jiraConfig?: { baseUrl: string; issuePrefix?: string };
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
