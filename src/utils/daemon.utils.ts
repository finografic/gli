import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const PLIST_FILENAME = 'com.finografic.gli.pr-watch.plist';

/**
 * Get the LaunchAgents directory path.
 */
function getLaunchAgentsDir(): string {
  return join(homedir(), 'Library', 'LaunchAgents');
}

/**
 * Get the plist file path.
 */
export function getPlistPath(): string {
  return join(getLaunchAgentsDir(), PLIST_FILENAME);
}

/**
 * Check if LaunchAgent (daemon) is installed.
 */
export function isDaemonInstalled(): boolean {
  return existsSync(getPlistPath());
}

/**
 * Check if LaunchAgent (daemon) is loaded/running.
 */
export function isDaemonRunning(): boolean {
  try {
    const result = execSync('launchctl list', { encoding: 'utf-8' });
    return result.includes('com.finografic.gli.pr-watch');
  } catch {
    return false;
  }
}

/**
 * Get log file path.
 */
export function getLogFilePath(): string {
  return join(homedir(), '.config', 'gli', 'logs', 'watch.log');
}

/**
 * Get last log entry from the watch log file.
 */
export function getLastLogEntry(): string | null {
  const logPath = getLogFilePath();
  if (!existsSync(logPath)) {
    return null;
  }

  try {
    // Get last line from log file
    const result = execSync(`tail -n 1 "${logPath}"`, { encoding: 'utf-8' });
    return result.trim() || null;
  } catch {
    return null;
  }
}
