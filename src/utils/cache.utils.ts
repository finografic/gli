import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import type { RepoSection } from 'utils/gh.utils.js';

import { DEFAULT_CACHE_MAX_AGE_SECONDS } from 'config/defaults.constants.js';
import { CACHE_FILE, CONFIG_PATH } from 'config/paths.constants';

export interface PrCache {
  updatedAt: string;
  sections: RepoSection[];
}

export function writeCache({ sections }: { sections: RepoSection[] }): void {
  mkdirSync(CONFIG_PATH, { recursive: true });
  const cache: PrCache = { updatedAt: new Date().toISOString(), sections };
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

export function readCache(): PrCache | null {
  if (!existsSync(CACHE_FILE)) return null;
  try {
    const raw = readFileSync(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as PrCache;
    if (typeof parsed.updatedAt !== 'string' || !Array.isArray(parsed.sections)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isCacheFresh({
  cache,
  maxAgeSeconds = DEFAULT_CACHE_MAX_AGE_SECONDS,
}: {
  cache: PrCache;
  maxAgeSeconds?: number;
}): boolean {
  const ageMs = Date.now() - new Date(cache.updatedAt).getTime();
  return ageMs < maxAgeSeconds * 1000;
}
