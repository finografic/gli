import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';

import { FULL_DEFAULT_CONFIG } from 'config/defaults.constants.js';
import { CONFIG_PATH } from 'config/paths.constants.js';
import type { GliConfiguration, JiraConfig } from 'types/config.types.js';

/** True when `jira.baseUrl` is a non-empty string (after trim). */
export function isJiraLinksEnabled(jira?: JiraConfig | null): boolean {
  return typeof jira?.baseUrl === 'string' && jira.baseUrl.trim().length > 0;
}

export function writeConfig({ config }: { config: GliConfiguration }): void {
  mkdirSync(CONFIG_PATH, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export function readConfig(): GliConfiguration {
  if (!existsSync(CONFIG_PATH)) {
    // First run → persist defaults so users can inspect/edit them
    writeConfig({ config: FULL_DEFAULT_CONFIG });
    return { ...FULL_DEFAULT_CONFIG };
  }

  try {
    const parsed: unknown = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));

    if (!isValidConfig(parsed)) {
      return { ...FULL_DEFAULT_CONFIG };
    }

    return parsed;
  } catch {
    // Any read/parse failure falls back to safe defaults
    return { ...FULL_DEFAULT_CONFIG };
  }
}

/** Narrow unknown → GliConfiguration (minimal structural check). */
function isValidConfig(value: unknown): value is GliConfiguration {
  return (
    typeof value === 'object'
    && value !== null
    && Array.isArray((value as GliConfiguration).repos)
  );
}

export function getConfigFilePath(): string {
  return CONFIG_PATH;
}

export function tildeify(path: string): string {
  return path.replace(homedir(), '~');
}
