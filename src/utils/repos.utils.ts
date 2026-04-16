import { readConfig, writeConfig } from 'utils/config.utils.js';

import type { RepoConfig } from 'types/config.types';

export async function addRepo({ localPath, remote }: { localPath: string; remote: string }): Promise<void> {
  const config = await readConfig();
  const exists = config.repos.some((r) => r.remote === remote);

  if (exists) {
    return;
  }

  config.repos.push({ localPath, remote });
  await writeConfig({ config });
}

export async function removeRepo({ remote }: { remote: string }): Promise<void> {
  const config = await readConfig();
  config.repos = config.repos.filter((r) => r.remote !== remote);
  await writeConfig({ config });
}

export async function listRepos(): Promise<RepoConfig[]> {
  const config = await readConfig();
  return config.repos;
}
