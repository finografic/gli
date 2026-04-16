import { join } from 'node:path';
import { getConfigPath } from '@finografic/cli-kit/xdg';

export const CONFIG_PATH = getConfigPath('gli');
export const CONFIG_FILE = join(CONFIG_PATH, 'config.json');
export const CACHE_FILE = join(CONFIG_PATH, 'cache.json');
