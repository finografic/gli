import logUpdate from 'log-update';
import pc from 'picocolors';

import {
  DEFAULT_LIVE_INTERVAL,
  DEFAULT_PR_TITLE_MAX_CHARS,
} from '../../config/defaults.constants.js';
import {
  COMPACT_TOGGLE_KEY,
  DEFAULT_PR_TITLE_SLICE_START,
  SPINNER_INTERVAL_MS,
  SPINNER_SEQUENCE,
} from '../../config/ui.constants.js';
import { readConfig, writeCache } from '../../utils/config.utils.js';
import type { RepoSection } from '../../utils/gh.utils.js';
import { assertGhAvailable } from '../../utils/gh.utils.js';
import { printCommandHelp } from '../../utils/help.utils.js';
import { fetchPrSections, renderDisplay } from '../../utils/pr-sections.utils.js';

interface RunLiveCommandParams {
  argv: string[];
}

// Module-level state shared between fetchAndDisplay, renderFromCache, and the keypress handler
let isCompact = false;
let cachedSections: RepoSection[] | null = null;

function renderFromCache(): void {
  if (!cachedSections) return;
  const config = readConfig();
  const showTitle = config.prListing?.title?.display ?? false;
  const titleMaxChars = config.prListing?.title?.maxChars ?? DEFAULT_PR_TITLE_MAX_CHARS;
  const titleSliceStart = config.prListing?.title?.sliceStart ?? DEFAULT_PR_TITLE_SLICE_START;
  const liveInterval = config.liveInterval ?? DEFAULT_LIVE_INTERVAL;
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
    const liveInterval = config.liveInterval ?? DEFAULT_LIVE_INTERVAL;

    const output = renderDisplay({
      sections,
      showTitle,
      titleMaxChars,
      titleSliceStart,
      liveInterval,
      isLive: true,
      compact: isCompact,
    });

    logUpdate(output);
  } catch (error: unknown) {
    logUpdate(
      `\n${pc.red('Error:')} ${error instanceof Error ? error.message : 'Unknown error'}\n`,
    );
  }
}

/**
 * Show a spinner via logUpdate while waiting for the first data fetch.
 * Returns a cleanup function that stops the spinner.
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
    printCommandHelp({
      command: 'gli live',
      description: 'Live-updating PR status dashboard (⭐ RECOMMENDED)',
      usage: 'gli live',
      options: [
        {
          flag: '--compact',
          description: `Start in compact view (toggle anytime with [${COMPACT_TOGGLE_KEY.label}])`,
        },
      ],
      examples: [
        {
          command: 'gli live',
          description:
            `Start live dashboard (refreshes every ${DEFAULT_LIVE_INTERVAL}s by default)`,
        },
        {
          command: 'gli config edit',
          description: 'Customize refresh interval and other settings',
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

  Refresh interval defaults to ${DEFAULT_LIVE_INTERVAL}s. Customize via \`gli config edit\` (liveInterval).`,
        },
      ],
    });
    return;
  }

  // Check gh availability
  try {
    await assertGhAvailable();
  } catch (error: unknown) {
    console.error(
      pc.red('Error:'),
      error instanceof Error ? error.message : 'GitHub CLI not available',
    );
    process.exit(1);
  }

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
      } else if (key === '\x03' || key === 'q') {
        // Ctrl+C or q — exit cleanly
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
  const liveInterval = config.liveInterval ?? DEFAULT_LIVE_INTERVAL;
  const intervalMs = liveInterval * 1000;

  setInterval(() => {
    fetchAndDisplay();
  }, intervalMs);
}
