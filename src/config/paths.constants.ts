import { homedir } from 'node:os';
import { join } from 'node:path';

export const CONFIG_PATH = join(process.env['XDG_CONFIG_HOME'] || join(homedir(), '.config'), 'gli');

export const CONFIG_FILE = join(CONFIG_PATH, 'config.json');
export const CACHE_FILE = join(CONFIG_PATH, 'cache.json');
