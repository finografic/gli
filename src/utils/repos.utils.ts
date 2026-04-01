import { readConfig, writeConfig } from 'utils/config.utils.js';
import type { RepoConfig } from 'types/config.types';

export function addRepo({ localPath, remote }: { localPath: string; remote: string }): void {
  const config = readConfig();
  const exists = config.repos.some((r) => r.remote === remote);

  if (exists) {
    return;
  }

  config.repos.push({ localPath, remote });
  writeConfig({ config });
}

export function removeRepo({ remote }: { remote: string }): void {
  const config = readConfig();
  config.repos = config.repos.filter((r) => r.remote !== remote);
  writeConfig({ config });
}

export function listRepos(): RepoConfig[] {
  const config = readConfig();
  return config.repos;
}
