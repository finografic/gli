import { renderCommandHelp } from '@finografic/cli-kit/render-help';
import { runSilentRebaseAll } from 'commands/rebase/index.js';
import logUpdate from 'log-update';
import pc from 'picocolors';
import type { SilentRebaseResult } from 'commands/rebase/index.js';

import { writeCache } from 'utils/cache.utils.js';
import { readConfig } from 'utils/config.utils.js';
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
let isAutoRebase = false;
let cachedSections: RepoSection[] | null = null;
let refreshCount = 0;
let autoRebaseRunning = false;
let lastAutoRebaseResults: SilentRebaseResult[] | null = null;
let lastAutoRebaseTime: Date | null = null;

function formatTimeAgo(date: Date): string {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

function buildAutoRebaseFooterLine(): string | null {
  if (!isAutoRebase) return null;

  const remainder = refreshCount % DEFAULT_AUTO_REBASE_EVERY_NTH_REFRESH;
  const nextIn =
    remainder === 0
      ? DEFAULT_AUTO_REBASE_EVERY_NTH_REFRESH
      : DEFAULT_AUTO_REBASE_EVERY_NTH_REFRESH - remainder;

  if (autoRebaseRunning) {
    return `  ${pc.dim('Auto-rebase: running…')}`;
  }

  const nextLabel = `next in ${nextIn} refresh${nextIn === 1 ? '' : 'es'}`;

  if (lastAutoRebaseResults !== null && lastAutoRebaseTime !== null) {
    const succeeded = lastAutoRebaseResults.filter((r) => r.success).length;
    const failed = lastAutoRebaseResults.filter((r) => !r.success).length;
    const timeAgo = formatTimeAgo(lastAutoRebaseTime);

    let statusText: string;
    if (failed > 0) {
      const failLabel = `${failed} conflict${failed === 1 ? '' : 's'}`;
      statusText =
        succeeded > 0
          ? `${pc.yellow(`⚠ ${failLabel}`)}, ${pc.green(`${succeeded} ok`)}`
          : pc.yellow(`⚠ ${failLabel}`);
    } else if (succeeded > 0) {
      statusText = pc.green(`✓ ${succeeded} rebased`);
    } else {
      statusText = pc.dim('✓ nothing to rebase');
    }

    return `  ${pc.dim(`Auto-rebase: ${timeAgo} · ${statusText} · ${nextLabel}`)}`;
  }

  return `  ${pc.dim(`Auto-rebase: ${nextLabel}`)}`;
}

async function renderFromCache(): Promise<void> {
  if (!cachedSections) return;
  const config = await readConfig();
  const showTitle = config.prListing?.title?.display ?? false;
  const titleMaxChars = config.prListing?.title?.maxChars ?? DEFAULT_PR_TITLE_MAX_CHARS;
  const titleSliceStart = config.prListing?.title?.sliceStart ?? DEFAULT_PR_TITLE_SLICE_START;
  const liveInterval = config.live?.interval ?? DEFAULT_LIVE_INTERVAL_SECONDS;
  const autoRebaseLine = buildAutoRebaseFooterLine();
  const output = renderDisplay({
    sections: cachedSections,
    showTitle,
    titleMaxChars,
    titleSliceStart,
    liveInterval,
    isLive: true,
    compact: isCompact,
    jiraConfig: config.jira,
    extraFooterLines: autoRebaseLine ? [autoRebaseLine] : undefined,
  });
  logUpdate(output);
}

function triggerAutoRebase(): void {
  autoRebaseRunning = true;
  void renderFromCache(); // Show "running…" immediately
  runSilentRebaseAll()
    .then((results) => {
      lastAutoRebaseResults = results;
      lastAutoRebaseTime = new Date();
      autoRebaseRunning = false;
      void renderFromCache();
    })
    .catch(() => {
      autoRebaseRunning = false;
    });
}

/**
 * Fetch and re-render the live display.
 */
async function fetchAndDisplay(): Promise<void> {
  try {
    const config = await readConfig();
    const sections = await fetchPrSections();
    cachedSections = sections;
    writeCache({ sections });

    refreshCount++;

    const showTitle = config.prListing?.title?.display ?? false;
    const titleMaxChars = config.prListing?.title?.maxChars ?? DEFAULT_PR_TITLE_MAX_CHARS;
    const titleSliceStart = config.prListing?.title?.sliceStart ?? DEFAULT_PR_TITLE_SLICE_START;
    const liveInterval = config.live?.interval ?? DEFAULT_LIVE_INTERVAL_SECONDS;
    const autoRebaseLine = buildAutoRebaseFooterLine();

    const output = renderDisplay({
      sections,
      showTitle,
      titleMaxChars,
      titleSliceStart,
      liveInterval,
      isLive: true,
      compact: isCompact,
      jiraConfig: config.jira,
      extraFooterLines: autoRebaseLine ? [autoRebaseLine] : undefined,
    });

    logUpdate(output);

    if (isAutoRebase && !autoRebaseRunning && refreshCount % DEFAULT_AUTO_REBASE_EVERY_NTH_REFRESH === 0) {
      triggerAutoRebase();
    }
  } catch (error: unknown) {
    logUpdate(`\n${pc.red('Error:')} ${error instanceof Error ? error.message : 'Unknown error'}\n`);
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
      usage: 'gli live',
      options: [
        {
          flag: '--compact',
          description: `Start in compact view (toggle anytime with [${COMPACT_TOGGLE_KEY.label}])`,
        },
        {
          flag: '--auto-rebase',
          description: `Silently rebase stale branches every ${DEFAULT_AUTO_REBASE_EVERY_NTH_REFRESH} refreshes`,
        },
      ],
      examples: [
        {
          command: 'gli live',
          description: `Start live dashboard (refreshes every ${DEFAULT_LIVE_INTERVAL_SECONDS}s by default)`,
        },
        {
          command: 'gli live --auto-rebase',
          description: 'Live dashboard with background auto-rebase of stale branches',
        },
        {
          command: 'gli config edit',
          description: 'Customize refresh interval, enable auto-rebase by default, and other settings',
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

  Refresh interval defaults to ${DEFAULT_LIVE_INTERVAL_SECONDS}s. Customize via \`gli config edit\` (live.interval).

  Auto-rebase mode (--auto-rebase or live.autoRebase: true in config) silently rebases
  stale branches every ${DEFAULT_AUTO_REBASE_EVERY_NTH_REFRESH} refreshes. Conflicts are skipped with a
  warning shown in the footer. No prompts — fully automatic.`,
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

  const config = await readConfig();

  // Set initial state from flags / config
  isCompact = argv.includes('--compact');
  isAutoRebase = argv.includes('--auto-rebase') || (config.live?.autoRebase ?? false);

  // Reset module-level state for clean run
  refreshCount = 0;
  autoRebaseRunning = false;
  lastAutoRebaseResults = null;
  lastAutoRebaseTime = null;

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
        void renderFromCache();
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
  const liveInterval = config.live?.interval ?? DEFAULT_LIVE_INTERVAL_SECONDS;
  const intervalMs = liveInterval * 1000;

  setInterval(() => {
    fetchAndDisplay();
  }, intervalMs);
}
