import { homedir } from 'node:os';
import { join } from 'node:path';
import { getConfigPath, readJsonc, writeJsonc } from '@finografic/cli-kit/xdg';

import { FULL_DEFAULT_CONFIG } from 'config/defaults.constants.js';
import type { GliConfiguration, JiraConfig } from 'types/config.types.js';

const CONFIG_FILE = join(getConfigPath('gli'), 'config.json');

/** True when `jira.baseUrl` is a non-empty string (after trim). */
export function isJiraLinksEnabled(jira?: JiraConfig | null): boolean {
  return typeof jira?.baseUrl === 'string' && jira.baseUrl.trim().length > 0;
}

export async function writeConfig({ config }: { config: GliConfiguration }): Promise<void> {
  await writeJsonc(CONFIG_FILE, config);
}

export async function readConfig(): Promise<GliConfiguration> {
  const parsed = await readJsonc<unknown>(CONFIG_FILE);

  if (parsed === null) {
    // First run → persist defaults so users can inspect/edit them
    await writeConfig({ config: FULL_DEFAULT_CONFIG });
    return { ...FULL_DEFAULT_CONFIG };
  }

  const legacyJiraBaseUrl = isRecord(parsed) ? parsed['jiraBaseUrl'] : undefined;

  if (!isValidConfig(parsed)) {
    return { ...FULL_DEFAULT_CONFIG };
  }

  const config = parsed as GliConfiguration;

  if (!config.jira && typeof legacyJiraBaseUrl === 'string' && legacyJiraBaseUrl.trim().length > 0) {
    return {
      ...config,
      jira: { baseUrl: legacyJiraBaseUrl.trim() },
    };
  }

  return config;
}

/** Narrow unknown → GliConfiguration (minimal structural check). */
function isValidConfig(value: unknown): value is GliConfiguration {
  return typeof value === 'object' && value !== null && Array.isArray((value as GliConfiguration).repos);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getConfigFilePath(): string {
  return CONFIG_FILE;
}

export function tildeify(path: string): string {
  return path.replace(homedir(), '~');
}
