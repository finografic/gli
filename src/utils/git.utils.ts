import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

interface ValidateRepoPathParams {
  repoPath: string;
}

/**
 * Validate that a path is a git repository.
 */
export function validateRepoPath({ repoPath }: ValidateRepoPathParams): boolean {
  const resolvedPath = resolve(repoPath);
  return existsSync(resolve(resolvedPath, '.git'));
}

interface GetRemoteFromPathParams {
  localPath: string;
}

/**
 * Get GitHub remote (owner/repo) from a local git repository path. Returns null if not found or not a GitHub
 * repo.
 */
export function getRemoteFromPath({ localPath }: GetRemoteFromPathParams): string | null {
  try {
    const output = execSync('gh repo view --json nameWithOwner --jq .nameWithOwner', {
      cwd: localPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return output || null;
  } catch {
    return null;
  }
}

/**
 * Get full GitHub URL from a local git repository path. Returns null if not found or not a GitHub repo.
 */
export function getGitHubUrlFromPath({ localPath }: GetRemoteFromPathParams): string | null {
  try {
    const output = execSync('gh repo view --json url --jq .url', {
      cwd: localPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return output || null;
  } catch {
    return null;
  }
}

interface IsGitRepoParams {
  path: string;
}

/**
 * Check if a path is a git repository.
 */
export function isGitRepo({ path }: IsGitRepoParams): boolean {
  return validateRepoPath({ repoPath: path });
}
