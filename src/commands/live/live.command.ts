import { spawn } from 'node:child_process';
import { renderCommandHelp } from 'core/render-help/index.js';
import logUpdate from 'log-update';
import pc from 'picocolors';

import { writeCache } from 'utils/cache.utils.js';
import { getLiveIntervalSeconds, readConfig } from 'utils/config.utils.js';
import type { RepoSection } from 'utils/gh.utils.js';
import { assertGhAvailable } from 'utils/gh.utils.js';
import { fetchPrSections, renderDisplay } from 'utils/pr-sections.utils.js';

import {
  DEFAULT_AUTO_REBASE_EVERY_NTH_REFRESH,
  DEFAULT_LIVE_INTERVAL_SECONDS,
  DEFAULT_PR_TITLE_MAX_CHARS,
} from 'config/defaults.constants.js';
import { KEYCODES } from 'config/keycodes.constants';
import {
  COMPACT_TOGGLE_KEY,
  DEFAULT_PR_TITLE_SLICE_START,
  SPINNER_INTERVAL_MS,
  SPINNER_SEQUENCE,
} from 'config/ui.constants.js';

interface RunLiveCommandParams {
  argv: string[];
}

// Module-level state shared between fetchAndDisplay, renderFromCache, and the keypress handler
let isCompact = false;
let cachedSections: RepoSection[] | null = null;
/** Set at `runLiveCommand` start when argv contains `--auto-rebase`. */
let sessionAutoRebase = false;
let liveRefreshCount = 0;

function renderFromCache(): void {
  if (!cachedSections) return;
  const config = readConfig();
  const showTitle = config.prListing?.title?.display ?? false;
  const titleMaxChars = config.prListing?.title?.maxChars ?? DEFAULT_PR_TITLE_MAX_CHARS;
  const titleSliceStart = config.prListing?.title?.sliceStart ?? DEFAULT_PR_TITLE_SLICE_START;
  const liveInterval = getLiveIntervalSeconds(config);
  const output = renderDisplay({
    sections: cachedSections,
    showTitle,
    titleMaxChars,
    titleSliceStart,
    liveInterval,
    isLive: true,
    compact: isCompact,
    jiraConfig: config.jira,
  });
  logUpdate(output);
}

/**
 * Fetch and re-render the live display.
 */
async function fetchAndDisplay(): Promise<void> {
  try {
    const config = readConfig();
    const sections = await fetchPrSections();
    cachedSections = sections;
    writeCache({ sections });

    const showTitle = config.prListing?.title?.display ?? false;
    const titleMaxChars = config.prListing?.title?.maxChars ?? DEFAULT_PR_TITLE_MAX_CHARS;
    const titleSliceStart = config.prListing?.title?.sliceStart ?? DEFAULT_PR_TITLE_SLICE_START;
    const liveInterval = getLiveIntervalSeconds(config);

    const output = renderDisplay({
      sections,
      showTitle,
      titleMaxChars,
      titleSliceStart,
      liveInterval,
      isLive: true,
      compact: isCompact,
      jiraConfig: config.jira,
    });

    logUpdate(output);

    liveRefreshCount++;
    maybeSpawnAutoRebase();
  } catch (error: unknown) {
    logUpdate(`\n${pc.red('Error:')} ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }
}

function maybeSpawnAutoRebase(): void {
  const config = readConfig();
  const enabled = sessionAutoRebase || (config.live?.autoRebase ?? false);
  if (!enabled) return;
  if (liveRefreshCount % DEFAULT_AUTO_REBASE_EVERY_NTH_REFRESH !== 0) return;

  const script = process.argv[1];
  if (typeof script !== 'string' || script.length === 0) return;

  try {
    const child = spawn(process.execPath, [script, 'rebase', '--all', '-y'], {
      cwd: process.cwd(),
      stdio: 'ignore',
      detached: true,
      windowsHide: true,
    });
    child.unref();
  } catch {
    // ignore spawn failures
  }
}

/**
 * Show a spinner via logUpdate while waiting for the first data fetch. Returns a cleanup function that stops
 * the spinner.
 */
function startSpinner(): () => void {
  let frame = 0;
  const timer = setInterval(() => {
    const glyph = SPINNER_SEQUENCE[frame % SPINNER_SEQUENCE.length];
    logUpdate(`\n  ${pc.bold(pc.gray(glyph))}  ${pc.gray('Fetching PR status…')}\n`);
    frame++;
  }, SPINNER_INTERVAL_MS);

  return () => clearInterval(timer);
}

/**
 * Run the live command.
 */
export async function runLiveCommand({ argv }: RunLiveCommandParams): Promise<void> {
  if (argv.includes('--help') || argv.includes('-h')) {
    renderCommandHelp({
      command: 'gli live',
      description: 'Live-updating PR status dashboard (⭐ RECOMMENDED)',
      usage: 'gli live [options]',
      options: [
        {
          flag: '--compact',
          description: `Start in compact view (toggle anytime with [${COMPACT_TOGGLE_KEY.label}])`,
        },
        {
          flag: '--auto-rebase',
          description:
            'Enable background auto-rebase for this session (`gli rebase --all -y` every few refreshes)',
        },
      ],
      examples: [
        {
          command: 'gli live',
          description: `Start live dashboard (refreshes every ${DEFAULT_LIVE_INTERVAL_SECONDS}s by default)`,
        },
        {
          command: 'gli live --auto-rebase',
          description: 'Same, plus periodic background rebase of stale PR branches',
        },
        {
          command: 'gli config edit',
          description: 'Customize `live.interval`, `live.autoRebase`, and other settings',
        },
      ],
      sections: [
        {
          title: 'DESCRIPTION',
          content: `  Live-updating terminal dashboard for PR status, like htop but for your PRs.
  Perfect for running in a terminal panel to monitor pull requests in real-time.

  The dashboard shows:
  - PR list with status indicators (clickable PR numbers and repo names)
  - Build and approval status columns
  - Config path footer

  Refresh interval defaults to ${DEFAULT_LIVE_INTERVAL_SECONDS}s (\`live.interval\` in config).
  Set \`live.autoRebase\` to true or pass \`--auto-rebase\` to run \`gli rebase --all -y\` in the
  background every ${DEFAULT_AUTO_REBASE_EVERY_NTH_REFRESH}th refresh (not every tick).`,
        },
      ],
    });
    return;
  }

  // Check gh availability
  try {
    await assertGhAvailable();
  } catch (error: unknown) {
    console.error(pc.red('Error:'), error instanceof Error ? error.message : 'GitHub CLI not available');
    process.exit(1);
  }

  sessionAutoRebase = argv.includes('--auto-rebase');
  liveRefreshCount = 0;

  // Set initial compact state from flag
  isCompact = argv.includes('--compact');

  // Set up raw keypress listener for hotkey toggle.
  // Wrapped in try/catch because setRawMode throws when stdin is not a TTY
  // (e.g. piped environments, some pnpm wrappers).
  try {
    process.stdin.setEncoding('utf8');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', (key: string) => {
      if (key === COMPACT_TOGGLE_KEY.binding) {
        isCompact = !isCompact;
        renderFromCache();
      } else if (key === KEYCODES.CTRL_C || key === KEYCODES.Q) {
        process.exit(0);
      }
    });
  } catch {
    // Not a TTY — hotkey unavailable, Ctrl+C handled by default SIGINT
  }

  // Clear console and show animated spinner while first async fetch runs.
  console.clear();
  const stopSpinner = startSpinner();
  await fetchAndDisplay();
  stopSpinner();

  // Read interval from config for the polling loop
  const config = readConfig();
  const liveInterval = getLiveIntervalSeconds(config);
  const intervalMs = liveInterval * 1000;

  setInterval(() => {
    fetchAndDisplay();
  }, intervalMs);
}
