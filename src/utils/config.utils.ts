import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';

import { FULL_DEFAULT_CONFIG } from 'config/defaults.constants.js';
import { CONFIG_FILE, CONFIG_PATH } from 'config/paths.constants.js';
import type { GliConfiguration, JiraConfig } from 'types/config.types.js';

/** True when `jira.baseUrl` is a non-empty string (after trim). */
export function isJiraLinksEnabled(jira?: JiraConfig | null): boolean {
  return typeof jira?.baseUrl === 'string' && jira.baseUrl.trim().length > 0;
}

export function writeConfig({ config }: { config: GliConfiguration }): void {
  mkdirSync(CONFIG_PATH, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function readConfig(): GliConfiguration {
  if (!existsSync(CONFIG_FILE)) {
    // First run → persist defaults so users can inspect/edit them
    writeConfig({ config: FULL_DEFAULT_CONFIG });
    return { ...FULL_DEFAULT_CONFIG };
  }

  try {
    const parsed: unknown = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
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
  } catch {
    // Any read/parse failure falls back to safe defaults
    return { ...FULL_DEFAULT_CONFIG };
  }
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
