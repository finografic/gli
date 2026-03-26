import { execSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { exit } from 'node:process';

import * as clack from '@clack/prompts';
import pc from 'picocolors';

import { DEFAULT_CHECK_INTERVAL } from '../../config/defaults.constants.js';
import { readConfig, tildeify } from '../../utils/config.utils.js';
import { assertGhAvailable, fetchMyOpenPrs } from '../../utils/gh.utils.js';
import { printCommandHelp } from '../../utils/help.utils.js';
import { getLogPath, writeLog } from '../../utils/log.utils.js';
import { sendNotification } from '../../utils/notify.utils.js';

interface RunWatchCommandParams {
  argv: string[];
}

const PLIST_LABEL = 'com.finografic.gli.pr-watch';
const PLIST_DIR = join(homedir(), 'Library', 'LaunchAgents');
const PLIST_PATH = join(PLIST_DIR, `${PLIST_LABEL}.plist`);

const resolveCliBin = (): string => {
  try {
    return execSync('which gli', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    // Fallback: try to find via npm/pnpm global
    try {
      return execSync('which gli', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] })
        .trim();
    } catch {
      throw new Error('Could not find `gli` on PATH. Run `pnpm link --global` first.');
    }
  }
};

const generatePlist = ({ binPath, interval }: { binPath: string; interval: number }): string =>
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${binPath}</string>
    <string>watch</string>
    <string>check</string>
  </array>
  <key>StartInterval</key>
  <integer>${interval}</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/${PLIST_LABEL}.stdout.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/${PLIST_LABEL}.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
`;

const isAgentLoaded = (): boolean => {
  try {
    const output = execSync(`launchctl list ${PLIST_LABEL}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return output.includes(PLIST_LABEL);
  } catch {
    return false;
  }
};

const printHelp = () => {
  printCommandHelp({
    command: 'gli watch',
    description: 'Background PR monitoring with macOS notifications',
    usage: 'gli watch <subcommand>',
    subcommands: [
      {
        name: 'install',
        description: 'Install LaunchAgent for background monitoring',
      },
      {
        name: 'uninstall',
        description: 'Remove LaunchAgent and stop monitoring',
      },
      {
        name: 'status',
        description: 'Show daemon installation and run status',
      },
      {
        name: 'check',
        description: 'Run a single PR check cycle (used by LaunchAgent)',
      },
    ],
    examples: [
      {
        command: 'gli watch install',
        description: 'Install daemon with default interval',
      },
      {
        command: 'gli watch status',
        description: 'Check daemon status',
      },
      {
        command: 'gli watch uninstall',
        description: 'Remove daemon',
      },
      {
        command: 'gli watch check',
        description: 'Manual check (for testing)',
      },
    ],
    requirements: [
      'At least one repository configured (run: gli config add)',
    ],
    howItWorks: [
      "LaunchAgent runs 'gli watch check' periodically (default: every 60s)",
      'Checks all configured repos for PRs in states: BEHIND, DIRTY, BLOCKED, UNSTABLE',
      'Sends native macOS notifications showing repo, branch, and status',
      'Logs activity to ~/.config/gli/logs/watch.log',
      'Configure interval via config.checkInterval in config file',
      "See notification → Run 'gli live' for interactive dashboard",
    ],
  });
};

const runInstall = async () => {
  clack.intro('Watch Install');

  const config = readConfig();

  if (config.repos.length === 0) {
    clack.log.warn('No repos configured. Run `gli config add` first.');
    clack.outro('Aborted');
    return;
  }

  // Check if already installed - ASK BEFORE OVERWRITING
  if (existsSync(PLIST_PATH)) {
    const shouldReinstall = await clack.confirm({
      message: 'LaunchAgent is already installed. Reinstall?',
    });

    if (clack.isCancel(shouldReinstall) || !shouldReinstall) {
      clack.outro('Cancelled');
      return;
    }

    // Unload existing agent first
    if (isAgentLoaded()) {
      try {
        execSync(`launchctl unload ${PLIST_PATH}`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch {
        // May not be loaded
      }
    }
  }

  let binPath: string;
  try {
    binPath = resolveCliBin();
  } catch (error: unknown) {
    clack.log.error(error instanceof Error ? error.message : 'Could not find CLI binary.');
    clack.outro('Aborted');
    return;
  }

  const interval = config.checkInterval || DEFAULT_CHECK_INTERVAL;
  const plist = generatePlist({ binPath, interval });

  if (isAgentLoaded()) {
    try {
      execSync(`launchctl unload ${PLIST_PATH}`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {
      // May not be loaded
    }
  }

  writeFileSync(PLIST_PATH, plist, 'utf-8');
  clack.log.info(`Plist written to ${pc.dim(tildeify(PLIST_PATH))}`);

  try {
    execSync(`launchctl load ${PLIST_PATH}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    clack.log.success('LaunchAgent loaded');
  } catch (error: unknown) {
    clack.log.error(
      `Failed to load agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    clack.outro('Install failed');
    return;
  }

  clack.log.info(
    `Checking ${pc.bold(String(config.repos.length))} repo${
      config.repos.length === 1 ? '' : 's'
    } every ${pc.bold(String(interval))}s`,
  );
  clack.log.info(`logs: ${pc.dim(tildeify(getLogPath()))}`);
  clack.outro('Watch installed');
};

const runUninstall = () => {
  clack.intro('Watch Uninstall');

  if (!existsSync(PLIST_PATH)) {
    clack.log.info('LaunchAgent is not installed.');
    clack.outro('Done');
    return;
  }

  if (isAgentLoaded()) {
    try {
      execSync(`launchctl unload ${PLIST_PATH}`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      clack.log.success('LaunchAgent unloaded');
    } catch (error: unknown) {
      clack.log.warn(
        `Failed to unload agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  try {
    rmSync(PLIST_PATH);
    clack.log.success('Plist removed');
  } catch (error: unknown) {
    clack.log.error(
      `Failed to remove plist: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  clack.outro('Watch uninstalled');
};

const runStatus = () => {
  console.log('');
  console.log(pc.bold('Watch Daemon Status'));
  console.log('');

  const installed = existsSync(PLIST_PATH);
  const loaded = isAgentLoaded();
  const config = readConfig();
  const interval = config.checkInterval || DEFAULT_CHECK_INTERVAL;

  // Status indicators
  console.log(
    `  ${pc.white('Installed:'.padEnd(12))}  ${
      installed ? pc.green('✓ Yes') : pc.dim('Not installed')
    }`,
  );
  console.log(
    `  ${pc.white('Running:'.padEnd(12))}  ${
      loaded ? pc.green('✓ Yes') : installed ? pc.yellow('○ Not running') : pc.dim('—')
    }`,
  );
  console.log(
    `  ${pc.white('Interval:'.padEnd(12))}  ${
      pc.dim(`${interval}s (${Math.round(interval / 60)} min)`)
    }`,
  );
  console.log(`  ${pc.white('repos:'.padEnd(12))}  ${pc.dim(String(config.repos.length))}`);
  console.log('');

  if (installed) {
    console.log(`  ${pc.white('plist'.padEnd(12))}  ${pc.dim(tildeify(PLIST_PATH))}`);

    const logPath = getLogPath();
    console.log(`  ${pc.white('logs:'.padEnd(12))}  ${pc.dim(tildeify(logPath))}`);
    console.log('');
  }

  if (!installed) {
    console.log(pc.dim(`  Run ${pc.cyan('gli watch install')} to set up background monitoring`));
    console.log('');
  }
};

const runCheck = async () => {
  writeLog({ message: 'Check started' });

  try {
    await assertGhAvailable();
  } catch {
    writeLog({ message: 'gh CLI not available, skipping check' });
    return;
  }

  const config = readConfig();

  if (config.repos.length === 0) {
    writeLog({ message: 'No repos configured, skipping check' });
    return;
  }

  const notifyOn = config.notifyOn || ['BEHIND', 'DIRTY'];
  const stalePrs: {
    repo: string;
    number: number;
    title: string;
    branch: string;
    status: string;
  }[] = [];

  for (const repo of config.repos) {
    try {
      const prs = await fetchMyOpenPrs({ repo: repo.remote });
      const stale = prs.filter(
        (pr) => !pr.isDraft && notifyOn.includes(pr.mergeStateStatus),
      );

      for (const pr of stale) {
        const statusLabel = pr.mergeStateStatus === 'DIRTY' ? 'Conflicts' : 'Rebase needed';
        stalePrs.push({
          repo: repo.remote,
          number: pr.number,
          title: pr.title,
          branch: pr.headRefName,
          status: statusLabel,
        });
      }

      writeLog({ message: `${repo.remote}: ${prs.length} PRs, ${stale.length} stale` });
    } catch (error: unknown) {
      writeLog({
        message: `${repo.remote}: error — ${error instanceof Error ? error.message : 'Unknown'}`,
      });
    }
  }

  if (stalePrs.length === 0) {
    writeLog({ message: 'No stale PRs found' });
    return;
  }

  // Build enhanced notification message with repo and PR details
  let notificationMessage = '';

  if (stalePrs.length === 1) {
    const pr = stalePrs[0]!;
    // Extract repo name from URL (e.g., "https://github.com/owner/repo" -> "owner/repo")
    const repoName = pr.repo.replace(/^https?:\/\/github\.com\//, '');
    notificationMessage = `${repoName}\n• ${pr.branch} (${pr.status})`;

    sendNotification({
      title: 'PR needs rebase',
      message: notificationMessage,
    });
  } else {
    // Group by repo
    const byRepo = new Map<string, typeof stalePrs>();
    for (const pr of stalePrs) {
      const existing = byRepo.get(pr.repo) || [];
      existing.push(pr);
      byRepo.set(pr.repo, existing);
    }

    // Build message with repo sections
    const lines: string[] = [];
    for (const [repo, prs] of byRepo) {
      const repoName = repo.replace(/^https?:\/\/github\.com\//, '');
      lines.push(repoName);
      for (const pr of prs) {
        lines.push(`• ${pr.branch} (${pr.status})`);
      }
      lines.push(''); // Blank line between repos
    }

    notificationMessage = lines.join('\n').trim();

    sendNotification({
      title: `${stalePrs.length} PRs need rebase`,
      message: notificationMessage,
    });
  }

  writeLog({
    message: `Check complete — ${stalePrs.length} stale PR${
      stalePrs.length === 1 ? '' : 's'
    } notified`,
  });
};

export const runWatchCommand = async ({ argv }: RunWatchCommandParams) => {
  const [subcommand] = argv;

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printHelp();
    return;
  }

  if (subcommand === 'install') {
    await runInstall();
    return;
  }

  if (subcommand === 'uninstall') {
    runUninstall();
    return;
  }

  if (subcommand === 'status') {
    runStatus();
    return;
  }

  if (subcommand === 'check') {
    await runCheck();
    return;
  }

  console.error(`Unknown watch subcommand: ${subcommand}`);
  printHelp();
  exit(1);
};
